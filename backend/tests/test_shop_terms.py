import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("JWT_SECRET", "r4nd0mS3cretValue2026abcdefghijk")

import pytest
from fastapi import HTTPException

import routers.orders as orders
import routers.terms as terms
from store import _seed_shop_terms_if_empty


def test_shop_terms_seed_is_scoped_and_idempotent():
    import sqlite3

    connection = sqlite3.connect(":memory:")
    connection.execute(
        """CREATE TABLE terms_conditions (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           title_en TEXT, title_te TEXT, title_hi TEXT,
           text_en TEXT, text_te TEXT, text_hi TEXT,
           sort_order INTEGER, is_active INTEGER, scope TEXT
        )"""
    )

    _seed_shop_terms_if_empty(connection)
    _seed_shop_terms_if_empty(connection)
    rows = connection.execute(
        "SELECT title_en, text_en, scope FROM terms_conditions ORDER BY sort_order"
    ).fetchall()

    assert len(rows) == 8
    assert rows[0][0] == "No Returns or Exchanges"
    assert rows[-1][0] == "Customer Support"
    assert all(scope == "shop" for _, _, scope in rows)


def test_shop_terms_snapshot_is_scoped_and_stable(monkeypatch):
    rows = [
        (1, "Shipping", "", "", "Delivery estimate", "", "", 0, 1, "created", "updated", "shop"),
        (2, "Storage", "", "", "Keep coffee cool", "", "", 1, 1, "created", "updated", "shop"),
    ]

    class FakeConnection:
        def execute(self, query):
            assert "scope = 'shop'" in query
            return self

        def fetchall(self):
            return rows

    monkeypatch.setattr(terms, "_get_conn", lambda: FakeConnection())
    first_terms, first_version = terms._shop_terms_snapshot()
    second_terms, second_version = terms._shop_terms_snapshot()

    assert [item["title_en"] for item in first_terms] == ["Shipping", "Storage"]
    assert first_version == second_version
    assert len(first_version) == 64


def test_shop_terms_acceptance_rejects_missing_and_stale_versions(monkeypatch):
    monkeypatch.setattr(orders, "_current_shop_terms_version", lambda: "current-version")

    with pytest.raises(HTTPException) as missing:
        orders._validate_shop_terms_acceptance(False, "current-version")
    assert missing.value.status_code == 400

    with pytest.raises(HTTPException) as stale:
        orders._validate_shop_terms_acceptance(True, "old-version")
    assert stale.value.status_code == 409

    assert orders._validate_shop_terms_acceptance(True, "current-version") == "current-version"
