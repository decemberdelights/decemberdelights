from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_admin, require_super_admin
from security import (
    validate_order_status, sanitize_input, RateLimiter, validate_email,
    get_client_ip, is_settings_not_configured,
)
from csrf import validate_csrf
from store import KVStore, _get_conn
from datetime import datetime, timedelta, timezone
from typing import Optional
import asyncio
import math
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

from order_pricing import calculate_order_totals, cart_fingerprint, normalize_cart_items, product_weight_grams


def _get_razorpay_client():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return None
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


class RazorpayOrderRequest(BaseModel):
    items: list[dict]
    customer_phone: str
    terms_accepted: bool = False
    terms_version: str = ""


class DeleteRequest(BaseModel):
    reason: str = ""


class RefundRequest(BaseModel):
    reason: str = "Refund requested by admin"


class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    customer_district: str = ""
    customer_pincode: str = ""
    customer_state: str = ""
    items: str
    notes: str = ""
    payment_method: str = "razorpay"
    razorpay_order_id: str = ""
    razorpay_payment_id: str = ""
    razorpay_signature: str = ""
    terms_accepted: bool = False
    terms_version: str = ""


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


def _validate_shop_terms_acceptance(accepted: bool, version: str) -> str:
    if not accepted:
        raise HTTPException(status_code=400, detail="Please accept the shop terms and conditions")
    try:
        terms_result = _current_shop_terms_version()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to validate shop terms acceptance: {e}")
        raise HTTPException(status_code=503, detail="Shop terms could not be verified") from e
    if not version or version != terms_result:
        raise HTTPException(
            status_code=409,
            detail="The shop terms have changed. Review and accept the current terms before continuing.",
        )
    return terms_result


def _current_shop_terms_version() -> str:
    import hashlib

    rows = _get_conn().execute(
        """SELECT id, title_en, text_en FROM terms_conditions
           WHERE scope = 'shop' AND is_active = 1
           ORDER BY sort_order ASC, id ASC"""
    ).fetchall()
    if not rows:
        raise HTTPException(status_code=503, detail="Shop terms are not available")
    canonical = json.dumps(
        [{"id": row[0], "title": row[1], "text": row[2]} for row in rows],
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


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


def _price_order_items(items: list[dict]) -> tuple[list[dict], float, float, float, float]:
    try:
        cart_items = normalize_cart_items(items)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    product_ids = [item["id"] for item in cart_items]
    try:
        products_result = supabase.table("products").select("*").in_("id", product_ids).execute()
    except Exception as e:
        logger.error(f"Failed to load products for checkout: {e}")
        raise HTTPException(status_code=503, detail="Products are temporarily unavailable") from e
    products_map = {int(product["id"]): product for product in (products_result.data or [])}

    sanitized_items = []
    subtotal = 0.0
    total_weight_grams = 0
    for item in cart_items:
        product = products_map.get(item["id"])
        if not product or not product.get("is_active", True):
            raise HTTPException(status_code=400, detail="One or more products are unavailable")
        quantity = item["quantity"]
        if int(product.get("stock") or 0) < quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.get('name', 'item')}",
            )
        try:
            price = float(product.get("price", 0))
        except (TypeError, ValueError):
            logger.error(f"Invalid catalog price for product {item['id']}")
            raise HTTPException(status_code=503, detail="Product pricing is temporarily unavailable") from None
        if not math.isfinite(price) or price < 0:
            logger.error(f"Negative catalog price for product {item['id']}")
            raise HTTPException(status_code=503, detail="Product pricing is temporarily unavailable")
        subtotal += price * quantity
        total_weight_grams += product_weight_grams(product.get("weight_grams")) * quantity
        sanitized_items.append({
            "id": item["id"],
            "name": product.get("name", ""),
            "price": price,
            "quantity": quantity,
        })

    return sanitized_items, *calculate_order_totals(subtotal, total_weight_grams)


