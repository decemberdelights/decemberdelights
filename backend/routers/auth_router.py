from fastapi import APIRouter, Depends, Response, HTTPException, Cookie, Request
from typing import Optional
from supabase_client import supabase
from auth import verify_password, create_token, decode_token
from security import login_limiter, get_client_ip
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


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
    result = supabase.table("admin_users").select("*").eq("id", user_id).execute()
    if not result.data or not result.data[0].get("is_active", True):
        return {"authenticated": False}
    user = result.data[0]
    return {"authenticated": True, "role": user["role"], "username": user["username"]}


@router.post("/api/auth/login")
def auth_login(request: Request, creds: dict, response: Response):
    client_ip = get_client_ip(request)
    rate_key = f"login:{client_ip}"
    login_limiter.check(rate_key)

    username = creds.get("username", "")
    password = creds.get("password", "")

    result = supabase.table("admin_users").select("*").eq("username", username).execute()
    if not result.data:
        login_limiter.record(rate_key)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = result.data[0]
    if not verify_password(password, user["password_hash"]):
        login_limiter.record(rate_key)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account disabled")

    login_limiter.reset(rate_key)

    token = create_token({"sub": str(user["id"]), "type": "admin", "role": user["role"]})
    response.set_cookie("session", token, httponly=True, samesite="none", max_age=86400, secure=True)
    return {"ok": True, "role": user["role"], "username": user["username"], "token": token}


@router.post("/api/auth/logout")
def auth_logout(response: Response):
    response.delete_cookie("session", samesite="none", secure=True)
    return {"ok": True}
