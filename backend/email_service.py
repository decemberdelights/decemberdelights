import os
import ssl
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "info@decemberdelights.in")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.decemberdelights.in")


def _send_email(to_email: str, subject: str, html_body: str, plain_body: str = "") -> bool:
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        logger.warning("Gmail credentials not configured — skipping email")
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = f"December Delights <{GMAIL_USER}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    if plain_body:
        msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_franchise_confirmation(to_email: str, full_name: str, login_id: str, phone: str) -> bool:
    subject = "Your Franchise Application — December Delights"
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf9f4; border-radius: 16px; overflow: hidden;">
      <div style="background: #074134; padding: 32px; text-align: center;">
        <h1 style="color: #c8a97e; margin: 0; font-size: 24px; letter-spacing: 2px;">DECEMBER DELIGHTS</h1>
        <p style="color: #fdf9f4; margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; opacity: 0.8;">FINE COFFEE & CUISINE</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #074134; margin: 0 0 16px; font-size: 20px;">Franchise Application Received</h2>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Dear <strong>{full_name}</strong>,
        </p>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Thank you for applying for a December Delights franchise! We've received your application and payment of ₹11,799 (inclusive of 18% GST).
        </p>
        <div style="background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Application ID</p>
          <p style="margin: 0; color: #074134; font-size: 20px; font-weight: 700; letter-spacing: 1px;">{login_id}</p>
        </div>
        <div style="background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <p style="margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Login Phone Number</p>
          <p style="margin: 0; color: #074134; font-size: 16px; font-weight: 600;">{phone}</p>
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
    subject = f"New Franchise Application — {full_name}"
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #074134; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #c8a97e; margin: 0; font-size: 18px;">New Franchise Application</h2>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; font-size: 14px; color: #333;">
          <tr><td style="padding: 8px 0; color: #999; width: 120px;">Name</td><td style="padding: 8px 0; font-weight: 600;">{full_name}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Email</td><td style="padding: 8px 0;">{email}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Phone</td><td style="padding: 8px 0;">{phone}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Location</td><td style="padding: 8px 0;">{preferred_location or "—"}</td></tr>
        </table>
        <p style="margin: 16px 0 0; font-size: 13px; color: #999;">Review in Admin Dashboard</p>
      </div>
    </div>
    """
    return _send_email(ADMIN_EMAIL, subject, html)


def send_contact_notification(name: str, email: str, phone: str, subject: str, message: str) -> bool:
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
          Dear <strong>{name}</strong>,
        </p>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Thank you for reaching out to us! We've received your message and our team will get back to you within 24-48 hours.
        </p>
        <div style="background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Message</p>
          <p style="margin: 0; color: #074134; font-size: 14px;">{subject or "No subject"}</p>
          <p style="margin: 8px 0 0; color: #586159; font-size: 14px; line-height: 1.6;">{message}</p>
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
    admin_subject = f"New Feedback from {name}" + (f" — {subject}" if subject else "")
    admin_html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #074134; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #c8a97e; margin: 0; font-size: 18px;">New Feedback Received</h2>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; font-size: 14px; color: #333;">
          <tr><td style="padding: 8px 0; color: #999; width: 100px;">From</td><td style="padding: 8px 0; font-weight: 600;">{name}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Email</td><td style="padding: 8px 0;">{email}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Phone</td><td style="padding: 8px 0;">{phone or "—"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Subject</td><td style="padding: 8px 0;">{subject or "—"}</td></tr>
        </table>
        <div style="background: #f8f8f8; border-radius: 8px; padding: 16px; margin-top: 16px;">
          <p style="margin: 0; color: #586159; line-height: 1.6; font-size: 14px;">{message}</p>
        </div>
      </div>
    </div>
    """
    return _send_email(ADMIN_EMAIL, admin_subject, admin_html)


def send_franchise_approved(to_email: str, full_name: str, login_id: str, phone: str, admin_notes: str = "") -> bool:
    subject = "Congratulations! Your Franchise Application is Approved — December Delights"
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf9f4; border-radius: 16px; overflow: hidden;">
      <div style="background: #074134; padding: 32px; text-align: center;">
        <h1 style="color: #c8a97e; margin: 0; font-size: 24px; letter-spacing: 2px;">DECEMBER DELIGHTS</h1>
        <p style="color: #fdf9f4; margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; opacity: 0.8;">FINE COFFEE & CUISINE</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #074134; margin: 0 0 16px; font-size: 20px;">Your Application is Approved!</h2>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Dear <strong>{full_name}</strong>,
        </p>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Great news! Your franchise application has been <strong style="color: #074134;">approved</strong>. Welcome to the December Delights family!
        </p>
        <div style="background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Application ID</p>
          <p style="margin: 0; color: #074134; font-size: 20px; font-weight: 700; letter-spacing: 1px;">{login_id}</p>
        </div>
        {"<div style='background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 0 0 24px;'><p style='margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;'>Note from Admin</p><p style='margin: 0; color: #074134; font-size: 14px; line-height: 1.6;'>{admin_notes}</p></div>" if admin_notes else ""}
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
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf9f4; border-radius: 16px; overflow: hidden;">
      <div style="background: #074134; padding: 32px; text-align: center;">
        <h1 style="color: #c8a97e; margin: 0; font-size: 24px; letter-spacing: 2px;">DECEMBER DELIGHTS</h1>
        <p style="color: #fdf9f4; margin: 8px 0 0; font-size: 13px; letter-spacing: 1px; opacity: 0.8;">FINE COFFEE & CUISINE</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #074134; margin: 0 0 16px; font-size: 20px;">Application Update</h2>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Dear <strong>{full_name}</strong>,
        </p>
        <p style="color: #586159; line-height: 1.7; font-size: 15px;">
          Thank you for your interest in a December Delights franchise. After careful review, we regret to inform you that we are <strong>unable to approve</strong> your application at this time.
        </p>
        <div style="background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Application ID</p>
          <p style="margin: 0; color: #074134; font-size: 20px; font-weight: 700; letter-spacing: 1px;">{login_id}</p>
        </div>
        {"<div style='background: #fff; border: 1px solid rgba(7,65,52,0.1); border-radius: 12px; padding: 20px; margin: 0 0 24px;'><p style='margin: 0 0 8px; color: #586159; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;'>Reason</p><p style='margin: 0; color: #074134; font-size: 14px; line-height: 1.6;'>{admin_notes}</p></div>" if admin_notes else ""}
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
