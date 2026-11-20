import os
import sys
from io import BytesIO

os.environ.setdefault("JWT_SECRET", "r4nd0mS3cretValue2026abcdefghijk")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.franchise as franchise


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table_name, action="select", payload=None):
        self.table_name = table_name
        self.action = action
        self.payload = payload

    def select(self, _columns):
        self.action = "select"
        return self

    def eq(self, _column, _value):
        return self

    def insert(self, payload):
        self.action = "insert"
        self.payload = payload
        return self

    def execute(self):
        if self.action == "insert":
            saved_applications.append(self.payload)
            return FakeResult([{"id": 123}])
        return FakeResult([])


class FakeSupabase:
    def table(self, name):
        return FakeQuery(name)


class FailingInsertQuery(FakeQuery):
    def execute(self):
        if self.action == "insert":
            raise RuntimeError("temporary server failure")
        return super().execute()


class FailingInsertSupabase:
    def table(self, name):
        return FailingInsertQuery(name)


class FakePaymentClient:
    class Payment:
        def fetch(self, payment_id):
            return {
                "id": payment_id,
                "status": "captured",
                "amount": franchise.FRANCHISE_FEE_PAISE,
                "currency": "INR",
            }

    payment = Payment()

    class Order:
        def create(self, payload):
            assert payload["amount"] == franchise.FRANCHISE_FEE_PAISE
            assert payload["currency"] == "INR"
            return {"id": "order_test_123"}

    order = Order()


saved_applications = []
app = FastAPI()
app.include_router(franchise.router)


def setup_franchise_mocks(monkeypatch):
    saved_applications.clear()
    stored_files = []
    monkeypatch.setattr(franchise, "supabase", FakeSupabase())
    monkeypatch.setattr(franchise.franchise_limiter, "check", lambda _key: None)
    monkeypatch.setattr(franchise, "_get_client", FakePaymentClient)
    monkeypatch.setattr(franchise, "_verify_signature", lambda *_args: True)
    monkeypatch.setattr(
        franchise,
        "save_private_doc_local",
        lambda content, filename, subdir: stored_files.append((filename, content, subdir))
        or f"/uploads/private/{subdir}/{filename}",
    )
    monkeypatch.setattr(franchise, "send_franchise_confirmation", lambda *_args: None)
    monkeypatch.setattr(franchise, "send_franchise_admin_notification", lambda *_args: None)
    return stored_files


def test_franchise_order_and_application_accept_jpg_and_jpeg(monkeypatch):
    stored_files = setup_franchise_mocks(monkeypatch)
    client = TestClient(app)

    order_response = client.post(
        "/api/franchise/create-order",
        json={"email": "applicant@example.com", "phone": "9876543210"},
    )
    assert order_response.status_code == 200
    assert order_response.json() == {
        "order_id": "order_test_123",
        "amount": franchise.FRANCHISE_FEE_PAISE,
        "currency": "INR",
        "key_id": franchise.RAZORPAY_KEY_ID,
    }

    multipart_data = {
        "full_name": "Test Applicant",
        "email": "applicant@example.com",
        "phone": "9876543210",
        "dob": "1990-01-01",
        "franchise_type": "city",
        "preferred_location": "Test City",
        "tc_accepted": "true",
        "razorpay_order_id": "order_test_123",
        "razorpay_payment_id": "pay_test_123",
        "razorpay_signature": "valid-test-signature",
    }
    # Content must start with real JPEG magic bytes (\xff\xd8\xff) —
    # the backend validates actual file content, not just the extension.
    fake_jpeg = b"\xff\xd8\xff\xe0" + b"jpeg-data"
    files = {
        "aadhaar": ("aadhaar.jpg", BytesIO(fake_jpeg), "image/jpeg"),
        "pan": ("pan.jpeg", BytesIO(fake_jpeg), "image/jpg"),
        "bank_statement": ("bank.jpg", BytesIO(fake_jpeg), "image/jpeg"),
        "address_proof": ("address.jpeg", BytesIO(fake_jpeg), "image/jpeg"),
    }

    submit_response = client.post("/api/franchise", data=multipart_data, files=files)

    assert submit_response.status_code == 200, submit_response.text
    result = submit_response.json()
    assert result["ok"] is True
    assert result["id"] == 123
    assert result["login_id"].startswith("DD-")
    assert len(stored_files) == 4
    assert [file[0] for file in stored_files] == [
        "aadhaar.jpg",
        "pan.jpeg",
        "bank.jpg",
        "address.jpeg",
    ]
    assert len(saved_applications) == 1
    assert saved_applications[0]["franchise_type"] == "city"
    assert saved_applications[0]["payment_status"] == "paid"
    assert saved_applications[0]["razorpay_payment_id"] == "pay_test_123"


