from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.config import EMAIL_VERIFICATION_EXPIRATION_MINUTES, FRONTEND_URL
from app.database import get_db
from app.models import Profile, User
from app.schemas import (
    GoogleAuthRequest,
    GoogleAuthResponse,
    TokenResponse,
    UserCreate,
    UserResponse,
    VerifyEmailCodeRequest,
    VerifyEmailLinkRequest,
)
from app.services.auth_service import (
    start_google_auth,
    verify_email_code_and_issue_token,
    verify_email_magic_link_and_issue_token,
)
from app.services.email_service import send_verification_email

router = APIRouter(prefix="/auth", tags=["Autenticacao"])


@router.post("/signup", response_model=TokenResponse)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Registrar novo usuario com email/senha."""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email ja cadastrado",
        )

    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=hash_password(user_data.password),
        email_verified=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    db.add(Profile(user_id=new_user.id, full_name=user_data.full_name))
    db.commit()

    access_token = create_access_token(data={"sub": str(new_user.id)})
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login com email e senha."""
    user = db.query(User).filter(User.email == form_data.username).first()
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

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email nao verificado. Conclua a verificacao para entrar.",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token)


@router.post("/google", response_model=GoogleAuthResponse)
def google_auth(
    payload: GoogleAuthRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    result = start_google_auth(payload.access_token, db)
    magic_token = create_access_token(
        data={
            "sub": result["user_id"],
            "scope": "email_magic_link",
            "verification_code_id": result["verification_code_id"],
        },
        expires_delta=timedelta(minutes=EMAIL_VERIFICATION_EXPIRATION_MINUTES),
    )
    magic_link = f"{FRONTEND_URL.rstrip('/')}/verify-email?magic_token={magic_token}"
    background_tasks.add_task(
        send_verification_email,
        result["recipient_email"],
        result["recipient_name"],
        result["verification_code"],
        magic_link,
    )
    return GoogleAuthResponse(
        pending_token=result["pending_token"],
        pending_token_type="bearer",
        verification_required=True,
        email=result["email"],
        code_expires_in_seconds=result["code_expires_in_seconds"],
    )


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


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Obter dados do usuario autenticado."""
    return current_user
