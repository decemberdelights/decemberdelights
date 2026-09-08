import re
import html
from fastapi import HTTPException, Request
from store import RateLimiter


login_limiter = RateLimiter(max_attempts=5, window_seconds=300)
franchise_limiter = RateLimiter(max_attempts=5, window_seconds=300)
careers_track_limiter = RateLimiter(max_attempts=10, window_seconds=60)


_HTML_TAG_RE = re.compile(r'<[^>]+>')

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
    return status in ("pending", "confirmed", "preparing", "packed", "ready", "delivered", "cancelled")


def validate_application_status(status: str) -> bool:
    """Validate application status value."""
    return status in ("pending", "submitted", "under_process", "approved", "rejected")


_PRIVATE_IP_RANGES = (
    ("10.", 8), ("127.", 8), ("169.254.", 16),
    ("172.16.", 12), ("192.168.", 16),
)


def get_client_ip(request: Request) -> str:
    """Get client IP. X-Forwarded-For only used when client is on a private/proxy IP."""
    client = request.client
    if not client or not client.host:
        return "unknown"

    client_is_private = any(client.host.startswith(prefix) for prefix, _ in _PRIVATE_IP_RANGES)
    if not client_is_private:
        return client.host

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
        if ip:
            return ip

    return client.host
