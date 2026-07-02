from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import AdminUser
from schemas import AdminLogin
from auth import require_super_admin, hash_password
from security import sanitize_input
from typing import List
from pydantic import BaseModel

router = APIRouter()


class AdminUserCreate(BaseModel):
    username: str
    password: str
    role: str = "admin"


from typing import Optional

class AdminUserUpdate(BaseModel):
    username: str = ""
    password: str = ""
    role: str = ""
    is_active: Optional[bool] = None


class AdminUserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: str = ""

    class Config:
        from_attributes = True


@router.get("/api/admin/users")
def get_admin_users(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    users = db.query(AdminUser).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": str(u.created_at) if u.created_at else "",
        }
        for u in users
    ]


@router.post("/api/admin/users")
def create_admin_user(data: AdminUserCreate, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    data.username = sanitize_input(data.username, 100)
    if not data.username or len(data.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if not data.password or len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = db.query(AdminUser).filter(AdminUser.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    if data.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if data.role == "admin":
        admin_count = db.query(AdminUser).filter(AdminUser.role == "admin").count()
        if admin_count >= 3:
            raise HTTPException(status_code=400, detail="Maximum 3 normal admins allowed (4 total including super admin)")
    user = AdminUser(
        username=data.username,
        password_hash=hash_password(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "role": user.role}


@router.put("/api/admin/users/{user_id}")
def update_admin_user(user_id: int, data: AdminUserUpdate, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.username:
        data.username = sanitize_input(data.username, 100)
        if len(data.username) < 3:
            raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
        existing = db.query(AdminUser).filter(AdminUser.username == data.username, AdminUser.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        user.username = data.username
    if data.password:
        if len(data.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        user.password_hash = hash_password(data.password)
    if data.role and data.role in ("admin", "super_admin"):
        if user.role == "super_admin" and data.role != "super_admin":
            count = db.query(AdminUser).filter(AdminUser.role == "super_admin").count()
            if count <= 1:
                raise HTTPException(status_code=400, detail="Cannot remove the last super admin")
            admin_count = db.query(AdminUser).filter(AdminUser.role == "admin").count()
            if admin_count >= 3:
                raise HTTPException(status_code=400, detail="Maximum 3 normal admins allowed. Cannot demote.")
        user.role = data.role
    user.is_active = data.is_active if data.is_active is not None else user.is_active
    db.commit()
    return {"ok": True}


@router.delete("/api/admin/users/{user_id}")
def delete_admin_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "super_admin":
        count = db.query(AdminUser).filter(AdminUser.role == "super_admin").count()
        if count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last super admin")
    db.delete(user)
    db.commit()
    return {"ok": True}
