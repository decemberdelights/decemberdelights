import time
import re
import html
from collections import defaultdict
from fastapi import HTTPException, Request


class RateLimiter:
    """Simple in-memory rate limiter with TTL cleanup."""

    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = defaultdict(list)
        self._last_cleanup = time.time()

    def _cleanup(self):
        now = time.time()
        if now - self._last_cleanup < 60:
            return
        self._last_cleanup = now
        stale_keys = [k for k, v in self._attempts.items() if not v or (now - v[-1] > self.window_seconds * 2)]
        for k in stale_keys:
            del self._attempts[k]

    def check(self, key: str) -> None:
        self._cleanup()
        now = time.time()
        self._attempts[key] = [
            t for t in self._attempts[key] if now - t < self.window_seconds
        ]
        if len(self._attempts[key]) >= self.max_attempts:
            remaining = int(self.window_seconds - (now - self._attempts[key][0]))
            raise HTTPException(
                status_code=429,
                detail=f"Too many attempts. Try again in {remaining} seconds.",
            )

    def record(self, key: str) -> None:
        self._attempts[key].append(time.time())

    def reset(self, key: str) -> None:
        self._attempts[key] = []


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


def html_escape(value: str) -> str:
    """Escape HTML entities for safe interpolation in emails/HTML."""
    if not isinstance(value, str):
        return ""
    return html.escape(value)


def sanitize_log(value: str) -> str:
    """Sanitize input for logging to prevent log injection."""
    if not isinstance(value, str):
        return ""
    return value.replace("\n", " ").replace("\r", " ").replace("\t", " ")[:200]


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
