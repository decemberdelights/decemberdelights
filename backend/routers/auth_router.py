import os
from fastapi import APIRouter, Depends, Response, HTTPException, Cookie, Request
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db
from models import AdminUser
from schemas import AdminLogin
from auth import verify_password, create_token, decode_token
from security import login_limiter, get_client_ip

router = APIRouter()


@router.get("/api/auth/check")
def auth_check(request: Request, session: Optional[str] = Cookie(None), db: Session = Depends(get_db)):
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
    user = db.query(AdminUser).filter(AdminUser.id == int(payload.get("sub"))).first()
    if not user or not user.is_active:
        return {"authenticated": False}
    return {"authenticated": True, "role": user.role, "username": user.username}


@router.post("/api/auth/login")
def auth_login(request: Request, creds: AdminLogin, response: Response, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    rate_key = f"login:{client_ip}"
    login_limiter.check(rate_key)

    user = db.query(AdminUser).filter(AdminUser.username == creds.username).first()
    if not user or not verify_password(creds.password, user.password_hash):
        login_limiter.record(rate_key)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    token = create_token({"sub": str(user.id), "type": "admin", "role": user.role})
    response.set_cookie("session", token, httponly=True, samesite="none", max_age=86400, secure=True)
    return {"ok": True, "role": user.role, "username": user.username, "token": token}


@router.post("/api/auth/logout")
def auth_logout(response: Response):
    response.delete_cookie("session", samesite="none", secure=True)
    return {"ok": True}
