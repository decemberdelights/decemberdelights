import os
import uuid
import re
import logging
import asyncio

from datetime import datetime

import razorpay

from fastapi import APIRouter, HTTPException, Response, UploadFile, File, Form, Cookie, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from supabase_client import supabase
from schemas import FranchiseLogin, FranchiseOut
from auth import create_token, decode_token, SESSION_COOKIE_MAX_AGE
from security import (
    franchise_limiter, franchise_login_limiter, get_client_ip, validate_email, validate_phone,
    sanitize_input, is_settings_not_configured,
)
from csrf import generate_csrf_token, set_csrf_cookie, validate_csrf
from email_service import send_franchise_confirmation, send_franchise_admin_notification
from local_storage import STORAGE_MODE, save_private_doc as save_private_doc_local, delete_local_file, is_local_url
from file_validation import validated_document_content_type

logger = logging.getLogger(__name__)
router = APIRouter()

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
FRANCHISE_FEE_PAISE = 999900 + 179982  # ₹9999 + 18% GST = ₹11799 = 1,179,900 paise

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
    content = await file.read()
    if len(content) > MAX_DOC_SIZE:
        raise HTTPException(400, f"{field}: file too large (max 5MB)")
    ext = os.path.splitext(file.filename)[1].lower()
    content_type = validated_document_content_type(file.filename, file.content_type, content)
    # Hybrid: sensitive docs go to private local vault (no Supabase bandwidth, not public).
    # Served only via GET /api/files/franchise/{filename} (admin auth).
    if STORAGE_MODE in ("hybrid", "local"):
        try:
            return save_private_doc_local(content, file.filename, "franchise")
        except Exception as e:
            logger.error(f"Local private save failed, Supabase fallback: {e}")
            if STORAGE_MODE == "local":
                raise HTTPException(status_code=503, detail=f"{field}: document storage is temporarily unavailable") from e
    filename = f"{_safe_name(name)}_{field}_{uuid.uuid4().hex[:8]}{ext}"
    try:
        return await asyncio.to_thread(_upload_sync, filename, content, content_type)
    except Exception as e:
        logger.error(f"Franchise document upload failed for {field}: {e}")
        raise HTTPException(status_code=503, detail=f"{field}: document storage is temporarily unavailable") from e


