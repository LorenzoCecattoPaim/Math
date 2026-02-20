import json
import logging
import smtplib
import urllib.error
import urllib.request
from email.message import EmailMessage

from app.config import (
    RESEND_API_KEY,
    SMTP_FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USE_TLS,
    SMTP_USERNAME,
)

logger = logging.getLogger(__name__)


def _build_email_body(recipient_name: str | None, code: str, magic_link: str) -> str:
    greeting_name = recipient_name or "usuario"
    return (
        f"Ola, {greeting_name}!\n\n"
        "Clique no link abaixo para confirmar seu login no ProvaLab:\n\n"
        f"{magic_link}\n\n"
        "Se preferir, use o codigo abaixo na tela de verificacao:\n\n"
        f"{code}\n\n"
        "Este codigo expira em 10 minutos.\n"
        "Se voce nao solicitou este acesso, ignore este email."
    )


def _send_with_resend_api(
    recipient_email: str,
    recipient_name: str | None,
    code: str,
    magic_link: str,
) -> bool:
    if not RESEND_API_KEY:
        return False

    if not SMTP_FROM_EMAIL:
        logger.error("RESEND_API_KEY provided but SMTP_FROM_EMAIL is missing.")
        return False

    payload = {
        "from": SMTP_FROM_EMAIL,
        "to": [recipient_email],
        "subject": "Confirme seu login - ProvaLab",
        "text": _build_email_body(recipient_name, code, magic_link),
    }

    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            status = getattr(response, "status", 200)
            if status >= 400:
                logger.error("Resend API returned error status: %s", status)
                return False
        logger.info("Verification email sent via Resend API to %s", recipient_email)
        return True
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        logger.error("Resend API HTTP error %s: %s", exc.code, error_body)
        return False
    except Exception as exc:
        logger.exception("Failed sending email via Resend API: %s", str(exc))
        return False


def _send_with_smtp(
    recipient_email: str,
    recipient_name: str | None,
    code: str,
    magic_link: str,
) -> None:
    if not SMTP_HOST or not SMTP_FROM_EMAIL:
        logger.error("SMTP config missing: SMTP_HOST or SMTP_FROM_EMAIL not set.")
        return

    message = EmailMessage()
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = recipient_email
    message["Subject"] = "Confirme seu login - ProvaLab"
    message.set_content(_build_email_body(recipient_name, code, magic_link))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as smtp:
            if SMTP_USE_TLS:
                smtp.starttls()
            if SMTP_USERNAME and SMTP_PASSWORD:
                smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(message)
        logger.info("Verification email sent via SMTP to %s", recipient_email)
    except Exception as exc:
        logger.exception(
            "Failed to send verification email. host=%s port=%s username=%s to=%s from=%s error=%s",
            SMTP_HOST,
            SMTP_PORT,
            SMTP_USERNAME,
            recipient_email,
            SMTP_FROM_EMAIL,
            str(exc),
        )


def send_verification_email(
    recipient_email: str,
    recipient_name: str | None,
    code: str,
    magic_link: str,
) -> None:
    sent = _send_with_resend_api(recipient_email, recipient_name, code, magic_link)
    if not sent:
        _send_with_smtp(recipient_email, recipient_name, code, magic_link)
