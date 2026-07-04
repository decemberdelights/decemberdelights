import os
import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import MenuItem
from schemas import MenuItemCreate, MenuItemOut
from auth import get_current_admin, require_super_admin
from typing import List, Optional

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "menu")
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    return f"/uploads/menu/{filename}"


@router.get("/api/menu", response_model=dict)
def get_menu(db: Session = Depends(get_db)):
    items = db.query(MenuItem).filter(MenuItem.is_active == True).order_by(MenuItem.sort_order).all()
    result = {}
    for item in items:
        if item.category not in result:
            result[item.category] = []
        result[item.category].append(MenuItemOut.model_validate(item).model_dump())
    return result


@router.get("/api/menu/all", response_model=List[MenuItemOut])
def get_all_menu(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    items = db.query(MenuItem).order_by(MenuItem.sort_order).all()
    return [MenuItemOut.model_validate(i) for i in items]


@router.post("/api/admin/menu")
async def create_menu(
    name: str = Form(""),
    category: str = Form(""),
    description: str = Form(""),
    price: str = Form(""),
    is_active: str = Form("true"),
    sort_order: str = Form("0"),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    image_url = await save_menu_image(image, name) if image else ""
    db_item = MenuItem(
        name=name, category=category, description=description,
        price=price, image_url=image_url,
        is_active=is_active.lower() == "true",
        sort_order=int(sort_order) if sort_order.isdigit() else 0,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"id": db_item.id}


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
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    if image and image.filename:
        new_url = await save_menu_image(image, name or db_item.name)
        if new_url:
            if db_item.image_url and db_item.image_url.startswith("/uploads/"):
                old_path = os.path.join(os.path.dirname(__file__), "..", db_item.image_url.lstrip("/"))
                if os.path.exists(old_path):
                    try: os.remove(old_path)
                    except OSError: pass
            image_url = new_url
    db_item.name = name
    db_item.category = category
    db_item.description = description
    db_item.price = price
    db_item.image_url = image_url
    db_item.is_active = is_active.lower() == "true"
    db_item.sort_order = int(sort_order) if sort_order.isdigit() else 0
    db.commit()
    return {"ok": True}


@router.delete("/api/admin/menu/{item_id}")
def delete_menu(item_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    if db_item.image_url and db_item.image_url.startswith("/uploads/"):
        filepath = os.path.join(os.path.dirname(__file__), "..", db_item.image_url.lstrip("/"))
        if os.path.exists(filepath):
            try: os.remove(filepath)
            except OSError: pass
    db.delete(db_item)
    db.commit()
    return {"ok": True}
