from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_admin, require_super_admin
from security import validate_application_status, sanitize_input
from routers.franchise import delete_app_files
from routers.careers import delete_career_files
from store import KVStore
from typing import Optional
from datetime import datetime, timezone, timedelta
from email_service import send_franchise_approved, send_franchise_rejected
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class DeleteRequest(BaseModel):
    reason: str = ""


class UpdateStatusRequest(BaseModel):
    status: str
    admin_notes: str = ""


from activity import log_activity


_stats_cache = KVStore(namespace="admin_stats", default_ttl=60)


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
    cached = _stats_cache.get("admin_stats")
    if cached:
        return cached

    today = datetime.now(timezone.utc).date()
    month_start = today.replace(day=1)

    # Use count="exact" with filters instead of fetching all rows
    franchise_count = supabase.table("franchise_applications").select("id", count="exact").execute().count or 0
    career_count = supabase.table("career_applications").select("id", count="exact").execute().count or 0
    contact_count = supabase.table("contact_messages").select("id", count="exact").execute().count or 0
    menu_count = supabase.table("menu_items").select("id", count="exact").execute().count or 0
    product_count = supabase.table("products").select("id", count="exact").execute().count or 0
    job_count = supabase.table("jobs").select("id", count="exact").eq("is_active", True).execute().count or 0
    admin_count = supabase.table("admin_users").select("id", count="exact").execute().count or 0

    # Franchise status counts using DB-level filtering
    pending_franchise = supabase.table("franchise_applications").select("id", count="exact").eq("status", "pending").execute().count or 0
    submitted_franchise = supabase.table("franchise_applications").select("id", count="exact").eq("status", "submitted").execute().count or 0
    under_process_franchise = supabase.table("franchise_applications").select("id", count="exact").eq("status", "under_process").execute().count or 0
    approved_franchise = supabase.table("franchise_applications").select("id", count="exact").eq("status", "approved").execute().count or 0
    rejected_franchise = supabase.table("franchise_applications").select("id", count="exact").eq("status", "rejected").execute().count or 0

    # Career status counts using DB-level filtering
    pending_careers = supabase.table("career_applications").select("id", count="exact").eq("status", "pending").execute().count or 0
    approved_careers = supabase.table("career_applications").select("id", count="exact").eq("status", "approved").execute().count or 0
    rejected_careers = supabase.table("career_applications").select("id", count="exact").eq("status", "rejected").execute().count or 0

    # Contact pending count using DB-level filtering
    pending_contacts = supabase.table("contact_messages").select("id", count="exact").eq("status", "pending").execute().count or 0

    # Orders — use date-filtered queries instead of loading all orders
    today_str = today.isoformat()
    today_orders_data = supabase.table("orders").select("total,status").gte("created_at", today_str).execute()
    today_orders_list = today_orders_data.data or []
    total_orders_count = supabase.table("orders").select("id", count="exact").execute().count or 0

    today_orders_count = len(today_orders_list)
    today_revenue = sum(o.get("total", 0) for o in today_orders_list)
    pending_orders = sum(1 for o in today_orders_list if o.get("status") == "pending")
    preparing_orders = sum(1 for o in today_orders_list if o.get("status") == "preparing")
    delivered_orders = sum(1 for o in today_orders_list if o.get("status") == "delivered")
    cancelled_orders = sum(1 for o in today_orders_list if o.get("status") == "cancelled")

    # Products online count
    online_count = supabase.table("products").select("id", count="exact").eq("is_active", True).execute().count or 0

    # Franchise month count using date filter
    month_str = today.strftime("%Y-%m-01")
    month_count = supabase.table("franchise_applications").select("id", count="exact").gte("created_at", month_str).execute().count or 0

    result = {
        "franchise_count": franchise_count,
        "career_count": career_count,
        "contact_count": contact_count,
        "menu_count": menu_count,
        "product_count": product_count,
        "job_opening_count": job_count,
        "order_count": total_orders_count,
        "total_revenue": 0,
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
        "pending_orders": pending_orders,
        "preparing_orders": preparing_orders,
        "delivered_orders": delivered_orders,
        "cancelled_orders": cancelled_orders,
        "today_orders": today_orders_count,
        "today_revenue": today_revenue,
        "products_online": online_count,
        "franchise_month_count": month_count,
    }
    _stats_cache.set("admin_stats", result)
    return result


@router.get("/api/admin/applications")
def get_applications(offset: int = 0, limit: int = 50, _=Depends(get_current_admin)):
    limit = min(limit, 200)
    franchise_q = supabase.table("franchise_applications").select("*", count="exact").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    careers_q = supabase.table("career_applications").select("*", count="exact").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    contacts_q = supabase.table("contact_messages").select("*", count="exact").order("created_at", desc=True).range(offset, offset + limit - 1).execute()

    return {
        "franchise": franchise_q.data or [],
        "careers": careers_q.data or [],
        "contacts": contacts_q.data or [],
        "franchise_total": franchise_q.count or 0,
        "careers_total": careers_q.count or 0,
        "contacts_total": contacts_q.count or 0,
    }


