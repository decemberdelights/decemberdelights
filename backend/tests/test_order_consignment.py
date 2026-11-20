import os
import sys

os.environ.setdefault("JWT_SECRET", "r4nd0mS3cretValue2026abcdefghijk")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.orders as orders


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, store, table_name="orders"):
        self.store = store
        self.table_name = table_name
        self.action = "select"
        self.payload = None
        self.filters = {}

    def select(self, _columns):
        self.action = "select"
        return self

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def eq(self, column, value):
        self.filters[column] = value
        return self

    def order(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def execute(self):
        if self.action == "update":
            self.store.setdefault("updates", []).append((self.table_name, self.payload, dict(self.filters)))
            if self.store.get("order"):
                self.store["order"].update(self.payload)
            return FakeResult([])
        order = self.store.get("order")
        order_id = self.filters.get("id")
        if order_id is not None:
            return FakeResult([order] if order and order.get("id") == order_id else [])
        return FakeResult([order] if order else [])


class FakeSupabase:
    def __init__(self, store):
        self.store = store

    def table(self, name):
        return FakeQuery(self.store, name)


def make_client(monkeypatch, order):
    store = {"order": dict(order)}
    app = FastAPI()
    app.include_router(orders.router)
    app.dependency_overrides[orders.get_current_admin] = lambda: {
        "username": "admin",
        "role": "super_admin",
    }
    monkeypatch.setattr(orders, "supabase", FakeSupabase(store))
    monkeypatch.setattr(orders, "validate_csrf", lambda _request: None)
    monkeypatch.setattr(orders, "log_activity", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(orders._order_cache, "invalidate", lambda: None)
    monkeypatch.setattr(orders.track_limiter, "check", lambda _key: None)
    monkeypatch.setattr(orders, "_consignment_column_ready", lambda: True)
    return TestClient(app), store


BASE_ORDER = {
    "id": 42,
    "customer_name": "Test Customer",
    "customer_phone": "9876543210",
    "status": "preparing",
    "consignment_number": "",
}


def test_dispatch_requires_consignment_number(monkeypatch):
    client, store = make_client(monkeypatch, BASE_ORDER)

    response = client.put("/api/admin/orders/42/status", json={"status": "dispatched"})

    assert response.status_code == 400
    assert "Consignment number is required" in response.json()["detail"]
    assert not store.get("updates")


def test_dispatch_saves_consignment_number(monkeypatch):
    client, store = make_client(monkeypatch, BASE_ORDER)

    response = client.put(
        "/api/admin/orders/42/status",
        json={"status": "dispatched", "consignment_number": "ee123456789in"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "dispatched"
    assert response.json()["consignment_number"] == "EE123456789IN"
    assert store["updates"][0][1] == {
        "status": "dispatched",
        "consignment_number": "EE123456789IN",
    }


def test_dispatch_allows_existing_consignment(monkeypatch):
    order = dict(BASE_ORDER, consignment_number="EE123456789IN")
    client, store = make_client(monkeypatch, order)

    response = client.put("/api/admin/orders/42/status", json={"status": "dispatched"})

    assert response.status_code == 200
    assert store["updates"][0][1] == {"status": "dispatched"}


def test_dispatch_rejects_too_short_consignment(monkeypatch):
    client, _store = make_client(monkeypatch, BASE_ORDER)

    response = client.put(
        "/api/admin/orders/42/status",
        json={"status": "dispatched", "consignment_number": "AB"},
    )

    assert response.status_code == 400
    assert "between 4 and 40" in response.json()["detail"]


def test_delivered_does_not_require_consignment(monkeypatch):
    order = dict(BASE_ORDER, status="dispatched", consignment_number="EE123456789IN")
    client, _store = make_client(monkeypatch, order)

    response = client.put("/api/admin/orders/42/status", json={"status": "delivered"})

    assert response.status_code == 200


def test_track_returns_consignment_number(monkeypatch):
    order = dict(
        BASE_ORDER,
        status="dispatched",
        consignment_number="EE123456789IN",
        customer_address="Test address",
        items="[]",
        total=499,
        payment_method="razorpay",
        created_at="2026-11-20T10:00:00+00:00",
    )
    client, _store = make_client(monkeypatch, order)

    response = client.get("/api/orders/track/9876543210")

    assert response.status_code == 200
    assert response.json()[0]["consignment_number"] == "EE123456789IN"


def test_track_works_before_migration(monkeypatch):
    order = dict(BASE_ORDER, status="preparing", customer_address="Test address", items="[]", total=499, created_at="2026-11-20T10:00:00+00:00")
    order.pop("consignment_number")
    client, _store = make_client(monkeypatch, order)
    monkeypatch.setattr(orders, "_consignment_column_ready", lambda: False)

    response = client.get("/api/orders/track/9876543210")

    assert response.status_code == 200
    assert response.json()[0]["id"] == 42
