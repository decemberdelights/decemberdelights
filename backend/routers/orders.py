from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_admin, require_super_admin
from security import validate_order_status, sanitize_input
from datetime import datetime, timedelta
from typing import Optional
import json

router = APIRouter()


class DeleteRequest(BaseModel):
    reason: str = ""


def log_activity(username: str, action: str, target_type: str, target_id: int, details: str = ""):
    supabase.table("activity_logs").insert({
        "admin_username": username,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "details": details,
    }).execute()


@router.post("/api/orders")
def create_public_order(data: dict):
    data["customer_name"] = sanitize_input(data.get("customer_name", ""), 200)
    data["customer_email"] = sanitize_input(data.get("customer_email", ""), 200)
    data["customer_phone"] = sanitize_input(data.get("customer_phone", ""), 20)
    data["customer_address"] = sanitize_input(data.get("customer_address", ""), 500)
    data["notes"] = sanitize_input(data.get("notes", ""), 1000)

    if not data.get("customer_name") or not data.get("customer_phone") or not data.get("customer_address"):
        raise HTTPException(status_code=400, detail="Name, phone, and address are required")
    if not data.get("items"):
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    try:
        items = json.loads(data["items"]) if isinstance(data["items"], str) else data["items"]
        if not isinstance(items, list) or len(items) == 0:
            raise ValueError("Items must be a non-empty array")
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid items format")

    order_data = {
        "customer_name": data["customer_name"],
        "customer_email": data.get("customer_email", ""),
        "customer_phone": data.get("customer_phone", ""),
        "customer_address": data.get("customer_address", ""),
        "items": json.dumps(items) if isinstance(items, list) else data["items"],
        "total": float(data.get("total", 0)),
        "status": data.get("status", "pending"),
        "payment_method": data.get("payment_method", "cash"),
        "payment_status": data.get("payment_status", "unpaid"),
        "notes": data.get("notes", ""),
    }
    result = supabase.table("orders").insert(order_data).execute()
    return {"id": result.data[0]["id"], "status": result.data[0]["status"]}


@router.get("/api/orders/track/{phone}")
def track_order(phone: str):
    result = supabase.table("orders").select("*").eq("customer_phone", phone).order("created_at", desc=True).limit(5).execute()
    return result.data or []


@router.get("/api/admin/orders")
def get_orders(_=Depends(get_current_admin)):
    result = supabase.table("orders").select("*").order("created_at", desc=True).execute()
    return result.data or []


@router.get("/api/admin/orders/stats")
def get_order_stats(_=Depends(get_current_admin)):
    result = supabase.table("orders").select("*").execute()
    orders = result.data or []

    today = datetime.now().date()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=today.weekday())

    daily = {}
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        key = d.strftime("%a")
        day_orders = [o for o in orders if o.get("created_at") and datetime.fromisoformat(o["created_at"]).date() == d]
        daily[key] = {"orders": len(day_orders), "revenue": sum(o.get("total", 0) for o in day_orders)}

    monthly = {}
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        if m <= 0:
            m += 12
            y -= 1
        key = datetime(y, m, 1).strftime("%b %Y")
        month_orders = [o for o in orders if o.get("created_at") and datetime.fromisoformat(o["created_at"]).month == m and datetime.fromisoformat(o["created_at"]).year == y]
        monthly[key] = {"orders": len(month_orders), "revenue": sum(o.get("total", 0) for o in month_orders)}

    today_orders = [o for o in orders if o.get("created_at") and datetime.fromisoformat(o["created_at"]).date() == today]
    week_orders = [o for o in orders if o.get("created_at") and datetime.fromisoformat(o["created_at"]).date() >= week_start]
    month_orders = [o for o in orders if o.get("created_at") and datetime.fromisoformat(o["created_at"]).date() >= month_start]

    return {
        "daily": daily,
        "monthly": monthly,
        "today_orders": len(today_orders),
        "today_revenue": sum(o.get("total", 0) for o in today_orders),
        "week_orders": len(week_orders),
        "week_revenue": sum(o.get("total", 0) for o in week_orders),
        "month_orders": len(month_orders),
        "month_revenue": sum(o.get("total", 0) for o in month_orders),
        "total_orders": len(orders),
        "total_revenue": sum(o.get("total", 0) for o in orders),
        "pending": len([o for o in orders if o.get("status") == "pending"]),
        "preparing": len([o for o in orders if o.get("status") == "preparing"]),
        "delivered": len([o for o in orders if o.get("status") == "delivered"]),
        "cancelled": len([o for o in orders if o.get("status") == "cancelled"]),
    }


@router.post("/api/admin/orders")
def create_order(data: dict, _=Depends(get_current_admin)):
    result = supabase.table("orders").insert(data).execute()
    return result.data[0]


@router.get("/api/admin/orders/{order_id}")
def get_order(order_id: int, _=Depends(get_current_admin)):
    result = supabase.table("orders").select("*").eq("id", order_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return result.data[0]


@router.put("/api/admin/orders/{order_id}")
def update_order(order_id: int, data: dict, _=Depends(get_current_admin)):
    existing = supabase.table("orders").select("*").eq("id", order_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Order not found")
    supabase.table("orders").update(data).eq("id", order_id).execute()
    updated = supabase.table("orders").select("*").eq("id", order_id).execute()
    return updated.data[0]


@router.put("/api/admin/orders/{order_id}/status")
def update_order_status(order_id: int, data: dict, _=Depends(get_current_admin)):
    status_val = data.get("status", "")
    if not validate_order_status(status_val):
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: pending, preparing, delivered, cancelled")
    existing = supabase.table("orders").select("*").eq("id", order_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Order not found")
    update_data = {"status": status_val}
    if data.get("admin_notes"):
        update_data["notes"] = sanitize_input(data["admin_notes"], 1000)
    supabase.table("orders").update(update_data).eq("id", order_id).execute()
    updated = supabase.table("orders").select("*").eq("id", order_id).execute()
    return updated.data[0]


@router.delete("/api/admin/orders/{order_id}")
def delete_order(order_id: int, data: Optional[DeleteRequest] = None, admin=Depends(require_super_admin)):
    existing = supabase.table("orders").select("*").eq("id", order_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Order not found")
    order = existing.data[0]
    reason = data.reason if data else ""
    log_activity(admin["username"], "delete", "order", order_id, f"Deleted order #{order_id} of {order.get('customer_name', '')} (₹{order.get('total', 0)}). Reason: {reason}")
    supabase.table("orders").delete().eq("id", order_id).execute()
    return {"ok": True}