def _refund_payment(payment_id: str, order_id: str, reason: str) -> str:
    client = _get_razorpay_client()
    if not client:
        raise RuntimeError("Razorpay client is unavailable")
    payment = client.payment.fetch(payment_id)
    remaining_amount = int(payment.get("amount", 0)) - int(payment.get("amount_refunded", 0))
    if remaining_amount <= 0:
        logger.info("Payment %s is already fully refunded", payment_id)
        return ""
    refund = client.payment.refund(payment_id, {
        "amount": remaining_amount,
        "notes": {
            "reason": sanitize_input(reason, 200),
            "razorpay_order_id": order_id,
        },
    })
    if isinstance(refund, dict) and refund.get("error"):
        raise RuntimeError(str(refund["error"]))
    return refund.get("id", "") if isinstance(refund, dict) else ""


def _ensure_shop_enabled() -> None:
    try:
        setting = supabase.table("site_settings").select("value").eq("key", "shop_enabled").execute()
        if setting.data and setting.data[0]["value"] == "false":
            raise HTTPException(status_code=403, detail="Shop is currently unavailable")
    except HTTPException:
        raise
    except Exception as e:
        if is_settings_not_configured(e):
            logger.warning(f"site_settings unavailable ({e}); allowing order (flag not configured)")
        else:
            logger.error(f"Failed to read shop_enabled flag, failing closed: {e}")
            raise HTTPException(status_code=503, detail="Shop is temporarily unavailable. Please try again shortly.") from e


from activity import log_activity
from email_service import send_contact_notification, send_order_confirmation, send_order_admin_notification


@router.post("/api/orders/create-order")
async def create_shop_razorpay_order(body: RazorpayOrderRequest, request: Request):
    client_ip = get_client_ip(request)
    rate_key = f"shop_order:{client_ip}"
    # SQLite-backed limiter is blocking — keep it off the event loop (workers=1).
    await asyncio.to_thread(order_limiter.check, rate_key)
    await asyncio.to_thread(_ensure_shop_enabled)
    terms_version = await asyncio.to_thread(
        _validate_shop_terms_acceptance,
        body.terms_accepted,
        body.terms_version,
    )

    client = _get_razorpay_client()
    if not client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")

    phone = sanitize_input(body.customer_phone, 20)
    cleaned = _normalize_phone(phone)
    if not cleaned.isdigit() or len(cleaned) < 7 or len(cleaned) > 15:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    sanitized_items, subtotal, gst_amount, delivery_charge, grand_total = await asyncio.to_thread(
        _price_order_items, body.items
    )
    amount_paise = int(round(grand_total * 100))
    if amount_paise < 1000:
        raise HTTPException(status_code=400, detail="Minimum order amount is ₹10")

    try:
        order = await asyncio.to_thread(
            lambda: client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"shop_{cleaned}_{uuid.uuid4().hex[:8]}",
                "notes": {
                    "phone": cleaned,
                    "purpose": "shop_order",
                    "terms_version": terms_version,
                    "cart_hash": cart_fingerprint([
                        {"id": item["id"], "quantity": item["quantity"]}
                        for item in sanitized_items
                    ]),
                },
            })
        )
        logger.info(f"Shop Razorpay order created: {order['id']} for phone={cleaned}")
        return {"order_id": order["id"], "amount": amount_paise, "currency": "INR", "key_id": RAZORPAY_KEY_ID}
    except Exception as e:
        logger.error(f"Shop Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment order. Please try again.")


