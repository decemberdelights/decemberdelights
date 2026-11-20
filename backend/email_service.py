import os
import ssl
import smtplib
import logging
import threading
import html
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "info@decemberdelights.in")
ALTERNATE_ADMIN_EMAIL = os.environ.get(
    "ALTERNATE_ADMIN_EMAIL", "praveennaraharishetty@gmail.com"
)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.decemberdelights.in")


def _admin_recipients() -> list[str]:
    return list(
        dict.fromkeys(
            email.strip()
            for email in (ADMIN_EMAIL, ALTERNATE_ADMIN_EMAIL)
            if email and email.strip()
        )
    )


def _h(value) -> str:
    """Escape dynamic data for interpolation into HTML email bodies.

    Done INSIDE the email builders so safety never depends on callers
    having sanitized first (defense in depth)."""
    return html.escape(str(value if value is not None else ""))


def _header_safe(value) -> str:
    """Strip CR/LF from user data that goes into a Subject: header —
    prevents SMTP header injection."""
    return str(value or "").replace("\r", " ").replace("\n", " ").strip()

# Thread-local SMTP connection pool
_local = threading.local()


def _get_smtp_connection():
    """Reuse SMTP connection per thread to avoid reconnecting for every email."""
    now = __import__("time").time()
    if hasattr(_local, "smtp") and hasattr(_local, "smtp_connected_at"):
        # Reuse if connected less than 300 seconds ago
        if now - _local.smtp_connected_at < 300:
            try:
                _local.smtp.noop()
                return _local.smtp
            except Exception:
                _local.smtp = None
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        return None
    try:
        context = ssl.create_default_context()
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context, timeout=10)
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        _local.smtp = server
        _local.smtp_connected_at = now
        return server
    except Exception as e:
        logger.error(f"SMTP connection failed: {e}")
        _local.smtp = None
        return None


def _send_email(to_email: str | list[str], subject: str, html_body: str, plain_body: str = "") -> bool:
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        logger.warning("Gmail credentials not configured — skipping email")
        return False

    recipients = [to_email] if isinstance(to_email, str) else to_email
    recipients = list(dict.fromkeys(email.strip() for email in recipients if email and email.strip()))
    if not recipients:
        logger.error("Email has no valid recipients — skipping email")
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = f"December Delights <{GMAIL_USER}>"
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject

    if plain_body:
        msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        server = _get_smtp_connection()
        if not server:
            # Fallback: one-shot connection
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as s:
                s.login(GMAIL_USER, GMAIL_APP_PASSWORD)
                s.sendmail(GMAIL_USER, recipients, msg.as_string())
        else:
            server.sendmail(GMAIL_USER, recipients, msg.as_string())
        logger.info(f"Email sent to {', '.join(recipients)}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {', '.join(recipients)}: {e}")
        # Reset connection on failure
        _local.smtp = None
        return False


def send_password_reset_otp(to_email: str, username: str, otp: str) -> bool:
    """Send a superadmin password-reset OTP. OTP is valid for 10 minutes."""
    safe_user = _h(username)
    subject = "December Delights — Admin Password Reset Code"
    html_body = f"""<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e8e5e0;border-radius:12px;overflow:hidden;">
      <div style="background:#1b3c33;color:#ffffff;padding:24px 32px;text-align:center;">
        <div style="font-size:20px;font-weight:700;letter-spacing:2px;">DECEMBER DELIGHTS</div>
        <div style="font-size:11px;opacity:0.7;letter-spacing:1px;margin-top:4px;">ADMIN PASSWORD RESET</div>
      </div>
      <div style="padding:28px 32px;">
        <p style="font-size:14px;color:#333;">A password reset was requested for superadmin account <strong>{safe_user}</strong>.</p>
        <p style="font-size:14px;color:#333;">Your verification code (valid for <strong>10 minutes</strong>):</p>
        <p style="text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#1b3c33;background:#f7f3ee;border-radius:10px;padding:16px 8px;margin:16px 0;">{otp}</p>
        <p style="font-size:12px;color:#888;">If you did not request this, you can safely ignore this email — your password will not change.</p>
      </div>
    </div>"""
    plain_body = f"December Delights admin password reset for {username}.\n\nYour verification code (valid 10 minutes): {otp}\n\nIf you did not request this, ignore this email."
    return _send_email(to_email, subject, html_body, plain_body)


