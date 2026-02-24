import hashlib
import hmac
import json
import logging
import random
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import create_access_token, decode_token, hash_password
from app.config import (
    EMAIL_VERIFICATION_EXPIRATION_MINUTES,
    EMAIL_VERIFICATION_MAX_ATTEMPTS,
    FRONTEND_URL,
    GOOGLE_CLIENT_ID,
    JWT_SECRET_KEY,
    PASSWORD_MIN_LENGTH,
    PASSWORD_RESET_EXPIRATION_MINUTES,
    PASSWORD_RESET_MAX_PER_HOUR,
    VERIFICATION_RESEND_COOLDOWN_SECONDS,
    VERIFICATION_RESEND_MAX_PER_HOUR,
)
from app.models import EmailVerificationCode, PasswordResetToken, Profile, User
from app.services.email_service import send_password_reset_email, send_verification_email
from app.services.plan_service import ensure_user_plan_profile

logger = logging.getLogger(__name__)

GENERIC_FORGOT_PASSWORD_MESSAGE = (
    "Se o email informado estiver cadastrado, enviaremos instrucoes de redefinicao."
)
GENERIC_RESEND_CODE_MESSAGE = (
    "Se a solicitacao ainda estiver valida, enviaremos um novo codigo em instantes."
)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _fetch_json(url: str, headers: dict[str, str] | None = None) -> dict:
    request = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(request, timeout=8) as response:
        payload = response.read().decode("utf-8")
        return json.loads(payload)


def _hash_secret(raw_value: str) -> str:
    digest = hashlib.sha256(f"{raw_value}:{JWT_SECRET_KEY}".encode("utf-8"))
    return digest.hexdigest()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def _generate_reset_token() -> str:
    return secrets.token_urlsafe(48)


def _create_pending_token(user_id: UUID, verification_code_id: UUID) -> str:
    return create_access_token(
        data={
            "sub": str(user_id),
            "scope": "email_verification",
            "verification_code_id": str(verification_code_id),
        },
        expires_delta=timedelta(minutes=EMAIL_VERIFICATION_EXPIRATION_MINUTES),
    )


def _create_magic_link(user_id: UUID, verification_code_id: UUID) -> str:
    magic_token = create_access_token(
        data={
            "sub": str(user_id),
            "scope": "email_magic_link",
            "verification_code_id": str(verification_code_id),
        },
        expires_delta=timedelta(minutes=EMAIL_VERIFICATION_EXPIRATION_MINUTES),
    )
    return f"{FRONTEND_URL.rstrip('/')}/verify-email?magic_token={magic_token}"


def _get_retry_after_seconds(last_created_at: datetime | None, cooldown_seconds: int) -> int:
    if last_created_at is None:
        return 0
    elapsed = int((_utcnow() - last_created_at).total_seconds())
    return max(0, cooldown_seconds - elapsed)


def _enforce_email_verification_resend_limits(
    db: Session,
    user_id: UUID,
    request_ip: str | None,
) -> None:
    one_hour_ago = _utcnow() - timedelta(hours=1)

    user_attempts = (
        db.query(func.count(EmailVerificationCode.id))
        .filter(
            EmailVerificationCode.user_id == user_id,
            EmailVerificationCode.created_at >= one_hour_ago,
        )
        .scalar()
        or 0
    )
    if user_attempts >= VERIFICATION_RESEND_MAX_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Limite de reenvio excedido. Tente novamente mais tarde.",
        )

    if request_ip:
        ip_attempts = (
            db.query(func.count(EmailVerificationCode.id))
            .filter(
                EmailVerificationCode.request_ip == request_ip,
                EmailVerificationCode.created_at >= one_hour_ago,
            )
            .scalar()
            or 0
        )
        if ip_attempts >= VERIFICATION_RESEND_MAX_PER_HOUR:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Muitas solicitacoes deste IP. Tente novamente mais tarde.",
            )

    latest_for_user = (
        db.query(EmailVerificationCode)
        .filter(EmailVerificationCode.user_id == user_id)
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )
    retry_after_user = _get_retry_after_seconds(
        latest_for_user.created_at if latest_for_user else None,
        VERIFICATION_RESEND_COOLDOWN_SECONDS,
    )

    retry_after_ip = 0
    if request_ip:
        latest_for_ip = (
            db.query(EmailVerificationCode)
            .filter(EmailVerificationCode.request_ip == request_ip)
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
        )
        retry_after_ip = _get_retry_after_seconds(
            latest_for_ip.created_at if latest_for_ip else None,
            VERIFICATION_RESEND_COOLDOWN_SECONDS,
        )

    retry_after = max(retry_after_user, retry_after_ip)
    if retry_after > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Aguarde {retry_after}s para solicitar um novo codigo.",
        )


