import os
import uuid
import re
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from supabase_client import supabase
from auth import get_current_admin, require_super_admin
from activity import log_activity, log_activity_background
from security import sanitize_input
from csrf import validate_csrf
from cache import cache_get, cache_set, cache_invalidate
from local_storage import STORAGE_MODE, save_public_image as save_public_image_local, delete_local_file, is_local_url
from typing import Optional
import logging

logger = logging.getLogger(__name__)
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

    if STORAGE_MODE in ("hybrid", "local"):
        try:
            # Blocking disk write in an async handler — run in a worker thread.
            return await asyncio.to_thread(save_public_image_local, content, file.filename, "menu")
        except Exception as e:
            logger.warning(f"Local menu save failed, Supabase fallback: {e}")
            if STORAGE_MODE == "local":
                raise
    filename = f"{_sanitize_filename(item_name)}_{uuid.uuid4().hex[:8]}{ext}"

    def _upload():
        supabase.storage.from_("menu-images").upload(filename, content, {"content-type": file.content_type})
        return supabase.storage.from_("menu-images").get_public_url(filename)

    return await asyncio.to_thread(_upload)


def _delete_menu_image(url: str):
    if not url:
        return
    if is_local_url(url):
        delete_local_file(url)
        return
    if "/menu-images/" in url:
        try:
            supabase.storage.from_("menu-images").remove([url.split("/")[-1]])
        except Exception as e:
            logger.warning(f"Failed to delete menu image {url.split('/')[-1]} from storage: {e}")


@router.get("/api/menu")
def get_menu(page: int = 1, limit: int = 100):
    page = max(page, 1)
    limit = min(max(limit, 1), 100)
    cache_key = f"menu:{page}:{limit}"
    cached = cache_get(cache_key)
    if cached is not None:
        response = JSONResponse(content=cached)
        response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
        response.headers["X-Cache"] = "HIT"
        return response
    offset = (page - 1) * limit
    result = supabase.table("menu_items").select("*").eq("is_active", True).order("sort_order").range(offset, offset + limit - 1).execute()
    items = result.data or []
    menu = {}
    for item in items:
        cat = item["category"]
        if cat not in menu:
            menu[cat] = []
        menu[cat].append(item)
    cache_set(cache_key, menu, ttl=120)
    response = JSONResponse(content=menu)
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    response.headers["X-Cache"] = "MISS"
    return response


@router.get("/api/menu/all")
def get_all_menu(_=Depends(get_current_admin)):
    try:
        result = supabase.table("menu_items").select("*").order("sort_order").execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to fetch all menu items: {e}")
        return []


@router.post("/api/admin/menu")
async def create_menu(
    request: Request,
    name: str = Form(""),
    category: str = Form(""),
    description: str = Form(""),
    price: str = Form(""),
    is_active: str = Form("true"),
    sort_order: str = Form("0"),
    image: Optional[UploadFile] = File(None),
    admin=Depends(get_current_admin),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    validate_csrf(request)
    image_url = await save_menu_image(image, name) if image else ""
    name = sanitize_input(name, 200)
    category = sanitize_input(category, 100)
    description = sanitize_input(description, 2000)
    try:
        sort_val = int(sort_order)
    except (ValueError, TypeError):
        sort_val = 0
    data = {
        "name": name,
        "category": category,
        "description": description,
        "price": price,
        "image_url": image_url,
        "is_active": is_active.lower() == "true",
        "sort_order": sort_val,
    }
    result = await asyncio.to_thread(lambda: supabase.table("menu_items").insert(data).execute())
    log_activity_background(background_tasks, admin.get("username", ""), "create", "menu", result.data[0]["id"], f"Created menu item: {name}")
    cache_invalidate("menu")
    return result.data[0]


@router.put("/api/admin/menu/{item_id}")
async def update_menu(
    item_id: int,
    request: Request,
    name: str = Form(""),
    category: str = Form(""),
    description: str = Form(""),
    price: str = Form(""),
    is_active: str = Form("true"),
    sort_order: str = Form("0"),
    image_url: str = Form(""),
    image: Optional[UploadFile] = File(None),
    admin=Depends(get_current_admin),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    validate_csrf(request)
    existing = await asyncio.to_thread(lambda: supabase.table("menu_items").select("*").eq("id", item_id).execute())
    if not existing.data:
        raise HTTPException(status_code=404, detail="Menu item not found")

    old_url = existing.data[0].get("image_url", "")
    if image and image.filename:
        new_url = await save_menu_image(image, name or existing.data[0]["name"])
        if new_url:
            if old_url and old_url != new_url:
                await asyncio.to_thread(_delete_menu_image, old_url)
            image_url = new_url

    name = sanitize_input(name, 200)
    category = sanitize_input(category, 100)
    description = sanitize_input(description, 2000)
    try:
        sort_val = int(sort_order)
    except (ValueError, TypeError):
        sort_val = 0
    data = {
        "name": name,
        "category": category,
        "description": description,
        "price": price,
        "image_url": image_url,
        "is_active": is_active.lower() == "true",
        "sort_order": sort_val,
    }
    await asyncio.to_thread(lambda: supabase.table("menu_items").update(data).eq("id", item_id).execute())
    log_activity_background(background_tasks, admin.get("username", ""), "update", "menu", item_id, f"Updated menu item: {name}")
    cache_invalidate("menu")
    return data


@router.delete("/api/admin/menu/{item_id}")
def delete_menu(
    item_id: int,
    request: Request,
    admin=Depends(require_super_admin),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    validate_csrf(request)
    existing = supabase.table("menu_items").select("*").eq("id", item_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Menu item not found")
    _delete_menu_image(existing.data[0].get("image_url", ""))
    supabase.table("menu_items").delete().eq("id", item_id).execute()
    log_activity_background(background_tasks, admin.get("username", ""), "delete", "menu", item_id, f"Deleted menu item: {existing.data[0].get('name', '')}")
    cache_invalidate("menu")
    return {"ok": True}
