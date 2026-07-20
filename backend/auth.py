import logging
import os
import time
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
    logger.critical("JWT_SECRET environment variable is NOT SET. Server cannot start securely.")
    raise RuntimeError("JWT_SECRET environment variable is required")
if len(SECRET_KEY) < 32:
    logger.critical("JWT_SECRET is too short. Must be at least 32 characters for HS256 security.")
    raise RuntimeError("JWT_SECRET must be at least 32 characters")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 4

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

bearer_scheme = HTTPBearer(auto_error=False)


class UserCache:
    """In-memory cache for user lookups to avoid DB hit on every request."""
    def __init__(self, ttl_seconds: int = 120):
        self._cache: dict[int, tuple[float, dict]] = {}
        self._ttl = ttl_seconds

    def get(self, user_id: int):
        if user_id in self._cache:
            ts, user = self._cache[user_id]
            if time.time() - ts < self._ttl:
                return user
            del self._cache[user_id]
        return None

    def set(self, user_id: int, user: dict):
        self._cache[user_id] = (time.time(), user)

    def invalidate(self, user_id: int = None):
        if user_id:
            self._cache.pop(user_id, None)
        else:
            self._cache.clear()


_user_cache = UserCache(ttl_seconds=120)


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

    # Check cache first
    cached = _user_cache.get(user_id)
    if cached:
        if not cached.get("is_active", True):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
        return cached

    result = supabase.table("admin_users").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    user = result.data[0]
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    _user_cache.set(user_id, user)
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


_franchise_cache = UserCache(ttl_seconds=120)


def get_current_franchise(
    franchise_session: Optional[str] = Cookie(None),
) -> dict:
    if not franchise_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(franchise_session)
    if not payload or payload.get("type") != "franchise":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    try:
        app_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    cached = _franchise_cache.get(app_id)
    if cached:
        return cached

    result = supabase.table("franchise_applications").select("*").eq("id", app_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Application not found")
    app = result.data[0]
    _franchise_cache.set(app_id, app)
    return app
