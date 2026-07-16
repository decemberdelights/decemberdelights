from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_admin, require_super_admin
from security import validate_order_status, sanitize_input, RateLimiter, validate_email
from datetime import datetime, timedelta
from typing import Optional
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

track_limiter = RateLimiter(max_attempts=10, window_seconds=60)
order_limiter = RateLimiter(max_attempts=5, window_seconds=60)
contact_limiter = RateLimiter(max_attempts=3, window_seconds=60)


class DeleteRequest(BaseModel):
    reason: str = ""


def _normalize_phone(phone: str) -> str:
    return phone.replace(" ", "").replace("-", "").replace("+", "")


def log_activity(username: str, action: str, target_type: str, target_id: int, details: str = ""):
    try:
        supabase.table("activity_logs").insert({
            "admin_username": username,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "details": details,
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")


@router.post("/api/orders")
def create_public_order(data: dict, request: Request, background_tasks: BackgroundTasks):
    from security import get_client_ip
    client_ip = get_client_ip(request)
    rate_key = f"order:{client_ip}"
    order_limiter.check(rate_key)
    order_limiter.record(rate_key)

    data["customer_name"] = sanitize_input(data.get("customer_name", ""), 200)
    data["customer_email"] = sanitize_input(data.get("customer_email", ""), 200)
    data["customer_phone"] = sanitize_input(data.get("customer_phone", ""), 20)
    data["customer_address"] = sanitize_input(data.get("customer_address", ""), 500)
    data["notes"] = sanitize_input(data.get("notes", ""), 1000)

    if not data.get("customer_name") or not data.get("customer_phone") or not data.get("customer_address"):
        raise HTTPException(status_code=400, detail="Name, phone, and address are required")

    phone = data["customer_phone"]
    cleaned = _normalize_phone(phone)
    if not cleaned.isdigit() or len(cleaned) < 7 or len(cleaned) > 15:
        raise HTTPException(status_code=400, detail="Invalid phone number format")

    if data.get("customer_email") and not validate_email(data["customer_email"]):
        raise HTTPException(status_code=400, detail="Invalid email address")

    if not data.get("items"):
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    try:
        items = json.loads(data["items"]) if isinstance(data["items"], str) else data["items"]
        if not isinstance(items, list) or len(items) == 0:
            raise ValueError("Items must be a non-empty array")
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid items format")

    for item in items:
        if not isinstance(item, dict) or not item.get("id") or not item.get("quantity"):
            raise HTTPException(status_code=400, detail="Each item must have id and quantity")
        try:
            qty = int(item["quantity"])
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid quantity value")
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Item quantity must be at least 1")

    product_ids = []
    for item in items:
        try:
            product_ids.append(int(item["id"]))
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid product ID")

    products_result = supabase.table("products").select("*").in_("id", product_ids).execute()
    products_map = {str(p["id"]): p for p in (products_result.data or [])}

    calculated_total = 0.0
    sanitized_items = []
    for item in items:
        pid = str(item["id"])
        if pid not in products_map:
            raise HTTPException(status_code=400, detail=f"Product ID {item['id']} not found")
        product = products_map[pid]
        qty = int(item["quantity"])
        if product.get("stock", 0) < qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.get('name', 'item')}")
        price = float(product.get("price", 0))
        calculated_total += price * qty
        sanitized_items.append({"id": int(pid), "name": product.get("name", ""), "price": price, "quantity": qty})

    for item in sanitized_items:
        try:
            current = supabase.table("products").select("stock").eq("id", item["id"]).execute()
            if current.data:
                current_stock = current.data[0]["stock"]
                if current_stock < item["quantity"]:
                    raise HTTPException(status_code=400, detail=f"Insufficient stock for {item['name']}")
                new_stock = current_stock - item["quantity"]
                supabase.table("products").update({"stock": new_stock}).eq("id", item["id"]).execute()
                verify = supabase.table("products").select("stock").eq("id", item["id"]).execute()
                if verify.data and verify.data[0]["stock"] < 0:
                    supabase.table("products").update({"stock": 0}).eq("id", item["id"]).execute()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Stock update failed for product {item['id']}: {e}")
            raise HTTPException(status_code=500, detail="Failed to update stock")

    order_data = {
        "customer_name": data["customer_name"],
        "customer_email": data.get("customer_email", ""),
        "customer_phone": data["customer_phone"],
        "customer_address": data["customer_address"],
        "items": json.dumps(sanitized_items),
        "total": calculated_total,
        "status": "pending",
        "payment_method": data.get("payment_method", "cash"),
        "payment_status": "unpaid",
        "notes": data.get("notes", ""),
    }
    result = supabase.table("orders").insert(order_data).execute()
    order_limiter.reset(rate_key)

    try:
        from email_service import send_order_confirmation
        background_tasks.add_task(send_order_confirmation, data["customer_name"], data.get("customer_email", ""), result.data[0]["id"], sanitized_items, calculated_total, data["customer_phone"])
        logger.info(f"Order email queued for {data.get('customer_email', 'no-email')}")
    except Exception as e:
        logger.error(f"Order email queue failed: {e}")

    return {"id": result.data[0]["id"], "status": result.data[0]["status"]}


@router.get("/api/orders/track/{phone}")
def track_order(phone: str, request: Request):
    from security import get_client_ip
    client_ip = get_client_ip(request)
    rate_key = f"track:{client_ip}"
    track_limiter.check(rate_key)
    track_limiter.record(rate_key)

    cleaned = _normalize_phone(phone)
    if not cleaned.isdigit() or len(cleaned) < 7:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    result = supabase.table("orders").select("id,customer_name,customer_phone,customer_address,items,total,status,created_at").order("created_at", desc=True).limit(50).execute()
    orders = result.data or []
    matching = [o for o in orders if _normalize_phone(o.get("customer_phone", "")) == cleaned]
    return matching[:5]


@router.post("/api/contact")
def submit_contact(data: dict, request: Request):
    from security import get_client_ip
    client_ip = get_client_ip(request)
    rate_key = f"contact:{client_ip}"
    contact_limiter.check(rate_key)
    contact_limiter.record(rate_key)

    name = sanitize_input(data.get("name", ""), 200)
    email = sanitize_input(data.get("email", ""), 200)
    phone = sanitize_input(data.get("phone", ""), 20)
    subject = sanitize_input(data.get("subject", ""), 200)
    message = sanitize_input(data.get("message", ""), 5000)

    if not name or not email or not message:
        raise HTTPException(status_code=400, detail="Name, email, and message are required")
    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Invalid email address")

    result = supabase.table("contact_messages").insert({
        "name": name,
        "email": email,
        "phone": phone,
        "subject": subject,
        "message": message,
        "status": "pending",
    }).execute()
    contact_limiter.reset(rate_key)
    return {"ok": True, "id": result.data[0]["id"]}


@router.get("/api/admin/orders")
def get_orders(_=Depends(get_current_admin)):
    result = supabase.table("orders").select("*").order("created_at", desc=True).limit(500).execute()
    return result.data or []


@router.get("/api/admin/orders/stats")
def get_order_stats(_=Depends(get_current_admin)):
    try:
        result = supabase.table("orders").select("total,status,created_at").execute()
    except Exception as e:
        logger.error(f"Failed to fetch orders for stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to load order stats")
    orders = result.data or []

    from datetime import timezone as tz
    today = datetime.now(tz.utc).date()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=today.weekday())

    daily = {}
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        key = d.strftime("%a")
        day_orders = []
        for o in orders:
            ca = o.get("created_at")
            if ca:
                try:
                    if datetime.fromisoformat(ca).date() == d:
                        day_orders.append(o)
                except (ValueError, TypeError):
                    pass
        daily[key] = {"orders": len(day_orders), "revenue": sum(o.get("total", 0) for o in day_orders)}

    monthly = {}
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        if m <= 0:
            m += 12
            y -= 1
        key = datetime(y, m, 1).strftime("%b %Y")
        month_orders = []
        for o in orders:
            ca = o.get("created_at")
            if ca:
                try:
                    dt = datetime.fromisoformat(ca)
                    if dt.month == m and dt.year == y:
                        month_orders.append(o)
                except (ValueError, TypeError):
                    pass
        monthly[key] = {"orders": len(month_orders), "revenue": sum(o.get("total", 0) for o in month_orders)}

    today_orders = []
    week_orders = []
    month_orders = []
    for o in orders:
        ca = o.get("created_at")
        if not ca:
            continue
        try:
            dt = datetime.fromisoformat(ca)
            d = dt.date()
            if d == today:
                today_orders.append(o)
            if d >= week_start:
                week_orders.append(o)
            if d >= month_start:
                month_orders.append(o)
        except (ValueError, TypeError):
            pass

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
    try:
        allowed_fields = {"customer_name", "customer_email", "customer_phone", "customer_address", "items", "total", "status", "payment_method", "payment_status", "notes"}
        safe_data = {k: v for k, v in data.items() if k in allowed_fields}
        result = supabase.table("orders").insert(safe_data).execute()
        return result.data[0]
    except Exception as e:
        logger.error(f"Failed to create order: {e}")
        raise HTTPException(status_code=500, detail="Failed to create order")


