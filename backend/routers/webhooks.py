"""Razorpay webhook endpoint.

Handles asynchronous payment events from Razorpay so that a customer who pays
but closes the browser before the frontend calls POST /api/orders is not left
with a captured payment and no order.

Webhook signature verification uses RAZORPAY_WEBHOOK_SECRET (set in .env).
Razorpay sends the signature in the `X-Razorpay-Signature` header and the
payload as raw JSON in the body.

Supported events:
- payment.captured   -> if a shop order, franchise application, or queued
                        application already exists for this payment_id, nothing
                        to do. Otherwise wait a grace period for the browser to
                        record it, and only auto-refund when that expires with
                        no record found.
- payment.failed     -> mark any pending order with this payment_id as failed.

IMPORTANT: franchise fees flow through this same endpoint. A payment must be
checked against `franchise_applications` (and the local queue) as well as
`orders`, otherwise every franchise fee is refunded.
"""
import asyncio
import hmac
import hashlib
import json
import logging
import os
from fastapi import APIRouter, Request, HTTPException, Header, BackgroundTasks
from supabase_client import supabase
from routers.orders import _refund_razorpay_payment, _get_razorpay_client

logger = logging.getLogger(__name__)
router = APIRouter()

RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

# Razorpay fires payment.captured the instant the payment succeeds, which is
# usually BEFORE the customer's browser has finished calling POST /api/orders
# (or POST /api/franchise). Refunding immediately cancels a payment that is
# about to become a valid order, so the customer sees a verification error
# plus a refund email. We always wait first, then re-check.
#
# Shop checkouts post a tiny JSON payload and land within seconds.
# Franchise submissions upload several documents first (up to ~25MB), which can
# take minutes on a slow connection, so they get a much longer grace period —
# a refund that lands mid-upload would fail an otherwise valid application.
SHOP_AUTO_REFUND_GRACE_SECONDS = 60
NON_SHOP_AUTO_REFUND_GRACE_SECONDS = 600
AUTO_REFUND_GRACE_SECONDS = SHOP_AUTO_REFUND_GRACE_SECONDS


def _grace_seconds_for(payment_entity: dict) -> int:
    """Shop payments carry purpose=shop_order in their notes; everything else
    (franchise fees, unknown integrations) gets the longer grace period."""
    notes = payment_entity.get("notes") or {}
    if notes.get("purpose") == "shop_order":
        return SHOP_AUTO_REFUND_GRACE_SECONDS
    return NON_SHOP_AUTO_REFUND_GRACE_SECONDS


def _payment_already_recorded(payment_id: str) -> bool:
    """True when any of our systems already owns this payment.

    A captured payment can belong to a shop order, a franchise application, or
    a franchise application that is sitting in the local spillover queue. The
    old code only looked at `orders`, which made it refund EVERY franchise fee.

    Fails closed: if a lookup errors we assume the payment is accounted for,
    so we never refund money that belongs to a real order or application.
    """
    try:
        if supabase.table("orders").select("id").eq("razorpay_payment_id", payment_id).execute().data:
            return True
    except Exception as e:
        logger.error("orders lookup failed for %s — not refunding: %s", payment_id, e)
        return True

    try:
        if supabase.table("franchise_applications").select("id").eq("razorpay_payment_id", payment_id).execute().data:
            return True
    except Exception as e:
        logger.error("franchise lookup failed for %s — not refunding: %s", payment_id, e)
        return True

    try:
        from local_queue import queue_list

        for item in queue_list():
            if (item.get("data") or {}).get("razorpay_payment_id") == payment_id:
                return True
    except Exception as e:
        logger.error("queue lookup failed for %s — not refunding: %s", payment_id, e)
        return True

    return False


def _verify_razorpay_webhook_signature(body: bytes, signature: str) -> bool:
    if not signature:
        return False
    if not RAZORPAY_WEBHOOK_SECRET:
        logger.error("RAZORPAY_WEBHOOK_SECRET is not configured — rejecting webhook")
        return False
    expected = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def _auto_refund_if_payment_never_recorded(payment_id: str, amount, grace_seconds: int) -> None:
    """Wait for the browser to record the payment, then refund only if it never did.

    Razorpay delivers payment.captured faster than a browser can complete its
    follow-up request. Refunding on arrival therefore cancels payments that were
    about to become valid orders or applications.
    """
    try:
        await asyncio.sleep(grace_seconds)
    except asyncio.CancelledError:
        return

    try:
        # Blocking Supabase/Razorpay calls stay off the event loop.
        await asyncio.to_thread(_issue_auto_refund_if_still_unrecorded, payment_id, amount, grace_seconds)
    except Exception as e:
        logger.error(f"Auto-refund failed for payment {payment_id}: {e}")


def _issue_auto_refund_if_still_unrecorded(payment_id: str, amount, grace_seconds: int = AUTO_REFUND_GRACE_SECONDS) -> None:
    if _payment_already_recorded(payment_id):
        logger.info("Auto-refund skipped for %s: order or application was recorded during the grace period", payment_id)
        return

    client = _get_razorpay_client()
    if not client or not amount:
        return

    payment = client.payment.fetch(payment_id)
    status = payment.get("status")
    already_refunded = int(payment.get("amount_refunded", 0) or 0) > 0
    if status != "captured" or already_refunded:
        logger.info(
            "Auto-refund skipped for %s: status=%s amount_refunded=%s",
            payment_id, status, payment.get("amount_refunded"),
        )
        return

    logger.warning(
        "Captured payment %s has no record after %ss — auto-refunding %s paise",
        payment_id, grace_seconds, amount,
    )
    client.payment.refund(
        payment_id,
        {
            "amount": amount,
            "notes": {"reason": "Auto-refund: captured payment with no order or application created (customer abandoned checkout)"},
        },
    )
    logger.info("Auto-refund issued for payment %s", payment_id)


@router.post("/api/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_razorpay_signature: str = Header(None, alias="x-razorpay-signature"),
):
    body = await request.body()

    if not _verify_razorpay_webhook_signature(body, x_razorpay_signature):
        logger.warning("Razorpay webhook signature verification failed")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event", "")
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})

    payment_id = payment_entity.get("id")
    order_id = payment_entity.get("order_id")
    status = payment_entity.get("status")
    amount = payment_entity.get("amount")

    logger.info(f"Razorpay webhook: event={event} payment_id={payment_id} status={status}")

    if event == "payment.captured" and payment_id:
        # The payment may already belong to a shop order, a franchise
        # application, or a queued application — never touch accounted money.
        if await asyncio.to_thread(_payment_already_recorded, payment_id):
            return {"ok": True}

        # The browser is almost certainly about to record the payment, so answer
        # Razorpay immediately and decide about a refund later.
        grace_seconds = _grace_seconds_for(payment_entity)
        background_tasks.add_task(
            _auto_refund_if_payment_never_recorded, payment_id, amount, grace_seconds
        )
        return {"ok": True, "deferred": True, "grace_seconds": grace_seconds}

    if event == "payment.failed" and payment_id:
        # Mark any pending order with this payment_id as failed.
        existing = supabase.table("orders").select("id").eq("razorpay_payment_id", payment_id).eq("payment_status", "unpaid").execute()
        for row in (existing.data or []):
            supabase.table("orders").update({"payment_status": "failed", "status": "cancelled"}).eq("id", row["id"]).execute()
        return {"ok": True}

    return {"ok": True}
