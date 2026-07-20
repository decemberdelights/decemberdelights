from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_admin, require_super_admin
from security import validate_order_status, sanitize_input, RateLimiter, validate_email, get_client_ip
from datetime import datetime, timedelta, timezone
from typing import Optional
import os
import json
import uuid
import time
import razorpay
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

track_limiter = RateLimiter(max_attempts=10, window_seconds=60)
order_limiter = RateLimiter(max_attempts=5, window_seconds=60)
contact_limiter = RateLimiter(max_attempts=3, window_seconds=60)

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")


def _get_razorpay_client():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return None
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


class RazorpayOrderRequest(BaseModel):
    amount: int
    customer_phone: str


class DeleteRequest(BaseModel):
    reason: str = ""


class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_email: str = ""
    customer_phone: str
    customer_address: str
    items: str
    notes: str = ""
    payment_method: str = "cash"
    razorpay_order_id: str = ""
    razorpay_payment_id: str = ""
    razorpay_signature: str = ""


class UpdateOrderRequest(BaseModel):
    status: str = ""
    payment_status: str = ""
    payment_method: str = ""
    notes: str = ""
    customer_address: str = ""
    admin_notes: str = ""


class UpdateStatusRequest(BaseModel):
    status: str
    admin_notes: str = ""


class CreateAdminOrderRequest(BaseModel):
    customer_name: str = ""
    customer_email: str = ""
    customer_phone: str = ""
    customer_address: str = ""
    items: str = ""
    total: float = 0
    status: str = "pending"
    payment_method: str = "cash"
    payment_status: str = "unpaid"
    notes: str = ""


