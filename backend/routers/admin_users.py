from fastapi import APIRouter, Depends, HTTPException
from supabase_client import supabase
from schemas import AdminLogin
from auth import require_super_admin, hash_password
from security import sanitize_input
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class AdminUserCreate(BaseModel):
    username: str
    password: str
    role: str = "admin"


class AdminUserUpdate(BaseModel):
    username: str = ""
    password: str = ""
    role: str = ""
    is_active: Optional[bool] = None


@router.get("/api/admin/users")
def get_admin_users(_=Depends(require_super_admin)):
    result = supabase.table("admin_users").select("*").execute()
    users = result.data or []
    return [
        {
            "id": u["id"],
            "username": u["username"],
            "role": u["role"],
            "is_active": u.get("is_active", True),
            "created_at": str(u.get("created_at", "")),
        }
        for u in users
    ]


@router.post("/api/admin/users")
def create_admin_user(data: AdminUserCreate, _=Depends(require_super_admin)):
    data.username = sanitize_input(data.username, 100)
    if not data.username or len(data.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if not data.password or len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = supabase.table("admin_users").select("*").eq("username", data.username).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Username already exists")
    if data.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if data.role == "admin":
        admin_count = supabase.table("admin_users").select("id", count="exact").eq("role", "admin").execute().count or 0
        if admin_count >= 3:
            raise HTTPException(status_code=400, detail="Maximum 3 normal admins allowed (4 total including super admin)")

    result = supabase.table("admin_users").insert({
        "username": data.username,
        "password_hash": hash_password(data.password),
        "role": data.role,
        "is_active": True,
    }).execute()
    user = result.data[0]
    return {"id": user["id"], "username": user["username"], "role": user["role"]}


@router.put("/api/admin/users/{user_id}")
def update_admin_user(user_id: int, data: AdminUserUpdate, _=Depends(require_super_admin)):
    existing = supabase.table("admin_users").select("*").eq("id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = existing.data[0]

    update_data = {}
    if data.username:
        data.username = sanitize_input(data.username, 100)
        if len(data.username) < 3:
            raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
        username_check = supabase.table("admin_users").select("*").eq("username", data.username).neq("id", user_id).execute()
        if username_check.data:
            raise HTTPException(status_code=400, detail="Username already exists")
        update_data["username"] = data.username

    if data.password:
        if len(data.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        update_data["password_hash"] = hash_password(data.password)

    if data.role and data.role in ("admin", "super_admin"):
        if user.get("role") == "super_admin" and data.role != "super_admin":
            count = supabase.table("admin_users").select("id", count="exact").eq("role", "super_admin").execute().count or 0
            if count <= 1:
                raise HTTPException(status_code=400, detail="Cannot remove the last super admin")
            admin_count = supabase.table("admin_users").select("id", count="exact").eq("role", "admin").execute().count or 0
            if admin_count >= 3:
                raise HTTPException(status_code=400, detail="Maximum 3 normal admins allowed. Cannot demote.")
        update_data["role"] = data.role

    if data.is_active is not None:
        update_data["is_active"] = data.is_active

    if update_data:
        supabase.table("admin_users").update(update_data).eq("id", user_id).execute()
    return {"ok": True}


@router.delete("/api/admin/users/{user_id}")
def delete_admin_user(user_id: int, _=Depends(require_super_admin)):
    existing = supabase.table("admin_users").select("*").eq("id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = existing.data[0]
    if user.get("role") == "super_admin":
        count = supabase.table("admin_users").select("id", count="exact").eq("role", "super_admin").execute().count or 0
        if count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last super admin")
    supabase.table("admin_users").delete().eq("id", user_id).execute()
    return {"ok": True}
