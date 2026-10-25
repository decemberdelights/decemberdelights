import os
import uuid
import re
import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from supabase_client import supabase
from auth import require_super_admin, get_current_admin
from activity import log_activity
from security import validate_email, validate_phone, sanitize_input, careers_track_limiter, RateLimiter
from local_storage import STORAGE_MODE, save_private_doc as save_private_doc_local, delete_local_file, is_local_url
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

careers_submit_limiter = RateLimiter(max_attempts=5, window_seconds=60)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_FILE_SIZE = 5 * 1024 * 1024


def _sanitize_filename(name: str) -> str:
    name = re.sub(r'[^\w\s-]', '', name)
    name = re.sub(r'\s+', '_', name.strip())
    return name[:80] if name else "applicant"


def _sync_upload(filename: str, content: bytes, content_type: str) -> str:
    import time as _time
    for attempt in range(3):
        try:
            supabase.storage.from_("career-docs").upload(filename, content, {"content-type": content_type})
            return supabase.storage.from_("career-docs").get_public_url(filename)
        except Exception as e:
            if attempt < 2:
                logger.warning(f"Upload attempt {attempt+1} failed for {filename}: {e}")
                _time.sleep(2 * (attempt + 1))
            else:
                logger.error(f"Upload failed after 3 attempts for {filename}: {e}")
                raise


def delete_career_files(app: dict):
    for field in ["resume_url"]:
        url = app.get(field, "")
        if not url:
            continue
        if is_local_url(url):
            delete_local_file(url)
        elif url and "/career-docs/" in url:
            filename = url.split("/")[-1]
            try:
                supabase.storage.from_("career-docs").remove([filename])
            except Exception as e:
                logger.warning(f"Failed to delete career doc {filename} from storage: {e}")


@router.get("/api/jobs")
def get_jobs():
    from cache import cache_get, cache_set
    cached = cache_get("jobs")
    if cached is not None:
        return cached
    result = supabase.table("jobs").select("*").eq("is_active", True).execute()
    data = result.data or []
    cache_set("jobs", data, ttl=180)
    return data


@router.get("/api/careers/track")
def track_career_application(tracking_code: str = "", phone: str = "", request: Request = None):
    """Applicant tracking.

    Requires a per-applicant tracking code issued at submit time. Looking up
    applications by bare phone number + name fragment exposed applicant PII to
    anyone who knew a phone number — the tracking code is not guessable and is
    stored only for the submitting applicant.
    """
    if request is None:
        raise HTTPException(status_code=500, detail="Invalid request")
    from security import get_client_ip
    client_ip = get_client_ip(request)
    rate_key = f"careers_track:{client_ip}"
    careers_track_limiter.check(rate_key)
    code = (tracking_code or "").strip().upper()
    if not code or not re.fullmatch(r"[A-Z0-9]{6,16}", code):
        raise HTTPException(status_code=400, detail="Invalid tracking code")
    phone_clean = re.sub(r"[\s\-\+]", "", phone or "")
    if not phone_clean.isdigit() or len(phone_clean) < 7 or len(phone_clean) > 15:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    try:
        result = supabase.table("career_applications").select("id,full_name,position,status,created_at").eq("phone", phone_clean).eq("tracking_code", code).order("created_at", desc=True).limit(5).execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to track career application: {e}")
        raise HTTPException(status_code=500, detail="Failed to track application")