class ContactRequest(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    subject: str = ""
    message: str = ""


class OrderStatsCache:
    """In-memory cache for order stats."""
    def __init__(self, ttl_seconds: int = 60):
        self._cache: dict[str, tuple[float, any]] = {}
        self._ttl = ttl_seconds

    def get(self, key: str):
        if key in self._cache:
            ts, val = self._cache[key]
            if time.time() - ts < self._ttl:
                return val
            del self._cache[key]
        return None

    def set(self, key: str, val):
        self._cache[key] = (time.time(), val)

    def invalidate(self):
        self._cache.clear()


_order_cache = OrderStatsCache(ttl_seconds=60)


def _normalize_phone(phone: str) -> str:
    return phone.replace(" ", "").replace("-", "").replace("+", "")


def _verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    client = _get_razorpay_client()
    if not client:
        return False
    try:
        params_dict = {"razorpay_order_id": order_id, "razorpay_payment_id": payment_id, "razorpay_signature": signature}
        client.utility.verify_payment_signature(params_dict)
        return True
    except Exception as e:
        logger.error(f"Razorpay signature verification failed: {e}")
        return False


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


@router.post("/api/orders/create-order")
async def create_shop_razorpay_order(body: RazorpayOrderRequest, request: Request):
    client_ip = get_client_ip(request)
    rate_key = f"shop_order:{client_ip}"
    order_limiter.check(rate_key)
    order_limiter.record(rate_key)

    client = _get_razorpay_client()
    if not client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")

    phone = sanitize_input(body.customer_phone, 20)
    cleaned = _normalize_phone(phone)
    if not cleaned.isdigit() or len(cleaned) < 7 or len(cleaned) > 15:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    if body.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum order amount is ₹10")

    try:
        import asyncio as _asyncio
        order = await _asyncio.to_thread(
            lambda: client.order.create({
                "amount": body.amount,
                "currency": "INR",
                "receipt": f"shop_{cleaned}_{uuid.uuid4().hex[:8]}",
                "notes": {"phone": cleaned, "purpose": "shop_order"},
            })
        )
        logger.info(f"Shop Razorpay order created: {order['id']} for phone={cleaned}")
        return {"order_id": order["id"], "amount": body.amount, "currency": "INR", "key_id": RAZORPAY_KEY_ID}
    except Exception as e:
        logger.error(f"Shop Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment order. Please try again.")


@router.post("/api/orders")
def create_public_order(body: CreateOrderRequest, request: Request, background_tasks: BackgroundTasks):
    client_ip = get_client_ip(request)
    rate_key = f"order:{client_ip}"
    order_limiter.check(rate_key)
    order_limiter.record(rate_key)

    data = body.model_dump()
    data["customer_name"] = sanitize_input(data["customer_name"], 200)
    data["customer_email"] = sanitize_input(data["customer_email"], 200)
    data["customer_phone"] = sanitize_input(data["customer_phone"], 20)
    data["customer_address"] = sanitize_input(data["customer_address"], 500)
    data["notes"] = sanitize_input(data["notes"], 1000)

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
        if qty > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 per item")

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
            raise HTTPException(status_code=400, detail="One or more products are unavailable")
        product = products_map[pid]
        qty = int(item["quantity"])
        if product.get("stock", 0) < qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.get('name', 'item')}")
        price = float(product.get("price", 0))
        calculated_total += price * qty
        sanitized_items.append({"id": int(pid), "name": product.get("name", ""), "price": price, "quantity": qty})

    payment_method = data.get("payment_method", "cash")
    payment_status = "unpaid"

    if payment_method == "razorpay":
        rp_order_id = data.get("razorpay_order_id", "")
        rp_payment_id = data.get("razorpay_payment_id", "")
        rp_signature = data.get("razorpay_signature", "")
        if not rp_order_id or not rp_payment_id or not rp_signature:
            raise HTTPException(status_code=400, detail="Missing payment details for online payment")
        if not _verify_razorpay_signature(rp_order_id, rp_payment_id, rp_signature):
            raise HTTPException(status_code=400, detail="Payment verification failed")
        client = _get_razorpay_client()
        if client:
            try:
                payment = client.payment.fetch(rp_payment_id)
                if payment.get("status") != "captured":
                    raise HTTPException(status_code=400, detail=f"Payment not captured (status: {payment.get('status')})")
                paid_paise = int(payment.get("amount", 0))
                if paid_paise != int(calculated_total * 100):
                    raise HTTPException(status_code=400, detail="Payment amount mismatch")
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Could not verify Razorpay payment details: {e}")
        payment_status = "paid"

    # Atomic stock decrement using conditional UPDATE with gte guard
    decremented = []
    for item in sanitized_items:
        try:
            result = supabase.table("products").update(
                {"stock": supabase.table("products").select("stock").eq("id", item["id"]).execute().data[0]["stock"] - item["quantity"]}
            ).eq("id", item["id"]).gte("stock", item["quantity"]).execute()

            if not result.data:
                # Rollback previously decremented items
                for prev in decremented:
                    try:
                        prev_product = supabase.table("products").select("stock").eq("id", prev["id"]).execute()
                        if prev_product.data:
                            supabase.table("products").update(
                                {"stock": prev_product.data[0]["stock"] + prev["quantity"]}
                            ).eq("id", prev["id"]).execute()
                    except Exception as rollback_err:
                        logger.error(f"Stock rollback failed for product {prev['id']}: {rollback_err}")
                raise HTTPException(status_code=400, detail="Insufficient stock — item was just purchased by someone else")
            decremented.append({"id": item["id"], "quantity": item["quantity"]})
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Stock update failed for product {item['id']}: {e}")
            raise HTTPException(status_code=500, detail="Failed to update stock")

    # Insert order AFTER stock is decremented
    order_data = {
        "customer_name": data["customer_name"],
        "customer_email": data.get("customer_email", ""),
        "customer_phone": data["customer_phone"],
        "customer_address": data["customer_address"],
        "items": json.dumps(sanitized_items),
        "total": calculated_total,
        "status": "pending",
        "payment_method": payment_method,
        "payment_status": payment_status,
        "notes": data.get("notes", ""),
        "razorpay_order_id": sanitize_input(data.get("razorpay_order_id", ""), 100),
        "razorpay_payment_id": sanitize_input(data.get("razorpay_payment_id", ""), 100),
    }

    try:
        result = supabase.table("orders").insert(order_data).execute()
    except Exception as order_err:
        # Rollback stock if order insert fails
        logger.error(f"Order insert failed, rolling back stock: {order_err}")
        for prev in decremented:
            try:
                prev_product = supabase.table("products").select("stock").eq("id", prev["id"]).execute()
                if prev_product.data:
                    supabase.table("products").update(
                        {"stock": prev_product.data[0]["stock"] + prev["quantity"]}
                    ).eq("id", prev["id"]).execute()
            except Exception as rollback_err:
                logger.error(f"Stock rollback failed for product {prev['id']}: {rollback_err}")
        raise HTTPException(status_code=500, detail="Failed to create order")

    _order_cache.invalidate()

    try:
        from email_service import send_order_confirmation
        background_tasks.add_task(send_order_confirmation, data["customer_name"], data.get("customer_email", ""), result.data[0]["id"], sanitized_items, calculated_total, data["customer_phone"])
        logger.info(f"Order email queued for {data.get('customer_email', 'no-email')}")
    except Exception as e:
        logger.error(f"Order email queue failed: {e}")

    return {"id": result.data[0]["id"], "status": result.data[0]["status"]}


