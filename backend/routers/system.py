"""Clarity endpoints (no UI change, API only):
- GET /api/admin/system/status (admin): supabase reachable, table counts, local disk, queue length, storage mode
- GET /api/admin/queue/status (admin): queued franchise count + items (no file bytes)
- POST /api/admin/queue/sync (super_admin + CSRF): push queued items to Supabase when space freed
Alerts: status returns warnings[] at 80% thresholds so admin panel/logs can poll every 5 min.
"""
import os
import shutil
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from auth import get_current_admin, require_super_admin
from csrf import validate_csrf
from supabase_client import supabase

logger = logging.getLogger(__name__)
router = APIRouter()

# Free-tier ceilings (conservative, to warn at 80%)
FREE_DB_MB = 500
FREE_STORAGE_MB = 1024
WARN_PCT = 80


def _safe_count(table: str):
    try:
        r = supabase.table(table).select("id", count="exact").limit(1).execute()
        return r.count or 0
    except Exception as e:
        # Full error stays in the server logs — never echoed to API clients.
        logger.error(f"Count failed for table {table}: {e}")
        return "error"


@router.get("/api/admin/system/status")
def system_status(_=Depends(get_current_admin)):
    from local_storage import UPLOAD_ROOT, STORAGE_MODE
    from local_queue import queue_count
    warnings = []
    supabase_ok = True
    try:
        supabase.table("admin_users").select("id").limit(1).execute()
    except Exception as e:
        supabase_ok = False
        # Generic message to the client; detail goes to the server logs only.
        logger.error(f"Supabase unreachable during system status: {e}")
        warnings.append("Supabase unreachable (see server logs)")

    counts = {}
    for t in ["franchise_applications", "orders", "products", "menu_items", "career_applications", "contact_messages", "jobs"]:
        counts[t] = _safe_count(t)

    # Rough DB estimate: 3KB/franchise, 1.5KB/order, 1KB/others (conservative for free-tier math)
    est_kb = 0
    try:
        est_kb += (counts.get("franchise_applications") or 0) * 3 if isinstance(counts.get("franchise_applications"), int) else 0
        est_kb += (counts.get("orders") or 0) * 2 if isinstance(counts.get("orders"), int) else 0
        est_kb += (counts.get("contact_messages") or 0) * 1 if isinstance(counts.get("contact_messages"), int) else 0
    except Exception as e:
        logger.warning(f"DB size estimate skipped: {e}")
    est_mb = round(est_kb / 1024, 1)
    if est_mb >= FREE_DB_MB * WARN_PCT / 100:
        warnings.append(f"DB ~{est_mb}MB of {FREE_DB_MB}MB free — clear queue/old logs or upgrade to Pro.")

    disk = {}
    try:
        total, used, free = shutil.disk_usage(UPLOAD_ROOT)
        disk = {"total_gb": round(total / 1e9, 2), "used_gb": round(used / 1e9, 2), "free_gb": round(free / 1e9, 2), "path": UPLOAD_ROOT}
        if free < 2e9:
            warnings.append("Hostinger disk <2GB free — backup + prune uploads/queue.")
    except Exception as e:
        disk = {"error": str(e)}

    qlen = queue_count()
    if qlen > 0:
        warnings.append(f"{qlen} franchise apps queued locally for reconciliation — POST /api/admin/queue/sync after resolving the database issue.")

    return {
        "supabase_ok": supabase_ok,
        "storage_mode": STORAGE_MODE,
        "counts": counts,
        "db_estimate_mb": est_mb,
        "db_free_limit_mb": FREE_DB_MB,
        "disk": disk,
        "queued_franchise": qlen,
        "warnings": warnings,
    }


@router.get("/api/admin/queue/status")
def queue_status(_=Depends(get_current_admin)):
    from local_queue import queue_list
    items = queue_list()
    # strip heavy data, keep identifiers
    slim = [{"qid": i.get("qid"), "queued_at": i.get("queued_at"),
             "phone": (i.get("data") or {}).get("phone"), "name": (i.get("data") or {}).get("full_name")} for i in items[-50:]]
    return {"count": len(items), "items": slim}


@router.post("/api/admin/queue/sync")
def queue_sync(request: Request, admin=Depends(require_super_admin)):
    validate_csrf(request)
    from local_queue import queue_list, queue_pop
    items = queue_list()
    ok, failed = 0, []
    for it in items:
        qid = it.get("qid")
        data = it.get("data") or {}
        try:
            payment_id = data.get("razorpay_payment_id")
            if payment_id:
                existing = (
                    supabase.table("franchise_applications")
                    .select("id")
                    .eq("razorpay_payment_id", payment_id)
                    .limit(1)
                    .execute()
                )
                if existing.data:
                    queue_pop(qid)
                    ok += 1
                    continue
            supabase.table("franchise_applications").insert(data).execute()
            queue_pop(qid)
            ok += 1
        except Exception as e:
            failed.append({"qid": qid, "error": str(e)[:200]})
            # stop on quota again — keep rest queued
            if "quota" in str(e).lower() or "exceed" in str(e).lower() or "full" in str(e).lower():
                break
    try:
        from cache import cache_invalidate
        cache_invalidate("franchise")
    except Exception as e:
        logger.warning(f"Franchise cache invalidation failed after queue sync: {e}")
    return {"synced": ok, "failed": failed, "remaining": len(queue_list())}
