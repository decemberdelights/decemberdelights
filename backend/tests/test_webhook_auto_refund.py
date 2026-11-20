"""Regression tests for the payment.captured auto-refund race.

Razorpay fires payment.captured before the customer's browser has called
POST /api/orders or POST /api/franchise. The webhook must therefore NOT refund
immediately, otherwise a perfectly good payment is cancelled and the customer
sees a verification error plus a refund email.

Franchise fees flow through this same webhook, so a captured payment must be
checked against `franchise_applications` and the local spillover queue as well
as `orders` — otherwise every franchise fee gets refunded.
"""
import asyncio
import hashlib
import hmac
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("JWT_SECRET", "r4nd0mS3cretValue2026abcdefghijk")

import pytest
from fastapi import HTTPException
from starlette.requests import Request
from starlette.background import BackgroundTasks

import local_queue
import routers.webhooks as webhooks

WEBHOOK_SECRET = "test_webhook_secret"
PAYMENT_ID = "pay_race_test_1"
AMOUNT = 61750
FRANCHISE_AMOUNT = 1179900

SHOP_NOTES = {"purpose": "shop_order", "phone": "919999999999"}
FRANCHISE_NOTES = {"email": "applicant@example.com", "phone": "9876543210"}


class FakeQuery:
    def __init__(self, result):
        self.result = result

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def execute(self):
        return type("Result", (), {"data": self.result})()


class FakeSupabase:
    """Routes each table to its own result set, or blows up when asked to."""

    def __init__(self, orders=None, franchise=None, explode=False):
        self.orders = orders or []
        self.franchise = franchise or []
        self.explode = explode

    def table(self, name):
        if self.explode:
            raise RuntimeError("database unavailable")
        if name == "orders":
            return FakeQuery(self.orders)
        if name == "franchise_applications":
            return FakeQuery(self.franchise)
        return FakeQuery([])


class FakePaymentResource:
    def __init__(self, payment, refunds):
        self._payment = payment
        self._refunds = refunds

    def fetch(self, _payment_id):
        return dict(self._payment)

    def refund(self, payment_id, payload):
        self._refunds.append((payment_id, payload))
        return {"id": "rfnd_test", "payment_id": payment_id, **payload}


class FakeRazorpay:
    def __init__(self, payment, refunds):
        self.payment = FakePaymentResource(payment, refunds)


def make_request(body: bytes) -> Request:
    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/webhooks/razorpay",
        "headers": [(b"content-type", b"application/json")],
        "client": ("127.0.0.1", 1234),
        "server": ("localhost", 80),
        "scheme": "http",
        "query_string": b"",
    }
    return Request(scope, receive=receive)


