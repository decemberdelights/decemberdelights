import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def send_password_email(to_email: str, full_name: str, password: str, login_id: str) -> bool:
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_EMAIL", "")
    smtp_pass = os.environ.get("SMTP_PASSWORD", "")
    from_name = os.environ.get("SMTP_FROM_NAME", "December Delights")

    if not smtp_user or not smtp_pass:
        logger.warning("SMTP not configured — skipping password email")
        return False

    first_name = full_name.split(" ")[0] if full_name else "Applicant"

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{from_name} <{smtp_user}>"
    msg["To"] = to_email
    msg["Subject"] = "Your December Delights Franchise Login Credentials"

    html = f"""
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
          If you did not submit this application, please ignore this email or contact us at <a href="mailto:support@decemberdelights.com" style="color: #1b3c33;">support@decemberdelights.com</a>.
        </p>
      </div>

      <p style="font-size: 11px; color: #bbb; text-align: center; margin-top: 24px;">
        &copy; 2026 December Delights. All rights reserved.
      </p>
    </div>
    """

    plain = f"""Welcome, {first_name}!

Your franchise application has been received.

Login ID: {login_id}
Password: {password}

Track your application: https://decemberdelights.onrender.com/franchise/status

If you did not submit this application, please ignore this email.
"""

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, [to_email], msg.as_string())
        logger.info(f"Password email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password email to {to_email}: {e}")
        return False
