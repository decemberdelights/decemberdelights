from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_admin, require_super_admin
from security import validate_application_status, sanitize_input
from routers.franchise import delete_app_files
from routers.careers import delete_career_files
from typing import Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class DeleteRequest(BaseModel):
    reason: str = ""


def log_activity(username: str, action: str, target_type: str, target_id: int, details: str = ""):
    try:
        supabase.table("activity_logs").insert({
            "admin_username": username,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "details": details,
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")


def _safe_query(table, select="*", filters=None, order=None, limit=None, offset=None, count_only=False):
    try:
        q = supabase.table(table).select(select)
        if filters:
            for col, val, op in filters:
                if op == "eq":
                    q = q.eq(col, val)
                elif op == "neq":
                    q = q.neq(col, val)
        if order:
            q = q.order(order[0], desc=order[1] if len(order) > 1 else False)
        if limit:
            q = q.limit(limit)
        if offset:
            q = q.offset(offset)
        result = q.execute()
        if count_only:
            return result.count or 0
        return result.data or []
    except Exception as e:
        logger.error(f"Query failed on {table}: {e}")
        return [] if not count_only else 0


@router.get("/api/admin/stats")
def get_stats(_=Depends(get_current_admin)):
    today = datetime.now(timezone.utc).date()
    month_start = today.replace(day=1)

    franchise_count = _safe_query("franchise_applications", select="id", count_only=True)
    career_count = _safe_query("career_applications", select="id", count_only=True)
    contact_count = _safe_query("contact_messages", select="id", count_only=True)
    menu_count = _safe_query("menu_items", select="id", count_only=True)
    product_count = _safe_query("products", select="id", count_only=True)
    job_count = _safe_query("jobs", select="id", filters=[("is_active", True, "eq")], count_only=True)
    admin_count = _safe_query("admin_users", select="id", count_only=True)

    pending_franchise = _safe_query("franchise_applications", select="id", filters=[("status", "pending", "eq")], count_only=True)
    submitted_franchise = _safe_query("franchise_applications", select="id", filters=[("status", "submitted", "eq")], count_only=True)
    under_process_franchise = _safe_query("franchise_applications", select="id", filters=[("status", "under_process", "eq")], count_only=True)
    approved_franchise = _safe_query("franchise_applications", select="id", filters=[("status", "approved", "eq")], count_only=True)
    rejected_franchise = _safe_query("franchise_applications", select="id", filters=[("status", "rejected", "eq")], count_only=True)
    pending_careers = _safe_query("career_applications", select="id", filters=[("status", "pending", "eq")], count_only=True)
    approved_careers = _safe_query("career_applications", select="id", filters=[("status", "approved", "eq")], count_only=True)
    rejected_careers = _safe_query("career_applications", select="id", filters=[("status", "rejected", "eq")], count_only=True)
    pending_contacts = _safe_query("contact_messages", select="id", filters=[("status", "pending", "eq")], count_only=True)

    order_data = _safe_query("orders", select="total,status,created_at")
    total_revenue = sum(o.get("total", 0) for o in order_data)
    products_online = _safe_query("products", select="id,is_active")
    online_count = sum(1 for p in products_online if p.get("is_active"))

    today_orders = 0
    today_revenue = 0.0
    for o in order_data:
        ca = o.get("created_at")
        if ca:
            try:
                if datetime.fromisoformat(ca).date() == today:
                    today_orders += 1
                    today_revenue += o.get("total", 0)
            except (ValueError, TypeError):
                pass

    franchise_month = _safe_query("franchise_applications", select="id,created_at", limit=500)
    month_count = sum(
        1 for f in franchise_month
        if f.get("created_at") and
        _parse_date_safe(f["created_at"]) and
        _parse_date_safe(f["created_at"]) >= month_start
    )

    return {
        "franchise_count": franchise_count,
        "career_count": career_count,
        "contact_count": contact_count,
        "menu_count": menu_count,
        "product_count": product_count,
        "job_opening_count": job_count,
        "order_count": len(order_data),
        "total_revenue": total_revenue,
        "admin_count": admin_count,
        "pending_franchise": pending_franchise,
        "pending_careers": pending_careers,
        "pending_contacts": pending_contacts,
        "submitted_franchise": submitted_franchise,
        "under_process_franchise": under_process_franchise,
        "approved_franchise": approved_franchise,
        "rejected_franchise": rejected_franchise,
        "approved_careers": approved_careers,
        "rejected_careers": rejected_careers,
        "pending_orders": sum(1 for o in order_data if o.get("status") == "pending"),
        "preparing_orders": sum(1 for o in order_data if o.get("status") == "preparing"),
        "delivered_orders": sum(1 for o in order_data if o.get("status") == "delivered"),
        "cancelled_orders": sum(1 for o in order_data if o.get("status") == "cancelled"),
        "today_orders": today_orders,
        "today_revenue": today_revenue,
        "products_online": online_count,
        "franchise_month_count": month_count,
    }


def _parse_date_safe(date_str):
    try:
        return datetime.fromisoformat(date_str).date()
    except (ValueError, TypeError):
        return None


@router.get("/api/admin/applications")
def get_applications(offset: int = 0, limit: int = 50, _=Depends(get_current_admin)):
    limit = min(limit, 200)
    franchise = _safe_query("franchise_applications", order=("created_at", True), limit=limit, offset=offset)
    careers = _safe_query("career_applications", order=("created_at", True), limit=limit, offset=offset)
    contacts = _safe_query("contact_messages", order=("created_at", True), limit=limit, offset=offset)

    franchise_total = _safe_query("franchise_applications", select="id", count_only=True)
    careers_total = _safe_query("career_applications", select="id", count_only=True)
    contacts_total = _safe_query("contact_messages", select="id", count_only=True)

    return {
        "franchise": franchise,
        "careers": careers,
        "contacts": contacts,
        "franchise_total": franchise_total,
        "careers_total": careers_total,
        "contacts_total": contacts_total,
    }


@router.put("/api/admin/franchise/{app_id}")
def update_franchise(app_id: int, data: dict, admin=Depends(get_current_admin)):
    if not validate_application_status(data.get("status", "")):
        raise HTTPException(status_code=400, detail="Invalid status")
    existing = supabase.table("franchise_applications").select("*").eq("id", app_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Application not found")
    app = existing.data[0]
    update_data = {
        "status": data["status"],
        "admin_notes": sanitize_input(data.get("admin_notes", ""), 2000),
    }
    supabase.table("franchise_applications").update(update_data).eq("id", app_id).execute()
    log_activity(admin["username"], data["status"], "franchise", app_id, f"Franchise application of {app.get('full_name', '')} → {data['status']}")
    return {"ok": True}


@router.put("/api/admin/careers/{app_id}")
def update_career(app_id: int, data: dict, admin=Depends(get_current_admin)):
    if not validate_application_status(data.get("status", "")):
        raise HTTPException(status_code=400, detail="Invalid status")
    existing = supabase.table("career_applications").select("*").eq("id", app_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Application not found")
    app = existing.data[0]
    update_data = {
        "status": data["status"],
        "admin_notes": sanitize_input(data.get("admin_notes", ""), 2000),
    }
    supabase.table("career_applications").update(update_data).eq("id", app_id).execute()
    log_activity(admin["username"], data["status"], "career", app_id, f"Career application of {app.get('full_name', '')} → {data['status']}")
    return {"ok": True}


@router.put("/api/admin/contacts/{app_id}")
def update_contact(app_id: int, data: dict, admin=Depends(get_current_admin)):
    if not validate_application_status(data.get("status", "")):
        raise HTTPException(status_code=400, detail="Invalid status")
    existing = supabase.table("contact_messages").select("*").eq("id", app_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Message not found")
    msg = existing.data[0]
    update_data = {
        "status": data["status"],
        "admin_notes": sanitize_input(data.get("admin_notes", ""), 2000),
    }
    supabase.table("contact_messages").update(update_data).eq("id", app_id).execute()
    log_activity(admin["username"], data["status"], "contact", app_id, f"Contact message from {msg.get('name', '')} → {data['status']}")
    return {"ok": True}


@router.delete("/api/admin/franchise/{app_id}")
def delete_franchise(app_id: int, data: Optional[DeleteRequest] = None, admin=Depends(require_super_admin)):
    existing = supabase.table("franchise_applications").select("*").eq("id", app_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Application not found")
    app = existing.data[0]
    reason = data.reason if data else ""
    log_activity(admin["username"], "delete", "franchise", app_id, f"Deleted franchise application of {app.get('full_name', '')}. Reason: {reason}")
    delete_app_files(app)
    supabase.table("franchise_applications").delete().eq("id", app_id).execute()
    return {"ok": True}


@router.delete("/api/admin/careers/{app_id}")
def delete_career(app_id: int, data: Optional[DeleteRequest] = None, admin=Depends(require_super_admin)):
    existing = supabase.table("career_applications").select("*").eq("id", app_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Application not found")
    app = existing.data[0]
    reason = data.reason if data else ""
    log_activity(admin["username"], "delete", "career", app_id, f"Deleted career application of {app.get('full_name', '')}. Reason: {reason}")
    delete_career_files(app)
    supabase.table("career_applications").delete().eq("id", app_id).execute()
    return {"ok": True}


@router.delete("/api/admin/contacts/{app_id}")
def delete_contact(app_id: int, data: Optional[DeleteRequest] = None, admin=Depends(require_super_admin)):
    existing = supabase.table("contact_messages").select("*").eq("id", app_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Message not found")
    msg = existing.data[0]
    reason = data.reason if data else ""
    log_activity(admin["username"], "delete", "contact", app_id, f"Deleted contact message from {msg.get('name', '')}. Reason: {reason}")
    supabase.table("contact_messages").delete().eq("id", app_id).execute()
    return {"ok": True}


@router.get("/api/admin/logs")
def get_logs(limit: int = 100, _=Depends(get_current_admin)):
    if limit > 500:
        limit = 500
    result = _safe_query("activity_logs", order=("created_at", True), limit=limit)
    return {"logs": [
        {"id": l["id"], "admin_username": l["admin_username"], "action": l["action"], "target_type": l["target_type"], "target_id": l["target_id"], "details": l.get("details", ""), "created_at": l.get("created_at", "")}
        for l in result
    ]}


@router.get("/api/admin/franchise/cities")
def get_franchise_cities(_=Depends(get_current_admin)):
    try:
        result = supabase.table("franchise_applications").select("city").neq("city", "").execute()
        cities = list(set(r["city"] for r in (result.data or []) if r.get("city")))
        return cities
    except Exception as e:
        logger.error(f"Failed to fetch franchise cities: {e}")
        return []


@router.post("/api/admin/reset-database")
def reset_database(admin=Depends(require_super_admin)):
    log_activity(admin["username"], "reset_database", "system", 0, "Full database reset initiated")
    tables_to_clear = [
        "activity_logs",
        "orders",
        "franchise_applications",
        "career_applications",
        "contact_messages",
        "menu_items",
        "products",
        "jobs",
    ]
    cleared = {}
    for table in tables_to_clear:
        try:
            total_deleted = 0
            while True:
                result = supabase.table(table).select("id").limit(1000).execute()
                data = result.data or []
                if not data:
                    break
                ids = [r["id"] for r in data]
                supabase.table(table).delete().in_("id", ids).execute()
                total_deleted += len(ids)
                if len(ids) < 1000:
                    break
            cleared[table] = total_deleted
        except Exception as e:
            logger.error(f"Failed to clear table {table}: {e}")
            cleared[table] = "error"
    total_cleared = sum(v for v in cleared.values() if isinstance(v, int))
    log_activity(admin["username"], "reset_database_complete", "system", 0, f"Reset complete. Total rows deleted: {total_cleared}. Tables: {cleared}")
    return {"ok": True, "cleared": cleared}