def send_franchise_confirmation(to_email: str, full_name: str, login_id: str, phone: str) -> bool:
    subject = "Your Franchise Application — December Delights"
    safe_name = _h(full_name)
    safe_login_id = _h(login_id)
    safe_phone = _h(phone)
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf9f4; border-radius: 16px; overflow: hidden;">
      <div style="background: #074134; padding: 32px; text-align: center;">
        <h1 style="color: #c8a97e; margin: 0; font-size: 24px; letter-spacing: 2px;">DECEMBER DELIGHTS</h1>
        <p style="color: #fdf9f4; margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; opacity: 0.8;">FINE COFFEE & CUISINE</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #074134; margin: 0 0 16px; font-size: 20px;">Franchise Application Received</h2>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Dear <strong>{safe_name}</strong>,
        </p>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Thank you for applying for a December Delights franchise! We've received your application and payment of ₹11,799 (inclusive of 18% GST).
        </p>
        <div style="background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Application ID</p>
          <p style="margin: 0; color: #074134; font-size: 20px; font-weight: 700; letter-spacing: 1px;">{safe_login_id}</p>
        </div>
        <div style="background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <p style="margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Login Phone Number</p>
          <p style="margin: 0; color: #074134; font-size: 16px; font-weight: 600;">{safe_phone}</p>
        </div>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          You can track your application status anytime using your phone number at:
        </p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="{FRONTEND_URL}/franchise/status" style="display: inline-block; background: #074134; color: #fff; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; letter-spacing: 0.5px;">Track Your Application</a>
        </p>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Our team will review your application and get back to you within 5-7 business days.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(7,65,52,0.1); margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          December Delights — Fine Coffee & Cuisine, Hyderabad<br>
          This is an automated confirmation email.
        </p>
      </div>
    </div>
    """
    plain = f"Dear {full_name},\n\nThank you for applying for a December Delights franchise!\n\nYour Application ID: {login_id}\nLogin Phone: {phone}\n\nTrack your application: {FRONTEND_URL}/franchise/status\n\nOur team will review your application within 5-7 business days.\n\n— December Delights"
    return _send_email(to_email, subject, html, plain)


def send_franchise_admin_notification(full_name: str, email: str, phone: str, preferred_location: str) -> bool:
    subject = f"New Franchise Application — {_header_safe(full_name)}"
    safe_name = _h(full_name)
    safe_email = _h(email)
    safe_phone = _h(phone)
    safe_location = _h(preferred_location) if preferred_location else "—"
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #074134; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #c8a97e; margin: 0; font-size: 18px;">New Franchise Application</h2>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; font-size: 14px; color: #333;">
          <tr><td style="padding: 8px 0; color: #999; width: 120px;">Name</td><td style="padding: 8px 0; font-weight: 600;">{safe_name}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Email</td><td style="padding: 8px 0;">{safe_email}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Phone</td><td style="padding: 8px 0;">{safe_phone}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Location</td><td style="padding: 8px 0;">{safe_location}</td></tr>
        </table>
        <p style="margin: 16px 0 0; font-size: 13px; color: #999;">Review in Admin Dashboard</p>
      </div>
    </div>
    """
    return _send_email(_admin_recipients(), subject, html)


