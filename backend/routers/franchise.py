import os
import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File, Form, Cookie, Request
from typing import Optional
from supabase_client import supabase
from schemas import FranchiseLogin, FranchiseOut
from auth import hash_password, verify_password, create_token, decode_token
from security import franchise_limiter, get_client_ip, validate_email, validate_phone, sanitize_input
from email_utils import send_password_email

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"}
ALLOWED_MIMETYPES = {
    "application/pdf", "image/jpeg", "image/png",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_SIZE = 10 * 1024 * 1024


def _sanitize_filename(name: str) -> str:
    name = re.sub(r'[^\w\s-]', '', name)
    name = re.sub(r'\s+', '_', name.strip())
    return name[:80] if name else "applicant"


async def save_upload(file: Optional[UploadFile], applicant_name: str, field_name: str = "file") -> str:
    if not file or not file.filename:
        return ""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed for {field_name}")
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large (max 10MB) for {field_name}")
    if file.content_type and file.content_type not in ALLOWED_MIMETYPES:
        raise HTTPException(status_code=400, detail=f"File content type {file.content_type} not allowed for {field_name}")

    safe_name = _sanitize_filename(applicant_name)
    safe_field = field_name.lower().replace(" ", "_")
    filename = f"{safe_name}_{safe_field}_{uuid.uuid4().hex[:8]}{ext}"
    supabase.storage.from_("franchise-docs").upload(filename, content, {"content-type": file.content_type})
    public_url = supabase.storage.from_("franchise-docs").get_public_url(filename)
    return public_url


def delete_app_files(app: dict):
    for field in ["aadhaar", "pan", "bank_statement", "id_proof", "address_proof", "other_docs"]:
        url = app.get(field, "")
        if url and "/franchise-docs/" in url:
            filename = url.split("/")[-1]
            try:
                supabase.storage.from_("franchise-docs").remove([filename])
            except Exception:
                pass


@router.post("/api/franchise")
async def create_franchise(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    password: str = Form(...),
    business_experience: str = Form(""),
    preferred_location: str = Form(""),
    investment_capability: str = Form(""),
    message: str = Form(""),
    tc_accepted: str = Form("false"),
    tc_language: str = Form("en"),
    aadhaar: Optional[UploadFile] = File(None),
    pan: Optional[UploadFile] = File(None),
    bank_statement: Optional[UploadFile] = File(None),
    id_proof: Optional[UploadFile] = File(None),
    address_proof: Optional[UploadFile] = File(None),
    other_docs: Optional[UploadFile] = File(None),
):
    full_name = sanitize_input(full_name, 200)
    email = sanitize_input(email, 200)
    phone = sanitize_input(phone, 20)
    business_experience = sanitize_input(business_experience, 2000)
    preferred_location = sanitize_input(preferred_location, 200)
    investment_capability = sanitize_input(investment_capability, 200)
    message = sanitize_input(message, 2000)
    tc_language = sanitize_input(tc_language, 10)

    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")
    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Invalid email address")
    if not validate_phone(phone):
        raise HTTPException(status_code=400, detail="Invalid phone number")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(c.isupper() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one digit")

    existing = supabase.table("franchise_applications").select("*").eq("phone", phone).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Application already exists with this phone number")

    data = {
        "full_name": full_name[:200],
        "email": email[:200],
        "phone": phone[:20],
        "password_hash": hash_password(password),
        "business_experience": business_experience[:2000],
        "preferred_location": preferred_location[:200],
        "investment_capability": investment_capability[:200],
        "message": message[:2000],
        "tc_accepted": tc_accepted == "true",
        "tc_language": tc_language[:10],
        "aadhaar": await save_upload(aadhaar, full_name, "Aadhaar"),
        "pan": await save_upload(pan, full_name, "PAN"),
        "bank_statement": await save_upload(bank_statement, full_name, "Bank Statement"),
        "id_proof": await save_upload(id_proof, full_name, "ID Proof"),
        "address_proof": await save_upload(address_proof, full_name, "Address Proof"),
        "other_docs": await save_upload(other_docs, full_name, "Other Documents"),
    }
    result = supabase.table("franchise_applications").insert(data).execute()
    app_id = result.data[0]["id"]
    login_id = f"DD{phone[-4:]}{str(app_id).zfill(4)}"
    supabase.table("franchise_applications").update({"login_id": login_id}).eq("id", app_id).execute()

    send_password_email(to_email=email, full_name=full_name, password=password, login_id=login_id)

    return {"ok": True, "id": app_id}


@router.get("/api/franchise/status")
def franchise_status(franchise_session: Optional[str] = Cookie(None)):
    if not franchise_session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(franchise_session)
    if not payload or payload.get("type") != "franchise":
        raise HTTPException(status_code=401, detail="Invalid session")
    app_id = int(payload.get("sub"))
    result = supabase.table("franchise_applications").select("*").eq("id", app_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"application": FranchiseOut(**result.data[0]).model_dump()}


@router.post("/api/franchise/login")
def franchise_login(request: Request, creds: FranchiseLogin, response: Response):
    client_ip = get_client_ip(request)
    rate_key = f"franchise:{client_ip}"
    franchise_limiter.check(rate_key)

    result = supabase.table("franchise_applications").select("*").eq("phone", creds.phone).execute()
    if not result.data or not verify_password(creds.password, result.data[0]["password_hash"]):
        franchise_limiter.record(rate_key)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    app = result.data[0]

    franchise_limiter.reset(rate_key)

    token = create_token({"sub": str(app["id"]), "type": "franchise"})
    secure_flag = os.environ.get("ENV", "development") != "development"
    response.set_cookie("franchise_session", token, httponly=True, samesite="none", max_age=86400, secure=True)
    return {"application": FranchiseOut(**app).model_dump()}


@router.post("/api/franchise/logout")
def franchise_logout(response: Response):
    response.delete_cookie("franchise_session", samesite="none", secure=True)
    return {"ok": True}
