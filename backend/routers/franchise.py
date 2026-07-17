import os
import uuid
import re
import logging
import asyncio
import secrets
import string
import hashlib
import hmac

import razorpay

from fastapi import APIRouter, HTTPException, Response, UploadFile, File, Form, Cookie, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from supabase_client import supabase
from schemas import FranchiseLogin, FranchiseOut
from auth import hash_password, verify_password, create_token, decode_token
from security import franchise_limiter, get_client_ip, validate_email, validate_phone, sanitize_input
from csrf import generate_csrf_token, set_csrf_cookie


logger = logging.getLogger(__name__)

router = APIRouter()

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
FRANCHISE_FEE_PAISE = 1000000  # ₹10,000 = 10,00,000 paise


def _get_razorpay_client():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


def _generate_secure_password() -> str:
    alphabet = string.ascii_uppercase + string.ascii_lowercase + string.digits
    while True:
        password = (
            secrets.choice(string.ascii_uppercase)
            + secrets.choice(string.ascii_lowercase)
            + "".join(secrets.choice(alphabet) for _ in range(6))
            + secrets.choice(string.digits)
            + "!"
        )
        if (any(c.isupper() for c in password) and any(c.isdigit() for c in password)):
            return password


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


def _sync_upload(filename: str, content: bytes, content_type: str) -> str:
    supabase.storage.from_("franchise-docs").upload(filename, content, {"content-type": content_type})
    return supabase.storage.from_("franchise-docs").get_public_url(filename)


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
    return await asyncio.to_thread(_sync_upload, filename, content, file.content_type)


def delete_app_files(app: dict):
    for field in ["aadhaar", "pan", "bank_statement", "id_proof", "address_proof", "other_docs"]:
        url = app.get(field, "")
        if url and "/franchise-docs/" in url:
            filename = url.split("/")[-1]
            try:
                supabase.storage.from_("franchise-docs").remove([filename])
            except Exception as e:
                logger.warning(f"Failed to delete file {filename}: {e}")


class RazorpayOrderRequest(BaseModel):
    email: str
    phone: str


def _verify_payment_with_razorpay(order_id: str, payment_id: str) -> dict:
    client = _get_razorpay_client()
    try:
        payment = client.payment.fetch(payment_id)
        return payment
    except Exception as e:
        logger.error(f"Razorpay payment fetch failed: {e}")
        raise HTTPException(status_code=400, detail="Could not verify payment with Razorpay")


def _is_payment_already_used(payment_id: str) -> bool:
    result = supabase.table("franchise_applications").select("id").eq("razorpay_payment_id", payment_id).execute()
    return bool(result.data)


def _is_order_already_used(order_id: str) -> bool:
    result = supabase.table("franchise_applications").select("id").eq("razorpay_order_id", order_id).execute()
    return bool(result.data)


@router.post("/api/franchise/create-order")
async def create_razorpay_order(body: RazorpayOrderRequest, request: Request):
    client_ip = get_client_ip(request)
    rate_key = f"franchise_order:{client_ip}"
    franchise_limiter.check(rate_key)

    email = sanitize_input(body.email, 200)
    phone = sanitize_input(body.phone, 20)
    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Invalid email address")
    if not validate_phone(phone):
        raise HTTPException(status_code=400, detail="Invalid phone number")

    client = _get_razorpay_client()
    try:
        order = await asyncio.to_thread(
            lambda: client.order.create({
                "amount": FRANCHISE_FEE_PAISE,
                "currency": "INR",
                "receipt": f"franchise_{phone}_{uuid.uuid4().hex[:8]}",
                "notes": {"email": email, "phone": phone, "purpose": "franchise_application"},
            })
        )
        logger.info(f"Razorpay order created: {order['id']} for phone={phone}")
        return {"order_id": order["id"], "amount": FRANCHISE_FEE_PAISE, "currency": "INR", "key_id": RAZORPAY_KEY_ID}
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment order. Please try again.")


