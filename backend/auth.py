import logging
import os
from dotenv import load_dotenv

_env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
if os.path.exists(_env_path):
    load_dotenv(_env_path)

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase_client import supabase
from store import KVStore

logger = logging.getLogger(__name__)

# Placeholder fragments that must never be used as a signing secret.
_JWT_SECRET_PLACEHOLDERS = ("CHANGE_ME", "PASTE_YOUR", "EXAMPLE")


def _is_repeating_chars(value: str) -> bool:
    """True for degenerate secrets like 'aaaa...' or 'abcdabcdabcd...'."""
    if len(set(value)) <= 1:
        return True
    n = len(value)
    # A "random" secret that is just a short unit repeated is still weak.
    for unit_len in range(1, min(8, n) + 1):
        if n % unit_len == 0 and value[:unit_len] * (n // unit_len) == value:
            return True
    return False


def validate_jwt_secret(secret: Optional[str]) -> str:
    """Validate JWT_SECRET at startup. Raises RuntimeError instead of ever
    falling back to a padded/placeholder value (a guessable signing key
    lets anyone mint admin tokens)."""
    if not secret:
        logger.critical("JWT_SECRET environment variable is NOT SET. Refusing to start with insecure fallback.")
        raise RuntimeError("JWT_SECRET must be set. Aborting startup.")
    if len(secret) < 32:
        logger.critical(f"JWT_SECRET is too short ({len(secret)} chars, minimum 32). Refusing to start.")
        raise RuntimeError("JWT_SECRET must be at least 32 characters long. Aborting startup.")
    upper = secret.upper()
    for fragment in _JWT_SECRET_PLACEHOLDERS:
        if fragment in upper:
            logger.critical(f"JWT_SECRET looks like a placeholder (contains '{fragment}'). Refusing to start.")
            raise RuntimeError(
                "JWT_SECRET is a placeholder value. Generate one with: "
                "python3 -c \"import secrets; print(secrets.token_hex(32))\""
            )
    if _is_repeating_chars(secret):
        logger.critical("JWT_SECRET is a repeating character/pattern value. Refusing to start.")
        raise RuntimeError("JWT_SECRET must be a random value, not a repeating pattern. Aborting startup.")
    return secret


SECRET_KEY = validate_jwt_secret(os.environ.get("JWT_SECRET", ""))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 4
# Single source of truth for session cookie lifetime — must match the token TTL
# (a 4h token in a 24h cookie = silently logged-out users mid-session).
SESSION_COOKIE_MAX_AGE = ACCESS_TOKEN_EXPIRE_HOURS * 3600

bearer_scheme = HTTPBearer(auto_error=False)

_user_cache = KVStore(namespace="user_cache", default_ttl=120)
_franchise_cache = KVStore(namespace="franchise_cache", default_ttl=120)
# Remove any full application records left by older versions of the local cache.
_franchise_cache.invalidate()


def session_safe_user(user: dict) -> dict:
    """Return only the non-secret columns of an admin_users row.

    The user cache is persisted into the local SQLite file — caching the
    full row would leak password_hash into the DB (this already happened
    via a distributed archive). Authorization only needs these fields.
    """
    safe_keys = ("id", "username", "role", "is_active", "created_at")
    return {k: user[k] for k in safe_keys if k in user}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


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

    cached = _user_cache.get(str(user_id))
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

    # Never persist password_hash into the (SQLite-backed) cache.
    _user_cache.set(str(user_id), session_safe_user(user))
    return session_safe_user(user)


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

    result = supabase.table("franchise_applications").select("*").eq("id", app_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Application not found")
    return result.data[0]
