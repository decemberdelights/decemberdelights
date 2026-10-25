"""Regression tests for the audit security fixes (stdlib + pytest only,
no live server, no Supabase).
Run: cd backend && python -m pytest tests/test_security_fixes.py -q
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# auth.py refuses to import without a valid JWT_SECRET (fail-closed at startup).
# Set a test secret BEFORE importing auth; pytest env has no .env.local JWT_SECRET.
os.environ["JWT_SECRET"] = "r4nd0mS3cretValue2026abcdefghijk"

import auth  # noqa: E402
from security import get_client_ip  # noqa: E402


# ---------------------------------------------------------------------------
# get_client_ip: forwarded-header trust rules (spoofable bucket key = RL bypass)
# ---------------------------------------------------------------------------
class _FakeClient:
    def __init__(self, host):
        self.host = host


class _FakeRequest:
    def __init__(self, host=None, headers=None):
        self.client = _FakeClient(host) if host is not None else None
        self.headers = dict(headers or {})


def test_client_ip_trusted_proxy_uses_rightmost_xff():
    req = _FakeRequest("127.0.0.1", {"x-forwarded-for": "203.0.113.7, 198.51.100.9"})
    # Only the rightmost entry was appended by our proxy; left is client-supplied.
    assert get_client_ip(req) == "198.51.100.9"


def test_client_ip_xff_spoof_prefix_ignored():
    # Classic spoof: "attacker-chosen, real-client" — real client is rightmost.
    req = _FakeRequest("127.0.0.1", {"x-forwarded-for": "6.6.6.6, 203.0.113.50"})
    assert get_client_ip(req) == "203.0.113.50"


def test_client_ip_prefers_x_real_ip():
    req = _FakeRequest("10.0.0.2", {
        "x-real-ip": "203.0.113.60",
        "x-forwarded-for": "1.1.1.1, 2.2.2.2",
    })
    assert get_client_ip(req) == "203.0.113.60"


def test_client_ip_x_real_ip_stuffed_list_takes_rightmost():
    req = _FakeRequest("10.0.0.2", {"x-real-ip": "9.9.9.9, 203.0.113.61"})
    assert get_client_ip(req) == "203.0.113.61"


def test_client_ip_public_peer_ignores_forwarded_headers():
    # Headers from the internet are attacker-controlled: never trusted.
    req = _FakeRequest("203.0.113.99", {
        "x-forwarded-for": "6.6.6.6",
        "x-real-ip": "7.7.7.7",
    })
    assert get_client_ip(req) == "203.0.113.99"


def test_client_ip_no_headers_returns_peer():
    req = _FakeRequest("192.168.1.5")
    assert get_client_ip(req) == "192.168.1.5"


def test_client_ip_unknown_peer_isolates_buckets():
    k1 = get_client_ip(_FakeRequest(None))
    k2 = get_client_ip(_FakeRequest(None))
    assert k1.startswith("unknown:")
    assert k2.startswith("unknown:")
    # Random per-request key: one caller must not lock out others.
    assert k1 != k2


# ---------------------------------------------------------------------------
# JWT secret validation (fail-closed at startup, no insecure fallback)
# ---------------------------------------------------------------------------
def test_jwt_secret_rejects_missing():
    for bad in ("", None):
        try:
            auth.validate_jwt_secret(bad)
            assert False, f"expected RuntimeError for {bad!r}"
        except RuntimeError:
            pass


def test_jwt_secret_rejects_short():
    try:
        auth.validate_jwt_secret("short-secret")
        assert False, "expected RuntimeError for short secret"
    except RuntimeError:
        pass


def test_jwt_secret_rejects_placeholders():
    # Long enough to pass the length check — must still be rejected as a
    # placeholder (these exact strings ship in the deploy templates).
    placeholders = (
        "CHANGE_ME_TO_RANDOM_STRING_XXXXXX",
        "PASTE_YOUR_RAZORPAY_KEY_ID_HERE!!",
        "EXAMPLE_SECRET_VALUE_NOT_FOR_PROD",
    )
    for bad in placeholders:
        assert len(bad) >= 32, "test value must be >= 32 chars to prove the placeholder check fires"
        try:
            auth.validate_jwt_secret(bad)
            assert False, f"expected RuntimeError for placeholder {bad!r}"
        except RuntimeError:
            pass


def test_jwt_secret_rejects_repeating_pattern():
    try:
        auth.validate_jwt_secret("a" * 64)
        assert False, "expected RuntimeError for repeating pattern"
    except RuntimeError:
        pass


def test_jwt_secret_accepts_random_value():
    secret = auth.validate_jwt_secret("r4nd0mS3cretValue2026abcdefghijk")
    assert secret == "r4nd0mS3cretValue2026abcdefghijk"


# ---------------------------------------------------------------------------
# RateLimiter.reset() clears BOTH memory and SQLite
# ---------------------------------------------------------------------------
def test_rate_limiter_reset_clears_memory_and_sqlite():
    from store import RateLimiter, _get_conn

    rl = RateLimiter(max_attempts=3, window_seconds=60)
    key = "test:reset:pytest"
    rl.reset(key)  # start clean
    try:
        rl.check(key)
        rl.check(key)

        assert key in RateLimiter._mem, "memory bucket should exist after check()"
        row = _get_conn().execute(
            "SELECT timestamps FROM rate_limits WHERE key = ?", (key,)
        ).fetchone()
        assert row is not None, "SQLite row should exist after check()"

        rl.reset(key)

        assert key not in RateLimiter._mem, "reset() must clear the memory bucket"
        row = _get_conn().execute(
            "SELECT timestamps FROM rate_limits WHERE key = ?", (key,)
        ).fetchone()
        assert row is None, "reset() must delete the SQLite row"

        # A cleared key must be usable again immediately (no stale 429).
        rl.check(key)
    finally:
        try:
            rl.reset(key)
            RateLimiter._mem.pop(key, None)
        except Exception:
            pass
