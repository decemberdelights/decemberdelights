from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from store import _get_conn
from auth import get_current_admin, require_super_admin
from security import sanitize_input
from activity import log_activity
import logging

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


class TermUpdate(BaseModel):
    title_en: Optional[str] = None
    title_te: Optional[str] = None
    title_hi: Optional[str] = None
    text_en: Optional[str] = None
    text_te: Optional[str] = None
    text_hi: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


def _row_to_dict(row) -> dict:
    return {
        "id": row[0], "title_en": row[1], "title_te": row[2], "title_hi": row[3],
        "text_en": row[4], "text_te": row[5], "text_hi": row[6],
        "sort_order": row[7], "is_active": bool(row[8]),
        "created_at": row[9], "updated_at": row[10],
    }


@router.get("/api/terms")
def get_terms():
    """Public endpoint to get active terms."""
    try:
        conn = _get_conn()
        rows = conn.execute(
            "SELECT * FROM terms_conditions WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
        ).fetchall()
        return [_row_to_dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Error fetching terms: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch terms")


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
    try:
        conn = _get_conn()
        cursor = conn.execute(
            """INSERT INTO terms_conditions (title_en, title_te, title_hi, text_en, text_te, text_hi, sort_order, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                sanitize_input(item.title_en, 500),
                sanitize_input(item.title_te, 500),
                sanitize_input(item.title_hi, 500),
                sanitize_input(item.text_en, 5000),
                sanitize_input(item.text_te, 5000),
                sanitize_input(item.text_hi, 5000),
                item.sort_order,
                1 if item.is_active else 0,
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
    try:
        conn = _get_conn()
        existing = conn.execute("SELECT id FROM terms_conditions WHERE id = ?", (term_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Term not found")

        updates = []
        params = []
        for field in ["title_en", "title_te", "title_hi", "text_en", "text_te", "text_hi", "sort_order", "is_active"]:
            val = getattr(item, field, None)
            if val is not None:
                if isinstance(val, str):
                    max_len = 500 if field.startswith("title") else 5000
                    updates.append(f"{field} = ?")
                    params.append(sanitize_input(val, max_len))
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