@router.post("/api/franchise")
async def create_franchise(
    request: Request,
    background_tasks: BackgroundTasks,
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    business_experience: str = Form(""),
    preferred_location: str = Form(""),
    investment_capability: str = Form(""),
    message: str = Form(""),
    tc_accepted: str = Form("false"),
    tc_language: str = Form("en"),
    razorpay_order_id: str = Form(""),
    razorpay_payment_id: str = Form(""),
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

    client_ip = get_client_ip(request)
    rate_key = f"franchise_create:{client_ip}"
    franchise_limiter.check(rate_key)

    business_experience = sanitize_input(business_experience, 2000)
    preferred_location = sanitize_input(preferred_location, 200)
    investment_capability = sanitize_input(investment_capability, 200)
    message = sanitize_input(message, 2000)
    tc_language = sanitize_input(tc_language, 10)
    razorpay_order_id = sanitize_input(razorpay_order_id, 100)
    razorpay_payment_id = sanitize_input(razorpay_payment_id, 100)

    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")
    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Invalid email address")
    if not validate_phone(phone):
        raise HTTPException(status_code=400, detail="Invalid phone number")

    # === PAYMENT SECURITY CHECKS ===

    # Check 1: Payment IDs must be present
    if not razorpay_order_id or not razorpay_payment_id:
        logger.warning(f"Franchise submission without payment IDs from IP {client_ip}")
        raise HTTPException(status_code=400, detail="Payment is required to submit a franchise application")

    # Check 2: Payment ID not already used (prevent reuse)
    if _is_payment_already_used(razorpay_payment_id):
        logger.warning(f"Duplicate payment_id {razorpay_payment_id} used from IP {client_ip}")
        raise HTTPException(status_code=400, detail="This payment has already been used for another application")

    # Check 3: Order ID not already used (prevent reuse)
    if _is_order_already_used(razorpay_order_id):
        logger.warning(f"Duplicate order_id {razorpay_order_id} used from IP {client_ip}")
        raise HTTPException(status_code=400, detail="This order has already been used for another application")

    # Check 4: Fetch payment from Razorpay API and verify EVERYTHING server-side
    payment = _verify_payment_with_razorpay(razorpay_order_id, razorpay_payment_id)

    # Check 5a: Payment must be captured (not just authorized)
    if payment.get("status") != "captured":
        logger.warning(f"Payment {razorpay_payment_id} status={payment.get('status')}, expected 'captured'")
        raise HTTPException(status_code=400, detail="Payment has not been completed yet. Please try again.")

    # Check 5b: Amount must match exactly (₹10,000 = 1,000,000 paise)
    paid_amount = payment.get("amount", 0)
    if paid_amount != FRANCHISE_FEE_PAISE:
        logger.warning(f"Payment amount mismatch: paid={paid_amount} paise, expected={FRANCHISE_FEE_PAISE} paise")
        raise HTTPException(status_code=400, detail="Payment amount does not match the required fee")

    # Check 5c: Currency must be INR
    if payment.get("currency") != "INR":
        logger.warning(f"Payment currency mismatch: {payment.get('currency')}")
        raise HTTPException(status_code=400, detail="Invalid payment currency")

    # Check 5d: Payment method must be from Razorpay (not a test/stolen ID)
    if "method" not in payment:
        logger.warning(f"Payment {razorpay_payment_id} has no method field — suspicious")
        raise HTTPException(status_code=400, detail="Invalid payment data")

    # Check 5e: Order ID from Razorpay must match what was fetched
    if payment.get("order_id") != razorpay_order_id:
        logger.warning(f"Order ID mismatch: payment.order_id={payment.get('order_id')}, submitted={razorpay_order_id}")
        raise HTTPException(status_code=400, detail="Payment does not belong to this order")

    # Check 6: Verify order notes contain the same phone number (link order to user)
    try:
        client = _get_razorpay_client()
        order_data = await asyncio.to_thread(lambda: client.order.fetch(razorpay_order_id))
        order_notes = order_data.get("notes", {})
        order_phone = order_notes.get("phone", "")
        if order_phone and order_phone != phone:
            logger.warning(f"Phone mismatch: order notes phone={order_phone}, submitted phone={phone}")
            raise HTTPException(status_code=400, detail="Payment was made with a different phone number")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch order from Razorpay: {e}")
        raise HTTPException(status_code=400, detail="Could not verify order details")

    logger.info(f"Payment verified: order={razorpay_order_id}, payment={razorpay_payment_id}, amount={paid_amount}p, phone={phone}")

    # === END PAYMENT SECURITY CHECKS ===

    existing = await asyncio.to_thread(
        lambda: supabase.table("franchise_applications").select("id, login_id, email").eq("phone", phone).execute()
    )

    password = _generate_secure_password()
    password_hash = await asyncio.to_thread(hash_password, password)

    uploaded_urls = await asyncio.gather(
        save_upload(aadhaar, full_name, "Aadhaar"),
        save_upload(pan, full_name, "PAN"),
        save_upload(bank_statement, full_name, "Bank Statement"),
        save_upload(id_proof, full_name, "ID Proof"),
        save_upload(address_proof, full_name, "Address Proof"),
        save_upload(other_docs, full_name, "Other Documents"),
    )

    data = {
        "full_name": full_name[:200],
        "email": email[:200],
        "phone": phone[:20],
        "password_hash": password_hash,
        "business_experience": business_experience[:2000],
        "preferred_location": preferred_location[:200],
        "investment_capability": investment_capability[:200],
        "message": message[:2000],
        "tc_accepted": tc_accepted == "true",
        "tc_language": tc_language[:10],
        "aadhaar": uploaded_urls[0],
        "pan": uploaded_urls[1],
        "bank_statement": uploaded_urls[2],
        "id_proof": uploaded_urls[3],
        "address_proof": uploaded_urls[4],
        "other_docs": uploaded_urls[5],
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": razorpay_payment_id,
    }

    if existing.data and existing.data[0].get("login_id"):
        raise HTTPException(status_code=400, detail="Application already exists with this phone number")

    if existing.data and not existing.data[0].get("login_id"):
        app_id = existing.data[0]["id"]
        logger.info(f"Updating incomplete franchise app {app_id} for phone={phone} with new payment")
        await asyncio.to_thread(
            lambda: supabase.table("franchise_applications").update(data).eq("id", app_id).execute()
        )
    else:
        result = await asyncio.to_thread(
            lambda: supabase.table("franchise_applications").insert(data).execute()
        )
        app_id = result.data[0]["id"]

    login_id = f"DD-{uuid.uuid4().hex[:12].upper()}"
    await asyncio.to_thread(
        lambda: supabase.table("franchise_applications").update({"login_id": login_id}).eq("id", app_id).execute()
    )

    logger.info(f"Franchise app {app_id} created/updated for {email} | payment={razorpay_payment_id}")

    try:
        from email_service import send_franchise_acknowledgment
        background_tasks.add_task(send_franchise_acknowledgment, full_name, email, phone, password, login_id)
        logger.info(f"Franchise email queued for {email}")
    except Exception as e:
        logger.error(f"Franchise email queue failed: {e}")

    return {"ok": True, "id": app_id}


@router.get("/api/franchise/status")
def franchise_status(franchise_session: Optional[str] = Cookie(None)):
    if not franchise_session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(franchise_session)
    if not payload or payload.get("type") != "franchise":
        raise HTTPException(status_code=401, detail="Invalid session")
    try:
        app_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")
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

    token = create_token({"sub": str(app["id"]), "type": "franchise"})
    response.set_cookie("franchise_session", token, httponly=True, samesite="none", max_age=86400, secure=True, path="/")
    csrf_token = generate_csrf_token()
    set_csrf_cookie(response, csrf_token)
    return {"application": FranchiseOut(**app).model_dump()}


@router.post("/api/franchise/logout")
def franchise_logout(response: Response):
    response.delete_cookie("franchise_session", samesite="none", secure=True, path="/")
    response.delete_cookie("csrf_token", samesite="none", secure=True, path="/")
    return {"ok": True}
