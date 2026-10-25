import re
import html
import uuid
from fastapi import HTTPException, Request
from store import RateLimiter


login_limiter = RateLimiter(max_attempts=5, window_seconds=300)
franchise_limiter = RateLimiter(max_attempts=5, window_seconds=300)
careers_track_limiter = RateLimiter(max_attempts=10, window_seconds=60)


_HTML_TAG_RE = re.compile(r'<[^>]+>')
_ALLOWED_HTML_TAGS = ("strong", "em", "b", "i", "br")


def sanitize_terms_text(value: str, max_length: int = 5000) -> str:
    """Sanitize Terms & Conditions HTML before storage/rendering.

    Allows only a fixed set of formatting tags (no attributes, no scripts,
    no event handlers, no embedded content) and HTML-escapes all remaining
    text. Any other tag (script/style/iframe/object/img/...) is dropped.
    """
    if not isinstance(value, str):
        return ""
    cleaned_parts: list[str] = []
    pos = 0
    for m in _HTML_TAG_RE.finditer(value):
        text_part = value[pos:m.start()]
        if text_part:
            cleaned_parts.append(html.escape(text_part))
        tag = m.group(0)
        name_m = re.match(r"<\s*/?\s*([a-zA-Z][a-zA-Z0-9]*)", tag)
        name = name_m.group(1).lower() if name_m else ""
        if name in _ALLOWED_HTML_TAGS:
            cleaned_parts.append(f"</{name}>" if tag.lstrip().startswith("</") else f"<{name}>")
        pos = m.end()
    if pos < len(value):
        cleaned_parts.append(html.escape(value[pos:]))
    return "".join(cleaned_parts).strip()[:max_length]

def sanitize_input(value: str, max_length: int = 1000) -> str:
    """Strip HTML tags, whitespace, and limit string length."""
    if not isinstance(value, str):
        return ""
    cleaned = _HTML_TAG_RE.sub("", value)
    cleaned = html.escape(cleaned)
    return cleaned.strip()[:max_length]


def validate_email(email: str) -> bool:
    """Basic email validation."""
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """Validate phone number (digits, +, -, spaces, 7-15 chars)."""
    cleaned = re.sub(r'[\s\-\+]', '', phone)
    return cleaned.isdigit() and 7 <= len(cleaned) <= 15


def validate_order_status(status: str) -> bool:
    """Validate order status value."""
    return status in ("pending", "confirmed", "preparing", "packed", "ready", "dispatched", "delivered", "cancelled")


def validate_application_status(status: str) -> bool:
    """Validate application status value."""
    return status in ("pending", "submitted", "under_process", "approved", "rejected")


def validate_password_policy(password: str) -> None:
    """Shared password policy. Raises HTTPException(400) with the exact
    messages the admin UI already displays. Use everywhere passwords are
    set (admin user create/update, password reset) — do not re-implement."""
    if not password or len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if len(password) > 72:
        raise HTTPException(status_code=400, detail="Password must not exceed 72 characters")
    if not any(c.isupper() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one digit")


def is_settings_not_configured(exc: Exception) -> bool:
    """True ONLY for the 'site_settings table not provisioned yet' error.

    Feature flags (shop_enabled / franchise_enabled) must fail CLOSED on any
    other error — `except Exception: pass` re-enabled a disabled shop on every
    transient DB hiccup. Only this explicit "table missing" condition may
    fall back to allowing the request."""
    msg = str(exc).lower()
    if "site_settings" not in msg:
        return False
    return (
        "does not exist" in msg
        or "could not find the table" in msg
        or "pgrst205" in msg
        or "schema cache" in msg
        or "not configured" in msg
    )


_PRIVATE_IP_RANGES = (
    ("10.", 8), ("127.", 8), ("169.254.", 16),
    ("172.16.", 12), ("192.168.", 16),
)


def _is_private_ip(ip: str) -> bool:
    return any(ip.startswith(prefix) for prefix, _ in _PRIVATE_IP_RANGES)


def get_client_ip(request: Request) -> str:
    """Resolve the client IP used for rate-limit bucket keys.

    Trust rules (a spoofable bucket key = a rate-limit bypass):
    - Forwarded headers are ONLY trusted when the direct socket peer is a
      private IP (our nginx / reverse proxy on this host or private network).
      A public peer's forwarded headers are attacker-controlled: ignored.
    - X-Real-IP (set unconditionally by our nginx) is preferred when present.
    - Otherwise take the RIGHTMOST X-Forwarded-For entry: only the entry our
      trusted proxy appends is trustworthy; everything to the left of it was
      supplied by the client (classic XFF spoof: "attacker, real-client").
    - When the peer is unknown (request.client is None) return a per-request
      random key: a shared "unknown" bucket would let one caller lock out
      every other caller (mutual DoS)."""
    client = request.client
    if not client or not client.host:
        return f"unknown:{uuid.uuid4().hex}"

    peer = client.host
    if not _is_private_ip(peer):
        # Public peer — never trust forwarded headers.
        return peer

    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        # nginx overwrites X-Real-IP; still take rightmost if stuffed with a list.
        real_entries = [p.strip() for p in real_ip.split(",") if p.strip()]
        if real_entries:
            return real_entries[-1]

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        entries = [p.strip() for p in forwarded.split(",") if p.strip()]
        if entries:
            return entries[-1]

    return peer
