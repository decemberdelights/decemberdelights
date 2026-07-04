import logging
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Cookie, Depends, HTTPException, Request, status
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


def get_token_from_request(request: Request, session: Optional[str] = Cookie(None)) -> Optional[str]:
    if session:
        return session
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def get_current_admin(
    request: Request,
    db: Session = Depends(get_db),
    session: Optional[str] = Cookie(None),
) -> AdminUser:
    token = get_token_from_request(request, session)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    if not payload or payload.get("type") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    user = db.query(AdminUser).filter(AdminUser.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return user


def require_super_admin(
    request: Request,
    db: Session = Depends(get_db),
    session: Optional[str] = Cookie(None),
) -> AdminUser:
    user = get_current_admin(request, db, session)
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
    app = db.query(FranchiseApplication).filter(FranchiseApplication.id == payload.get("sub")).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Application not found")
    return app