def send_contact_notification(name: str, email: str, phone: str, subject: str, message: str) -> bool:
    safe_name = _h(name)
    safe_email = _h(email)
    safe_phone = _h(phone)
    safe_subject = _h(subject)
    safe_message = _h(message)
    # 1. Send thank-you email to customer
    customer_html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf9f4; border-radius: 16px; overflow: hidden;">
      <div style="background: #074134; padding: 32px; text-align: center;">
        <h1 style="color: #c8a97e; margin: 0; font-size: 24px; letter-spacing: 2px;">DECEMBER DELIGHTS</h1>
        <p style="color: #fdf9f4; margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; opacity: 0.8;">FINE COFFEE & CUISINE</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #074134; margin: 0 0 16px; font-size: 20px;">Thank You for Your Feedback!</h2>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Dear <strong>{safe_name}</strong>,
        </p>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Thank you for reaching out to us! We've received your message and our team will get back to you within 24-48 hours.
        </p>
        <div style="background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Message</p>
          <p style="margin: 0; color: #074134; font-size: 14px;">{safe_subject or "No subject"}</p>
          <p style="margin: 8px 0 0; color: #586159; font-size: 14px; line-height: 1.6;">{safe_message}</p>
        </div>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Meanwhile, feel free to explore our menu or visit us at our cafe!
        </p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="{FRONTEND_URL}/menu" style="display: inline-block; background: #074134; color: #fff; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; letter-spacing: 0.5px;">View Our Menu</a>
        </p>
        <hr style="border: none; border-top: 1px solid rgba(7,65,52,0.1); margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          December Delights — Fine Coffee & Cuisine, Hyderabad
        </p>
      </div>
    </div>
    """
    customer_plain = f"Dear {name},\n\nThank you for your feedback! We've received your message and will get back to you within 24-48 hours.\n\nYour message: {subject}\n\n— December Delights"
    _send_email(email, "Thank You for Your Feedback — December Delights", customer_html, customer_plain)

    # 2. Send notification to admin
    admin_subject = f"New Feedback from {_header_safe(name)}" + (f" — {_header_safe(subject)}" if subject else "")
    admin_html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #074134; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #c8a97e; margin: 0; font-size: 18px;">New Feedback Received</h2>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; font-size: 14px; color: #333;">
          <tr><td style="padding: 8px 0; color: #999; width: 100px;">From</td><td style="padding: 8px 0; font-weight: 600;">{safe_name}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Email</td><td style="padding: 8px 0;">{safe_email}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Phone</td><td style="padding: 8px 0;">{safe_phone or "—"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Subject</td><td style="padding: 8px 0;">{safe_subject or "—"}</td></tr>
        </table>
        <div style="background: #f8f8f8; border-radius: 8px; padding: 16px; margin-top: 16px;">
          <p style="margin: 0; color: #586159; line-height: 1.6; font-size: 14px;">{safe_message}</p>
        </div>
      </div>
    </div>
    """
    return _send_email(ADMIN_EMAIL, admin_subject, admin_html)


def send_franchise_approved(to_email: str, full_name: str, login_id: str, phone: str, admin_notes: str = "") -> bool:
    subject = "Congratulations! Your Franchise Application is Approved — December Delights"
    safe_name = _h(full_name)
    safe_login_id = _h(login_id)
    safe_notes = _h(admin_notes) if admin_notes else ""
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf9f4; border-radius: 16px; overflow: hidden;">
      <div style="background: #074134; padding: 32px; text-align: center;">
        <h1 style="color: #c8a97e; margin: 0; font-size: 24px; letter-spacing: 2px;">DECEMBER DELIGHTS</h1>
        <p style="color: #fdf9f4; margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; opacity: 0.8;">FINE COFFEE & CUISINE</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #074134; margin: 0 0 16px; font-size: 20px;">Your Application is Approved!</h2>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Dear <strong>{safe_name}</strong>,
        </p>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Great news! Your franchise application has been <strong style="color: #074134;">approved</strong>. Welcome to the December Delights family!
        </p>
        <div style="background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Application ID</p>
          <p style="margin: 0; color: #074134; font-size: 20px; font-weight: 700; letter-spacing: 1px;">{safe_login_id}</p>
        </div>
        {"<div style='background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 0 0 24px;'><p style='margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;'>Note from Admin</p><p style='margin: 0; color: #074134; font-size: 14px; line-height: 1.6;'>" + safe_notes + "</p></div>" if safe_notes else ""}
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Our team will contact you shortly with the next steps. You can also track your application status anytime.
        </p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="{FRONTEND_URL}/franchise/status" style="display: inline-block; background: #074134; color: #fff; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600;">Track Your Application</a>
        </p>
        <hr style="border: none; border-top: 1px solid rgba(7,65,52,0.1); margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          December Delights — Fine Coffee & Cuisine, Hyderabad
        </p>
      </div>
    </div>
    """
    plain = f"Dear {full_name},\n\nGreat news! Your franchise application has been APPROVED.\n\nApplication ID: {login_id}\n\nOur team will contact you shortly.\n\n— December Delights"
    return _send_email(to_email, subject, html, plain)


def send_franchise_rejected(to_email: str, full_name: str, login_id: str, phone: str, admin_notes: str = "") -> bool:
    subject = "Franchise Application Update — December Delights"
    safe_name = _h(full_name)
    safe_login_id = _h(login_id)
    safe_notes = _h(admin_notes) if admin_notes else ""
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf9f4; border-radius: 16px; overflow: hidden;">
      <div style="background: #074134; padding: 32px; text-align: center;">
        <h1 style="color: #c8a97e; margin: 0; font-size: 24px; letter-spacing: 2px;">DECEMBER DELIGHTS</h1>
        <p style="color: #fdf9f4; margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; opacity: 0.8;">FINE COFFEE & CUISINE</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #074134; margin: 0 0 16px; font-size: 20px;">Application Update</h2>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Dear <strong>{safe_name}</strong>,
        </p>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Thank you for your interest in a December Delights franchise. After careful review, we regret to inform you that we are <strong>unable to approve</strong> your application at this time.
        </p>
        <div style="background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Application ID</p>
          <p style="margin: 0; color: #074134; font-size: 20px; font-weight: 700; letter-spacing: 1px;">{safe_login_id}</p>
        </div>
        {"<div style='background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 0 0 24px;'><p style='margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;'>Reason</p><p style='margin: 0; color: #074134; font-size: 14px; line-height: 1.6;'>" + safe_notes + "</p></div>" if safe_notes else ""}
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          We encourage you to apply again in the future. If you have any questions, please don't hesitate to reach out.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(7,65,52,0.1); margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          December Delights — Fine Coffee & Cuisine, Hyderabad
        </p>
      </div>
    </div>
    """
    plain = f"Dear {full_name},\n\nThank you for your interest in a December Delights franchise. After review, we are unable to approve your application at this time.\n\nApplication ID: {login_id}\n\nReason: {admin_notes}\n\n— December Delights"
    return _send_email(to_email, subject, html, plain)


