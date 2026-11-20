import email_service


def test_order_confirmation_includes_delivery_and_consignment_timing(monkeypatch):
    sent = {}

    def capture_email(to_email, subject, html_body, plain_body=""):
        sent.update(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            plain_body=plain_body,
        )
        return True

    monkeypatch.setattr(email_service, "_send_email", capture_email)

    result = email_service.send_order_confirmation(
        "customer@example.com",
        "Test Customer",
        123,
        [],
        1090.0,
        "razorpay",
    )

    assert result is True
    assert "4–7 working days" in sent["html_body"]
    assert "24–48 hours" in sent["html_body"]
    assert "4-7 working days" in sent["plain_body"]
    assert "24-48 hours" in sent["plain_body"]


def test_order_notification_goes_to_both_admin_inboxes(monkeypatch):
    sent = {}
    monkeypatch.setattr(email_service, "ADMIN_EMAIL", "info@example.com")
    monkeypatch.setattr(email_service, "ALTERNATE_ADMIN_EMAIL", "alternate@example.com")
    monkeypatch.setattr(
        email_service,
        "_send_email",
        lambda to, subject, html, plain="": sent.update(
            to=to, subject=subject, html=html, plain=plain
        ) or True,
    )

    assert email_service.send_order_admin_notification(
        123, "Customer", "customer@example.com", "9876543210", [], 100.0, "razorpay"
    )
    assert sent["to"] == ["info@example.com", "alternate@example.com"]
    assert "New Order #123" in sent["subject"]


def test_franchise_notification_goes_to_both_admin_inboxes(monkeypatch):
    sent = {}
    monkeypatch.setattr(email_service, "ADMIN_EMAIL", "info@example.com")
    monkeypatch.setattr(email_service, "ALTERNATE_ADMIN_EMAIL", "alternate@example.com")
    monkeypatch.setattr(
        email_service,
        "_send_email",
        lambda to, subject, html, plain="": sent.update(
            to=to, subject=subject, html=html, plain=plain
        ) or True,
    )

    assert email_service.send_franchise_admin_notification(
        "Applicant", "applicant@example.com", "9876543210", "Test City"
    )
    assert sent["to"] == ["info@example.com", "alternate@example.com"]


def test_admin_recipients_are_deduplicated(monkeypatch):
    monkeypatch.setattr(email_service, "ADMIN_EMAIL", "info@example.com")
    monkeypatch.setattr(email_service, "ALTERNATE_ADMIN_EMAIL", "info@example.com")

    assert email_service._admin_recipients() == ["info@example.com"]


def test_send_email_delivers_to_every_recipient(monkeypatch):
    class FakeSMTP:
        def __init__(self):
            self.recipients = None
            self.message = None

        def sendmail(self, _sender, recipients, message):
            self.recipients = recipients
            self.message = message

    smtp = FakeSMTP()
    monkeypatch.setattr(email_service, "GMAIL_USER", "sender@example.com")
    monkeypatch.setattr(email_service, "GMAIL_APP_PASSWORD", "test-password")
    monkeypatch.setattr(email_service, "_get_smtp_connection", lambda: smtp)

    assert email_service._send_email(
        ["info@example.com", "alternate@example.com"],
        "Test notification",
        "<p>Message</p>",
    )
    assert smtp.recipients == ["info@example.com", "alternate@example.com"]
    assert "To: info@example.com, alternate@example.com" in smtp.message
