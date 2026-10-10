"""Outgoing email. Without SMTP_HOST (dev) the message is logged instead of sent."""

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    if not settings.smtp_host:
        logger.warning("SMTP_HOST not set; email not sent.\nTo: %s\nSubject: %s\n\n%s", to, subject, body)
        return

    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


def send_password_reset(to: str, full_name: str, token: str) -> None:
    link = f"{settings.frontend_url}/reset-password?token={token}"
    minutes = settings.password_reset_expire_minutes
    send_email(
        to,
        "Reset your ResumeRadar password",
        f"Hi {full_name.split(' ')[0]},\n\n"
        f"Someone asked to reset the password for your ResumeRadar account. "
        f"If it was you, open this link within {minutes} minutes:\n\n{link}\n\n"
        f"If it wasn't you, ignore this email. Your password won't change.\n",
    )
