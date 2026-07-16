import os
import ssl
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp-relay.brevo.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@decemberdelights.com")
SENDER_NAME = os.environ.get("SENDER_NAME", "December Delights")


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured, skipping email")
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    text_part = MIMEText(html_body, "html", "utf-8")
    msg.attach(text_part)

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_order_confirmation(customer_name: str, customer_email: str, order_id: int, items: list, total: float, phone: str = "") -> bool:
    if not customer_email:
        return False

    items_html = ""
    for item in items:
        name = item.get("name", "Item")
        qty = item.get("quantity", 0)
        price = item.get("price", 0)
        items_html += f"""
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">{name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">{qty}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">₹{price * qty:.2f}</td>
        </tr>"""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;background-color:#f9f9f9;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="background-color:#4a2c2a;padding:24px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:22px;">☕ December Delights</h1>
            </div>
            <div style="padding:32px;">
                <h2 style="color:#4a2c2a;margin-top:0;">Order Confirmed!</h2>
                <p style="color:#555;font-size:16px;">Hi <strong>{customer_name}</strong>,</p>
                <p style="color:#555;font-size:16px;">Thank you for your order. Here are your order details:</p>

                <div style="background:#f8f4f0;border-radius:6px;padding:12px 16px;margin:20px 0;">
                    <p style="margin:0;color:#4a2c2a;font-size:14px;">Order ID: <strong>#{order_id}</strong></p>
                </div>

                <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                    <thead>
                        <tr style="background-color:#4a2c2a;color:#fff;">
                            <th style="padding:10px 12px;text-align:left;">Item</th>
                            <th style="padding:10px 12px;text-align:center;">Qty</th>
                            <th style="padding:10px 12px;text-align:right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>{items_html}</tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="padding:12px;font-weight:bold;font-size:16px;text-align:right;">Total:</td>
                            <td style="padding:12px;font-weight:bold;font-size:16px;text-align:right;color:#4a2c2a;">₹{total:.2f}</td>
                        </tr>
                    </tfoot>
                </table>

                <p style="color:#555;font-size:15px;">We'll notify you once your order is out for delivery.</p>

                <div style="background:#f8f4f0;border-radius:6px;padding:16px;margin:20px 0;">
                    <p style="margin:0 0 6px 0;color:#4a2c2a;font-size:14px;"><strong>Track Your Order</strong></p>
                    <p style="margin:0;color:#555;font-size:14px;">Use your phone number <strong>{phone}</strong> to track your order status on our website.</p>
                </div>

                <div style="text-align:center;margin-top:24px;">
                    <a href="https://decemberdelights.vercel.app/track" style="background:#4a2c2a;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-size:14px;display:inline-block;">Track Order</a>
                </div>
            </div>
            <div style="background:#f4f4f4;padding:16px;text-align:center;">
                <p style="margin:0;color:#888;font-size:12px;">December Delights — Crafted with love ☕</p>
            </div>
        </div>
    </body>
    </html>"""

    return _send_email(customer_email, f"Order Confirmed — #{order_id} | December Delights", html)


def send_franchise_acknowledgment(full_name: str, email: str, phone: str, password: str, login_id: str) -> bool:
    if not email:
        return False

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;background-color:#f9f9f9;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="background-color:#4a2c2a;padding:24px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:22px;">☕ December Delights — Franchise</h1>
            </div>
            <div style="padding:32px;">
                <h2 style="color:#4a2c2a;margin-top:0;">Application Received!</h2>
                <p style="color:#555;font-size:16px;">Hi <strong>{full_name}</strong>,</p>
                <p style="color:#555;font-size:16px;">Thank you for applying to become a December Delights franchise partner. We've received your application and our team will review it shortly.</p>

                <div style="background:#f8f4f0;border-radius:6px;padding:16px;margin:20px 0;">
                    <p style="margin:0 0 8px 0;color:#4a2c2a;font-size:14px;"><strong>Your Login Credentials:</strong></p>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:6px 0;color:#888;font-size:14px;">Name:</td>
                            <td style="padding:6px 0;color:#4a2c2a;font-size:14px;font-weight:bold;">{full_name}</td>
                        </tr>
                        <tr>
                            <td style="padding:6px 0;color:#888;font-size:14px;">Login ID:</td>
                            <td style="padding:6px 0;color:#4a2c2a;font-size:14px;font-weight:bold;letter-spacing:1px;">{login_id}</td>
                        </tr>
                        <tr>
                            <td style="padding:6px 0;color:#888;font-size:14px;">Password:</td>
                            <td style="padding:6px 0;color:#4a2c2a;font-size:14px;font-weight:bold;">{password}</td>
                        </tr>
                        <tr>
                            <td style="padding:6px 0;color:#888;font-size:14px;">Phone:</td>
                            <td style="padding:6px 0;color:#4a2c2a;font-size:14px;font-weight:bold;">{phone}</td>
                        </tr>
                    </table>
                </div>

                <p style="color:#555;font-size:15px;"><strong>What's next?</strong></p>
                <ul style="color:#555;font-size:15px;line-height:1.8;">
                    <li>Our team will review your application within 3-5 business days.</li>
                    <li>You can check your application status anytime on our website.</li>
                    <li>We may reach out to you for additional information.</li>
                </ul>

                <div style="text-align:center;margin-top:24px;">
                    <a href="https://decemberdelights.vercel.app/franchise/status" style="background:#4a2c2a;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-size:14px;display:inline-block;">Check Status</a>
                </div>
            </div>
            <div style="background:#f4f4f4;padding:16px;text-align:center;">
                <p style="margin:0;color:#888;font-size:12px;">December Delights — Crafted with love ☕</p>
            </div>
        </div>
    </body>
    </html>"""

    return _send_email(email, f"Franchise Application Received — {full_name} | December Delights", html)