@router.get("/api/admin/orders/{order_id}")
def get_order(order_id: int, _=Depends(get_current_admin)):
    try:
        result = supabase.table("orders").select("*").eq("id", order_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Order not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch order {order_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch order")


@router.put("/api/admin/orders/{order_id}")
def update_order(order_id: int, data: dict, _=Depends(get_current_admin)):
    try:
        existing = supabase.table("orders").select("*").eq("id", order_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Order not found")
        allowed_fields = {"status", "payment_status", "payment_method", "notes", "customer_address", "admin_notes"}
        safe_data = {k: v for k, v in data.items() if k in allowed_fields}
        supabase.table("orders").update(safe_data).eq("id", order_id).execute()
        updated = supabase.table("orders").select("*").eq("id", order_id).execute()
        return updated.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update order {order_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update order")


@router.put("/api/admin/orders/{order_id}/status")
def update_order_status(order_id: int, data: dict, admin=Depends(get_current_admin)):
    status_val = data.get("status", "")
    if not validate_order_status(status_val):
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: pending, confirmed, preparing, packed, ready, delivered, cancelled")
    existing = supabase.table("orders").select("*").eq("id", order_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Order not found")

    order = existing.data[0]
    old_status = order.get("status", "")
    update_data = {"status": status_val}
    if data.get("admin_notes"):
        update_data["admin_notes"] = sanitize_input(data["admin_notes"], 1000)

    if status_val == "cancelled" and old_status != "cancelled":
        try:
            items_list = json.loads(order.get("items", "[]")) if isinstance(order.get("items", ""), str) else order.get("items", [])
            for item in items_list:
                pid = item.get("id")
                qty = item.get("quantity", 0)
                if pid and qty > 0:
                    current = supabase.table("products").select("stock").eq("id", pid).execute()
                    if current.data:
                        new_stock = current.data[0]["stock"] + qty
                        supabase.table("products").update({"stock": new_stock}).eq("id", pid).execute()
        except Exception as e:
            logger.error(f"Failed to restore stock for order {order_id}: {e}")

    supabase.table("orders").update(update_data).eq("id", order_id).execute()
    updated = supabase.table("orders").select("*").eq("id", order_id).execute()
    log_activity(admin["username"], f"status:{status_val}", "order", order_id, f"Order #{order_id} ({order.get('customer_name', '')}) → {status_val}")
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
