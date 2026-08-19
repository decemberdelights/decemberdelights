import os
import uuid
import re
import logging
import asyncio

import razorpay

from fastapi import APIRouter, HTTPException, Response, UploadFile, File, Form, Cookie, Request
from pydantic import BaseModel
from typing import Optional
from supabase_client import supabase
from schemas import FranchiseLogin, FranchiseOut
from auth import create_token, decode_token
from security import franchise_limiter, get_client_ip, validate_email, validate_phone, sanitize_input
from csrf import generate_csrf_token, set_csrf_cookie

logger = logging.getLogger(__name__)
router = APIRouter()

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
FRANCHISE_FEE_PAISE = 999900 + 179982  # ₹9999 + 18% GST = ₹11799 = 1,179,900 paise

ALLOWED_DOC_EXT = {".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"}
ALLOWED_DOC_MIME = {
    "application/pdf", "image/jpeg", "image/png",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_VIDEO_EXT = {".mp4", ".webm", ".mov"}
MAX_DOC_SIZE = 5 * 1024 * 1024
MAX_VIDEO_SIZE = 15 * 1024 * 1024


def _get_client():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


def _safe_name(name: str) -> str:
    return re.sub(r'\s+', '_', re.sub(r'[^\w\s-]', '', name.strip()))[:60] or "applicant"


def _upload_sync(filename: str, content: bytes, content_type: str) -> str:
    import time
    for attempt in range(3):
        try:
            supabase.storage.from_("franchise-docs").upload(filename, content, {"content-type": content_type})
            return supabase.storage.from_("franchise-docs").get_public_url(filename)
        except Exception as e:
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
            else:
                logger.error(f"Upload failed for {filename}: {e}")
                raise


async def _upload_file(file: Optional[UploadFile], name: str, field: str) -> str:
    if not file or not file.filename:
        return ""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_DOC_EXT:
        raise HTTPException(400, f"{field}: file type {ext} not allowed")
    content = await file.read()
    if len(content) > MAX_DOC_SIZE:
        raise HTTPException(400, f"{field}: file too large (max 5MB)")
    if file.content_type and file.content_type not in ALLOWED_DOC_MIME:
        raise HTTPException(400, f"{field}: content type not allowed")
    filename = f"{_safe_name(name)}_{field}_{uuid.uuid4().hex[:8]}{ext}"
    return await asyncio.to_thread(_upload_sync, filename, content, file.content_type or "application/octet-stream")


def delete_app_files(app: dict):
    for field in ["aadhaar", "pan", "bank_statement", "address_proof", "other_docs", "tc_video"]:
        url = app.get(field, "")
        if url and "/franchise-docs/" in url:
            try:
                supabase.storage.from_("franchise-docs").remove([url.split("/")[-1]])
            except Exception:
                pass


class CreateOrderReq(BaseModel):
    email: str
    phone: str


def _verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if not signature:
        return False
    try:
        client = _get_client()
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        return True
    except Exception as e:
        logger.error(f"Signature verify failed: {e}")
        return False


def _check_payment_used(payment_id: str, order_id: str) -> bool:
    r1 = supabase.table("franchise_applications").select("id").eq("razorpay_payment_id", payment_id).execute()
    r2 = supabase.table("franchise_applications").select("id").eq("razorpay_order_id", order_id).execute()
    return bool(r1.data or r2.data)


@router.post("/api/franchise/create-order")
async def create_order(body: CreateOrderReq, request: Request):
    ip = get_client_ip(request)
    franchise_limiter.check(f"franchise_order:{ip}")

    email = sanitize_input(body.email, 200)
    phone = sanitize_input(body.phone, 20)
    if not validate_email(email):
        raise HTTPException(400, "Invalid email")
    if not validate_phone(phone):
        raise HTTPException(400, "Invalid phone")

    try:
        client = _get_client()
        order = await asyncio.to_thread(
            lambda: client.order.create({
                "amount": FRANCHISE_FEE_PAISE,
                "currency": "INR",
                "receipt": f"franchise_{phone}_{uuid.uuid4().hex[:8]}",
                "notes": {"email": email, "phone": phone},
            })
        )
        return {"order_id": order["id"], "amount": FRANCHISE_FEE_PAISE, "currency": "INR", "key_id": RAZORPAY_KEY_ID}
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(500, "Failed to create payment order")


@router.post("/api/franchise")
async def submit_application(
    request: Request,
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    dob: str = Form(""),
    business_experience: str = Form(""),
    preferred_location: str = Form(""),
    investment_capability: str = Form(""),
    message: str = Form(""),
    tc_accepted: str = Form("false"),
    tc_language: str = Form("en"),
    razorpay_order_id: str = Form(""),
    razorpay_payment_id: str = Form(""),
    razorpay_signature: str = Form(""),
    aadhaar: Optional[UploadFile] = File(None),
    pan: Optional[UploadFile] = File(None),
    bank_statement: Optional[UploadFile] = File(None),
    address_proof: Optional[UploadFile] = File(None),
    other_docs: Optional[UploadFile] = File(None),
    tc_video: Optional[UploadFile] = File(None),
):
    # Check if franchise applications are enabled
    try:
        setting = supabase.table("site_settings").select("value").eq("key", "franchise_enabled").execute()
        if setting.data and setting.data[0]["value"] == "false":
            raise HTTPException(status_code=403, detail="Franchise applications are currently closed")
    except HTTPException:
        raise
    except Exception:
        pass  # If settings table doesn't exist yet, allow submission
    ip = get_client_ip(request)
    franchise_limiter.check(f"franchise:{ip}")

    full_name = sanitize_input(full_name, 200)
    email = sanitize_input(email, 200)
    phone = sanitize_input(phone, 20)

    if not full_name:
        raise HTTPException(400, "Full name is required")
    if not validate_email(email):
        raise HTTPException(400, "Invalid email")
    if not validate_phone(phone):
        raise HTTPException(400, "Invalid phone")
    if not razorpay_order_id or not razorpay_payment_id:
        raise HTTPException(400, "Payment is required")
    if _check_payment_used(razorpay_payment_id, razorpay_order_id):
        raise HTTPException(400, "This payment has already been used")
    if not _verify_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
        raise HTTPException(400, "Payment verification failed")

    try:
        client = _get_client()
        payment = await asyncio.to_thread(lambda: client.payment.fetch(razorpay_payment_id))
    except Exception as e:
        logger.error(f"Payment fetch failed: {e}")
        raise HTTPException(400, "Could not verify payment")

    if payment.get("status") != "captured":
        raise HTTPException(400, f"Payment not captured (status: {payment.get('status')})")
    if payment.get("amount", 0) != FRANCHISE_FEE_PAISE:
        raise HTTPException(400, "Payment amount mismatch")
    if payment.get("currency") != "INR":
        raise HTTPException(400, "Invalid currency")

    existing = await asyncio.to_thread(
        lambda: supabase.table("franchise_applications").select("id,login_id").eq("phone", phone).execute()
    )
    if existing.data and existing.data[0].get("login_id"):
        raise HTTPException(400, "Application already exists for this phone number")

    aadhaar_url = await _upload_file(aadhaar, full_name, "aadhaar")
    pan_url = await _upload_file(pan, full_name, "pan")
    bank_url = await _upload_file(bank_statement, full_name, "bank_statement")
    address_url = await _upload_file(address_proof, full_name, "address_proof")
    other_url = await _upload_file(other_docs, full_name, "other_docs")

    tc_video_url = ""
    if tc_video and tc_video.filename:
        ext = os.path.splitext(tc_video.filename)[1].lower()
        if ext in ALLOWED_VIDEO_EXT:
            content = await tc_video.read()
            if len(content) <= MAX_VIDEO_SIZE:
                filename = f"{_safe_name(full_name)}_tc_video_{uuid.uuid4().hex[:8]}{ext}"
                tc_video_url = await asyncio.to_thread(_upload_sync, filename, content, tc_video.content_type or "video/mp4")

    login_id = f"DD-{uuid.uuid4().hex[:12].upper()}"

    data = {
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "dob": sanitize_input(dob, 20),
        "business_experience": sanitize_input(business_experience, 2000),
        "preferred_location": sanitize_input(preferred_location, 200),
        "investment_capability": sanitize_input(investment_capability, 200),
        "message": sanitize_input(message, 2000),
        "tc_accepted": tc_accepted == "true",
        "tc_language": sanitize_input(tc_language, 10),
        "aadhaar": aadhaar_url,
        "pan": pan_url,
        "bank_statement": bank_url,
        "address_proof": address_url,
        "other_docs": other_url,
        "tc_video": tc_video_url,
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": razorpay_payment_id,
        "login_id": login_id,
        "payment_status": "paid",
    }

    try:
        if existing.data:
            app_id = existing.data[0]["id"]
            await asyncio.to_thread(
                lambda: supabase.table("franchise_applications").update(data).eq("id", app_id).execute()
            )
        else:
            result = await asyncio.to_thread(
                lambda: supabase.table("franchise_applications").insert(data).execute()
            )
            app_id = result.data[0]["id"]
    except Exception as e:
        logger.error(f"DB insert failed: {e}")
        raise HTTPException(500, "Failed to save application")

    return {"ok": True, "id": app_id, "login_id": login_id}


@router.post("/api/franchise/login")
def franchise_login(request: Request, creds: FranchiseLogin, response: Response):
    ip = get_client_ip(request)
    key = f"franchise:{ip}"
    franchise_limiter.check(key)

    result = supabase.table("franchise_applications").select("*").eq("phone", creds.phone).execute()
    if not result.data:
        franchise_limiter.record(key)
        raise HTTPException(401, "Invalid credentials")
    app = result.data[0]
    stored_dob = (app.get("dob") or "").strip()
    if not stored_dob or stored_dob != creds.dob.strip():
        franchise_limiter.record(key)
        raise HTTPException(401, "Invalid credentials")

    token = create_token({"sub": str(app["id"]), "type": "franchise"})
    response.set_cookie("franchise_session", token, httponly=True, samesite="none", max_age=86400, secure=True, path="/")
    csrf_token = generate_csrf_token()
    set_csrf_cookie(response, csrf_token)

    from auth import _franchise_cache
    _franchise_cache.set(app["id"], app)

    return {"application": FranchiseOut(**app).model_dump()}


@router.get("/api/franchise/status")
def franchise_status(franchise_session: Optional[str] = Cookie(None)):
    from auth import _franchise_cache
    if not franchise_session:
        raise HTTPException(401, "Not authenticated")
    payload = decode_token(franchise_session)
    if not payload or payload.get("type") != "franchise":
        raise HTTPException(401, "Invalid session")
    try:
        app_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(401, "Invalid token")

    cached = _franchise_cache.get(app_id)
    if cached:
        return {"application": FranchiseOut(**cached).model_dump()}

    result = supabase.table("franchise_applications").select("*").eq("id", app_id).execute()
    if not result.data:
        raise HTTPException(404, "Application not found")
    app = result.data[0]
    _franchise_cache.set(app_id, app)
    return {"application": FranchiseOut(**app).model_dump()}


@router.post("/api/franchise/logout")
def franchise_logout(response: Response):
    response.delete_cookie("franchise_session", samesite="none", secure=True, path="/")
    response.delete_cookie("csrf_token", samesite="none", secure=True, path="/")
    return {"ok": True}
