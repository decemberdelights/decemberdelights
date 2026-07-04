import os
import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import Product
from schemas import ProductCreate, ProductOut
from auth import get_current_admin, require_super_admin
from typing import List, Optional

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "products")
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    return f"/uploads/products/{filename}"


@router.get("/api/products", response_model=List[ProductOut])
def get_products(db: Session = Depends(get_db)):
    return [ProductOut.model_validate(p) for p in db.query(Product).filter(Product.is_active == True).order_by(Product.sort_order).all()]


@router.get("/api/products/categories")
def get_product_categories(db: Session = Depends(get_db)):
    cats = db.query(Product.category).filter(Product.is_active == True).distinct().all()
    return [c[0] for c in cats if c[0]]


@router.get("/api/admin/products", response_model=List[ProductOut])
def get_admin_products(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return [ProductOut.model_validate(p) for p in db.query(Product).order_by(Product.sort_order).all()]


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
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    image_url = await save_product_image(image, name) if image else ""
    db_product = Product(
        name=name, description=description,
        price=float(price) if price else 0,
        original_price=float(original_price) if original_price else 0,
        category=category, image_url=image_url,
        stock=int(stock) if stock.isdigit() else 0,
        is_active=is_active.lower() == "true",
        offer=offer,
        sort_order=int(sort_order) if sort_order.isdigit() else 0,
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return {"id": db_product.id}


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
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    if image and image.filename:
        new_url = await save_product_image(image, name or db_product.name)
        if new_url:
            if db_product.image_url and db_product.image_url.startswith("/uploads/"):
                old_path = os.path.join(os.path.dirname(__file__), "..", db_product.image_url.lstrip("/"))
                if os.path.exists(old_path):
                    try: os.remove(old_path)
                    except OSError: pass
            image_url = new_url
    db_product.name = name
    db_product.description = description
    db_product.price = float(price) if price else 0
    db_product.original_price = float(original_price) if original_price else 0
    db_product.category = category
    db_product.image_url = image_url
    db_product.stock = int(stock) if stock.isdigit() else 0
    db_product.is_active = is_active.lower() == "true"
    db_product.offer = offer
    db_product.sort_order = int(sort_order) if sort_order.isdigit() else 0
    db.commit()
    return {"ok": True}


@router.delete("/api/admin/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    if db_product.image_url and db_product.image_url.startswith("/uploads/"):
        filepath = os.path.join(os.path.dirname(__file__), "..", db_product.image_url.lstrip("/"))
        if os.path.exists(filepath):
            try: os.remove(filepath)
            except OSError: pass
    db.delete(db_product)
    db.commit()
    return {"ok": True}
