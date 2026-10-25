from fastapi import APIRouter, Depends, Response, HTTPException, Cookie, Request
from typing import Optional
from supabase_client import supabase
from auth import verify_password, create_token, decode_token, _user_cache, session_safe_user, SESSION_COOKIE_MAX_AGE
from schemas import AdminLogin
from security import login_limiter, get_client_ip
from csrf import generate_csrf_token, set_csrf_cookie
import logging
import bcrypt

logger = logging.getLogger(__name__)
router = APIRouter()

# Fixed dummy hash used to keep login timing constant for unknown usernames
# (user-enumeration timing leak). bcrypt.checkpw against it costs the same as
# a real hash comparison; value is a hash of a throwaway string.
_DUMMY_PASSWORD_HASH = "$2b$12$hnr.N.8nwqbLAXI5GzXML.dWgEGKgMKRG7UCEbu6wYFion5MKmGrC"


@router.get("/api/auth/check")
def auth_check(request: Request, session: Optional[str] = Cookie(None)):
    token = session
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        return {"authenticated": False}
    payload = decode_token(token)
    if not payload or payload.get("type") != "admin":
        return {"authenticated": False}
    try:
        user_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        return {"authenticated": False}

    cached = _user_cache.get(user_id)
    if cached:
        if not cached.get("is_active", True):
            return {"authenticated": False}
        return {"authenticated": True, "role": cached["role"], "username": cached["username"]}

    result = supabase.table("admin_users").select("*").eq("id", user_id).execute()
    if not result.data or not result.data[0].get("is_active", True):
        return {"authenticated": False}
    user = session_safe_user(result.data[0])
    _user_cache.set(user_id, user)
    return {"authenticated": True, "role": user["role"], "username": user["username"]}


@router.post("/api/auth/login")
def auth_login(request: Request, creds: AdminLogin, response: Response):
    client_ip = get_client_ip(request)
    rate_key = f"login:{client_ip}"
    login_limiter.check(rate_key)

    username = creds.username
    password = creds.password

    if len(password) > 72:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    result = supabase.table("admin_users").select("*").eq("username", username).execute()
    if not result.data:
        # Burn the same bcrypt time as a real comparison so response timing
        # does not reveal whether the username exists.
        verify_password(password, _DUMMY_PASSWORD_HASH)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = result.data[0]
    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account disabled")

    login_limiter.reset(rate_key)

    token = create_token({"sub": str(user["id"]), "type": "admin", "role": user["role"]})
    # Cookie max-age must match the JWT TTL (SESSION_COOKIE_MAX_AGE = 4h),
    # not the old 24h — mismatch logged users out at 4h with a live cookie.
    response.set_cookie("session", token, httponly=True, samesite="lax", max_age=SESSION_COOKIE_MAX_AGE, secure=True, path="/")
    csrf_token = generate_csrf_token()
    set_csrf_cookie(response, csrf_token, secure=True)
    return {"ok": True, "role": user["role"], "username": user["username"]}


@router.post("/api/auth/logout")
def auth_logout(response: Response):
    response.delete_cookie("session", samesite="lax", secure=True, path="/")
    response.delete_cookie("csrf_token", samesite="lax", secure=True, path="/")
    return {"ok": True}
