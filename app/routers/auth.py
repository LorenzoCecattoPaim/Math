from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import Profile, User
from app.schemas import (
    GoogleAuthRequest,
    GoogleAuthResponse,
    TokenResponse,
    UserCreate,
    UserResponse,
    VerifyEmailCodeRequest,
)
from app.services.auth_service import start_google_auth, verify_email_code_and_issue_token

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
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    result = start_google_auth(payload.access_token, db)
    return GoogleAuthResponse(**result)


@router.post("/verify-email-code", response_model=TokenResponse)
def verify_email_code(payload: VerifyEmailCodeRequest, db: Session = Depends(get_db)):
    access_token = verify_email_code_and_issue_token(
        pending_token=payload.pending_token,
        code=payload.code,
        db=db,
    )
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Obter dados do usuario autenticado."""
    return current_user
