from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_admin, require_super_admin
from security import validate_order_status, sanitize_input, RateLimiter, validate_email, get_client_ip
from store import KVStore
from datetime import datetime, timedelta, timezone
from typing import Optional
import os
import json
import uuid
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
    """SQLite-backed cache for order stats with TTL."""
    def __init__(self, ttl_seconds: int = 60):
        self._store = KVStore(namespace="order_stats", default_ttl=ttl_seconds)

    def get(self, key: str):
        return self._store.get(key)

    def set(self, key: str, val):
        self._store.set(key, val)

    def invalidate(self):
        self._store.invalidate()


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


from activity import log_activity
from email_service import send_contact_notification


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
def create_public_order(body: CreateOrderRequest, request: Request):
    # Check if shop is enabled
    try:
        setting = supabase.table("site_settings").select("value").eq("key", "shop_enabled").execute()
        if setting.data and setting.data[0]["value"] == "false":
            raise HTTPException(status_code=403, detail="Shop is currently unavailable")
    except HTTPException:
        raise
    except Exception:
        pass  # If settings table doesn't exist yet, allow orders

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

    # Atomic stock decrement: read all stocks first, validate, then batch update
    product_ids = [item["id"] for item in sanitized_items]
    try:
        stock_result = supabase.table("products").select("id,stock").in_("id", product_ids).execute()
        stock_map = {p["id"]: p["stock"] for p in (stock_result.data or [])}
    except Exception as e:
        logger.error(f"Failed to read product stocks: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify stock")

    # Validate all stock BEFORE making any updates
    for item in sanitized_items:
        current_stock = stock_map.get(item["id"], 0)
        if current_stock < item["quantity"]:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {item.get('name', 'item')}")

    # All stock is sufficient — perform batch update
    decremented = []
    for item in sanitized_items:
        current_stock = stock_map.get(item["id"], 0)
        new_stock = current_stock - item["quantity"]
        result = supabase.table("products").update(
            {"stock": new_stock}
        ).eq("id", item["id"]).gte("stock", item["quantity"]).execute()

        if not result.data:
            # Rollback all previous decrements
            for prev in decremented:
                try:
                    fresh = supabase.table("products").select("stock").eq("id", prev["id"]).execute()
                    current = fresh.data[0]["stock"] if fresh.data else 0
                    supabase.table("products").update({"stock": current + prev["quantity"]}).eq("id", prev["id"]).execute()
                except Exception as rollback_err:
                    logger.error(f"Stock rollback failed for product {prev['id']}: {rollback_err}")
            raise HTTPException(status_code=400, detail="Insufficient stock — item was just purchased by someone else")
        decremented.append({"id": item["id"], "quantity": item["quantity"]})

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
    }
    if payment_method == "razorpay" and data.get("razorpay_order_id"):
        order_data["razorpay_order_id"] = sanitize_input(data.get("razorpay_order_id", ""), 100)
        order_data["razorpay_payment_id"] = sanitize_input(data.get("razorpay_payment_id", ""), 100)

    try:
        result = supabase.table("orders").insert(order_data).execute()
    except Exception as order_err:
        logger.error(f"Order insert failed, rolling back stock: {order_err}")
        for prev in decremented:
            try:
                fresh = supabase.table("products").select("stock").eq("id", prev["id"]).execute()
                current = fresh.data[0]["stock"] if fresh.data else 0
                supabase.table("products").update({"stock": current + prev["quantity"]}).eq("id", prev["id"]).execute()
            except Exception as rollback_err:
                logger.error(f"Stock rollback failed for product {prev['id']}: {rollback_err}")
        raise HTTPException(status_code=500, detail="Failed to create order")

    _order_cache.invalidate()

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

    safe_cols = "id,customer_name,customer_phone,items,total,status,payment_method,created_at"

    try:
        result = supabase.table("orders").select(safe_cols).eq("customer_phone", cleaned).order("created_at", desc=True).limit(5).execute()
        return result.data or []
    except Exception as e:
        logger.warning(f"Track query failed: {e}")
        return []