def test_franchise_application_requires_terms_acceptance(monkeypatch):
    setup_franchise_mocks(monkeypatch)
    response = TestClient(app).post(
        "/api/franchise",
        data={
            "full_name": "Test Applicant",
            "email": "applicant@example.com",
            "phone": "9876543210",
            "franchise_type": "city",
            "tc_accepted": "false",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Please accept the franchise terms and conditions"
    assert saved_applications == []


def test_captured_franchise_application_is_queued_when_database_write_fails(monkeypatch):
    setup_franchise_mocks(monkeypatch)
    queued = []
    monkeypatch.setattr(franchise, "supabase", FailingInsertSupabase())
    monkeypatch.setattr("local_queue.queue_push", lambda data: queued.append(data) or "queued_123")
    fake_jpeg = b"\xff\xd8\xff\xe0" + b"jpeg-data"
    response = TestClient(app).post(
        "/api/franchise",
        data={
            "full_name": "Test Applicant",
            "email": "applicant@example.com",
            "phone": "9876543210",
            "dob": "1990-01-01",
            "franchise_type": "city",
            "tc_accepted": "true",
            "razorpay_order_id": "order_test_123",
            "razorpay_payment_id": "pay_test_123",
            "razorpay_signature": "valid-test-signature",
        },
        files={
            "aadhaar": ("aadhaar.jpg", BytesIO(fake_jpeg), "image/jpeg"),
            "pan": ("pan.jpg", BytesIO(fake_jpeg), "image/jpeg"),
            "bank_statement": ("bank.jpg", BytesIO(fake_jpeg), "image/jpeg"),
            "address_proof": ("address.jpg", BytesIO(fake_jpeg), "image/jpeg"),
        },
    )

    assert response.status_code == 200
    assert response.json()["queued"] is True
    assert response.json()["queue_id"] == "queued_123"
    assert queued[0]["payment_status"] == "paid"
    assert queued[0]["razorpay_payment_id"] == "pay_test_123"
    assert queued[0]["tc_accepted"] is True


def test_franchise_application_requires_date_of_birth(monkeypatch):
    """DOB is the login credential — an application without one is unreachable."""
    setup_franchise_mocks(monkeypatch)
    fake_jpeg = b"\xff\xd8\xff\xe0" + b"jpeg-data"
    response = TestClient(app).post(
        "/api/franchise",
        data={
            "full_name": "Test Applicant",
            "email": "applicant@example.com",
            "phone": "9876543210",
            "franchise_type": "city",
            "tc_accepted": "true",
            "razorpay_order_id": "order_test_123",
            "razorpay_payment_id": "pay_test_123",
            "razorpay_signature": "valid-test-signature",
        },
        files={
            "aadhaar": ("aadhaar.jpg", BytesIO(fake_jpeg), "image/jpeg"),
            "pan": ("pan.jpg", BytesIO(fake_jpeg), "image/jpeg"),
            "bank_statement": ("bank.jpg", BytesIO(fake_jpeg), "image/jpeg"),
            "address_proof": ("address.jpg", BytesIO(fake_jpeg), "image/jpeg"),
        },
    )

    assert response.status_code == 400
    assert "date of birth" in response.json()["detail"].lower()
    assert saved_applications == []


def test_franchise_application_requires_mandatory_documents(monkeypatch):
    """The UI marks 4 documents mandatory; the API must enforce it too."""
    setup_franchise_mocks(monkeypatch)
    response = TestClient(app).post(
        "/api/franchise",
        data={
            "full_name": "Test Applicant",
            "email": "applicant@example.com",
            "phone": "9876543210",
            "dob": "1990-01-01",
            "franchise_type": "city",
            "tc_accepted": "true",
            "razorpay_order_id": "order_test_123",
            "razorpay_payment_id": "pay_test_123",
            "razorpay_signature": "valid-test-signature",
        },
    )

    assert response.status_code == 400
    assert "document is required" in response.json()["detail"]
    assert saved_applications == []


def test_franchise_create_order_rejects_duplicate_phone_before_charging(monkeypatch):
    """Duplicate check must happen BEFORE the ₹11,799 fee is captured."""
    setup_franchise_mocks(monkeypatch)

    class DupQuery(FakeQuery):
        def execute(self):
            return FakeResult([{"id": 5, "login_id": "DD-EXISTING123"}])

    class DupSupabase:
        def table(self, _name):
            return DupQuery("franchise_applications")

    monkeypatch.setattr(franchise, "supabase", DupSupabase())

    response = TestClient(app).post(
        "/api/franchise/create-order",
        json={"email": "applicant@example.com", "phone": "9876543210"},
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]
