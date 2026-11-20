import os
import sys

os.environ.setdefault("JWT_SECRET", "r4nd0mS3cretValue2026abcdefghijk")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from starlette.requests import Request

import local_queue
import routers.system as system


def make_request():
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/api/admin/queue/sync",
        "headers": [],
        "client": ("127.0.0.1", 1234),
        "server": ("localhost", 80),
        "scheme": "http",
        "query_string": b"",
    })


def test_queue_sync_removes_submission_already_saved_to_database(monkeypatch):
    queued = [{
        "qid": "queued_123",
        "data": {"razorpay_payment_id": "pay_existing"},
    }]
    removed = []

    class Query:
        def select(self, _columns):
            return self

        def eq(self, _column, _value):
            return self

        def limit(self, _count):
            return self

        def insert(self, _data):
            raise AssertionError("an already-persisted application must not be inserted again")

        def execute(self):
            return type("Result", (), {"data": [{"id": 42}]})()

    class Supabase:
        def table(self, _name):
            return Query()

    monkeypatch.setattr(system, "supabase", Supabase())
    monkeypatch.setattr(system, "validate_csrf", lambda _request: None)
    monkeypatch.setattr(local_queue, "queue_list", lambda: queued)
    monkeypatch.setattr(local_queue, "queue_pop", lambda qid: removed.append(qid) or queued.pop(0))

    result = system.queue_sync(make_request(), admin={})

    assert result == {"synced": 1, "failed": [], "remaining": 0}
    assert removed == ["queued_123"]