@router.post("/api/orders")
def create_public_order(body: CreateOrderRequest, request: Request, background_tasks: BackgroundTasks = BackgroundTasks()):
    _ensure_shop_enabled()
    if not body.terms_accepted or not body.terms_version:
        raise HTTPException(status_code=400, detail="Shop terms acceptance is required")
    terms_version = body.terms_version

    client_ip = get_client_ip(request)
    rate_key = f"order:{client_ip}"
    order_limiter.check(rate_key)

    data = body.model_dump()
    data["customer_name"] = sanitize_input(data["customer_name"], 200)
    data["customer_email"] = sanitize_input(data["customer_email"], 200)
    data["customer_phone"] = sanitize_input(data["customer_phone"], 20)
    data["customer_address"] = sanitize_input(data["customer_address"], 500)
    data["notes"] = sanitize_input(data["notes"], 1000)

    if not data.get("customer_name") or not data.get("customer_phone") or not data.get("customer_address"):
        raise HTTPException(status_code=400, detail="Name, phone, and address are required")

    if data.get("customer_email") and not validate_email(data["customer_email"]):
        raise HTTPException(status_code=400, detail="A valid email address is required")

    phone = data["customer_phone"]
    cleaned = _normalize_phone(phone)
    if not cleaned.isdigit() or len(cleaned) < 7 or len(cleaned) > 15:
        raise HTTPException(status_code=400, detail="Invalid phone number format")

    try:
        items = json.loads(data["items"]) if isinstance(data["items"], str) else data["items"]
        if not isinstance(items, list):
            raise ValueError("Items must be an array")
    except (json.JSONDecodeError, ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid items format")
    sanitized_items, subtotal, gst_amount, delivery_charge, grand_total = _price_order_items(items)

    payment_method = data.get("payment_method", "razorpay")
    payment_status = "unpaid"

    if payment_method != "razorpay":
        raise HTTPException(status_code=400, detail="Online payment is required")

    rp_order_id = data.get("razorpay_order_id", "")
    rp_payment_id = data.get("razorpay_payment_id", "")
    rp_signature = data.get("razorpay_signature", "")
    if not rp_order_id or not rp_payment_id or not rp_signature:
        raise HTTPException(status_code=400, detail="Missing payment details for online payment")
    if not _verify_razorpay_signature(rp_order_id, rp_payment_id, rp_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed")
    client = _get_razorpay_client()
    if not client:
        raise HTTPException(status_code=503, detail="Payment gateway verification is unavailable")
    expected_hash = cart_fingerprint([
        {"id": item["id"], "quantity": item["quantity"]}
        for item in sanitized_items
    ])
    try:
        rp_order = client.order.fetch(rp_order_id)
        rp_notes = rp_order.get("notes") or {}
        expected_paise = int(round(grand_total * 100))
        if (
            rp_order.get("amount") != expected_paise
            or rp_order.get("currency") != "INR"
            or rp_notes.get("purpose") != "shop_order"
            or rp_notes.get("terms_version") != terms_version
            or rp_notes.get("cart_hash") != expected_hash
            or rp_notes.get("phone") != _normalize_phone(data["customer_phone"])
        ):
            raise HTTPException(status_code=400, detail="Payment order does not match this cart")
        payment = client.payment.fetch(rp_payment_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Razorpay payment verification lookup failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Payment could not be verified. Please contact support before retrying.",
        ) from e
    if (
        payment.get("status") != "captured"
        or payment.get("order_id") != rp_order_id
        or payment.get("currency") != "INR"
        or int(payment.get("amount", 0)) != expected_paise
    ):
        logger.warning(f"Razorpay payment {rp_payment_id} failed order/amount/capture checks")
        raise HTTPException(status_code=400, detail="Payment verification failed")
    payment_status = "paid"

    stock_items = [
        {"id": item["id"], "quantity": item["quantity"]}
        for item in sanitized_items
    ]
    order_data = {
        "customer_name": data["customer_name"],
        "customer_email": data["customer_email"],
        "customer_phone": data["customer_phone"],
        "customer_address": data["customer_address"],
        "customer_district": sanitize_input(data.get("customer_district", ""), 100),
        "customer_pincode": sanitize_input(data.get("customer_pincode", ""), 10),
        "customer_state": sanitize_input(data.get("customer_state", ""), 100),
        "items": json.dumps(sanitized_items),
        "total": grand_total,
        "subtotal": subtotal,
        "gst_amount": gst_amount,
        "delivery_charge": delivery_charge,
        "status": "pending",
        "payment_method": payment_method,
        "payment_status": payment_status,
        "notes": data.get("notes", ""),
        "razorpay_order_id": sanitize_input(rp_order_id, 100),
        "razorpay_payment_id": sanitize_input(rp_payment_id, 100),
        "terms_accepted": True,
        "terms_version": terms_version,
    }

    try:
        order_result = supabase.rpc(
            "create_paid_order",
            {"p_order": order_data, "p_items": stock_items},
        ).execute()
    except Exception as order_err:
        logger.critical(
            "Paid order creation result is unknown for payment %s: %s",
            rp_payment_id,
            order_err,
        )
        raise HTTPException(
            status_code=503,
            detail=(
                "Payment was received, but order status could not be confirmed. "
                f"Retry safely or contact support with payment reference {rp_payment_id}."
            ),
        ) from order_err

    order_result_data = order_result.data
    if not isinstance(order_result_data, dict):
        logger.error("Paid order RPC returned an invalid result for payment %s", rp_payment_id)
        raise HTTPException(
            status_code=503,
            detail=f"Payment was received, but order status could not be confirmed. Contact support with payment reference {rp_payment_id}.",
        )

    if order_result_data.get("stock_reserved") is False:
        try:
            _refund_payment(
                rp_payment_id,
                rp_order_id,
                "Order could not be fulfilled because stock reservation failed",
            )
        except Exception as refund_err:
            logger.critical(
                "Payment %s was captured but stock reservation failed and refund "
                "could not be initiated: %s",
                rp_payment_id,
                refund_err,
            )
            raise HTTPException(
                status_code=503,
                detail=(
                    "Payment was received, but the order could not be placed and "
                    f"the refund needs support follow-up. Payment reference: {rp_payment_id}"
                ),
            ) from refund_err
        logger.warning(
            "Payment %s captured but stock reservation failed; refund initiated",
            rp_payment_id,
        )
        raise HTTPException(
            status_code=409,
            detail="Payment was received, but the item is no longer available. A refund has been initiated.",
        )

    result_data = order_result_data.get("order")
    if not isinstance(result_data, dict) or "id" not in result_data:
        logger.error("Paid order RPC omitted order details for payment %s", rp_payment_id)
        raise HTTPException(
            status_code=503,
            detail=f"Payment was received, but order status could not be confirmed. Contact support with payment reference {rp_payment_id}.",
        )

    _order_cache.invalidate()

    # Send order confirmation email in background
    try:
        customer_email = data["customer_email"]
        full_address = f"{data['customer_address']}, {data.get('customer_district', '')}, {data.get('customer_state', '')} - {data.get('customer_pincode', '')}"
        if order_result_data.get("created") is True:
            # 1. Confirmation to the customer
            if customer_email:
                background_tasks.add_task(
                    send_order_confirmation,
                    customer_email, data["customer_name"], result_data["id"],
                    sanitized_items, grand_total, payment_method, full_address,
                    subtotal, gst_amount, delivery_charge
                )
            # 2. Notification to the shop inbox (info@decemberdelights.in)
            background_tasks.add_task(
                send_order_admin_notification,
                result_data["id"], data["customer_name"], customer_email,
                data["customer_phone"], sanitized_items, grand_total,
                payment_method, full_address, subtotal, gst_amount, delivery_charge
            )
    except Exception as e:
        logger.warning(f"Failed to queue order confirmation email: {e}")

    return {"id": result_data["id"], "status": result_data["status"]}


@router.get("/api/orders/track/{phone}")
def track_order(phone: str, request: Request):
    client_ip = get_client_ip(request)
    rate_key = f"track:{client_ip}"
    track_limiter.check(rate_key)

    cleaned = _normalize_phone(phone)
    if not cleaned.isdigit() or len(cleaned) < 7:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    # Public endpoint: NO internal columns (admin_notes, razorpay ids, notes,
    # payment_status stay admin-only).
    safe_cols = "id,customer_name,customer_phone,customer_address,customer_district,customer_pincode,customer_state,items,total,status,payment_method,created_at"

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
    # count="exact" + tiny limit: PostgREST still returns the TOTAL count in the
    # Content-Range header without shipping every order id to the app.
    total = supabase.table("orders").select("id", count="exact").limit(1).execute()
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

        # All orders for daily/monthly charts — only select needed columns, limit to recent 90 days.
        # Safety cap keeps a 90-day spike from shipping an unbounded row set;
        # values are unchanged for any realistic volume (shape identical).
        ninety_days_ago = (today - timedelta(days=90)).isoformat()
        chart_q = supabase.table("orders").select("total,status,created_at").gte("created_at", ninety_days_ago).order("created_at", desc=True).limit(10000).execute()
        chart_orders = chart_q.data or []

        # Total count (limit(1): count header only, no row payload)
        total_count = supabase.table("orders").select("id", count="exact").limit(1).execute().count or 0

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
def create_order(data: CreateAdminOrderRequest, request: Request, _=Depends(get_current_admin)):
    validate_csrf(request)
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
def update_order(order_id: int, data: UpdateOrderRequest, request: Request, _=Depends(get_current_admin)):
    validate_csrf(request)
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


@router.post("/api/admin/orders/{order_id}/refund")
def refund_order(
    order_id: int,
    data: RefundRequest,
    request: Request,
    admin=Depends(get_current_admin),
):
    validate_csrf(request)
    try:
        result = supabase.table("orders").select("*").eq("id", order_id).limit(1).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Order not found")
        order = result.data[0]
        if order.get("payment_method") != "razorpay" or not order.get("razorpay_payment_id"):
            raise HTTPException(status_code=400, detail="This order has no refundable online payment")
        if order.get("payment_status") == "refunded":
            raise HTTPException(status_code=409, detail="This order has already been refunded")
        if order.get("payment_status") != "paid":
            raise HTTPException(status_code=409, detail="Only paid orders can be refunded")

        claim = (
            supabase.table("orders")
            .update({"payment_status": "refund_pending"})
            .eq("id", order_id)
            .eq("payment_status", "paid")
            .select("id")
            .execute()
        )
        if not claim.data:
            raise HTTPException(
                status_code=409,
                detail="A refund is already being processed. Verify its status in Razorpay before retrying.",
            )

        refund_id = _refund_payment(
            order["razorpay_payment_id"],
            str(order.get("razorpay_order_id", "")),
            data.reason or "Refund requested by admin",
        )
        update_result = (
            supabase.table("orders")
            .update({"payment_status": "refunded"})
            .eq("id", order_id)
            .eq("payment_status", "refund_pending")
            .select("id,payment_status")
            .execute()
        )
        if not update_result.data:
            logger.critical(
                "Refund for order %s succeeded (refund %s), but order status could not be updated",
                order_id,
                refund_id,
            )
            raise HTTPException(
                status_code=503,
                detail=f"Refund was issued but order status update failed. Refresh and verify order #{order_id}.",
            )
        log_activity(
            admin["username"],
            "refund",
            "order",
            order_id,
            f"Refunded order #{order_id}. Refund ID: {refund_id or 'already refunded'}",
        )
        _order_cache.invalidate()
        return {"id": order_id, "payment_status": "refunded", "refund_id": refund_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Refund failed for order %s", order_id)
        raise HTTPException(
            status_code=502,
            detail="Refund could not be confirmed. Check the Razorpay dashboard before retrying.",
        ) from e


@router.put("/api/admin/orders/{order_id}/status")
def update_order_status(order_id: int, data: UpdateStatusRequest, request: Request, admin=Depends(get_current_admin)):
    validate_csrf(request)
    status_val = data.status
    if not validate_order_status(status_val):
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: pending, confirmed, preparing, packed, ready, dispatched, delivered, cancelled")
    existing = supabase.table("orders").select("*").eq("id", order_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Order not found")

    order = existing.data[0]
    old_status = order.get("status", "")
    update_data = {"status": status_val}
    if data.admin_notes:
        update_data["admin_notes"] = sanitize_input(data.admin_notes, 1000)

    if status_val == "cancelled" and old_status != "cancelled":
        # Refund if order was paid online via Razorpay.
        # This handler is sync (FastAPI runs it in the threadpool), so the
        # refund must be a plain blocking call. The old code used
        # asyncio.get_running_loop().run_in_executor(...) which raises
        # RuntimeError (no running loop in a worker thread) — silently caught
        # below — so NO refund was ever created, yet the order could still be
        # marked refunded. A customer is now only marked refunded when the
        # refund call actually succeeded.
        if order.get("payment_method") == "razorpay" and order.get("payment_status") == "refund_pending":
            raise HTTPException(
                status_code=409,
                detail="A refund is already being processed. Verify its status in Razorpay before cancelling.",
            )
        if order.get("payment_method") == "razorpay" and order.get("payment_status") == "paid":
            rp_payment_id = order.get("razorpay_payment_id", "")
            if not rp_payment_id:
                logger.error(
                    f"Order {order_id} is marked paid via Razorpay but has no "
                    f"razorpay_payment_id — cannot issue refund; cancelling WITHOUT refund mark"
                )
            elif not _get_razorpay_client():
                logger.error(f"Razorpay not configured; cannot refund order {order_id}")
                raise HTTPException(
                    status_code=502,
                    detail="Refund could not be issued (payment gateway not configured). "
                           "The order was NOT cancelled — please retry later.",
                )
            else:
                claim = (
                    supabase.table("orders")
                    .update({"payment_status": "refund_pending"})
                    .eq("id", order_id)
                    .eq("payment_status", "paid")
                    .select("id")
                    .execute()
                )
                if not claim.data:
                    raise HTTPException(
                        status_code=409,
                        detail="A refund is already being processed. Verify its status in Razorpay before cancelling.",
                    )
                refund_ok = False
                try:
                    refund_id = _refund_payment(
                        rp_payment_id,
                        str(order.get("razorpay_order_id", "")),
                        "Order cancelled by admin",
                    )
                    refund_ok = True
                    logger.info(f"Refund created for order {order_id}, payment {rp_payment_id} ({refund_id})")
                except Exception as refund_err:
                    err_text = str(refund_err).lower()
                    if "refund" in err_text and "already" in err_text:
                        logger.warning(
                            f"Refund already exists for order {order_id} payment {rp_payment_id}: {refund_err}"
                        )
                        raise HTTPException(
                            status_code=502,
                            detail="Refund status is uncertain. Check Razorpay before retrying cancellation.",
                        ) from refund_err
                    else:
                        logger.error(f"Refund FAILED for order {order_id} (payment {rp_payment_id}): {refund_err}")
                        raise HTTPException(
                            status_code=502,
                            detail="Refund could not be confirmed, so the order was NOT cancelled. "
                                   "Check Razorpay before retrying.",
                        )
                if refund_ok:
                    update_data["payment_status"] = "refunded"

        # Stock was atomically reserved via the reserve_order_stock RPC when the
        # order was created — releasing it back uses the atomic release_order_stock
        # RPC (no read-then-write race on the stock counter). Only paid online
        # orders held a reservation, so only those release stock here.
        if (
            status_val == "cancelled"
            and old_status != "cancelled"
            and order.get("payment_method") == "razorpay"
            and order.get("payment_status") in ("paid", "refunded")
        ):
            items = order.get("items", "[]")
            items_list = json.loads(items) if isinstance(items, str) else (items or [])
            stock_items = [
                {"id": item.get("id"), "quantity": item.get("quantity", 0)}
                for item in items_list
                if item.get("id") and item.get("quantity", 0) > 0
            ]
            if stock_items:
                _release_order_stock(stock_items)

    supabase.table("orders").update(update_data).eq("id", order_id).execute()
    log_activity(admin["username"], f"status:{status_val}", "order", order_id, f"Order #{order_id} ({order.get('customer_name', '')}) → {status_val}")
    _order_cache.invalidate()
    return {**order, **update_data}


@router.delete("/api/admin/orders/{order_id}")
def delete_order(order_id: int, request: Request, data: Optional[DeleteRequest] = None, admin=Depends(require_super_admin)):
    validate_csrf(request)
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