def delete_app_files(app: dict):
    for field in ["aadhaar", "pan", "bank_statement", "address_proof", "other_docs", "tc_video"]:
        url = app.get(field, "")
        if not url:
            continue
        if is_local_url(url):
            delete_local_file(url)
        elif url and "/franchise-docs/" in url:
            try:
                supabase.storage.from_("franchise-docs").remove([url.split("/")[-1]])
            except Exception as e:
                logger.warning(f"Failed to delete franchise doc {url.split('/')[-1]} from storage: {e}")


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
    # Blocking SQLite limiter — keep off the event loop (workers=1).
    await asyncio.to_thread(franchise_limiter.check, f"franchise_order:{ip}")

    email = sanitize_input(body.email, 200)
    phone = sanitize_input(body.phone, 20)
    if not validate_email(email):
        raise HTTPException(400, "Invalid email")
    if not validate_phone(phone):
        raise HTTPException(400, "Invalid phone")

    # Reject duplicates BEFORE charging. The same check exists on submit, but by
    # then the ₹11,799 fee is already captured and the applicant would have to
    # wait for an auto-refund.
    try:
        existing = await asyncio.to_thread(
            lambda: supabase.table("franchise_applications").select("id,login_id").eq("phone", phone).execute()
        )
    except Exception as e:
        logger.error(f"Failed to check existing franchise application: {e}")
        raise HTTPException(
            status_code=503,
            detail="Application service is temporarily unavailable. Please try again shortly.",
        ) from e
    if existing.data and existing.data[0].get("login_id"):
        raise HTTPException(400, "Application already exists for this phone number")

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
    background_tasks: BackgroundTasks,
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    dob: str = Form(""),
    business_experience: str = Form(""),
    preferred_location: str = Form(""),
    franchise_type: str = Form(""),
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
    if tc_accepted.strip().lower() != "true":
        raise HTTPException(status_code=400, detail="Please accept the franchise terms and conditions")

    # Check if franchise applications are enabled. Fail CLOSED on unexpected
    # errors — the old `except Exception: pass` re-opened a closed franchise
    # form on any transient DB error.
    try:
        setting = await asyncio.to_thread(
            lambda: supabase.table("site_settings").select("value").eq("key", "franchise_enabled").execute()
        )
        if setting.data and setting.data[0]["value"] == "false":
            raise HTTPException(status_code=403, detail="Franchise applications are currently closed")
    except HTTPException:
        raise
    except Exception as e:
        if is_settings_not_configured(e):
            logger.warning(f"site_settings unavailable ({e}); allowing submission (flag not configured)")
        else:
            logger.error(f"Failed to read franchise_enabled flag, failing closed: {e}")
            raise HTTPException(status_code=503, detail="Franchise applications are temporarily unavailable. Please try again shortly.")
    ip = get_client_ip(request)
    await asyncio.to_thread(franchise_limiter.check, f"franchise:{ip}")

    full_name = sanitize_input(full_name, 200)
    email = sanitize_input(email, 200)
    phone = sanitize_input(phone, 20)

    if not full_name:
        raise HTTPException(400, "Full name is required")
    if not validate_email(email):
        raise HTTPException(400, "Invalid email")
    if not validate_phone(phone):
        raise HTTPException(400, "Invalid phone")
    # DOB is the applicant's login credential for /api/franchise/status.
    # Without a well-formed value the application can never be accessed.
    dob = sanitize_input(dob, 20).strip()
    try:
        datetime.strptime(dob, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Date of birth is required (YYYY-MM-DD)")
    # The four documents the UI marks as mandatory must actually be present,
    # otherwise an application reaches admin review with nothing to assess.
    for field_name, upload in (
        ("aadhaar", aadhaar),
        ("pan", pan),
        ("bank_statement", bank_statement),
        ("address_proof", address_proof),
    ):
        if not upload or not upload.filename:
            raise HTTPException(400, f"{field_name} document is required")
    normalized_franchise_type = sanitize_input(franchise_type, 50).strip().lower()
    if normalized_franchise_type in ("highway", "highway edition"):
        normalized_franchise_type = "highway"
        investment_capability = "₹1.5 Cr – ₹3 Cr"
    elif normalized_franchise_type in ("city", "city edition"):
        normalized_franchise_type = "city"
        investment_capability = "₹70 Lakh – ₹1 Cr"
    else:
        raise HTTPException(400, "Please choose a valid franchise edition")
    if not razorpay_order_id or not razorpay_payment_id:
        raise HTTPException(400, "Payment is required")
    # Blocking Supabase lookups in an async handler — run in a worker thread.
    try:
        payment_already_used = await asyncio.to_thread(_check_payment_used, razorpay_payment_id, razorpay_order_id)
    except Exception as e:
        logger.error(f"Failed to check franchise payment reuse: {e}")
        raise HTTPException(status_code=503, detail="Payment verification is temporarily unavailable. Please try again shortly.") from e
    if payment_already_used:
        raise HTTPException(400, "This payment has already been used")
    if not await asyncio.to_thread(_verify_signature, razorpay_order_id, razorpay_payment_id, razorpay_signature):
        raise HTTPException(400, "Payment verification failed")

    try:
        client = _get_client()
        payment = await asyncio.to_thread(lambda: client.payment.fetch(razorpay_payment_id))
    except Exception as e:
        logger.error(f"Payment fetch failed: {e}")
        raise HTTPException(400, "Could not verify payment")

    if payment.get("status") == "authorized":
        # Late authorization / manual-capture accounts leave the payment in the
        # "authorized" state. Capture it here so the application can complete.
        try:
            await asyncio.to_thread(
                lambda: client.payment.capture(razorpay_payment_id, {"amount": payment.get("amount") or 0})
            )
            payment = await asyncio.to_thread(lambda: client.payment.fetch(razorpay_payment_id))
            logger.info(f"Captured previously-authorized franchise payment {razorpay_payment_id}")
        except Exception as e:
            logger.warning(f"Could not capture authorized franchise payment {razorpay_payment_id}: {e}")

    if payment.get("status") != "captured":
        raise HTTPException(400, f"Payment not captured (status: {payment.get('status')})")
    if payment.get("amount", 0) != FRANCHISE_FEE_PAISE:
        raise HTTPException(400, "Payment amount mismatch")
    if payment.get("currency") != "INR":
        raise HTTPException(400, "Invalid currency")

    try:
        existing = await asyncio.to_thread(
            lambda: supabase.table("franchise_applications").select("id,login_id").eq("phone", phone).execute()
        )
    except Exception as e:
        logger.error(f"Failed to check existing franchise application: {e}")
        raise HTTPException(status_code=503, detail="Application service is temporarily unavailable. Please try again shortly.") from e
    if existing.data and existing.data[0].get("login_id"):
        raise HTTPException(400, "Application already exists for this phone number")

    aadhaar_url = await _upload_file(aadhaar, full_name, "aadhaar")
    pan_url = await _upload_file(pan, full_name, "pan")
    bank_url = await _upload_file(bank_statement, full_name, "bank_statement")
    address_url = await _upload_file(address_proof, full_name, "address_proof")
    other_url = await _upload_file(other_docs, full_name, "other_docs")

    tc_video_url = ""
    if tc_video and tc_video.filename:
        # Reject instead of silently dropping: the applicant explicitly chose
        # this file and must not believe it was uploaded when it was not.
        ext = os.path.splitext(tc_video.filename)[1].lower()
        if ext not in ALLOWED_VIDEO_EXT:
            raise HTTPException(400, "tc_video: unsupported format (use MP4, WebM or MOV)")
        content = await tc_video.read()
        if not content:
            raise HTTPException(400, "tc_video: empty file uploaded")
        if len(content) > MAX_VIDEO_SIZE:
            raise HTTPException(400, "tc_video: file too large (max 15MB)")
        if STORAGE_MODE in ("hybrid", "local"):
            try:
                # Blocking disk write — keep off the event loop.
                tc_video_url = await asyncio.to_thread(
                    save_private_doc_local, content, tc_video.filename, "franchise"
                )
            except Exception as e:
                logger.warning(f"Local video save failed: {e}")
                if STORAGE_MODE == "local":
                    raise
        if not tc_video_url:
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
        "franchise_type": normalized_franchise_type,
        "investment_capability": investment_capability,
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
        # Payment is already captured. Preserve the application locally for
        # admin reconciliation instead of losing the paid submission.
        try:
            from local_queue import queue_push
            qid = queue_push(data)
        except Exception as queue_err:
            logger.critical(
                "Could not persist captured franchise payment %s to local queue: %s",
                razorpay_payment_id,
                queue_err,
            )
            raise HTTPException(
                status_code=503,
                detail=(
                    "Payment was received, but the application could not be saved. "
                    f"Contact support with payment reference {razorpay_payment_id}."
                ),
            ) from queue_err
        logger.warning(
            "Supabase application save failed; queued captured franchise payment %s as %s",
            razorpay_payment_id,
            qid,
        )
        return {
            "ok": True,
            "id": 0,
            "login_id": login_id,
            "queued": True,
            "queue_id": qid,
            "note": "Payment verified; application saved locally for administrator reconciliation.",
        }

    background_tasks.add_task(
        send_franchise_confirmation, email, full_name, login_id, phone
    )
    background_tasks.add_task(
        send_franchise_admin_notification, full_name, email, phone, preferred_location
    )

    return {"ok": True, "id": app_id, "login_id": login_id}


@router.post("/api/franchise/login")
def franchise_login(request: Request, creds: FranchiseLogin, response: Response):
    ip = get_client_ip(request)
    key = f"franchise:{ip}"
    franchise_limiter.check(key)
    # Per-ACCOUNT attempt limit (keyed by phone, not IP): DOB guessing stays
    # throttled even when the attacker rotates or spoofs IPs. Digits-only key
    # so "+91 98765-43210" and "9876543210" share one bucket.
    account_key = f"franchise_acc:{re.sub(r'[^0-9]', '', creds.phone or '')}"
    # Stricter per-account limiter for DOB guessing (3 attempts per 10 minutes).
    franchise_login_limiter.check(account_key)

    result = supabase.table("franchise_applications").select("*").eq("phone", creds.phone).execute()
    if not result.data:
        raise HTTPException(401, "Invalid credentials")
    app = result.data[0]
    stored_dob = (app.get("dob") or "").strip()
    if not stored_dob or stored_dob != creds.dob.strip():
        raise HTTPException(401, "Invalid credentials")

    # Successful login clears the per-account counter (same pattern as admin
    # login): only someone who knows the correct DOB can reset it.
    # NOTE: this must be franchise_login_limiter — the limiter account_key was
    # actually checked against. Resetting franchise_limiter here was a no-op,
    # so a correct DOB stayed locked out for the rest of the window.
    franchise_login_limiter.reset(account_key)

    token = create_token({"sub": str(app["id"]), "type": "franchise"})
    response.set_cookie("franchise_session", token, httponly=True, samesite="lax", max_age=SESSION_COOKIE_MAX_AGE, secure=True, path="/")
    csrf_token = generate_csrf_token()
    set_csrf_cookie(response, csrf_token, secure=True)

    return {"application": FranchiseOut(**app).model_dump()}


@router.get("/api/franchise/status")
def franchise_status(franchise_session: Optional[str] = Cookie(None)):
    if not franchise_session:
        raise HTTPException(401, "Not authenticated")
    payload = decode_token(franchise_session)
    if not payload or payload.get("type") != "franchise":
        raise HTTPException(401, "Invalid session")
    try:
        app_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(401, "Invalid token")

    result = supabase.table("franchise_applications").select("*").eq("id", app_id).execute()
    if not result.data:
        raise HTTPException(404, "Application not found")
    app = result.data[0]
    return {"application": FranchiseOut(**app).model_dump()}


@router.post("/api/franchise/logout")
def franchise_logout(request: Request, response: Response):
    validate_csrf(request)
    response.delete_cookie("franchise_session", samesite="lax", secure=True, path="/")
    response.delete_cookie("csrf_token", samesite="lax", secure=True, path="/")
    return {"ok": True}