def _enforce_password_reset_limits(
    db: Session,
    user_id: UUID,
    request_ip: str | None,
) -> None:
    one_hour_ago = _utcnow() - timedelta(hours=1)

    user_attempts = (
        db.query(func.count(PasswordResetToken.id))
        .filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.created_at >= one_hour_ago,
        )
        .scalar()
        or 0
    )
    if user_attempts >= PASSWORD_RESET_MAX_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Limite de solicitacoes atingido. Tente novamente mais tarde.",
        )

    if request_ip:
        ip_attempts = (
            db.query(func.count(PasswordResetToken.id))
            .filter(
                PasswordResetToken.request_ip == request_ip,
                PasswordResetToken.created_at >= one_hour_ago,
            )
            .scalar()
            or 0
        )
        if ip_attempts >= PASSWORD_RESET_MAX_PER_HOUR:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Muitas solicitacoes deste IP. Tente novamente mais tarde.",
            )


def _create_email_verification_code(
    db: Session,
    user: User,
    request_ip: str | None = None,
) -> tuple[EmailVerificationCode, str]:
    now = _utcnow()
    db.query(EmailVerificationCode).filter(
        EmailVerificationCode.user_id == user.id,
        EmailVerificationCode.consumed_at.is_(None),
    ).update({"consumed_at": now}, synchronize_session=False)

    raw_code = _generate_code()
    verification = EmailVerificationCode(
        user_id=user.id,
        code_hash=_hash_secret(raw_code),
        expires_at=now + timedelta(minutes=EMAIL_VERIFICATION_EXPIRATION_MINUTES),
        request_ip=request_ip,
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)
    return verification, raw_code


def issue_email_verification_challenge(
    user: User,
    db: Session,
    request_ip: str | None = None,
) -> dict:
    verification, raw_code = _create_email_verification_code(
        db=db,
        user=user,
        request_ip=request_ip,
    )
    pending_token = _create_pending_token(user.id, verification.id)
    return {
        "pending_token": pending_token,
        "email": user.email,
        "code_expires_in_seconds": EMAIL_VERIFICATION_EXPIRATION_MINUTES * 60,
        "recipient_email": user.email,
        "recipient_name": user.full_name,
        "verification_code": raw_code,
        "verification_code_id": str(verification.id),
        "user_id": str(user.id),
    }


def _validate_google_access_token(access_token: str) -> dict:
    tokeninfo_url = (
        "https://oauth2.googleapis.com/tokeninfo?"
        f"access_token={urllib.parse.quote(access_token)}"
    )
    try:
        token_info = _fetch_json(tokeninfo_url)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Google invalido ou expirado.",
        )

    audience = token_info.get("aud")
    if GOOGLE_CLIENT_ID and audience != GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Google nao pertence ao cliente configurado.",
        )

    try:
        expires_in = int(token_info.get("expires_in", "0"))
    except ValueError:
        expires_in = 0

    if expires_in <= 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Google expirado.",
        )

    userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
    try:
        user_info = _fetch_json(
            userinfo_url,
            headers={"Authorization": f"Bearer {access_token}"},
        )
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nao foi possivel consultar dados da conta Google.",
        )

    if not user_info.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conta Google sem email disponivel.",
        )
    if user_info.get("email_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email da conta Google nao esta verificado.",
        )

    return user_info


def start_google_auth(access_token: str, db: Session, request_ip: str | None = None) -> dict:
    google_user = _validate_google_access_token(access_token)

    email = _normalize_email(google_user["email"])
    google_id = google_user.get("sub")
    full_name = google_user.get("name")

    if not google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resposta Google sem identificador de usuario.",
        )

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            email=email,
            full_name=full_name,
            google_id=google_id,
            email_verified=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        db.add(Profile(user_id=user.id, full_name=full_name))
        ensure_user_plan_profile(user)
        db.commit()
    else:
        if user.google_id and user.google_id != google_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Este email ja esta vinculado a outra conta Google.",
            )
        if user.google_id is None:
            user.google_id = google_id
        if full_name and not user.full_name:
            user.full_name = full_name
        db.commit()
        if not user.profile:
            db.add(Profile(user_id=user.id, full_name=full_name or user.full_name))
        ensure_user_plan_profile(user)
        db.commit()

    return issue_email_verification_challenge(user=user, db=db, request_ip=request_ip)


def resend_email_code(pending_token: str, db: Session, request_ip: str | None = None) -> dict:
    payload = decode_token(pending_token)
    if not payload or payload.get("scope") != "email_verification":
        return {"message": GENERIC_RESEND_CODE_MESSAGE}

    user_id = payload.get("sub")
    if not user_id:
        return {"message": GENERIC_RESEND_CODE_MESSAGE}

    try:
        user_uuid = UUID(str(user_id))
    except ValueError:
        return {"message": GENERIC_RESEND_CODE_MESSAGE}

    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None or user.email_verified:
        return {"message": GENERIC_RESEND_CODE_MESSAGE}

    _enforce_email_verification_resend_limits(db=db, user_id=user.id, request_ip=request_ip)

    verification, raw_code = _create_email_verification_code(
        db=db,
        user=user,
        request_ip=request_ip,
    )
    pending_token_new = _create_pending_token(user.id, verification.id)
    magic_link = _create_magic_link(user.id, verification.id)

    sent = send_verification_email(
        user.email,
        user.full_name,
        raw_code,
        magic_link,
    )
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nao foi possivel reenviar o codigo. Tente novamente em instantes.",
        )

    logger.info("Verification code resent for user_id=%s", str(user.id))
    return {
        "message": "Novo codigo enviado com sucesso.",
        "pending_token": pending_token_new,
        "email": user.email,
        "code_expires_in_seconds": EMAIL_VERIFICATION_EXPIRATION_MINUTES * 60,
    }


