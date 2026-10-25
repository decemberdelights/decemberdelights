"""Superadmin-only password reset via Gmail OTP.

Flow:  forgot-password (OTP emailed) -> verify-otp (single-use reset token)
        -> reset-password (new password, token consumed).

Security properties:
- Only active `super_admin` accounts can use this flow. Everyone else
  (including non-existent usernames) gets the same generic response, so
  the endpoints cannot be used to enumerate accounts or roles.
- OTPs are 6 digits from `secrets`, stored as SHA-256 hashes, expire in
  10 minutes, allow max 5 verification attempts, and are single-use.
- The reset token is a 256-bit random value, stored hashed, expires in
  15 minutes, and is deleted on first use — it cannot be replayed, and
  the password cannot be changed without completing OTP verification.
- Strict per-IP and per-account rate limits on all three endpoints.
"""

import hashlib
import hmac
import logging
import os
import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from supabase_client import supabase
from auth import hash_password, _user_cache
from activity import log_activity
from schemas import ForgotPasswordRequest, VerifyOtpRequest, ResetPasswordRequest
from security import get_client_ip, sanitize_input, validate_password_policy
from store import RateLimiter
from email_service import send_password_reset_otp

logger = logging.getLogger(__name__)
router = APIRouter()

SUPERADMIN_RESET_EMAIL = os.environ.get("SUPERADMIN_RESET_EMAIL", "info@decemberdelights.in").strip()

OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
RESET_TOKEN_TTL_MINUTES = 15

forgot_limiter = RateLimiter(max_attempts=3, window_seconds=3600)
verify_limiter = RateLimiter(max_attempts=10, window_seconds=600)
reset_limiter = RateLimiter(max_attempts=10, window_seconds=600)

_GENERIC_OK = {"ok": True, "message": "If this superadmin account exists, a verification code has been sent to the registered Gmail."}


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        ts = value
    else:
        ts = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts


def _get_super_admin(username: str):
    """Return the active super_admin row for username, else None."""
    try:
        result = supabase.table("admin_users").select("*").eq("username", username).execute()
    except Exception as e:
        logger.error(f"Password-reset lookup failed: {e}")
        return None
    if not result.data:
        return None
    user = result.data[0]
    if user.get("role") != "super_admin" or not user.get("is_active", True):
        return None
    return user


