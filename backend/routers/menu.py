from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import MenuItem
from schemas import MenuItemCreate, MenuItemOut
from auth import get_current_admin, require_super_admin
from typing import List

router = APIRouter()


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
def create_menu(item: MenuItemCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    db_item = MenuItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"id": db_item.id}


@router.put("/api/admin/menu/{item_id}")
def update_menu(item_id: int, item: MenuItemCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    for k, v in item.model_dump().items():
        setattr(db_item, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/api/admin/menu/{item_id}")
def delete_menu(item_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    db.delete(db_item)
    db.commit()
    return {"ok": True}