@router.get("/api/orders/track/{phone}")
def track_order(phone: str, request: Request):
    client_ip = get_client_ip(request)
    rate_key = f"track:{client_ip}"
    track_limiter.check(rate_key)
    track_limiter.record(rate_key)

    cleaned = _normalize_phone(phone)
    if not cleaned.isdigit() or len(cleaned) < 7:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    # Try normalized phone first (how it was stored)
    result = supabase.table("orders").select("id,customer_name,customer_phone,customer_address,items,total,status,created_at").eq("customer_phone", cleaned).order("created_at", desc=True).limit(5).execute()
    matching = result.data or []

    if not matching:
        # Fallback: try with the raw phone parameter
        result = supabase.table("orders").select("id,customer_name,customer_phone,customer_address,items,total,status,created_at").eq("customer_phone", phone).order("created_at", desc=True).limit(5).execute()
        matching = result.data or []

    if not matching:
        # Last resort: scan recent orders and normalize
        result = supabase.table("orders").select("id,customer_name,customer_phone,customer_address,items,total,status,created_at").order("created_at", desc=True).limit(20).execute()
        orders = result.data or []
        matching = [o for o in orders if _normalize_phone(o.get("customer_phone", "")) == cleaned][:5]

    return matching


@router.post("/api/contact")
def submit_contact(data: ContactRequest, request: Request):
    client_ip = get_client_ip(request)
    rate_key = f"contact:{client_ip}"
    contact_limiter.check(rate_key)
    contact_limiter.record(rate_key)

    name = sanitize_input(data.name, 200)
    email = sanitize_input(data.email, 200)
    phone = sanitize_input(data.phone, 20)
    subject = sanitize_input(data.subject, 200)
    message = sanitize_input(data.message, 5000)

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
    return {"ok": True, "id": result.data[0]["id"]}


@router.get("/api/admin/orders")
def get_orders(limit: int = 100, offset: int = 0, _=Depends(get_current_admin)):
    limit = min(limit, 200)
    result = supabase.table("orders").select("*").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    total = supabase.table("orders").select("id", count="exact").execute()
    return {"orders": result.data or [], "total": total.count or 0}


def _parse_created_date(o: dict):
    ca = o.get("created_at")
    if not ca:
        return None
    try:
        return datetime.fromisoformat(ca).date()
    except (ValueError, TypeError):
        return None


def _parse_created_month(o: dict):
    ca = o.get("created_at")
    if not ca:
        return None
    try:
        dt = datetime.fromisoformat(ca)
        return (dt.month, dt.year)
    except (ValueError, TypeError):
        return None


