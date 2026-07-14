import logging
import os
from dotenv import load_dotenv

_env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
if os.path.exists(_env_path):
    load_dotenv(_env_path)

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase_client import supabase

logger = logging.getLogger(__name__)

SECRET_KEY = os.environ.get("JWT_SECRET", "")
if not SECRET_KEY:
    if os.environ.get("ENV") == "production":
        logger.critical("JWT_SECRET environment variable is NOT SET in production. Server cannot start securely.")
        raise RuntimeError("JWT_SECRET environment variable is required in production")
    SECRET_KEY = "dev-secret-only-not-for-production"
    logger.warning("JWT_SECRET not set. Using dev fallback — NOT safe for production.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def _extract_user(token: str) -> dict:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    if not payload or payload.get("type") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    try:
        user_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = supabase.table("admin_users").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    user = result.data[0]
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return user


def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Optional[str] = Cookie(None),
) -> dict:
    token = None
    if credentials:
        token = credentials.credentials
    elif session:
        token = session
    return _extract_user(token)


def require_super_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Optional[str] = Cookie(None),
) -> dict:
    token = None
    if credentials:
        token = credentials.credentials
    elif session:
        token = session
    user = _extract_user(token)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return user


def get_current_franchise(
    session: Optional[str] = Cookie(None),
) -> dict:
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(session)
    if not payload or payload.get("type") != "franchise":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    try:
        app_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = supabase.table("franchise_applications").select("*").eq("id", app_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Application not found")
    return result.data[0]
