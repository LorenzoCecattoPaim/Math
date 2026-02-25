from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Profile
from app.schemas import ProfileResponse, ProfileUpdate, UserPlanResponse
from app.auth import get_current_user
from app.services.plan_service import ensure_user_plan_profile

router = APIRouter(prefix="/profiles", tags=["Perfis"])

@router.get("/me", response_model=ProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter perfil do usuário autenticado"""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado"
        )
    return profile

@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar perfil do usuário autenticado"""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        # Criar perfil se não existir
        profile = Profile(user_id=current_user.id)
        db.add(profile)
    
    # Atualizar campos
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/plan", response_model=UserPlanResponse)
def get_my_plan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter status do plano e consumo do usuario autenticado"""
    had_plan_profile = current_user.plan_profile is not None
    plan_profile = ensure_user_plan_profile(current_user)
    if (not had_plan_profile) or db.is_modified(plan_profile):
        db.add(current_user)
        db.commit()
        db.refresh(plan_profile)
    return plan_profile
