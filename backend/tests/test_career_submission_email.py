import os
import sys

os.environ.setdefault("JWT_SECRET", "r4nd0mS3cretValue2026abcdefghijk")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.testclient import TestClient

import email_service
import routers.careers as careers


class FakeResult:
    data = [{"id": 321}]


class FakeQuery:
    def insert(self, _payload):
        return self

    def execute(self):
        return FakeResult()


class FakeSupabase:
    def table(self, _name):
        return FakeQuery()


app = FastAPI()
app.include_router(careers.router)


def test_successful_career_submission_sends_confirmation(monkeypatch):
    sent = []
    monkeypatch.setattr(careers, "supabase", FakeSupabase())
    monkeypatch.setattr(careers.careers_submit_limiter, "check", lambda _key: None)
    monkeypatch.setattr(
        email_service,
        "send_career_application_received",
        lambda *args: sent.append(args) or True,
    )

    response = TestClient(app).post(
        "/api/careers",
        data={
            "full_name": "Test Applicant",
            "email": "applicant@example.com",
            "phone": "9876543210",
            "position": "Barista",
            "message": "",
        },
    )

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert sent == [("applicant@example.com", "Test Applicant", "Barista")]


def test_career_confirmation_email_escapes_applicant_data(monkeypatch):
    sent = {}
    monkeypatch.setattr(
        email_service,
        "_send_email",
        lambda to, subject, html, plain: sent.update(
            to=to, subject=subject, html=html, plain=plain
        ) or True,
    )

    assert email_service.send_career_application_received(
        "applicant@example.com", "<Applicant>", "<Barista>"
    )
    assert sent["to"] == "applicant@example.com"
    assert "Career Application Received" in sent["subject"]
    assert "&lt;Applicant&gt;" in sent["html"]
    assert "&lt;Barista&gt;" in sent["html"]
    assert "<Applicant>" not in sent["html"]


def test_email_failure_does_not_fail_saved_application(monkeypatch):
    monkeypatch.setattr(careers, "supabase", FakeSupabase())
    monkeypatch.setattr(careers.careers_submit_limiter, "check", lambda _key: None)

    def fail_to_send(*_args):
        raise RuntimeError("SMTP unavailable")

    monkeypatch.setattr(email_service, "send_career_application_received", fail_to_send)

    response = TestClient(app).post(
        "/api/careers",
        data={
            "full_name": "Test Applicant",
            "email": "applicant@example.com",
            "phone": "9876543210",
            "position": "Barista",
            "message": "",
        },
    )

    assert response.status_code == 200
    assert response.json()["ok"] is True