@router.get("/api/admin/orders/stats")
def get_order_stats(_=Depends(get_current_admin)):
    cached = _order_cache.get("order_stats")
    if cached:
        return cached

    today = datetime.now(timezone.utc).date()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=today.weekday())

    try:
        result = supabase.table("orders").select("total,status,created_at").order("created_at", desc=True).execute()
    except Exception as e:
        logger.error(f"Failed to fetch orders for stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to load order stats")
    orders = result.data or []

    daily = {}
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        key = d.strftime("%a")
        day_orders = [o for o in orders if _parse_created_date(o) == d]
        daily[key] = {"orders": len(day_orders), "revenue": sum(o.get("total", 0) for o in day_orders)}

    monthly = {}
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        if m <= 0:
            m += 12
            y -= 1
        key = datetime(y, m, 1).strftime("%b %Y")
        month_orders = [o for o in orders if _parse_created_month(o) == (m, y)]
        monthly[key] = {"orders": len(month_orders), "revenue": sum(o.get("total", 0) for o in month_orders)}

    today_orders = []
    week_orders = []
    month_orders_filtered = []
    pending = preparing = delivered = cancelled = 0
    for o in orders:
        status = o.get("status")
        if status == "pending":
            pending += 1
        elif status == "preparing":
            preparing += 1
        elif status == "delivered":
            delivered += 1
        elif status == "cancelled":
            cancelled += 1
        d = _parse_created_date(o)
        if not d:
            continue
        if d == today:
            today_orders.append(o)
        if d >= week_start:
            week_orders.append(o)
        if d >= month_start:
            month_orders_filtered.append(o)

    result_data = {
        "daily": daily,
        "monthly": monthly,
        "today_orders": len(today_orders),
        "today_revenue": sum(o.get("total", 0) for o in today_orders),
        "week_orders": len(week_orders),
        "week_revenue": sum(o.get("total", 0) for o in week_orders),
        "month_orders": len(month_orders_filtered),
        "month_revenue": sum(o.get("total", 0) for o in month_orders_filtered),
        "total_orders": len(orders),
        "total_revenue": sum(o.get("total", 0) for o in orders),
        "pending": pending,
        "preparing": preparing,
        "delivered": delivered,
        "cancelled": cancelled,
    }
    _order_cache.set("order_stats", result_data)
    return result_data


@router.post("/api/admin/orders")
def create_order(data: CreateAdminOrderRequest, _=Depends(get_current_admin)):
    try:
        order_data = {
            "customer_name": sanitize_input(data.customer_name, 200),
            "customer_email": sanitize_input(data.customer_email, 200),
            "customer_phone": sanitize_input(data.customer_phone, 20),
            "customer_address": sanitize_input(data.customer_address, 500),
            "items": sanitize_input(data.items, 5000),
            "total": data.total,
            "status": data.status,
            "payment_method": data.payment_method,
            "payment_status": data.payment_status,
            "notes": sanitize_input(data.notes, 1000),
        }
        result = supabase.table("orders").insert(order_data).execute()
        _order_cache.invalidate()
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
def update_order(order_id: int, data: UpdateOrderRequest, _=Depends(get_current_admin)):
    try:
        existing = supabase.table("orders").select("*").eq("id", order_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Order not found")
        update_data = {}
        if data.status:
            update_data["status"] = data.status
        if data.payment_status:
            update_data["payment_status"] = data.payment_status
        if data.payment_method:
            update_data["payment_method"] = data.payment_method
        if data.notes:
            update_data["notes"] = sanitize_input(data.notes, 1000)
        if data.customer_address:
            update_data["customer_address"] = sanitize_input(data.customer_address, 500)
        if data.admin_notes:
            update_data["admin_notes"] = sanitize_input(data.admin_notes, 1000)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        supabase.table("orders").update(update_data).eq("id", order_id).execute()
        updated = supabase.table("orders").select("*").eq("id", order_id).execute()
        _order_cache.invalidate()
        return updated.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update order {order_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update order")


@router.put("/api/admin/orders/{order_id}/status")
def update_order_status(order_id: int, data: UpdateStatusRequest, admin=Depends(get_current_admin)):
    status_val = data.status
    if not validate_order_status(status_val):
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: pending, confirmed, preparing, packed, ready, delivered, cancelled")
    existing = supabase.table("orders").select("*").eq("id", order_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Order not found")

    order = existing.data[0]
    old_status = order.get("status", "")
    update_data = {"status": status_val}
    if data.admin_notes:
        update_data["admin_notes"] = sanitize_input(data.admin_notes, 1000)

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
    _order_cache.invalidate()
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
    _order_cache.invalidate()
    return {"ok": True}