def send_order_confirmation(to_email: str, customer_name: str, order_id: int, items: list, total: float, payment_method: str, full_address: str = "", subtotal: float = 0.0, gst_amount: float = 0.0, delivery_charge: float = 0.0) -> bool:
    subject = f"Order #{order_id} Confirmed — December Delights"
    safe_customer_name = _h(customer_name)
    safe_address = _h(full_address)
    payment_label = "Online (Razorpay)" if payment_method == "razorpay" else "Cash on Delivery"
    items_html = "".join([
        f"<tr><td style='padding:8px 12px;border-bottom:1px solid #f0ede8;font-size:13px;color:#1b3c33;'>{_h(item.get('name', ''))}</td>"
        f"<td style='padding:8px 12px;border-bottom:1px solid #f0ede8;font-size:13px;text-align:center;'>{item.get('quantity', 0)}</td>"
        f"<td style='padding:8px 12px;border-bottom:1px solid #f0ede8;font-size:13px;text-align:right;'>&#8377;{item.get('price', 0) * item.get('quantity', 0):.2f}</td></tr>"
        for item in items
    ])
    address_html = f"""
        <div style="margin-top:16px;padding:16px;background:#faf8f5;border-radius:10px;border:1px solid #e8e5e0;">
          <p style="margin:0 0 6px;color:#074134;font-weight:700;font-size:13px;">Delivery Address</p>
          <p style="margin:0;color:#586159;font-size:14px;line-height:1.6;">{safe_address or 'Not provided'}</p>
        </div>
    """ if full_address else ""
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf9f4; border-radius: 16px; overflow: hidden;">
      <div style="background: #074134; padding: 32px; text-align: center;">
        <h1 style="color: #c8a97e; margin: 0; font-size: 24px; letter-spacing: 2px;">DECEMBER DELIGHTS</h1>
        <p style="color: #fdf9f4; margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; opacity: 0.8;">FINE COFFEE & CUISINE</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #074134; margin: 0 0 16px; font-size: 20px;">Order Confirmed!</h2>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">Dear <strong>{safe_customer_name}</strong>,</p>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">Your order has been placed successfully.</p>
        <div style="background: #f0faf4; border: 1px solid #c3e8d4; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px; color: #1a7a4a; font-weight: 700; font-size: 14px;">Delivery and tracking update</p>
          <p style="margin: 0; color: #586159; line-height: 1.7; font-size: 14px;">Your order will be delivered within <strong>4–7 working days</strong>. Your consignment number will be sent by SMS within <strong>24–48 hours</strong>.</p>
        </div>
        <div style="background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Order Number</p>
          <p style="margin: 0; color: #074134; font-size: 20px; font-weight: 700;">#{order_id}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead><tr style="background: #1b3c33;"><th style="padding: 8px 12px; color: #fff; font-size: 11px; text-align: left;">Item</th><th style="padding: 8px 12px; color: #fff; font-size: 11px; text-align: center;">Qty</th><th style="padding: 8px 12px; color: #fff; font-size: 11px; text-align: right;">Price</th></tr></thead>
          <tbody>{items_html}</tbody>
        </table>
        <div style="display: flex; justify-content: space-between; padding: 6px 0;">
          <span style="font-size: 14px; color: #586159;">Subtotal</span>
          <span style="font-size: 14px; font-weight: 600; color: #1b3c33;">&#8377;{subtotal:.2f}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0;">
          <span style="font-size: 14px; color: #586159;">GST (5%)</span>
          <span style="font-size: 14px; font-weight: 600; color: #1b3c33;">&#8377;{gst_amount:.2f}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0;">
          <span style="font-size: 14px; color: #586159;">Delivery</span>
          <span style="font-size: 14px; font-weight: 600; color: #1b3c33;">&#8377;{delivery_charge:.2f}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #1b3c33; margin-top: 8px;">
          <span style="font-size: 15px; font-weight: 700; color: #1b3c33;">Total</span>
          <span style="font-size: 15px; font-weight: 700; color: #c8a97a;">&#8377;{total:.2f}</span>
        </div>
        <div style="margin-top: 20px; padding: 16px; background: #f0faf4; border-radius: 10px; border: 1px solid #c3e8d4;">
          <p style="margin: 0; color: #1a7a4a; font-weight: 700; font-size: 14px;">Payment: {payment_label}</p>
        </div>
        {address_html}
        <p style="color: #586159; line-height: 1.7; font-size: 15px; margin-top: 20px;">
          Track your order status anytime:
        </p>
        <p style="text-align: center; margin: 16px 0;">
          <a href="{FRONTEND_URL}/track" style="display: inline-block; background: #074134; color: #fff; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600;">Track Your Order</a>
        </p>
        <hr style="border: none; border-top: 1px solid rgba(7,65,52,0.1); margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          December Delights — Fine Coffee & Cuisine, Hyderabad<br>
          This is an automated confirmation email.
        </p>
      </div>
    </div>
    """
    plain = f"Dear {customer_name},\n\nYour order #{order_id} has been placed successfully. Your order will be delivered within 4-7 working days. Your consignment number will be sent by SMS within 24-48 hours.\n\nSubtotal: Rs. {subtotal:.2f}\nGST (5%): Rs. {gst_amount:.2f}\nDelivery: Rs. {delivery_charge:.2f}\nTotal: Rs. {total:.2f}\nPayment: {payment_method}\n\nTrack your order: {FRONTEND_URL}/track\n\n— December Delights"
    return _send_email(to_email, subject, html, plain)


def send_order_admin_notification(order_id: int, customer_name: str, customer_email: str, customer_phone: str, items: list, total: float, payment_method: str, full_address: str = "", subtotal: float = 0.0, gst_amount: float = 0.0, delivery_charge: float = 0.0) -> bool:
    """Notify the shop inbox (ADMIN_EMAIL) about a newly placed order."""
    safe_name = _h(customer_name)
    safe_email = _h(customer_email) if customer_email else "—"
    safe_phone = _h(customer_phone)
    safe_address = _h(full_address) if full_address else "—"
    payment_label = "Online (Razorpay)" if payment_method == "razorpay" else "Cash on Delivery"
    subject = f"New Order #{order_id} — {_header_safe(customer_name)}"
    items_html = "".join([
        f"<tr><td style='padding:8px 12px;border-bottom:1px solid #f0ede8;font-size:13px;color:#1b3c33;'>{_h(item.get('name', ''))}</td>"
        f"<td style='padding:8px 12px;border-bottom:1px solid #f0ede8;font-size:13px;text-align:center;'>{item.get('quantity', 0)}</td>"
        f"<td style='padding:8px 12px;border-bottom:1px solid #f0ede8;font-size:13px;text-align:right;'>&#8377;{item.get('price', 0) * item.get('quantity', 0):.2f}</td></tr>"
        for item in items
    ])
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #074134; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #c8a97e; margin: 0; font-size: 18px;">New Order Received</h2>
        <p style="color: #fdf9f4; margin: 8px 0 0; font-size: 13px; opacity: 0.8;">Order #{order_id}</p>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; font-size: 14px; color: #333; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #999; width: 130px;">Customer</td><td style="padding: 8px 0; font-weight: 600;">{safe_name}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Email</td><td style="padding: 8px 0;">{safe_email}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Phone</td><td style="padding: 8px 0;">{safe_phone}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Delivery Address</td><td style="padding: 8px 0;">{safe_address}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Payment</td><td style="padding: 8px 0; font-weight: 600;">{payment_label}</td></tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead><tr style="background: #1b3c33;"><th style="padding: 8px 12px; color: #fff; font-size: 11px; text-align: left;">Item</th><th style="padding: 8px 12px; color: #fff; font-size: 11px; text-align: center;">Qty</th><th style="padding: 8px 12px; color: #fff; font-size: 11px; text-align: right;">Price</th></tr></thead>
          <tbody>{items_html}</tbody>
        </table>
        <div style="display: flex; justify-content: space-between; padding: 6px 0;">
          <span style="font-size: 14px; color: #586159;">Subtotal</span>
          <span style="font-size: 14px; font-weight: 600; color: #1b3c33;">&#8377;{subtotal:.2f}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0;">
          <span style="font-size: 14px; color: #586159;">GST (5%)</span>
          <span style="font-size: 14px; font-weight: 600; color: #1b3c33;">&#8377;{gst_amount:.2f}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0;">
          <span style="font-size: 14px; color: #586159;">Delivery</span>
          <span style="font-size: 14px; font-weight: 600; color: #1b3c33;">&#8377;{delivery_charge:.2f}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #1b3c33; margin-top: 8px;">
          <span style="font-size: 15px; font-weight: 700; color: #1b3c33;">Total</span>
          <span style="font-size: 15px; font-weight: 700; color: #c8a97a;">&#8377;{total:.2f}</span>
        </div>
        <p style="margin: 16px 0 0; font-size: 13px; color: #999;">Review this order in the Admin Dashboard.</p>
      </div>
    </div>
    """
    plain = (
        f"New Order #{order_id}\n\n"
        f"Customer: {customer_name}\nEmail: {customer_email or '-'}\nPhone: {customer_phone}\n"
        f"Address: {full_address or '-'}\nPayment: {payment_label}\n\n"
        + "".join(f"- {item.get('name', '')} x{item.get('quantity', 0)} = Rs. {item.get('price', 0) * item.get('quantity', 0):.2f}\n" for item in items)
        + f"\nSubtotal: Rs. {subtotal:.2f}\nGST (5%): Rs. {gst_amount:.2f}\nDelivery: Rs. {delivery_charge:.2f}\nTotal: Rs. {total:.2f}"
    )
    return _send_email(_admin_recipients(), subject, html, plain)


