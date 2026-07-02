from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from database import get_db
from models import Order, ActivityLog
from schemas import OrderCreate, OrderOut, OrderStatusUpdate
from auth import get_current_admin, require_super_admin
from security import validate_order_status, sanitize_input
from datetime import datetime, timedelta
from typing import Optional
import json

router = APIRouter()


class DeleteRequest(BaseModel):
    reason: str = ""


def log_activity(db: Session, username: str, action: str, target_type: str, target_id: int, details: str = ""):
    log = ActivityLog(admin_username=username, action=action, target_type=target_type, target_id=target_id, details=details)
    db.add(log)
    db.commit()


@router.post("/api/orders")
def create_public_order(data: OrderCreate, db: Session = Depends(get_db)):
    # Sanitize inputs
    data.customer_name = sanitize_input(data.customer_name, 200)
    data.customer_email = sanitize_input(data.customer_email, 200)
    data.customer_phone = sanitize_input(data.customer_phone, 20)
    data.customer_address = sanitize_input(data.customer_address, 500)
    data.notes = sanitize_input(data.notes, 1000)

    if not data.customer_name or not data.customer_phone or not data.customer_address:
        raise HTTPException(status_code=400, detail="Name, phone, and address are required")
    if not data.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    # Validate items JSON
    try:
        items = json.loads(data.items) if isinstance(data.items, str) else data.items
        if not isinstance(items, list) or len(items) == 0:
            raise ValueError("Items must be a non-empty array")
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid items format")

    order = Order(**data.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return {"id": order.id, "status": order.status}


@router.get("/api/orders/track/{phone}")
def track_order(phone: str, db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.customer_phone == phone).order_by(Order.created_at.desc()).limit(5).all()
    return [OrderOut.model_validate(o).model_dump() for o in orders]


@router.get("/api/admin/orders")
def get_orders(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return [OrderOut.model_validate(o).model_dump() for o in db.query(Order).order_by(Order.created_at.desc()).all()]


@router.get("/api/admin/orders/stats")
def get_order_stats(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    today = datetime.now().date()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=today.weekday())

    orders = db.query(Order).all()

    daily = {}
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        key = d.strftime("%a")
        day_orders = [o for o in orders if o.created_at and o.created_at.date() == d]
        daily[key] = {"orders": len(day_orders), "revenue": sum(o.total for o in day_orders)}

    monthly = {}
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        if m <= 0:
            m += 12
            y -= 1
        key = datetime(y, m, 1).strftime("%b %Y")
        month_orders = [o for o in orders if o.created_at and o.created_at.month == m and o.created_at.year == y]
        monthly[key] = {"orders": len(month_orders), "revenue": sum(o.total for o in month_orders)}

    today_orders = [o for o in orders if o.created_at and o.created_at.date() == today]
    week_orders = [o for o in orders if o.created_at and o.created_at.date() >= week_start]
    month_orders = [o for o in orders if o.created_at and o.created_at.date() >= month_start]

    return {
        "daily": daily,
        "monthly": monthly,
        "today_orders": len(today_orders),
        "today_revenue": sum(o.total for o in today_orders),
        "week_orders": len(week_orders),
        "week_revenue": sum(o.total for o in week_orders),
        "month_orders": len(month_orders),
        "month_revenue": sum(o.total for o in month_orders),
        "total_orders": len(orders),
        "total_revenue": sum(o.total for o in orders),
        "pending": len([o for o in orders if o.status == "pending"]),
        "preparing": len([o for o in orders if o.status == "preparing"]),
        "delivered": len([o for o in orders if o.status == "delivered"]),
        "cancelled": len([o for o in orders if o.status == "cancelled"]),
    }


@router.post("/api/admin/orders")
def create_order(data: OrderCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    order = Order(**data.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return OrderOut.model_validate(order).model_dump()


@router.get("/api/admin/orders/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderOut.model_validate(order).model_dump()


@router.put("/api/admin/orders/{order_id}")
def update_order(order_id: int, data: OrderCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    for k, v in data.model_dump().items():
        setattr(order, k, v)
    db.commit()
    db.refresh(order)
    return OrderOut.model_validate(order).model_dump()


@router.put("/api/admin/orders/{order_id}/status")
def update_order_status(order_id: int, data: OrderStatusUpdate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    if not validate_order_status(data.status):
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: pending, preparing, delivered, cancelled")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = data.status
    if data.admin_notes:
        order.notes = sanitize_input(data.admin_notes, 1000)
    db.commit()
    db.refresh(order)
    return OrderOut.model_validate(order).model_dump()


@router.delete("/api/admin/orders/{order_id}")
def delete_order(order_id: int, data: Optional[DeleteRequest] = None, db: Session = Depends(get_db), admin=Depends(require_super_admin)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    reason = data.reason if data else ""
    log_activity(db, admin.username, "delete", "order", order_id, f"Deleted order #{order_id} of {order.customer_name} (₹{order.total}). Reason: {reason}")
    db.delete(order)
    db.commit()
    return {"ok": True}
