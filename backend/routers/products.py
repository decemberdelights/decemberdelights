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

    filename = f"{_sanitize_filename(product_name)}_{uuid.uuid4().hex[:8]}{ext}"
    supabase.storage.from_("product-images").upload(filename, content, {"content-type": file.content_type})
    public_url = supabase.storage.from_("product-images").get_public_url(filename)
    return public_url


@router.get("/api/products")
def get_products():
    result = supabase.table("products").select("*").eq("is_active", True).order("sort_order").execute()
    return result.data or []


@router.get("/api/products/categories")
def get_product_categories():
    result = supabase.table("products").select("category").eq("is_active", True).execute()
    cats = list(set(r["category"] for r in (result.data or []) if r["category"]))
    return cats


@router.get("/api/admin/products")
def get_admin_products(_=Depends(get_current_admin)):
    result = supabase.table("products").select("*").order("sort_order").execute()
    return result.data or []


@router.post("/api/admin/products")
async def create_product(
    name: str = Form(""),
    description: str = Form(""),
    price: str = Form("0"),
    original_price: str = Form("0"),
    category: str = Form(""),
    stock: str = Form("0"),
    is_active: str = Form("true"),
    offer: str = Form(""),
    sort_order: str = Form("0"),
    image: Optional[UploadFile] = File(None),
    _=Depends(get_current_admin),
):
    image_url = await save_product_image(image, name) if image else ""
    data = {
        "name": name,
        "description": description,
        "price": float(price) if price else 0,
        "original_price": float(original_price) if original_price else 0,
        "category": category,
        "image_url": image_url,
        "stock": int(stock) if stock.isdigit() else 0,
        "is_active": is_active.lower() == "true",
        "offer": offer,
        "sort_order": int(sort_order) if sort_order.isdigit() else 0,
    }
    result = supabase.table("products").insert(data).execute()
    return {"id": result.data[0]["id"]}


@router.put("/api/admin/products/{product_id}")
async def update_product(
    product_id: int,
    name: str = Form(""),
    description: str = Form(""),
    price: str = Form("0"),
    original_price: str = Form("0"),
    category: str = Form(""),
    stock: str = Form("0"),
    is_active: str = Form("true"),
    offer: str = Form(""),
    sort_order: str = Form("0"),
    image_url: str = Form(""),
    image: Optional[UploadFile] = File(None),
    _=Depends(get_current_admin),
):
    existing = supabase.table("products").select("*").eq("id", product_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Product not found")

    if image and image.filename:
        new_url = await save_product_image(image, name or existing.data[0]["name"])
        if new_url:
            image_url = new_url

    data = {
        "name": name,
        "description": description,
        "price": float(price) if price else 0,
        "original_price": float(original_price) if original_price else 0,
        "category": category,
        "image_url": image_url,
        "stock": int(stock) if stock.isdigit() else 0,
        "is_active": is_active.lower() == "true",
        "offer": offer,
        "sort_order": int(sort_order) if sort_order.isdigit() else 0,
    }
    supabase.table("products").update(data).eq("id", product_id).execute()
    return {"ok": True}


@router.delete("/api/admin/products/{product_id}")
def delete_product(product_id: int, _=Depends(require_super_admin)):
    existing = supabase.table("products").select("*").eq("id", product_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Product not found")
    supabase.table("products").delete().eq("id", product_id).execute()
    return {"ok": True}
