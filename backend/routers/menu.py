import os
import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from supabase_client import supabase
from auth import get_current_admin, require_super_admin
from typing import List, Optional

router = APIRouter()

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024


def _sanitize_filename(name: str) -> str:
    name = re.sub(r'[^\w\s-]', '', name)
    name = re.sub(r'\s+', '_', name.strip())
    return name[:60] if name else "menu"


async def save_menu_image(file: Optional[UploadFile], item_name: str) -> str:
    if not file or not file.filename:
        return ""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXT:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    if file.content_type and file.content_type not in ALLOWED_IMAGE_MIME:
        raise HTTPException(status_code=400, detail=f"Content type {file.content_type} not allowed")

    filename = f"{_sanitize_filename(item_name)}_{uuid.uuid4().hex[:8]}{ext}"
    supabase.storage.from_("menu-images").upload(filename, content, {"content-type": file.content_type})
    public_url = supabase.storage.from_("menu-images").get_public_url(filename)
    return public_url


@router.get("/api/menu")
def get_menu():
    result = supabase.table("menu_items").select("*").eq("is_active", True).order("sort_order").execute()
    items = result.data or []
    menu = {}
    for item in items:
        cat = item["category"]
        if cat not in menu:
            menu[cat] = []
        menu[cat].append(item)
    return menu


@router.get("/api/menu/all")
def get_all_menu(_=Depends(get_current_admin)):
    result = supabase.table("menu_items").select("*").order("sort_order").execute()
    return result.data or []


@router.post("/api/admin/menu")
async def create_menu(
    name: str = Form(""),
    category: str = Form(""),
    description: str = Form(""),
    price: str = Form(""),
    is_active: str = Form("true"),
    sort_order: str = Form("0"),
    image: Optional[UploadFile] = File(None),
    _=Depends(get_current_admin),
):
    image_url = await save_menu_image(image, name) if image else ""
    data = {
        "name": name,
        "category": category,
        "description": description,
        "price": price,
        "image_url": image_url,
        "is_active": is_active.lower() == "true",
        "sort_order": int(sort_order) if sort_order.isdigit() else 0,
    }
    result = supabase.table("menu_items").insert(data).execute()
    return {"id": result.data[0]["id"]}


@router.put("/api/admin/menu/{item_id}")
async def update_menu(
    item_id: int,
    name: str = Form(""),
    category: str = Form(""),
    description: str = Form(""),
    price: str = Form(""),
    is_active: str = Form("true"),
    sort_order: str = Form("0"),
    image_url: str = Form(""),
    image: Optional[UploadFile] = File(None),
    _=Depends(get_current_admin),
):
    existing = supabase.table("menu_items").select("*").eq("id", item_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Menu item not found")

    if image and image.filename:
        new_url = await save_menu_image(image, name or existing.data[0]["name"])
        if new_url:
            image_url = new_url

    data = {
        "name": name,
        "category": category,
        "description": description,
        "price": price,
        "image_url": image_url,
        "is_active": is_active.lower() == "true",
        "sort_order": int(sort_order) if sort_order.isdigit() else 0,
    }
    supabase.table("menu_items").update(data).eq("id", item_id).execute()
    return {"ok": True}


@router.delete("/api/admin/menu/{item_id}")
def delete_menu(item_id: int, _=Depends(require_super_admin)):
    existing = supabase.table("menu_items").select("*").eq("id", item_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Menu item not found")
    supabase.table("menu_items").delete().eq("id", item_id).execute()
    return {"ok": True}
