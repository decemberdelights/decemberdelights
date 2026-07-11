from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase_client import supabase
from auth import get_current_admin, require_super_admin
from security import validate_application_status, sanitize_input
from routers.franchise import delete_app_files
from routers.careers import delete_career_files
from typing import Optional

router = APIRouter()


class DeleteRequest(BaseModel):
    reason: str = ""


def log_activity(username: str, action: str, target_type: str, target_id: int, details: str = ""):
    supabase.table("activity_logs").insert({
        "admin_username": username,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "details": details,
    }).execute()


@router.get("/api/admin/stats")
def get_stats(_=Depends(get_current_admin)):
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date()
    month_start = today.replace(day=1)

    franchise_count = supabase.table("franchise_applications").select("id", count="exact").execute().count or 0
    career_count = supabase.table("career_applications").select("id", count="exact").execute().count or 0
    contact_count = supabase.table("contact_messages").select("id", count="exact").execute().count or 0
    menu_count = supabase.table("menu_items").select("id", count="exact").execute().count or 0
    product_count = supabase.table("products").select("id", count="exact").execute().count or 0
    order_count = supabase.table("orders").select("id", count="exact").execute().count or 0
    admin_count = supabase.table("admin_users").select("id", count="exact").execute().count or 0

    all_orders = supabase.table("orders").select("total,status,created_at").execute().data or []
    total_revenue = sum(o.get("total", 0) for o in all_orders)

    pending_franchise = supabase.table("franchise_applications").select("id", count="exact").eq("status", "pending").execute().count or 0
    pending_careers = supabase.table("career_applications").select("id", count="exact").eq("status", "pending").execute().count or 0
    pending_contacts = supabase.table("contact_messages").select("id", count="exact").eq("status", "pending").execute().count or 0
    submitted_franchise = supabase.table("franchise_applications").select("id", count="exact").eq("status", "submitted").execute().count or 0
    under_process_franchise = supabase.table("franchise_applications").select("id", count="exact").eq("status", "under_process").execute().count or 0
    approved_franchise = supabase.table("franchise_applications").select("id", count="exact").eq("status", "approved").execute().count or 0
    rejected_franchise = supabase.table("franchise_applications").select("id", count="exact").eq("status", "rejected").execute().count or 0
    approved_careers = supabase.table("career_applications").select("id", count="exact").eq("status", "approved").execute().count or 0
    rejected_careers = supabase.table("career_applications").select("id", count="exact").eq("status", "rejected").execute().count or 0
    pending_orders = supabase.table("orders").select("id", count="exact").eq("status", "pending").execute().count or 0
    preparing_orders = supabase.table("orders").select("id", count="exact").eq("status", "preparing").execute().count or 0
    delivered_orders = supabase.table("orders").select("id", count="exact").eq("status", "delivered").execute().count or 0
    cancelled_orders = supabase.table("orders").select("id", count="exact").eq("status", "cancelled").execute().count or 0
    products_online = supabase.table("products").select("id", count="exact").eq("is_active", True).execute().count or 0
    job_opening_count = supabase.table("jobs").select("id", count="exact").eq("is_active", True).execute().count or 0

    today_orders_list = [o for o in all_orders if o.get("created_at") and datetime.fromisoformat(o["created_at"]).date() == today]
    today_orders = len(today_orders_list)
    today_revenue = sum(o.get("total", 0) for o in today_orders_list)

    franchise_month = supabase.table("franchise_applications").select("id", count="exact").gte("created_at", month_start.isoformat()).execute().count or 0

    return {
        "franchise_count": franchise_count,
        "career_count": career_count,
        "contact_count": contact_count,
        "menu_count": menu_count,
        "product_count": product_count,
        "job_opening_count": job_opening_count,
        "order_count": order_count,
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
        "pending_orders": pending_orders,
        "preparing_orders": preparing_orders,
        "delivered_orders": delivered_orders,
        "cancelled_orders": cancelled_orders,
        "today_orders": today_orders,
        "today_revenue": today_revenue,
        "products_online": products_online,
        "franchise_month_count": franchise_month,
    }


@router.get("/api/admin/applications")
def get_applications(_=Depends(get_current_admin)):
    franchise = supabase.table("franchise_applications").select("*").order("created_at", desc=True).execute().data or []
    careers = supabase.table("career_applications").select("*").order("created_at", desc=True).execute().data or []
    contacts = supabase.table("contact_messages").select("*").order("created_at", desc=True).execute().data or []
    return {"franchise": franchise, "careers": careers, "contacts": contacts}


@router.put("/api/admin/franchise/{app_id}")
def update_franchise(app_id: int, data: dict, _=Depends(get_current_admin)):
    if not validate_application_status(data.get("status", "")):
        raise HTTPException(status_code=400, detail="Invalid status")
    existing = supabase.table("franchise_applications").select("*").eq("id", app_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Application not found")
    update_data = {
        "status": data["status"],
        "admin_notes": sanitize_input(data.get("admin_notes", ""), 2000),
    }
    supabase.table("franchise_applications").update(update_data).eq("id", app_id).execute()
    return {"ok": True}


@router.put("/api/admin/careers/{app_id}")
def update_career(app_id: int, data: dict, _=Depends(get_current_admin)):
    if not validate_application_status(data.get("status", "")):
        raise HTTPException(status_code=400, detail="Invalid status")
    existing = supabase.table("career_applications").select("*").eq("id", app_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Application not found")
    update_data = {
        "status": data["status"],
        "admin_notes": sanitize_input(data.get("admin_notes", ""), 2000),
    }
    supabase.table("career_applications").update(update_data).eq("id", app_id).execute()
    return {"ok": True}


@router.put("/api/admin/contacts/{app_id}")
def update_contact(app_id: int, data: dict, _=Depends(get_current_admin)):
    if not validate_application_status(data.get("status", "")):
        raise HTTPException(status_code=400, detail="Invalid status")
    existing = supabase.table("contact_messages").select("*").eq("id", app_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Message not found")
    update_data = {
        "status": data["status"],
        "admin_notes": sanitize_input(data.get("admin_notes", ""), 2000),
    }
    supabase.table("contact_messages").update(update_data).eq("id", app_id).execute()
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
    result = supabase.table("activity_logs").select("*").order("created_at", desc=True).limit(limit).execute()
    logs = result.data or []
    return {"logs": [
        {"id": l["id"], "admin_username": l["admin_username"], "action": l["action"], "target_type": l["target_type"], "target_id": l["target_id"], "details": l.get("details", ""), "created_at": l.get("created_at", "")}
        for l in logs
    ]}


@router.get("/api/admin/franchise/cities")
def get_franchise_cities(_=Depends(get_current_admin)):
    result = supabase.table("franchise_applications").select("city").neq("city", "").execute()
    cities = list(set(r["city"] for r in (result.data or []) if r.get("city")))
    return cities


@router.post("/api/admin/reset-database")
def reset_database(_=Depends(require_super_admin)):
    from routers.orders import log_activity as log_order_activity
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
            result = supabase.table(table).select("id").execute()
            count = len(result.data) if result.data else 0
            if count > 0:
                ids = [r["id"] for r in result.data]
                supabase.table(table).delete().in_("id", ids).execute()
                cleared[table] = count
        except Exception:
            cleared[table] = "error"
    return {"ok": True, "cleared": cleared}