def send_career_approved(to_email: str, full_name: str, position: str, admin_notes: str = "") -> bool:
    subject = f"Congratulations! Your Application is Approved — December Delights"
    safe_name = _h(full_name)
    safe_position = _h(position)
    safe_notes = _h(admin_notes) if admin_notes else ""
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf9f4; border-radius: 16px; overflow: hidden;">
      <div style="background: #074134; padding: 32px; text-align: center;">
        <h1 style="color: #c8a97e; margin: 0; font-size: 24px; letter-spacing: 2px;">DECEMBER DELIGHTS</h1>
        <p style="color: #fdf9f4; margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; opacity: 0.8;">FINE COFFEE & CUISINE</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #074134; margin: 0 0 16px; font-size: 20px;">Your Application is Approved!</h2>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">Dear <strong>{safe_name}</strong>,</p>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Great news! Your career application for <strong>{safe_position}</strong> has been <strong style="color: #074134;">approved</strong>.
        </p>
        {"<div style='background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 0 0 24px;'><p style='margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;'>Note from Team</p><p style='margin: 0; color: #074134; font-size: 14px; line-height: 1.6;'>{safe_notes}</p></div>" if admin_notes else ""}
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Our HR team will contact you shortly with the next steps. Please keep your phone available.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(7,65,52,0.1); margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          December Delights — Fine Coffee & Cuisine, Hyderabad
        </p>
      </div>
    </div>
    """
    plain = f"Dear {full_name},\n\nGreat news! Your career application for {position} has been approved.\n\nOur HR team will contact you shortly.\n\n— December Delights"
    return _send_email(to_email, subject, html, plain)

def send_career_application_received(to_email: str, full_name: str, position: str) -> bool:
    """Confirm receipt of a career application to the applicant."""
    safe_name = _h(full_name)
    safe_position = _h(position or "the position you selected")
    subject = "Career Application Received — December Delights"
    html = f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fdf9f4;border-radius:16px;overflow:hidden;">
      <div style="background:#074134;padding:32px;text-align:center;">
        <h1 style="color:#c8a97e;margin:0;font-size:24px;letter-spacing:2px;">DECEMBER DELIGHTS</h1>
        <p style="color:#fdf9f4;margin:8px 0 0;font-size:13px;letter-spacing:1px;opacity:.8;">FINE COFFEE &amp; CUISINE</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#074134;margin:0 0 16px;font-size:20px;">Application Received</h2>
        <p style="color:#586159;line-height:1.7;font-size:15px;">Dear <strong>{safe_name}</strong>,</p>
        <p style="color:#586159;line-height:1.7;font-size:15px;">
          Thank you for applying to join December Delights. We have received your application for
          <strong>{safe_position}</strong> and our team will review it.
        </p>
        <p style="color:#586159;line-height:1.7;font-size:15px;">
          We will contact you if your experience matches the role. Thank you for your interest in our team.
        </p>
        <hr style="border:none;border-top:1px solid rgba(7,65,52,.1);margin:24px 0;">
        <p style="color:#999;font-size:12px;text-align:center;margin:0;">
          December Delights — Fine Coffee &amp; Cuisine, Hyderabad<br>
          This is an automated confirmation email.
        </p>
      </div>
    </div>
    """
    plain = (
        f"Dear {full_name},\n\n"
        f"Thank you for applying to join December Delights. We have received your "
        f"application for {position or 'the position you selected'} and our team will review it.\n\n"
        "We will contact you if your experience matches the role.\n\n"
        "— December Delights"
    )
    return _send_email(to_email, subject, html, plain)