@router.put("/api/admin/franchise/{app_id}")
def update_franchise(app_id: int, data: UpdateStatusRequest, admin=Depends(get_current_admin)):
    if not validate_application_status(data.status):
        raise HTTPException(status_code=400, detail="Invalid status")
    if data.status == "rejected" and len(data.admin_notes.strip()) < 10:
        raise HTTPException(status_code=400, detail="A detailed rejection reason (min 10 characters) is required")
    existing = supabase.table("franchise_applications").select("*").eq("id", app_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Application not found")
    app = existing.data[0]
    update_data = {
        "status": data.status,
        "admin_notes": sanitize_input(data.admin_notes, 2000),
    }
    supabase.table("franchise_applications").update(update_data).eq("id", app_id).execute()
    log_activity(admin["username"], data.status, "franchise", app_id, f"Franchise application of {app.get('full_name', '')} → {data.status}")
    _stats_cache.invalidate("admin_stats")

    email = app.get("email", "")
    full_name = app.get("full_name", "")
    login_id = app.get("login_id", "")
    phone = app.get("phone", "")
    notes = data.admin_notes or ""

    if email and data.status == "approved":
        send_franchise_approved(email, full_name, login_id, phone, notes)
    elif email and data.status == "rejected":
        send_franchise_rejected(email, full_name, login_id, phone, notes)

    try:
        from auth import _franchise_cache
        _franchise_cache.invalidate(str(app_id))
    except Exception:
        pass
    return {"ok": True}


@router.put("/api/admin/careers/{app_id}")
def update_career(app_id: int, data: UpdateStatusRequest, admin=Depends(get_current_admin)):
    if not validate_application_status(data.status):
        raise HTTPException(status_code=400, detail="Invalid status")
    if data.status == "rejected" and len(data.admin_notes.strip()) < 10:
        raise HTTPException(status_code=400, detail="A detailed rejection reason (min 10 characters) is required")
    existing = supabase.table("career_applications").select("*").eq("id", app_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Application not found")
    app = existing.data[0]
    update_data = {
        "status": data.status,
        "admin_notes": sanitize_input(data.admin_notes, 2000),
    }
    supabase.table("career_applications").update(update_data).eq("id", app_id).execute()
    log_activity(admin["username"], data.status, "career", app_id, f"Career application of {app.get('full_name', '')} → {data.status}")
    _stats_cache.invalidate("admin_stats")
    return {"ok": True}


@router.put("/api/admin/contacts/{app_id}")
def update_contact(app_id: int, data: UpdateStatusRequest, admin=Depends(get_current_admin)):
    if not validate_application_status(data.status):
        raise HTTPException(status_code=400, detail="Invalid status")
    if data.status == "rejected" and len(data.admin_notes.strip()) < 10:
        raise HTTPException(status_code=400, detail="A detailed rejection reason (min 10 characters) is required")
    existing = supabase.table("contact_messages").select("*").eq("id", app_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Message not found")
    msg = existing.data[0]
    update_data = {
        "status": data.status,
        "admin_notes": sanitize_input(data.admin_notes, 2000),
    }
    supabase.table("contact_messages").update(update_data).eq("id", app_id).execute()
    log_activity(admin["username"], data.status, "contact", app_id, f"Contact message from {msg.get('name', '')} → {data.status}")
    _stats_cache.invalidate("admin_stats")
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
    _stats_cache.invalidate("admin_stats")
    try:
        from auth import _franchise_cache
        _franchise_cache.invalidate(str(app_id))
    except Exception:
        pass
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
    _stats_cache.invalidate("admin_stats")
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
    _stats_cache.invalidate("admin_stats")
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
        "orders",
        "franchise_applications",
        "career_applications",
        "contact_messages",
        "menu_items",
        "products",
        "jobs",
        "activity_logs",
    ]
    cleared = {}
    for table in tables_to_clear:
        try:
            total_deleted = 0
            max_iterations = 100
            iteration = 0
            while iteration < max_iterations:
                iteration += 1
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
    _stats_cache.invalidate()
    return {"ok": True, "cleared": cleared}


class SettingsUpdate(BaseModel):
    shop_enabled: Optional[bool] = None
    franchise_enabled: Optional[bool] = None


def _get_settings():
    try:
        result = supabase.table("site_settings").select("key, value").execute()
        settings = {}
        for row in (result.data or []):
            settings[row["key"]] = row["value"] == "true"
        return {
            "shop_enabled": settings.get("shop_enabled", True),
            "franchise_enabled": settings.get("franchise_enabled", True),
        }
    except Exception as e:
        logger.error(f"Failed to read settings: {e}")
        return {"shop_enabled": True, "franchise_enabled": True}


@router.get("/api/settings")
def get_settings():
    return _get_settings()


@router.put("/api/admin/settings")
def update_settings(body: SettingsUpdate, admin=Depends(get_current_admin)):
    updates = {}
    if body.shop_enabled is not None:
        updates["shop_enabled"] = body.shop_enabled
    if body.franchise_enabled is not None:
        updates["franchise_enabled"] = body.franchise_enabled
    for key, value in updates.items():
        try:
            existing = supabase.table("site_settings").select("key").eq("key", key).execute()
            if existing.data:
                supabase.table("site_settings").update({"value": str(value).lower(), "updated_at": "now()"}).eq("key", key).execute()
            else:
                supabase.table("site_settings").insert({"key": key, "value": str(value).lower()}).execute()
        except Exception as e:
            logger.error(f"Failed to update setting {key}: {e}")
            raise HTTPException(500, f"Failed to update {key}")
    log_activity(admin["username"], "update_settings", "system", 0, str(updates))
    return _get_settings()
