import os
import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import Job, CareerApplication
from schemas import JobOut, CareerOut
from auth import require_super_admin
from security import validate_email, validate_phone, sanitize_input

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "careers")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

JOB_FIELDS = {"title", "department", "location", "description", "requirements", "salary_range", "job_type", "is_active"}


def _sanitize_filename(name: str) -> str:
    name = re.sub(r'[^\w\s-]', '', name)
    name = re.sub(r'\s+', '_', name.strip())
    return name[:80] if name else "applicant"


def delete_career_files(app: CareerApplication):
    if app.resume_url and app.resume_url.startswith("/uploads/"):
        filepath = os.path.join(os.path.dirname(__file__), "..", app.resume_url.lstrip("/"))
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass


@router.get("/api/jobs", response_model=list)
def get_jobs(db: Session = Depends(get_db)):
    return [JobOut.model_validate(j).model_dump() for j in db.query(Job).filter(Job.is_active == True).all()]


@router.post("/api/careers")
async def create_career(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    position: str = Form(""),
    message: str = Form(""),
    resume: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    # Input validation
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
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(content)
        resume_url = f"/uploads/careers/{filename}"

    app = CareerApplication(
        full_name=full_name,
        email=email,
        phone=phone,
        position=position,
        message=message,
        resume_url=resume_url,
    )
    db.add(app)
    db.commit()
    return {"ok": True}


@router.get("/api/admin/jobs", response_model=list)
def get_admin_jobs(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    return [JobOut.model_validate(j).model_dump() for j in db.query(Job).order_by(Job.id.desc()).all()]


@router.post("/api/admin/jobs")
def create_job(data: dict, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    filtered = {k: v for k, v in data.items() if k in JOB_FIELDS}
    if "title" not in filtered or not filtered["title"]:
        raise HTTPException(status_code=400, detail="Title is required")
    job = Job(**filtered)
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"id": job.id}


@router.put("/api/admin/jobs/{job_id}")
def update_job(job_id: int, data: dict, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    for k, v in data.items():
        if k in JOB_FIELDS and k != "id":
            setattr(job, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/api/admin/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"ok": True}
