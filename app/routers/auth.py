from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.config import EMAIL_VERIFICATION_EXPIRATION_MINUTES, FRONTEND_URL, PASSWORD_MIN_LENGTH
from app.database import get_db
from app.models import Profile, User
from app.schemas import (
    AuthSessionResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    GoogleAuthRequest,
    GoogleAuthResponse,
    ResendVerificationCodeRequest,
    ResendVerificationCodeResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TokenResponse,
    UserCreate,
    UserResponse,
    VerifyEmailCodeRequest,
    VerifyEmailLinkRequest,
)
from app.services.auth_service import (
    request_password_reset,
    resend_email_code,
    reset_password,
    start_google_auth,
    verify_email_code_and_issue_token,
    verify_email_magic_link_and_issue_token,
)
from app.services.email_service import send_verification_email
from app.services.plan_service import ensure_user_plan_profile

router = APIRouter(prefix="/auth", tags=["Autenticacao"])


@router.post("/signup", response_model=AuthSessionResponse)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Registrar novo usuario com email/senha e autenticar imediatamente."""
    normalized_email = user_data.email.strip().lower()
    existing_user = db.query(User).filter(User.email == normalized_email).first()

    if user_data.password != user_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha e confirmacao de senha devem ser iguais.",
        )

    if len(user_data.password) < PASSWORD_MIN_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A senha deve ter pelo menos {PASSWORD_MIN_LENGTH} caracteres.",
        )

    if existing_user:
        if existing_user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email ja cadastrado",
            )

        if not existing_user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conta vinculada ao Google. Use 'Continuar com Google'.",
            )

        if not verify_password(user_data.password, existing_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email ja cadastrado. Use a senha da conta para entrar.",
            )

        if user_data.full_name and not existing_user.full_name:
            existing_user.full_name = user_data.full_name
            db.commit()
    else:
        existing_user = User(
            email=normalized_email,
            full_name=user_data.full_name,
            password_hash=hash_password(user_data.password),
            email_verified=True,
        )
        db.add(existing_user)
        db.commit()
        db.refresh(existing_user)
    if not existing_user.email_verified:
        existing_user.email_verified = True

    if not existing_user.profile:
        db.add(Profile(user_id=existing_user.id, full_name=user_data.full_name or existing_user.full_name))
    ensure_user_plan_profile(existing_user)
    db.commit()

    access_token = create_access_token(data={"sub": str(existing_user.id)})
    return AuthSessionResponse(
        access_token=access_token,
        user=existing_user,
        profile=existing_user.profile,
    )


@router.post("/login", response_model=AuthSessionResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login com email e senha."""
    normalized_email = form_data.username.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conta vinculada ao Google. Use 'Continuar com Google'.",
        )

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return AuthSessionResponse(
        access_token=access_token,
        user=user,
        profile=user.profile,
    )


@router.post("/google", response_model=GoogleAuthResponse)
def google_auth(
    payload: GoogleAuthRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    result = start_google_auth(payload.access_token, db, request.client.host if request.client else None)
    magic_token = create_access_token(
        data={
            "sub": result["user_id"],
            "scope": "email_magic_link",
            "verification_code_id": result["verification_code_id"],
        },
        expires_delta=timedelta(minutes=EMAIL_VERIFICATION_EXPIRATION_MINUTES),
    )
    magic_link = f"{FRONTEND_URL.rstrip('/')}/verify-email?magic_token={magic_token}"
    sent = send_verification_email(
        result["recipient_email"],
        result["recipient_name"],
        result["verification_code"],
        magic_link,
    )
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nao foi possivel enviar o email de verificacao. Tente novamente em instantes.",
        )
    return GoogleAuthResponse(
        pending_token=result["pending_token"],
        pending_token_type="bearer",
        verification_required=True,
        email=result["email"],
        code_expires_in_seconds=result["code_expires_in_seconds"],
    )


@router.post("/resend-code", response_model=ResendVerificationCodeResponse)
def resend_code(
    payload: ResendVerificationCodeRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    response = resend_email_code(
        pending_token=payload.pending_token,
        db=db,
        request_ip=request.client.host if request.client else None,
    )
    return ResendVerificationCodeResponse(**response)


@router.post("/verify-email-code", response_model=TokenResponse)
def verify_email_code(payload: VerifyEmailCodeRequest, db: Session = Depends(get_db)):
    access_token = verify_email_code_and_issue_token(
        pending_token=payload.pending_token,
        code=payload.code,
        db=db,
    )
    return TokenResponse(access_token=access_token)


@router.post("/verify-email-link", response_model=TokenResponse)
def verify_email_link(payload: VerifyEmailLinkRequest, db: Session = Depends(get_db)):
    access_token = verify_email_magic_link_and_issue_token(payload.magic_token, db)
    return TokenResponse(access_token=access_token)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    message = request_password_reset(
        email=payload.email,
        db=db,
        request_ip=request.client.host if request.client else None,
    )
    return ForgotPasswordResponse(message=message)


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password_endpoint(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    message = reset_password(payload.token, payload.new_password, db)
    return ResetPasswordResponse(message=message)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Obter dados do usuario autenticado."""
    return current_user
