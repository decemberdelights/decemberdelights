import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("JWT_SECRET", "r4nd0mS3cretValue2026abcdefghijk")

import pytest
from fastapi import HTTPException
from starlette.requests import Request
from starlette.background import BackgroundTasks

import routers.orders as orders
from order_pricing import cart_fingerprint


PAYMENT_ID = "pay_test_123"
RAZORPAY_ORDER_ID = "order_test_123"
TERMS_VERSION = "shop-terms-version"
ITEMS = [{"id": 1, "name": "Cake", "price": 1000.0, "quantity": 1}]


class FakeQuery:
    def __init__(self, result):
        self.result = result

    def execute(self):
        return type("Result", (), {"data": self.result})()


class FakeSupabase:
    def __init__(self, result):
        self.result = result

    def rpc(self, name, params):
        assert name == "create_paid_order"
        assert params["p_order"]["razorpay_payment_id"] == PAYMENT_ID
        assert params["p_items"] == [{"id": 1, "quantity": 1}]
        return FakeQuery(self.result)


class FakeRazorpay:
    def __init__(self):
        self.refunds = []
        self.order = type("OrderResource", (), {
            "fetch": lambda _self, order_id: {
                "id": order_id,
                "amount": 109000,
                "currency": "INR",
                "notes": {
                    "purpose": "shop_order",
                    "terms_version": TERMS_VERSION,
                    "cart_hash": cart_fingerprint([{"id": 1, "quantity": 1}]),
                    "phone": "919999999999",
                },
            },
        })()
        self.payment = type("PaymentResource", (), {
            "fetch": lambda _self, payment_id: {
                "id": payment_id,
                "order_id": RAZORPAY_ORDER_ID,
                "status": "captured",
                "currency": "INR",
                "amount": 109000,
            },
            "refund": lambda _self, payment_id, payload: self.refunds.append((payment_id, payload)),
        })()


def make_request():
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/api/orders",
        "headers": [],
        "client": ("127.0.0.1", 1234),
        "server": ("localhost", 80),
        "scheme": "http",
        "query_string": b"",
    })


def setup_order_mocks(monkeypatch, rpc_result):
    gateway = FakeRazorpay()
    monkeypatch.setattr(orders, "_ensure_shop_enabled", lambda: None)
    monkeypatch.setattr(orders.order_limiter, "check", lambda _key: None)
    monkeypatch.setattr(
        orders,
        "_price_order_items",
        lambda _items: (ITEMS, 1000.0, 50.0, 40.0, 1090.0),
    )
    monkeypatch.setattr(orders, "_verify_razorpay_signature", lambda *_args: True)
    monkeypatch.setattr(orders, "_get_razorpay_client", lambda: gateway)
    monkeypatch.setattr(orders, "supabase", FakeSupabase(rpc_result))
    monkeypatch.setattr(orders._order_cache, "invalidate", lambda: None)
    return gateway


def make_body():
    return orders.CreateOrderRequest(
        customer_name="Test Customer",
        customer_email="",
        customer_phone="+91 99999 99999",
        customer_address="Test address",
        items='[{"id":1,"quantity":1}]',
        razorpay_order_id=RAZORPAY_ORDER_ID,
        razorpay_payment_id=PAYMENT_ID,
        razorpay_signature="valid-signature",
        terms_accepted=True,
        terms_version=TERMS_VERSION,
    )


def test_repeated_captured_payment_returns_existing_order(monkeypatch):
    setup_order_mocks(
        monkeypatch,
        {"created": False, "order": {"id": 42, "status": "pending"}},
    )

    result = orders.create_public_order(make_body(), make_request(), BackgroundTasks())

    assert result == {"id": 42, "status": "pending"}


def test_order_rejects_missing_shop_terms_acceptance(monkeypatch):
    setup_order_mocks(monkeypatch, {"created": True, "order": {"id": 42, "status": "pending"}})
    body = make_body()
    body.terms_accepted = False

    with pytest.raises(HTTPException) as error:
        orders.create_public_order(body, make_request(), BackgroundTasks())

    assert error.value.status_code == 400
    assert "terms acceptance is required" in error.value.detail


def test_failed_stock_reservation_initiates_full_refund(monkeypatch):
    gateway = setup_order_mocks(monkeypatch, {"created": False, "stock_reserved": False})

    with pytest.raises(HTTPException) as error:
        orders.create_public_order(make_body(), make_request(), BackgroundTasks())

    assert error.value.status_code == 409
    assert "refund has been initiated" in error.value.detail
    assert gateway.refunds[0][0] == PAYMENT_ID
    assert gateway.refunds[0][1]["amount"] == 109000
    assert gateway.refunds[0][1]["notes"]["razorpay_order_id"] == RAZORPAY_ORDER_ID


def test_failed_refund_surfaces_payment_reference(monkeypatch):
    gateway = setup_order_mocks(monkeypatch, {"created": False, "stock_reserved": False})
    gateway.payment.refund = lambda *_args: (_ for _ in ()).throw(RuntimeError("gateway unavailable"))

    with pytest.raises(HTTPException) as error:
        orders.create_public_order(make_body(), make_request(), BackgroundTasks())

    assert error.value.status_code == 503
    assert PAYMENT_ID in error.value.detail


def test_retry_does_not_refund_a_payment_twice(monkeypatch):
    gateway = setup_order_mocks(monkeypatch, {"created": False, "stock_reserved": False})
    gateway.payment.fetch = lambda _payment_id: {
        "amount": 109000,
        "amount_refunded": 109000,
    }

    with pytest.raises(HTTPException):
        orders.create_public_order(make_body(), make_request(), BackgroundTasks())

    assert gateway.refunds == []


def test_partial_refund_only_refunds_remaining_captured_amount(monkeypatch):
    gateway = FakeRazorpay()
    gateway.payment.fetch = lambda _payment_id: {
        "amount": 109000,
        "amount_refunded": 25000,
    }
    monkeypatch.setattr(orders, "_get_razorpay_client", lambda: gateway)

    orders._refund_payment(PAYMENT_ID, RAZORPAY_ORDER_ID, "Admin refund")

    assert gateway.refunds[0][0] == PAYMENT_ID
    assert gateway.refunds[0][1]["amount"] == 84000
