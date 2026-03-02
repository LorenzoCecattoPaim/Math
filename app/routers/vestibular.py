from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.auth import get_current_user
from app.config import HOTMART_CHECKOUT_URL
from app.database import get_db
from app.exceptions import FreeLimitReachedError
from app.models import User, UserVestibularProgress, VestibularExercise
from app.schemas import (
    VestibularAnswerRequest,
    VestibularAnswerResponse,
    VestibularExercisesPageResponse,
    VestibularStatsResponse,
)
from app.services.plan_service import ensure_user_plan_profile

router = APIRouter(prefix="/vestibular", tags=["Vestibulares"])


def _ensure_premium_access(db: Session, current_user: User) -> None:
    had_plan_profile = current_user.plan_profile is not None
    plan_profile = ensure_user_plan_profile(current_user)
    is_premium = plan_profile.plan == "premium" or plan_profile.is_premium

    if not had_plan_profile:
        db.add(current_user)
        db.commit()

    if not is_premium:
        raise FreeLimitReachedError(checkout_url=HOTMART_CHECKOUT_URL)


def _get_user_vestibular_stats(db: Session, user_id) -> tuple[int, int, int]:
    total, correct = (
        db.query(
            func.count(UserVestibularProgress.id),
            func.coalesce(
                func.sum(case((UserVestibularProgress.correct.is_(True), 1), else_=0)),
                0,
            ),
        )
        .filter(UserVestibularProgress.user_id == user_id)
        .one()
    )
    accuracy = round((correct / total * 100)) if total > 0 else 0
    return total, correct, accuracy


@router.get("/exercises", response_model=VestibularExercisesPageResponse)
def get_vestibular_exercises(
    limit: int = Query(10, ge=1, le=50, description="Limite de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginacao"),
    difficulty: str = Query("medium", description="Dificuldade: medium|hard"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_premium_access(db, current_user)

    if difficulty not in {"medium", "hard"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Dificuldade invalida. Use 'medium' ou 'hard'.",
        )

    answered_subquery = (
        db.query(UserVestibularProgress.exercise_id)
        .filter(UserVestibularProgress.user_id == current_user.id)
        .subquery()
    )

    rows = (
        db.query(VestibularExercise)
        .filter(VestibularExercise.difficulty == difficulty)
        .filter(~VestibularExercise.id.in_(answered_subquery))
        .order_by(VestibularExercise.created_at.desc(), VestibularExercise.id.desc())
        .offset(offset)
        .limit(limit + 1)
        .all()
    )

    has_more = len(rows) > limit
    items = rows[:limit]
    return VestibularExercisesPageResponse(
        items=items,
        limit=limit,
        offset=offset,
        has_more=has_more,
    )


@router.post("/answer", response_model=VestibularAnswerResponse)
def submit_vestibular_answer(
    payload: VestibularAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_premium_access(db, current_user)

    exercise = (
        db.query(VestibularExercise)
        .filter(VestibularExercise.id == payload.exercise_id)
        .first()
    )
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercicio vestibular nao encontrado.",
        )

    already_answered = (
        db.query(UserVestibularProgress.id)
        .filter(
            UserVestibularProgress.user_id == current_user.id,
            UserVestibularProgress.exercise_id == payload.exercise_id,
        )
        .first()
    )
    if already_answered:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Exercicio vestibular ja respondido por este usuario.",
        )

    normalized_answer = payload.answer.strip().casefold()
    normalized_correct = exercise.correct_answer.strip().casefold()
    is_correct = normalized_answer == normalized_correct

    progress = UserVestibularProgress(
        user_id=current_user.id,
        exercise_id=exercise.id,
        correct=is_correct,
    )
    db.add(progress)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        message = str(exc.orig).lower() if exc.orig is not None else str(exc).lower()
        if "unique" in message:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Exercicio vestibular ja respondido por este usuario.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nao foi possivel registrar a resposta vestibular.",
        ) from exc

    _, _, accuracy = _get_user_vestibular_stats(db, current_user.id)

    return VestibularAnswerResponse(
        correct=is_correct,
        explanation=exercise.explanation,
        accuracy=accuracy,
    )


@router.get("/stats", response_model=VestibularStatsResponse)
def get_vestibular_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_premium_access(db, current_user)
    total, correct, accuracy = _get_user_vestibular_stats(db, current_user.id)
    return VestibularStatsResponse(
        exercicios_feitos=total,
        respostas_corretas=correct,
        taxa_acerto=accuracy,
    )
