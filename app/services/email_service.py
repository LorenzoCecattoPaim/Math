import smtplib
import logging
from email.message import EmailMessage

from app.config import (
    SMTP_FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USE_TLS,
    SMTP_USERNAME,
)

logger = logging.getLogger(__name__)


def send_verification_email(
    recipient_email: str,
    recipient_name: str | None,
    code: str,
    magic_link: str,
) -> None:
    if not SMTP_HOST or not SMTP_FROM_EMAIL:
        logger.error("SMTP config missing: SMTP_HOST or SMTP_FROM_EMAIL not set.")
        return

    subject = "Confirme seu login - ProvaLab"
    greeting_name = recipient_name or "usuario"
    body = (
        f"Ola, {greeting_name}!\n\n"
        "Clique no link abaixo para confirmar seu login no ProvaLab:\n\n"
        f"{magic_link}\n\n"
        "Se preferir, use o codigo abaixo na tela de verificacao:\n\n"
        f"{code}\n\n"
        "Este codigo expira em 10 minutos.\n"
        "Se voce nao solicitou este acesso, ignore este email."
    )

    message = EmailMessage()
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = recipient_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
            if SMTP_USE_TLS:
                smtp.starttls()
            if SMTP_USERNAME and SMTP_PASSWORD:
                smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(message)
        logger.info("Verification email sent to %s", recipient_email)
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