@router.post("/api/contact")
def submit_contact(data: ContactRequest, request: Request, background_tasks: BackgroundTasks):
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

    background_tasks.add_task(
        send_contact_notification, name, email, phone, subject, message
    )

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

    now = datetime.now(timezone.utc)
    today = now.date()
    month_start = today.replace(day=1).isoformat()
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    today_str = today.isoformat()

    # Use DB-level date filtering instead of loading all orders
    try:
        # Today's orders
        today_q = supabase.table("orders").select("total,status").gte("created_at", today_str).execute()
        today_orders = today_q.data or []

        # This week's orders (reuses today_q data for week if today is start of week)
        if week_start == today_str:
            week_orders = today_orders
        else:
            week_q = supabase.table("orders").select("total,status").gte("created_at", week_start).execute()
            week_orders = week_q.data or []

        # This month's orders
        if month_start == today_str:
            month_orders = today_orders
        elif month_start == week_start:
            month_orders = week_orders
        else:
            month_q = supabase.table("orders").select("total,status").gte("created_at", month_start).execute()
            month_orders = month_q.data or []

        # All orders for daily/monthly charts — only select needed columns, limit to recent 90 days
        ninety_days_ago = (today - timedelta(days=90)).isoformat()
        chart_q = supabase.table("orders").select("total,status,created_at").gte("created_at", ninety_days_ago).order("created_at", desc=True).execute()
        chart_orders = chart_q.data or []

        # Total count
        total_count = supabase.table("orders").select("id", count="exact").execute().count or 0

    except Exception as e:
        logger.error(f"Failed to fetch orders for stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to load order stats")

    # Daily chart (last 7 days)
    daily = {}
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        key = d.strftime("%a")
        day_orders = [o for o in chart_orders if _parse_created_date(o) == d]
        daily[key] = {"orders": len(day_orders), "revenue": sum(o.get("total", 0) for o in day_orders)}

    # Monthly chart (last 6 months)
    monthly = {}
    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        if m <= 0:
            m += 12
            y -= 1
        key = datetime(y, m, 1).strftime("%b %Y")
        month_orders_chart = [o for o in chart_orders if _parse_created_month(o) == (m, y)]
        monthly[key] = {"orders": len(month_orders_chart), "revenue": sum(o.get("total", 0) for o in month_orders_chart)}

    # Status counts from today's orders
    pending = preparing = delivered = cancelled = 0
    for o in today_orders:
        status = o.get("status")
        if status == "pending":
            pending += 1
        elif status == "preparing":
            preparing += 1
        elif status == "delivered":
            delivered += 1
        elif status == "cancelled":
            cancelled += 1

    result_data = {
        "daily": daily,
        "monthly": monthly,
        "today_orders": len(today_orders),
        "today_revenue": sum(o.get("total", 0) for o in today_orders),
        "week_orders": len(week_orders),
        "week_revenue": sum(o.get("total", 0) for o in week_orders),
        "month_orders": len(month_orders),
        "month_revenue": sum(o.get("total", 0) for o in month_orders),
        "total_orders": total_count,
        "total_revenue": sum(o.get("total", 0) for o in chart_orders),
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
        _order_cache.invalidate()
        return {**existing.data[0], **update_data}
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
            restore_ids = [item.get("id") for item in items_list if item.get("id") and item.get("quantity", 0) > 0]
            if restore_ids:
                stock_result = supabase.table("products").select("id,stock").in_("id", restore_ids).execute()
                stock_map = {p["id"]: p["stock"] for p in (stock_result.data or [])}
                for item in items_list:
                    pid = item.get("id")
                    qty = item.get("quantity", 0)
                    if pid and qty > 0:
                        new_stock = stock_map.get(pid, 0) + qty
                        supabase.table("products").update({"stock": new_stock}).eq("id", pid).execute()
        except Exception as e:
            logger.error(f"Failed to restore stock for order {order_id}: {e}")

    supabase.table("orders").update(update_data).eq("id", order_id).execute()
    log_activity(admin["username"], f"status:{status_val}", "order", order_id, f"Order #{order_id} ({order.get('customer_name', '')}) → {status_val}")
    _order_cache.invalidate()
    return {**order, **update_data}


@router.delete("/api/admin/orders/{order_id}")
def delete_order(order_id: int, data: Optional[DeleteRequest] = None, admin=Depends(require_super_admin)):
    existing = supabase.table("orders").select("*").eq("id", order_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Order not found")
    order = existing.data[0]
    reason = data.reason if data else ""
    log_activity(admin["username"], "delete", "order", order_id, f"Deleted order #{order_id} of {order.get('customer_name', '')} (₹{order.get('total', 0)}). Reason: {reason}")

    # Restore product stock before deleting (only if not already cancelled)
    if order.get("status") != "cancelled":
        try:
            items = order.get("items", "")
            if items:
                items_list = json.loads(items) if isinstance(items, str) else items
                if items_list:
                    ids = [item.get("id") for item in items_list if item.get("id")]
                    stock_result = supabase.table("products").select("id,stock").in_("id", ids).execute() if ids else None
                    stock_map = {p["id"]: p["stock"] for p in (stock_result.data or [])}
                    for item in items_list:
                        pid = item.get("id")
                        qty = item.get("quantity", 0)
                        if pid and qty > 0:
                            new_stock = stock_map.get(pid, 0) + qty
                            supabase.table("products").update({"stock": new_stock}).eq("id", pid).execute()
        except Exception as e:
            logger.error(f"Failed to restore stock for deleted order {order_id}: {e}")

    supabase.table("orders").delete().eq("id", order_id).execute()
    _order_cache.invalidate()
    return {"ok": True}
