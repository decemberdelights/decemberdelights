import os
import json
import logging
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

EMAIL_HTML = """
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #fdf9f4;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 22px; color: #1b3c33; margin: 0;">December Delights</h1>
    <p style="font-size: 12px; color: #999; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase;">Franchise Portal</p>
  </div>
  <div style="background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 12px rgba(27,60,51,0.06);">
    <h2 style="font-size: 20px; color: #1b3c33; margin: 0 0 12px;">Welcome, {first_name}!</h2>
    <p style="font-size: 14px; color: #586159; line-height: 1.7; margin: 0 0 24px;">
      Your franchise application has been received. Use the credentials below to log in and track your application status.
    </p>
    <div style="background: #f7f3ee; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <p style="font-size: 12px; color: #999; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px;">Login ID</p>
      <p style="font-size: 18px; color: #1b3c33; font-weight: 700; margin: 0; font-family: monospace;">{login_id}</p>
    </div>
    <div style="background: #f7f3ee; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="font-size: 12px; color: #999; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px;">Password</p>
      <p style="font-size: 18px; color: #1b3c33; font-weight: 700; margin: 0; font-family: monospace; word-break: break-all;">{password}</p>
    </div>
    <div style="text-align: center; margin-bottom: 20px;">
      <a href="https://decemberdelights.onrender.com/franchise/status" style="display: inline-block; padding: 12px 32px; background: #1b3c33; color: #fff; border-radius: 100px; text-decoration: none; font-weight: 700; font-size: 14px;">Track Application</a>
    </div>
    <p style="font-size: 12px; color: #999; line-height: 1.6; margin: 0;">
      If you did not submit this application, please ignore this email.
    </p>
  </div>
  <p style="font-size: 11px; color: #bbb; text-align: center; margin-top: 24px;">&copy; 2026 December Delights. All rights reserved.</p>
</div>
"""


def send_password_email(to_email: str, full_name: str, password: str, login_id: str) -> bool:
    api_key = os.environ.get("RESEND_API_KEY", "")
    from_email = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    from_name = os.environ.get("SMTP_FROM_NAME", "December Delights")

    if not api_key:
        logger.warning("RESEND_API_KEY not set — skipping password email")
        return False

    first_name = full_name.split(" ")[0] if full_name else "Applicant"

    html = EMAIL_HTML.format(first_name=first_name, login_id=login_id, password=password)
    plain = f"Welcome, {first_name}!\n\nYour franchise application has been received.\n\nLogin ID: {login_id}\nPassword: {password}\n\nTrack your application: https://decemberdelights.onrender.com/franchise/status"

    payload = json.dumps({
        "from": f"{from_name} <{from_email}>",
        "to": [to_email],
        "subject": "Your December Delights Franchise Login Credentials",
        "text": plain,
        "html": html,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode())
            logger.info(f"Password email sent to {to_email} — id: {body.get('id', '?')}")
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        logger.error(f"Resend API error {e.code} for {to_email}: {error_body}")
        return False
    except Exception as e:
        logger.error(f"Failed to send password email to {to_email}: {e}")
        return False


def test_email_connection() -> dict:
    api_key = os.environ.get("RESEND_API_KEY", "")
    from_email = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")

    if not api_key:
        return {"ok": False, "configured": False, "error": "RESEND_API_KEY env var not set"}

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps({
            "from": f"December Delights <{from_email}>",
            "to": ["test@resend.dev"],
            "subject": "SMTP Test",
            "text": "Test email",
        }).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode())
            return {"ok": True, "configured": True, "from_email": from_email, "email_id": body.get("id")}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        return {"ok": False, "configured": True, "error": f"HTTP {e.code}: {error_body}", "from_email": from_email}
    except Exception as e:
        return {"ok": False, "configured": True, "error": str(e), "from_email": from_email}