def signed_webhook(notes=None, event: str = "payment.captured", amount: int = AMOUNT):
    payload = {
        "event": event,
        "payload": {"payment": {"entity": {
            "id": PAYMENT_ID,
            "order_id": "order_race_test_1",
            "status": "captured" if event == "payment.captured" else "failed",
            "amount": amount,
            "notes": notes or {},
        }}},
    }
    body = json.dumps(payload).encode("utf-8")
    signature = hmac.new(WEBHOOK_SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return make_request(body), signature


def setup(monkeypatch, orders=None, franchise=None, explode=False, payment=None, refunds=None, queue=None):
    refunds = refunds if refunds is not None else []
    payment = payment or {
        "id": PAYMENT_ID,
        "status": "captured",
        "amount": AMOUNT,
        "amount_refunded": 0,
    }
    monkeypatch.setattr(webhooks, "RAZORPAY_WEBHOOK_SECRET", WEBHOOK_SECRET)
    monkeypatch.setattr(webhooks, "supabase", FakeSupabase(orders, franchise, explode))
    monkeypatch.setattr(webhooks, "_get_razorpay_client", lambda: FakeRazorpay(payment, refunds))
    monkeypatch.setattr(local_queue, "queue_list", lambda: queue or [])
    return refunds


def test_invalid_webhook_signature_is_rejected(monkeypatch):
    setup(monkeypatch)
    request, _signature = signed_webhook()

    with pytest.raises(HTTPException) as error:
        asyncio.run(webhooks.razorpay_webhook(request, BackgroundTasks(), "bad-signature"))

    assert error.value.status_code == 401


def test_shop_payment_without_record_defers_the_refund(monkeypatch):
    """The browser has not created the order yet — do NOT refund immediately."""
    refunds = setup(monkeypatch)
    request, signature = signed_webhook(notes=SHOP_NOTES)
    tasks = BackgroundTasks()

    result = asyncio.run(webhooks.razorpay_webhook(request, tasks, signature))

    assert result["deferred"] is True
    assert result["grace_seconds"] == webhooks.SHOP_AUTO_REFUND_GRACE_SECONDS
    # Refund is scheduled for later, not executed inline.
    assert len(tasks.tasks) == 1
    assert refunds == []


def test_franchise_payment_gets_a_longer_grace_period(monkeypatch):
    """Franchise submissions upload documents first and can take minutes."""
    refunds = setup(monkeypatch)
    request, signature = signed_webhook(notes=FRANCHISE_NOTES, amount=FRANCHISE_AMOUNT)
    tasks = BackgroundTasks()

    result = asyncio.run(webhooks.razorpay_webhook(request, tasks, signature))

    assert result["deferred"] is True
    assert result["grace_seconds"] == webhooks.NON_SHOP_AUTO_REFUND_GRACE_SECONDS
    assert len(tasks.tasks) == 1
    assert refunds == []


def test_franchise_application_is_never_refunded(monkeypatch):
    """CRITICAL: the old code only checked `orders`, so it refunded every fee."""
    refunds = setup(monkeypatch, franchise=[{"id": 7}])
    request, signature = signed_webhook(notes=FRANCHISE_NOTES, amount=FRANCHISE_AMOUNT)
    tasks = BackgroundTasks()

    result = asyncio.run(webhooks.razorpay_webhook(request, tasks, signature))

    assert result == {"ok": True}
    assert tasks.tasks == []
    assert refunds == []

    # Even after the grace period expires, the fee must stay untouched.
    webhooks._issue_auto_refund_if_still_unrecorded(
        PAYMENT_ID, FRANCHISE_AMOUNT, webhooks.NON_SHOP_AUTO_REFUND_GRACE_SECONDS
    )
    assert refunds == []


def test_queued_franchise_application_is_never_refunded(monkeypatch):
    """A captured fee whose DB write failed lives in the local queue."""
    refunds = setup(
        monkeypatch,
        queue=[{"qid": "q1", "data": {"razorpay_payment_id": PAYMENT_ID}}],
    )

    webhooks._issue_auto_refund_if_still_unrecorded(
        PAYMENT_ID, FRANCHISE_AMOUNT, webhooks.NON_SHOP_AUTO_REFUND_GRACE_SECONDS
    )

    assert refunds == []


def test_existing_shop_order_schedules_nothing(monkeypatch):
    refunds = setup(monkeypatch, orders=[{"id": 42}])
    request, signature = signed_webhook(notes=SHOP_NOTES)
    tasks = BackgroundTasks()

    result = asyncio.run(webhooks.razorpay_webhook(request, tasks, signature))

    assert result == {"ok": True}
    assert tasks.tasks == []
    assert refunds == []


def test_refund_is_skipped_when_record_appears_during_grace_period(monkeypatch):
    refunds = setup(monkeypatch, orders=[{"id": 42}])

    webhooks._issue_auto_refund_if_still_unrecorded(PAYMENT_ID, AMOUNT, 60)

    assert refunds == []


def test_refund_is_issued_when_no_record_ever_exists(monkeypatch):
    refunds = setup(monkeypatch)

    webhooks._issue_auto_refund_if_still_unrecorded(PAYMENT_ID, AMOUNT, 60)

    assert len(refunds) == 1
    refunded_payment_id, payload = refunds[0]
    assert refunded_payment_id == PAYMENT_ID
    assert payload["amount"] == AMOUNT


def test_double_refund_is_prevented(monkeypatch):
    """Razorpay may redeliver the event; never refund twice."""
    refunds = setup(
        monkeypatch,
        payment={
            "id": PAYMENT_ID,
            "status": "refunded",
            "amount": AMOUNT,
            "amount_refunded": AMOUNT,
        },
    )

    webhooks._issue_auto_refund_if_still_unrecorded(PAYMENT_ID, AMOUNT, 60)

    assert refunds == []


def test_non_captured_payment_is_never_refunded(monkeypatch):
    refunds = setup(
        monkeypatch,
        payment={"id": PAYMENT_ID, "status": "authorized", "amount": AMOUNT, "amount_refunded": 0},
    )

    webhooks._issue_auto_refund_if_still_unrecorded(PAYMENT_ID, AMOUNT, 60)

    assert refunds == []


def test_lookup_failure_fails_closed_and_never_refunds(monkeypatch):
    """If we cannot check ownership, keep the money rather than risk a refund."""
    refunds = setup(monkeypatch, explode=True)

    assert webhooks._payment_already_recorded(PAYMENT_ID) is True
    webhooks._issue_auto_refund_if_still_unrecorded(PAYMENT_ID, AMOUNT, 60)

    assert refunds == []