def send_career_rejected(to_email: str, full_name: str, position: str, admin_notes: str = "") -> bool:
    subject = "Career Application Update — December Delights"
    safe_name = _h(full_name)
    safe_position = _h(position)
    safe_notes = _h(admin_notes) if admin_notes else ""
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf9f4; border-radius: 16px; overflow: hidden;">
      <div style="background: #074134; padding: 32px; text-align: center;">
        <h1 style="color: #c8a97e; margin: 0; font-size: 24px; letter-spacing: 2px;">DECEMBER DELIGHTS</h1>
        <p style="color: #fdf9f4; margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; opacity: 0.8;">FINE COFFEE & CUISINE</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #074134; margin: 0 0 16px; font-size: 20px;">Application Update</h2>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">Dear <strong>{safe_name}</strong>,</p>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Thank you for applying for the <strong>{safe_position}</strong> position at December Delights. After careful review, we regret to inform you that we are unable to move forward with your application at this time.
        </p>
        {"<div style='background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 24px 0;'><p style='margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;'>Feedback</p><p style='margin: 0; color: #074134; font-size: 14px; line-height: 1.6;'>{safe_notes}</p></div>" if admin_notes else ""}
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          We encourage you to apply again in the future for other positions. We wish you all the best in your career.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(7,65,52,0.1); margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          December Delights — Fine Coffee & Cuisine, Hyderabad
        </p>
      </div>
    </div>
    """
    plain = f"Dear {full_name},\n\nThank you for applying for the {position} position. After review, we are unable to move forward with your application.\n\n— December Delights"
    return _send_email(to_email, subject, html, plain)
