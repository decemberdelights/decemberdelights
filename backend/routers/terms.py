from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Literal, Optional
from store import _get_conn
from auth import get_current_admin, require_super_admin
from security import sanitize_input, sanitize_terms_text
from csrf import validate_csrf
from activity import log_activity
import logging
import hashlib
import json

logger = logging.getLogger(__name__)
router = APIRouter()


class TermItem(BaseModel):
    id: Optional[int] = None
    title_en: str = ""
    title_te: str = ""
    title_hi: str = ""
    text_en: str = ""
    text_te: str = ""
    text_hi: str = ""
    sort_order: int = 0
    is_active: bool = True
    scope: Literal["franchise", "shop"] = "franchise"


class TermUpdate(BaseModel):
    title_en: Optional[str] = None
    title_te: Optional[str] = None
    title_hi: Optional[str] = None
    text_en: Optional[str] = None
    text_te: Optional[str] = None
    text_hi: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    scope: Optional[Literal["franchise", "shop"]] = None


def _row_to_dict(row) -> dict:
    return {
        "id": row[0], "title_en": row[1], "title_te": row[2], "title_hi": row[3],
        "text_en": row[4], "text_te": row[5], "text_hi": row[6],
        "sort_order": row[7], "is_active": bool(row[8]),
        "created_at": row[9], "updated_at": row[10],
        "scope": row[11] if len(row) > 11 else "franchise",
    }


def _shop_terms_snapshot() -> tuple[list[dict], str]:
    conn = _get_conn()
    rows = conn.execute(
        """SELECT * FROM terms_conditions
           WHERE scope = 'shop' AND is_active = 1
           ORDER BY sort_order ASC, id ASC"""
    ).fetchall()
    terms = [_row_to_dict(row) for row in rows]
    version_data = [
        {"id": term["id"], "title": term["title_en"], "text": term["text_en"]}
        for term in terms
    ]
    version = hashlib.sha256(
        json.dumps(version_data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return terms, version


@router.get("/api/terms")
def get_terms():
    """Public endpoint to get active terms."""
    try:
        conn = _get_conn()
        rows = conn.execute(
            """SELECT * FROM terms_conditions
               WHERE scope = 'franchise' AND is_active = 1
               ORDER BY sort_order ASC, id ASC"""
        ).fetchall()
        return [_row_to_dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Error fetching terms: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch terms")


@router.get("/api/shop/terms")
def get_shop_terms():
    try:
        terms, version = _shop_terms_snapshot()
        if not terms:
            raise HTTPException(status_code=503, detail="Shop terms are not available")
        return {"terms": terms, "version": version}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shop terms: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch shop terms") from e


@router.get("/api/admin/terms")
def get_all_terms(admin=Depends(get_current_admin)):
    """Admin endpoint to get all terms (including inactive)."""
    try:
        conn = _get_conn()
        rows = conn.execute(
            "SELECT * FROM terms_conditions ORDER BY sort_order ASC, id ASC"
        ).fetchall()
        return [_row_to_dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Error fetching all terms: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch terms")


@router.post("/api/admin/terms")
def create_term(item: TermItem, request: Request, admin=Depends(require_super_admin)):
    """Create a new term (super_admin only)."""
    validate_csrf(request)
    try:
        conn = _get_conn()
        cursor = conn.execute(
            """INSERT INTO terms_conditions
               (title_en, title_te, title_hi, text_en, text_te, text_hi, sort_order, is_active, scope)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                sanitize_input(item.title_en, 500),
                sanitize_input(item.title_te, 500),
                sanitize_input(item.title_hi, 500),
                sanitize_terms_text(item.text_en, 5000),
                sanitize_terms_text(item.text_te, 5000),
                sanitize_terms_text(item.text_hi, 5000),
                item.sort_order,
                1 if item.is_active else 0,
                item.scope,
            ),
        )
        conn.commit()
        term_id = cursor.lastrowid
        log_activity(admin["username"], "create", "terms_conditions", term_id,
                     f"Created term: {item.title_en[:50]}")
        row = conn.execute("SELECT * FROM terms_conditions WHERE id = ?", (term_id,)).fetchone()
        return _row_to_dict(row)
    except Exception as e:
        logger.error(f"Error creating term: {e}")
        raise HTTPException(status_code=500, detail="Failed to create term")


@router.put("/api/admin/terms/{term_id}")
def update_term(term_id: int, item: TermUpdate, request: Request, admin=Depends(require_super_admin)):
    """Update a term (super_admin only)."""
    validate_csrf(request)
    try:
        conn = _get_conn()
        existing = conn.execute("SELECT id FROM terms_conditions WHERE id = ?", (term_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Term not found")

        updates = []
        params = []
        for field in ["title_en", "title_te", "title_hi", "text_en", "text_te", "text_hi", "sort_order", "is_active", "scope"]:
            val = getattr(item, field, None)
            if val is not None:
                if isinstance(val, str):
                    max_len = 500 if field.startswith("title") else 5000
                    value = sanitize_terms_text(val, max_len) if field.startswith("text") else sanitize_input(val, max_len)
                    updates.append(f"{field} = ?")
                    params.append(value)
                elif isinstance(val, bool):
                    updates.append(f"{field} = ?")
                    params.append(1 if val else 0)
                else:
                    updates.append(f"{field} = ?")
                    params.append(val)

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        updates.append("updated_at = datetime('now')")
        params.append(term_id)
        conn.execute(f"UPDATE terms_conditions SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
        log_activity(admin["username"], "update", "terms_conditions", term_id,
                     f"Updated term {term_id}")
        row = conn.execute("SELECT * FROM terms_conditions WHERE id = ?", (term_id,)).fetchone()
        return _row_to_dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating term {term_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update term")


@router.delete("/api/admin/terms/{term_id}")
def delete_term(term_id: int, request: Request, admin=Depends(require_super_admin)):
    """Delete a term (super_admin only)."""
    validate_csrf(request)
    try:
        conn = _get_conn()
        existing = conn.execute("SELECT id, title_en FROM terms_conditions WHERE id = ?", (term_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Term not found")

        conn.execute("DELETE FROM terms_conditions WHERE id = ?", (term_id,))
        conn.commit()
        log_activity(admin["username"], "delete", "terms_conditions", term_id,
                     f"Deleted term: {existing[1][:50]}")
        return {"detail": "Term deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting term {term_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete term")