@router.post("/api/careers")
async def create_career(
    request: Request,
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    position: str = Form(""),
    message: str = Form(""),
    resume: UploadFile = File(None),
):
    from security import get_client_ip
    client_ip = get_client_ip(request)
    rate_key = f"career:{client_ip}"
    # Blocking SQLite limiter in an async handler — keep off the event loop.
    await asyncio.to_thread(careers_submit_limiter.check, rate_key)
    full_name = sanitize_input(full_name, 200)
    email = sanitize_input(email, 200)
    phone = sanitize_input(phone, 20)
    position = sanitize_input(position, 200)
    message = sanitize_input(message, 2000)

    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")
    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Invalid email address")
    if not validate_phone(phone):
        raise HTTPException(status_code=400, detail="Invalid phone number")

    resume_url = ""
    tracking_code = uuid.uuid4().hex[:10].upper()
    if resume and resume.filename:
        ext = os.path.splitext(resume.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")
        content = await resume.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")
        if resume.content_type and resume.content_type not in {"application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}:
            raise HTTPException(status_code=400, detail=f"File content type {resume.content_type} not allowed")
        if STORAGE_MODE in ("hybrid", "local"):
            try:
                # Blocking disk write in an async handler — run in a worker thread.
                resume_url = await asyncio.to_thread(
                    save_private_doc_local, content, resume.filename, "career"
                )
            except Exception as e:
                logger.warning(f"Local resume save failed: {e}")
                if STORAGE_MODE == "local":
                    raise
        if not resume_url:
            filename = f"{_sanitize_filename(full_name)}_resume_{uuid.uuid4().hex[:8]}{ext}"
            resume_url = await asyncio.to_thread(_sync_upload, filename, content, resume.content_type)

    data = {
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "position": position,
        "message": message,
        "resume_url": resume_url,
        "tracking_code": tracking_code,
    }
    result = await asyncio.to_thread(
        lambda: supabase.table("career_applications").insert(data).execute()
    )
    return {"ok": True, "id": result.data[0]["id"], "tracking_code": tracking_code}


@router.get("/api/admin/jobs")
def get_admin_jobs(_=Depends(require_super_admin)):
    try:
        result = supabase.table("jobs").select("*").order("id", desc=True).execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to fetch admin jobs: {e}")
        return []


@router.post("/api/admin/jobs")
def create_job(
    request: Request,
    title: str = Form(""),
    department: str = Form(""),
    location: str = Form(""),
    description: str = Form(""),
    requirements: str = Form(""),
    salary_range: str = Form(""),
    job_type: str = Form("full-time"),
    is_active: str = Form("true"),
    admin=Depends(require_super_admin),
):
    from csrf import validate_csrf as _v
    _v(request)
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    data = {
        "title": sanitize_input(title, 200),
        "department": sanitize_input(department, 200),
        "location": sanitize_input(location, 200),
        "description": sanitize_input(description, 5000),
        "requirements": sanitize_input(requirements, 5000),
        "salary_range": sanitize_input(salary_range, 100),
        "job_type": sanitize_input(job_type, 50),
        "is_active": is_active.lower() == "true",
    }
    result = supabase.table("jobs").insert(data).execute()
    log_activity(admin.get("username", ""), "create", "job", result.data[0]["id"], f"Created job: {title}")
    try:
        from cache import cache_invalidate as _ci
        _ci("jobs")
    except Exception as e:
        logger.warning(f"Jobs cache invalidation failed after creating job {result.data[0]['id']}: {e}")
    return result.data[0]


@router.put("/api/admin/jobs/{job_id}")
def update_job(
    job_id: int,
    request: Request,
    title: str = Form(""),
    department: str = Form(""),
    location: str = Form(""),
    description: str = Form(""),
    requirements: str = Form(""),
    salary_range: str = Form(""),
    job_type: str = Form("full-time"),
    is_active: str = Form("true"),
    admin=Depends(require_super_admin),
):
    from csrf import validate_csrf as _v2
    _v2(request)
    existing = supabase.table("jobs").select("*").eq("id", job_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Job not found")
    data = {
        "title": sanitize_input(title, 200),
        "department": sanitize_input(department, 200),
        "location": sanitize_input(location, 200),
        "description": sanitize_input(description, 5000),
        "requirements": sanitize_input(requirements, 5000),
        "salary_range": sanitize_input(salary_range, 100),
        "job_type": sanitize_input(job_type, 50),
        "is_active": is_active.lower() == "true",
    }
    supabase.table("jobs").update(data).eq("id", job_id).execute()
    log_activity(admin.get("username", ""), "update", "job", job_id, f"Updated job: {title}")
    try:
        from cache import cache_invalidate as _ci2
        _ci2("jobs")
    except Exception as e:
        logger.warning(f"Jobs cache invalidation failed after updating job {job_id}: {e}")
    updated = supabase.table("jobs").select("*").eq("id", job_id).execute()
    return updated.data[0] if updated.data else {"ok": True}


@router.delete("/api/admin/jobs/{job_id}")
def delete_job(job_id: int, request: Request, admin=Depends(require_super_admin)):
    from csrf import validate_csrf as _v3
    _v3(request)
    existing = supabase.table("jobs").select("*").eq("id", job_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Job not found")
    supabase.table("jobs").delete().eq("id", job_id).execute()
    log_activity(admin.get("username", ""), "delete", "job", job_id, f"Deleted job: {existing.data[0].get('title', '')}")
    try:
        from cache import cache_invalidate as _ci3
        _ci3("jobs")
    except Exception as e:
        logger.warning(f"Jobs cache invalidation failed after deleting job {job_id}: {e}")
    return {"ok": True}
