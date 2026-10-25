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
from typing import Optional, List
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024


def _validated_weight_grams(value: str) -> int:
    try:
        weight_grams = int(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Package weight must be a whole number of grams") from None
    if weight_grams <= 0 or weight_grams > 1_000_000:
        raise HTTPException(status_code=400, detail="Package weight must be between 1 and 1,000,000 grams")
    return weight_grams


def _sanitize_filename(name: str) -> str:
    name = re.sub(r'[^\w\s-]', '', name)
    name = re.sub(r'\s+', '_', name.strip())
    return name[:60] if name else "product"


async def save_product_image(file: Optional[UploadFile], product_name: str) -> str:
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

    # Hybrid: local disk first (saves Supabase free-tier 1GB storage + bandwidth),
    # Supabase fallback for backward-compat / STORAGE_MODE=supabase.
    if STORAGE_MODE in ("hybrid", "local"):
        try:
            # Blocking disk write in an async handler — run in a worker thread.
            return await asyncio.to_thread(save_public_image_local, content, file.filename, "products")
        except Exception as e:
            logger.warning(f"Local save failed, falling back to Supabase: {e}")
            if STORAGE_MODE == "local":
                raise
    filename = f"{_sanitize_filename(product_name)}_{uuid.uuid4().hex[:8]}{ext}"

    def _upload():
        supabase.storage.from_("product-images").upload(filename, content, {"content-type": file.content_type})
        return supabase.storage.from_("product-images").get_public_url(filename)

    return await asyncio.to_thread(_upload)


def _delete_product_image(url: str):
    if not url:
        return
    if is_local_url(url):
        delete_local_file(url)
        return
    if "/product-images/" in url:
        try:
            supabase.storage.from_("product-images").remove([url.split("/")[-1]])
        except Exception as e:
            logger.warning(f"Failed to delete product image {url.split('/')[-1]} from storage: {e}")


MAX_EXTRA_IMAGES = 3  # 1 main + 3 extra = 4 total visible to user


def _parse_extra(value) -> list:
    """extra_images may be a JSON string, a list, or missing (old rows)."""
    if not value:
        return []
    if isinstance(value, list):
        return [u for u in value if isinstance(u, str) and u][:MAX_EXTRA_IMAGES]
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [u for u in parsed if isinstance(u, str) and u][:MAX_EXTRA_IMAGES]
    except (json.JSONDecodeError, TypeError):
        pass
    return []


async def _save_extra_images(files: Optional[List[UploadFile]], product_name: str) -> list:
    urls = []
    for f in (files or [])[:MAX_EXTRA_IMAGES]:
        if f and f.filename:
            urls.append(await save_product_image(f, product_name))
    return urls


@router.get("/api/products")
def get_products(page: int = 1, limit: int = 100):
    page = max(page, 1)
    limit = min(max(limit, 1), 100)
    cache_key = f"products:{page}:{limit}"
    cached = cache_get(cache_key)
    if cached is not None:
        response = JSONResponse(content=cached)
        response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
        response.headers["X-Cache"] = "HIT"
        return response
    offset = (page - 1) * limit
    result = supabase.table("products").select("*").eq("is_active", True).order("sort_order").range(offset, offset + limit - 1).execute()
    data = result.data or []
    cache_set(cache_key, data, ttl=120)
    response = JSONResponse(content=data)
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    response.headers["X-Cache"] = "MISS"
    return response


@router.get("/api/products/categories")
def get_product_categories():
    cached = cache_get("product_cats")
    if cached is not None:
        response = JSONResponse(content=cached)
        response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
        response.headers["X-Cache"] = "HIT"
        return response
    result = supabase.table("products").select("category").eq("is_active", True).execute()
    cats = list(set(r["category"] for r in (result.data or []) if r["category"]))
    cache_set("product_cats", cats, ttl=300)
    response = JSONResponse(content=cats)
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    response.headers["X-Cache"] = "MISS"
    return response


@router.get("/api/admin/products")
def get_admin_products(_=Depends(get_current_admin)):
    try:
        result = supabase.table("products").select("*").order("sort_order").execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to fetch admin products: {e}")
        return []


@router.post("/api/admin/products")
async def create_product(
    request: Request,
    name: str = Form(""),
    description: str = Form(""),
    price: str = Form("0"),
    original_price: str = Form("0"),
    weight_grams: str = Form("250"),
    category: str = Form(""),
    stock: str = Form("0"),
    is_active: str = Form("true"),
    offer: str = Form(""),
    sort_order: str = Form("0"),
    image: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None),
    admin=Depends(get_current_admin),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    validate_csrf(request)
    weight_grams_val = _validated_weight_grams(weight_grams)
    image_url = await save_product_image(image, name) if image else ""
    extra_urls = await _save_extra_images(images, name)
    name = sanitize_input(name, 200)
    description = sanitize_input(description, 2000)
    category = sanitize_input(category, 100)
    offer = sanitize_input(offer, 200)
    try:
        price_val = float(price) if price else 0
    except (ValueError, TypeError):
        price_val = 0
    if price_val < 0:
        price_val = 0
    try:
        orig_price_val = float(original_price) if original_price else 0
    except (ValueError, TypeError):
        orig_price_val = 0
    if orig_price_val < 0:
        orig_price_val = 0
    try:
        stock_val = int(stock)
    except (ValueError, TypeError):
        stock_val = 0
    if stock_val < 0:
        stock_val = 0
    try:
        sort_val = int(sort_order)
    except (ValueError, TypeError):
        sort_val = 0
    data = {
        "name": name,
        "description": description,
        "price": price_val,
        "original_price": orig_price_val,
        "weight_grams": weight_grams_val,
        "category": category,
        "image_url": image_url,
        "extra_images": json.dumps(extra_urls),
        "stock": stock_val,
        "is_active": is_active.lower() == "true",
        "offer": offer,
        "sort_order": sort_val,
    }
    result = await asyncio.to_thread(lambda: supabase.table("products").insert(data).execute())
    log_activity_background(background_tasks, admin.get("username", ""), "create", "product", result.data[0]["id"], f"Created product: {name}")
    cache_invalidate("products")
    cache_invalidate("product_cats")
    return result.data[0]


@router.put("/api/admin/products/{product_id}")
async def update_product(
    product_id: int,
    request: Request,
    name: str = Form(""),
    description: str = Form(""),
    price: str = Form("0"),
    original_price: str = Form("0"),
    weight_grams: str = Form("250"),
    category: str = Form(""),
    stock: str = Form("0"),
    is_active: str = Form("true"),
    offer: str = Form(""),
    sort_order: str = Form("0"),
    image_url: str = Form(""),
    keep_images: str = Form(""),
    image: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None),
    admin=Depends(get_current_admin),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    validate_csrf(request)
    weight_grams_val = _validated_weight_grams(weight_grams)
    existing = await asyncio.to_thread(lambda: supabase.table("products").select("*").eq("id", product_id).execute())
    if not existing.data:
        raise HTTPException(status_code=404, detail="Product not found")

    old_url = existing.data[0].get("image_url", "")
    old_extra = _parse_extra(existing.data[0].get("extra_images"))
    if image and image.filename:
        new_url = await save_product_image(image, name or existing.data[0]["name"])
        if new_url:
            if old_url and old_url != new_url:
                await asyncio.to_thread(_delete_product_image, old_url)
            image_url = new_url
    elif not image_url and old_url:
        # Admin pressed × on the main photo without uploading a replacement —
        # delete the orphan file too, DB row is already cleared below.
        await asyncio.to_thread(_delete_product_image, old_url)

    # Merge kept existing extras + newly uploaded (cap 3 extras = 4 total).
    kept = [u for u in _parse_extra(keep_images) if u in old_extra][:MAX_EXTRA_IMAGES]
    new_extra = await _save_extra_images(images, name or existing.data[0]["name"])
    final_extra = (kept + new_extra)[:MAX_EXTRA_IMAGES]
    for removed in [u for u in old_extra if u not in kept]:
        await asyncio.to_thread(_delete_product_image, removed)

    name = sanitize_input(name, 200)
    description = sanitize_input(description, 2000)
    category = sanitize_input(category, 100)
    offer = sanitize_input(offer, 200)
    try:
        price_val = float(price) if price else 0
    except (ValueError, TypeError):
        price_val = 0
    if price_val < 0:
        price_val = 0
    try:
        orig_price_val = float(original_price) if original_price else 0
    except (ValueError, TypeError):
        orig_price_val = 0
    if orig_price_val < 0:
        orig_price_val = 0
    try:
        stock_val = int(stock)
    except (ValueError, TypeError):
        stock_val = 0
    if stock_val < 0:
        stock_val = 0
    try:
        sort_val = int(sort_order)
    except (ValueError, TypeError):
        sort_val = 0
    data = {
        "name": name,
        "description": description,
        "price": price_val,
        "original_price": orig_price_val,
        "weight_grams": weight_grams_val,
        "category": category,
        "image_url": image_url,
        "extra_images": json.dumps(final_extra),
        "stock": stock_val,
        "is_active": is_active.lower() == "true",
        "offer": offer,
        "sort_order": sort_val,
    }
    await asyncio.to_thread(lambda: supabase.table("products").update(data).eq("id", product_id).execute())
    log_activity_background(background_tasks, admin.get("username", ""), "update", "product", product_id, f"Updated product: {name}")
    cache_invalidate("products")
    cache_invalidate("product_cats")
    return data


@router.delete("/api/admin/products/{product_id}")
def delete_product(
    product_id: int,
    request: Request,
    admin=Depends(require_super_admin),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    validate_csrf(request)
    existing = supabase.table("products").select("*").eq("id", product_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Product not found")
    _delete_product_image(existing.data[0].get("image_url", ""))
    for u in _parse_extra(existing.data[0].get("extra_images")):
        _delete_product_image(u)
    supabase.table("products").delete().eq("id", product_id).execute()
    log_activity_background(background_tasks, admin.get("username", ""), "delete", "product", product_id, f"Deleted product: {existing.data[0].get('name', '')}")
    cache_invalidate("products")
    cache_invalidate("product_cats")
    return {"ok": True}
