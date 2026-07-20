import os
import uuid
import re
import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from supabase_client import supabase
from auth import require_super_admin
from security import validate_email, validate_phone, sanitize_input, careers_track_limiter, RateLimiter
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
        if url and "/career-docs/" in url:
            filename = url.split("/")[-1]
            try:
                supabase.storage.from_("career-docs").remove([filename])
            except Exception:
                pass


@router.get("/api/jobs")
def get_jobs():
    result = supabase.table("jobs").select("*").eq("is_active", True).execute()
    return result.data or []


@router.get("/api/careers/track")
def track_career_application(name: str = "", phone: str = "", request: Request = None):
    from fastapi import Request as Req
    from security import get_client_ip
    if request:
        client_ip = get_client_ip(request)
        rate_key = f"careers_track:{client_ip}"
        careers_track_limiter.check(rate_key)
        careers_track_limiter.record(rate_key)
    if not name or len(name) < 2:
        raise HTTPException(status_code=400, detail="Name is required")
    if not phone or len(phone) < 5:
        raise HTTPException(status_code=400, detail="Phone is required")
    try:
        result = supabase.table("career_applications").select("id,full_name,phone,position,status,created_at").eq("phone", phone).order("created_at", desc=True).limit(10).execute()
        apps = result.data or []
        if name:
            apps = [a for a in apps if name.lower() in (a.get("full_name", "")).lower()]
        return apps
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
    careers_submit_limiter.check(rate_key)
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
    if resume and resume.filename:
        ext = os.path.splitext(resume.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")
        content = await resume.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")
        if resume.content_type and resume.content_type not in {"application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}:
            raise HTTPException(status_code=400, detail=f"File content type {resume.content_type} not allowed")
        filename = f"{_sanitize_filename(full_name)}_resume_{uuid.uuid4().hex[:8]}{ext}"
        resume_url = await asyncio.to_thread(_sync_upload, filename, content, resume.content_type)

    data = {
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "position": position,
        "message": message,
        "resume_url": resume_url,
    }
    await asyncio.to_thread(
        lambda: supabase.table("career_applications").insert(data).execute()
    )
    careers_submit_limiter.record(rate_key)
    return {"ok": True}


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
    title: str = Form(""),
    department: str = Form(""),
    location: str = Form(""),
    description: str = Form(""),
    requirements: str = Form(""),
    salary_range: str = Form(""),
    job_type: str = Form("full-time"),
    is_active: str = Form("true"),
    _=Depends(require_super_admin),
):
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
    return {"id": result.data[0]["id"]}


@router.put("/api/admin/jobs/{job_id}")
def update_job(
    job_id: int,
    title: str = Form(""),
    department: str = Form(""),
    location: str = Form(""),
    description: str = Form(""),
    requirements: str = Form(""),
    salary_range: str = Form(""),
    job_type: str = Form("full-time"),
    is_active: str = Form("true"),
    _=Depends(require_super_admin),
):
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
    return {"ok": True}


@router.delete("/api/admin/jobs/{job_id}")
def delete_job(job_id: int, _=Depends(require_super_admin)):
    existing = supabase.table("jobs").select("*").eq("id", job_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Job not found")
    supabase.table("jobs").delete().eq("id", job_id).execute()
    return {"ok": True}
