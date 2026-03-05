import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, exists, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import HOTMART_CHECKOUT_URL
from app.database import get_db
from app.exceptions import FreeLimitReachedError
from app.models import User, UserVestibularProgress, VestibularExercise
from app.schemas import (
    VestibularAnswerApiResponse,
    VestibularAnswerRequest,
    VestibularAnswerResponse,
    VestibularExercisesApiResponse,
    VestibularExercisesPageResponse,
    VestibularStatsApiResponse,
    VestibularStatsResponse,
)
from app.services.plan_service import ensure_user_plan_profile

router = APIRouter(prefix="/vestibular", tags=["Vestibulares"])
logger = logging.getLogger(__name__)


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


def _normalize_options(options: Any) -> list[str]:
    if isinstance(options, list):
        return [str(item).strip() for item in options if str(item).strip()]
    if isinstance(options, dict):
        keys = sorted(options.keys(), key=lambda key: str(key))
        return [str(options[key]).strip() for key in keys if str(options[key]).strip()]
    return []


@router.get("/exercises", response_model=VestibularExercisesApiResponse)
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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dificuldade invalida. Use 'medium' ou 'hard'.",
        )

    try:
        rows = (
            db.query(VestibularExercise)
            .filter(VestibularExercise.difficulty == difficulty)
            .filter(
                ~exists().where(
                    UserVestibularProgress.user_id == current_user.id,
                    UserVestibularProgress.exercise_id == VestibularExercise.id,
                )
            )
            .order_by(VestibularExercise.created_at.desc(), VestibularExercise.id.desc())
            .offset(offset)
            .limit(limit + 1)
            .all()
        )

        if not rows:
            has_any_for_difficulty = (
                db.query(VestibularExercise.id)
                .filter(VestibularExercise.difficulty == difficulty)
                .first()
            )
            detail = (
                "Nao ha mais exercicios vestibulares disponiveis para esse nivel."
                if has_any_for_difficulty
                else "Nao ha exercicios vestibulares cadastrados para esse nivel."
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=detail,
            )

        has_more = len(rows) > limit
        items = rows[:limit]
        page = VestibularExercisesPageResponse(
            items=items,
            limit=limit,
            offset=offset,
            has_more=has_more,
        )
        return VestibularExercisesApiResponse(
            success=True,
            message="Exercicios vestibulares carregados com sucesso.",
            data=page,
        )
    except HTTPException:
        raise
    except SQLAlchemyError:
        logger.exception("Database error while loading vestibular exercises.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha interna ao carregar exercicios vestibulares.",
        )


@router.post("/answer", response_model=VestibularAnswerApiResponse)
def submit_vestibular_answer(
    payload: VestibularAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_premium_access(db, current_user)

    normalized_answer = payload.answer.strip()
    if not normalized_answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resposta invalida. Informe uma alternativa.",
        )

    try:
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

        options = _normalize_options(exercise.options)
        if options and normalized_answer not in options:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resposta invalida para este exercicio.",
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
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exercicio vestibular ja respondido por este usuario.",
            )

        normalized_correct = exercise.correct_answer.strip()
        is_correct = normalized_answer.casefold() == normalized_correct.casefold()

        progress = UserVestibularProgress(
            user_id=current_user.id,
            exercise_id=exercise.id,
            correct=is_correct,
        )
        db.add(progress)
        db.commit()

        _, _, accuracy = _get_user_vestibular_stats(db, current_user.id)

        return VestibularAnswerApiResponse(
            success=True,
            message="Resposta vestibular registrada com sucesso.",
            data=VestibularAnswerResponse(
                correct=is_correct,
                correct_answer=normalized_correct,
                explanation=exercise.explanation,
                accuracy=accuracy,
            ),
        )
    except HTTPException:
        raise
    except IntegrityError as exc:
        db.rollback()
        message = str(exc.orig).lower() if exc.orig is not None else str(exc).lower()
        if "unique" in message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exercicio vestibular ja respondido por este usuario.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nao foi possivel registrar a resposta vestibular.",
        ) from exc
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error while submitting vestibular answer.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha interna ao registrar resposta vestibular.",
        )


@router.get("/stats", response_model=VestibularStatsApiResponse)
def get_vestibular_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_premium_access(db, current_user)
    try:
        total, correct, accuracy = _get_user_vestibular_stats(db, current_user.id)
        return VestibularStatsApiResponse(
            success=True,
            message="Estatisticas vestibulares carregadas com sucesso.",
            data=VestibularStatsResponse(
                exercicios_feitos=total,
                respostas_corretas=correct,
                taxa_acerto=accuracy,
            ),
        )
    except SQLAlchemyError:
        logger.exception("Database error while loading vestibular stats.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha interna ao carregar estatisticas vestibulares.",
        )