def _latest_record(user_id: int):
    try:
        result = (
            supabase.table("admin_password_resets")
            .select("*")
            .eq("admin_user_id", user_id)
            .eq("used", False)
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as e:
        logger.error(f"Password-reset fetch failed: {e}")
        return None
    return result.data[0] if result.data else None


def _invalidate(record_id: int):
    try:
        supabase.table("admin_password_resets").update({"used": True}).eq("id", record_id).execute()
    except Exception as e:
        logger.error(f"Password-reset invalidate failed: {e}")


@router.post("/api/auth/forgot-password")
def forgot_password(request: Request, body: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    client_ip = get_client_ip(request)
    forgot_limiter.check(f"pwd_forgot_ip:{client_ip}")

    username = sanitize_input(str(body.username or ""), 100).strip()
    if not username:
        return _GENERIC_OK
    forgot_limiter.check(f"pwd_forgot_user:{username.lower()}")

    user = _get_super_admin(username)
    if not user:
        # Generic response — never reveal whether the account exists,
        # is active, or has reset rights.
        return _GENERIC_OK

    otp = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = (_now() + timedelta(minutes=OTP_TTL_MINUTES)).isoformat()
    try:
        supabase.table("admin_password_resets").insert({
            "admin_user_id": user["id"],
            "otp_hash": _sha256(otp),
            "reset_token_hash": "",
            "expires_at": expires_at,
            "attempts": 0,
            "verified": False,
            "used": False,
        }).execute()
    except Exception as e:
        logger.error(f"Password-reset OTP store failed: {e}")
        raise HTTPException(status_code=500, detail="Could not start password reset. Try again later.")

    # SMTP over the network is slow — send after the response is handed back.
    background_tasks.add_task(
        send_password_reset_otp, SUPERADMIN_RESET_EMAIL, user["username"], otp
    )

    log_activity(user["username"], "password_reset_requested", "admin_user", user["id"], "OTP sent to registered Gmail")
    return _GENERIC_OK


@router.post("/api/auth/verify-otp")
def verify_otp(request: Request, body: VerifyOtpRequest):
    client_ip = get_client_ip(request)
    verify_limiter.check(f"pwd_verify_ip:{client_ip}")

    username = sanitize_input(str(body.username or ""), 100).strip()
    otp = sanitize_input(str(body.otp or ""), 10).strip()
    if not username or not otp:
        raise HTTPException(status_code=400, detail="Username and verification code are required.")
    verify_limiter.check(f"pwd_verify_user:{username.lower()}")

    user = _get_super_admin(username)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    record = _latest_record(user["id"])
    if not record or record.get("verified"):
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    if _parse_ts(record["expires_at"]) < _now():
        _invalidate(record["id"])
        raise HTTPException(status_code=400, detail="Verification code expired. Request a new one.")

    attempts = int(record.get("attempts", 0)) + 1
    if not hmac.compare_digest(_sha256(otp), str(record.get("otp_hash", ""))):
        try:
            update = {"attempts": attempts}
            if attempts >= OTP_MAX_ATTEMPTS:
                update["used"] = True
            supabase.table("admin_password_resets").update(update).eq("id", record["id"]).execute()
        except Exception as e:
            logger.error(f"Password-reset attempt update failed: {e}")
        if attempts >= OTP_MAX_ATTEMPTS:
            raise HTTPException(status_code=429, detail="Too many wrong attempts. Request a new code.")
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    # OTP correct — issue a single-use reset token bound to this record.
    reset_token = secrets.token_urlsafe(32)
    new_expiry = (_now() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)).isoformat()
    try:
        supabase.table("admin_password_resets").update({
            "verified": True,
            "attempts": attempts,
            "reset_token_hash": _sha256(reset_token),
            "expires_at": new_expiry,
        }).eq("id", record["id"]).execute()
    except Exception as e:
        logger.error(f"Password-reset verify update failed: {e}")
        raise HTTPException(status_code=500, detail="Verification failed. Try again.")

    log_activity(user["username"], "password_reset_verified", "admin_user", user["id"], "OTP verified")
    return {"ok": True, "reset_token": reset_token}


@router.post("/api/auth/reset-password")
def reset_password(request: Request, body: ResetPasswordRequest):
    client_ip = get_client_ip(request)
    reset_limiter.check(f"pwd_reset_ip:{client_ip}")

    username = sanitize_input(str(body.username or ""), 100).strip()
    reset_token = str(body.reset_token or "")
    new_password = str(body.new_password or "")
    if not username or not reset_token or not new_password:
        raise HTTPException(status_code=400, detail="Username, reset token and new password are required.")
    if len(reset_token) > 128:
        raise HTTPException(status_code=400, detail="Invalid reset token.")
    reset_limiter.check(f"pwd_reset_user:{username.lower()}")

    user = _get_super_admin(username)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    record = _latest_record(user["id"])
    if (
        not record
        or not record.get("verified")
        or not record.get("reset_token_hash")
        or not hmac.compare_digest(_sha256(reset_token), str(record.get("reset_token_hash")))
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    if _parse_ts(record["expires_at"]) < _now():
        _invalidate(record["id"])
        raise HTTPException(status_code=400, detail="Reset token expired. Start again.")

    validate_password_policy(new_password)

    try:
        supabase.table("admin_users").update({"password_hash": hash_password(new_password)}).eq("id", user["id"]).execute()
    except Exception as e:
        logger.error(f"Password-reset update failed: {e}")
        raise HTTPException(status_code=500, detail="Could not update password. Try again.")

    # Single-use: consume this record and every other pending record for the user.
    try:
        supabase.table("admin_password_resets").update({"used": True}).eq("admin_user_id", user["id"]).eq("used", False).execute()
    except Exception as e:
        logger.error(f"Password-reset cleanup failed: {e}")

    try:
        _user_cache.invalidate(user["id"])
    except Exception as e:
        logger.warning(f"Could not invalidate user cache after password reset for user {user['id']}: {e}")
    reset_limiter.reset(f"pwd_reset_user:{username.lower()}")
    log_activity(user["username"], "password_reset_completed", "admin_user", user["id"], "Password changed via OTP reset")
    return {"ok": True, "message": "Password changed. Please sign in with your new password."}
