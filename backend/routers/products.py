from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Product
from schemas import ProductCreate, ProductOut
from auth import get_current_admin, require_super_admin
from typing import List

router = APIRouter()


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
def create_product(product: ProductCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    return {"id": db_product.id}


@router.put("/api/admin/products/{product_id}")
def update_product(product_id: int, product: ProductCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    for k, v in product.model_dump().items():
        setattr(db_product, k, v)
    db.commit()

    return {"ok": True}


@router.delete("/api/admin/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(db_product)
    db.commit()

    return {"ok": True}
