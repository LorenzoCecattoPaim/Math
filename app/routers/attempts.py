from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Exercise, ExerciseAttempt, User
from app.schemas import AttemptCreate, AttemptResponse, ProgressResponse, StatsResponse

router = APIRouter(prefix="/attempts", tags=["Tentativas"])


def _get_user_stats(db: Session, user_id) -> tuple[int, int, int]:
    total, correct = (
        db.query(
            func.count(ExerciseAttempt.id),
            func.coalesce(
                func.sum(case((ExerciseAttempt.is_correct.is_(True), 1), else_=0)),
                0,
            ),
        )
        .filter(ExerciseAttempt.user_id == user_id)
        .one()
    )
    accuracy = round((correct / total * 100)) if total > 0 else 0
    return total, correct, accuracy


@router.get("", response_model=List[AttemptResponse])
def get_attempts(
    limit: int = Query(50, ge=1, le=200, description="Limite de resultados"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obter historico de tentativas do usuario"""
    attempts = (
        db.query(ExerciseAttempt)
        .options(joinedload(ExerciseAttempt.exercise))
        .filter(ExerciseAttempt.user_id == current_user.id)
        .order_by(ExerciseAttempt.created_at.desc())
        .limit(limit)
        .all()
    )
    return attempts


@router.get("/stats", response_model=StatsResponse)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obter estatisticas do usuario"""
    total, correct, accuracy = _get_user_stats(db, current_user.id)
    return StatsResponse(total=total, correct=correct, accuracy=accuracy)


@router.get("/progress", response_model=ProgressResponse)
def get_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obter dados de progresso do usuario"""
    attempts = (
        db.query(ExerciseAttempt)
        .options(joinedload(ExerciseAttempt.exercise))
        .filter(ExerciseAttempt.user_id == current_user.id)
        .order_by(ExerciseAttempt.created_at.desc())
        .limit(100)
        .all()
    )
    total, correct, accuracy = _get_user_stats(db, current_user.id)

    return ProgressResponse(
        attempts=attempts,
        stats=StatsResponse(total=total, correct=correct, accuracy=accuracy),
    )


@router.post("", response_model=AttemptResponse)
def create_attempt(
    attempt_data: AttemptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registrar nova tentativa de exercicio"""
    exercise_exists = (
        db.query(Exercise.id)
        .filter(Exercise.id == attempt_data.exercise_id)
        .first()
    )
    if not exercise_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercicio nao encontrado.",
        )

    new_attempt = ExerciseAttempt(
        user_id=current_user.id,
        exercise_id=attempt_data.exercise_id,
        user_answer=attempt_data.user_answer,
        is_correct=attempt_data.is_correct,
        time_spent_seconds=attempt_data.time_spent_seconds,
    )
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)
    db.refresh(new_attempt, ["exercise"])

    return new_attempt