def request_password_reset(email: str, db: Session, request_ip: str | None = None) -> str:
    normalized_email = _normalize_email(email)
    user = db.query(User).filter(User.email == normalized_email).first()
    if user is None:
        logger.info("Forgot password requested for non-existing email.")
        return GENERIC_FORGOT_PASSWORD_MESSAGE

    try:
        _enforce_password_reset_limits(db=db, user_id=user.id, request_ip=request_ip)
    except HTTPException:
        logger.warning(
            "Password reset rate limit reached for user_id=%s ip=%s",
            str(user.id),
            request_ip or "unknown",
        )
        return GENERIC_FORGOT_PASSWORD_MESSAGE

    raw_token = _generate_reset_token()
    token_hash = _hash_secret(raw_token)
    now = _utcnow()

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": now}, synchronize_session=False)

    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=now + timedelta(minutes=PASSWORD_RESET_EXPIRATION_MINUTES),
        request_ip=request_ip,
    )
    db.add(reset_token)
    db.commit()

    reset_link = f"{FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"
    sent = send_password_reset_email(user.email, user.full_name, reset_link)
    if not sent:
        logger.error("Password reset email failed for user_id=%s", str(user.id))
        return GENERIC_FORGOT_PASSWORD_MESSAGE

    logger.info("Password reset requested for user_id=%s", str(user.id))
    return GENERIC_FORGOT_PASSWORD_MESSAGE


def reset_password(token: str, new_password: str, db: Session) -> str:
    if len(new_password) < PASSWORD_MIN_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A senha deve ter pelo menos {PASSWORD_MIN_LENGTH} caracteres.",
        )

    token_hash = _hash_secret(token.strip())
    reset_token = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
        )
        .first()
    )
    if reset_token is None or reset_token.expires_at < _utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalido ou expirado.",
        )

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalido ou expirado.",
        )

    now = _utcnow()
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": now}, synchronize_session=False)

    user.password_hash = hash_password(new_password)
    db.commit()

    logger.info("Password reset completed for user_id=%s", str(user.id))
    return "Senha redefinida com sucesso."


def verify_email_code_and_issue_token(pending_token: str, code: str, db: Session) -> str:
    payload = decode_token(pending_token)
    if not payload or payload.get("scope") != "email_verification":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de verificacao invalido ou expirado.",
        )

    user_id = payload.get("sub")
    verification_code_id = payload.get("verification_code_id")
    if not user_id or not verification_code_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de verificacao invalido.",
        )

    try:
        user_uuid = UUID(str(user_id))
        verification_uuid = UUID(str(verification_code_id))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de verificacao invalido.",
        )

    verification = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.id == verification_uuid,
            EmailVerificationCode.user_id == user_uuid,
        )
        .first()
    )
    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitacao de verificacao nao encontrada.",
        )

    if verification.consumed_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Codigo ja utilizado.",
        )
    if verification.expires_at < _utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Codigo expirado. Faca login com Google novamente.",
        )
    if verification.attempts_count >= EMAIL_VERIFICATION_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Limite de tentativas excedido. Inicie o login novamente.",
        )

    clean_code = code.strip()
    if not clean_code.isdigit() or len(clean_code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Codigo deve conter 6 digitos numericos.",
        )
    provided_code_hash = _hash_secret(clean_code)
    if not hmac.compare_digest(provided_code_hash, verification.code_hash):
        verification.attempts_count += 1
        db.commit()

        if verification.attempts_count >= EMAIL_VERIFICATION_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Limite de tentativas excedido. Inicie o login novamente.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Codigo incorreto.",
        )

    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario nao encontrado.",
        )

    verification.consumed_at = _utcnow()
    user.email_verified = True
    db.commit()

    return create_access_token(data={"sub": str(user.id)})


def verify_email_magic_link_and_issue_token(magic_token: str, db: Session) -> str:
    payload = decode_token(magic_token)
    if not payload or payload.get("scope") != "email_magic_link":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Link de verificacao invalido ou expirado.",
        )

    user_id = payload.get("sub")
    verification_code_id = payload.get("verification_code_id")
    if not user_id or not verification_code_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Link de verificacao invalido.",
        )

    try:
        user_uuid = UUID(str(user_id))
        verification_uuid = UUID(str(verification_code_id))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Link de verificacao invalido.",
        )

    verification = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.id == verification_uuid,
            EmailVerificationCode.user_id == user_uuid,
        )
        .first()
    )
    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitacao de verificacao nao encontrada.",
        )
    if verification.consumed_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link ja utilizado.",
        )
    if verification.expires_at < _utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link expirado. Faca login com Google novamente.",
        )

    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario nao encontrado.",
        )

    verification.consumed_at = _utcnow()
    user.email_verified = True
    db.commit()
    return create_access_token(data={"sub": str(user.id)})
