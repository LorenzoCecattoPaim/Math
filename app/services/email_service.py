import json
import logging
import urllib.error
import urllib.request

from app.config import (
    RESEND_API_KEY,
    SMTP_FROM_EMAIL,
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


def send_verification_email(
    recipient_email: str,
    recipient_name: str | None,
    code: str,
    magic_link: str,
) -> bool:
    if not RESEND_API_KEY:
        logger.error("RESEND_API_KEY is missing. Email not sent.")
        return False

    if not SMTP_FROM_EMAIL:
        logger.error("SMTP_FROM_EMAIL is missing. Email not sent.")
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
