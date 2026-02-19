import hashlib
import hmac
import json
import random
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, decode_token
from app.config import (
    EMAIL_VERIFICATION_EXPIRATION_MINUTES,
    EMAIL_VERIFICATION_MAX_ATTEMPTS,
    GOOGLE_CLIENT_ID,
    JWT_SECRET_KEY,
)
from app.models import EmailVerificationCode, Profile, User


def _fetch_json(url: str, headers: dict[str, str] | None = None) -> dict:
    request = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(request, timeout=8) as response:
        payload = response.read().decode("utf-8")
        return json.loads(payload)


def _hash_code(raw_code: str) -> str:
    digest = hashlib.sha256(f"{raw_code}:{JWT_SECRET_KEY}".encode("utf-8"))
    return digest.hexdigest()


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


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


def start_google_auth(access_token: str, db: Session) -> dict:
    google_user = _validate_google_access_token(access_token)

    email = google_user["email"].strip().lower()
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
            db.commit()

    now = datetime.utcnow()
    # Invalida codigos pendentes antigos para manter apenas o mais recente.
    db.query(EmailVerificationCode).filter(
        EmailVerificationCode.user_id == user.id,
        EmailVerificationCode.consumed_at.is_(None),
    ).update({"consumed_at": now}, synchronize_session=False)

    raw_code = _generate_code()
    verification = EmailVerificationCode(
        user_id=user.id,
        code_hash=_hash_code(raw_code),
        expires_at=now + timedelta(minutes=EMAIL_VERIFICATION_EXPIRATION_MINUTES),
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)

    # Token temporario: nao da acesso final, apenas autoriza a etapa de verificacao.
    pending_token = create_access_token(
        data={
            "sub": str(user.id),
            "scope": "email_verification",
            "verification_code_id": str(verification.id),
        },
        expires_delta=timedelta(minutes=EMAIL_VERIFICATION_EXPIRATION_MINUTES),
    )

    return {
        "pending_token": pending_token,
        "email": user.email,
        "code_expires_in_seconds": EMAIL_VERIFICATION_EXPIRATION_MINUTES * 60,
        "recipient_email": user.email,
        "recipient_name": user.full_name,
        "verification_code": raw_code,
    }


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
    if verification.expires_at < datetime.utcnow():
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
    provided_code_hash = _hash_code(clean_code)
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

    verification.consumed_at = datetime.utcnow()
    user.email_verified = True
    db.commit()

    return create_access_token(data={"sub": str(user.id)})
