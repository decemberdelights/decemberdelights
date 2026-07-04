import logging
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import AdminUser, FranchiseApplication

logger = logging.getLogger(__name__)

SECRET_KEY = os.environ.get("JWT_SECRET", "dev-secret")
if SECRET_KEY == "dev-secret":
    logger.warning(
        "JWT_SECRET environment variable is not set. Using development fallback secret. "
        "Add JWT_SECRET to your environment for production."
    )
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


def _extract_user(token: str, db: Session) -> AdminUser:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    if not payload or payload.get("type") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    user = db.query(AdminUser).filter(AdminUser.id == int(payload.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return user


def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Optional[str] = Cookie(None),
    request: Request = None,
    db: Session = Depends(get_db),
) -> AdminUser:
    token = None
    if credentials:
        token = credentials.credentials
    elif session:
        token = session
    return _extract_user(token, db)


def require_super_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
) -> AdminUser:
    token = None
    if credentials:
        token = credentials.credentials
    elif session:
        token = session
    user = _extract_user(token, db)
    if user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return user


def get_current_franchise(
    session: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
) -> FranchiseApplication:
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(session)
    if not payload or payload.get("type") != "franchise":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    app = db.query(FranchiseApplication).filter(FranchiseApplication.id == int(payload.get("sub"))).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Application not found")
    return app
