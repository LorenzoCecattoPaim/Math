import smtplib
from email.message import EmailMessage
from fastapi import HTTPException, status

from app.config import (
    SMTP_FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USE_TLS,
    SMTP_USERNAME,
)


def send_verification_email(recipient_email: str, recipient_name: str | None, code: str) -> None:
    if not SMTP_HOST or not SMTP_FROM_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuracao de email ausente no servidor.",
        )

    subject = "Seu codigo de verificacao - ProvaLab"
    greeting_name = recipient_name or "usuario"
    body = (
        f"Olá, {greeting_name}!\n\n"
        "Use o codigo abaixo para concluir seu login no ProvaLab:\n\n"
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
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Nao foi possivel enviar o codigo de verificacao por email.",
        ) from exc

