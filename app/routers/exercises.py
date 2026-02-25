import random
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.auth import get_current_user
from app.database import get_db
from app.dependencies.plan import check_plan_limit
from app.models import Exercise, User
from app.schemas import ExerciseCreate, ExerciseResponse

router = APIRouter(prefix="/exercises", tags=["ExercÃ­cios"])


@router.get("", response_model=List[ExerciseResponse])
def list_exercises(
    subject: Optional[str] = Query(None, description="Filtrar por matÃ©ria"),
    difficulty: Optional[str] = Query(None, description="Filtrar por dificuldade"),
    limit: int = Query(50, ge=1, le=100, description="Limite de resultados"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Listar exercÃ­cios com filtros opcionais"""
    query = db.query(Exercise)

    if subject:
        query = query.filter(Exercise.subject == subject)
    if difficulty:
        query = query.filter(Exercise.difficulty == difficulty)

    exercises = query.order_by(Exercise.created_at.desc()).limit(limit).all()
    return exercises


@router.get("/random", response_model=ExerciseResponse)
def get_random_exercise(
    subject: str = Query(..., description="MatÃ©ria do exercÃ­cio"),
    difficulty: str = Query(..., description="Dificuldade do exercÃ­cio"),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_plan_limit(increment_use=True)),
):
    """Obter um exercÃ­cio aleatÃ³rio por matÃ©ria e dificuldade"""
    base_query = db.query(Exercise).filter(
        Exercise.subject == subject,
        Exercise.difficulty == difficulty,
    )
    total = base_query.with_entities(func.count(Exercise.id)).scalar() or 0
    if total == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum exercÃ­cio encontrado para {subject} ({difficulty})",
        )

    random_offset = random.randint(0, total - 1)
    exercise = base_query.order_by(Exercise.id).offset(random_offset).limit(1).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum exercÃ­cio encontrado para {subject} ({difficulty})",
        )
    return exercise


@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(
    exercise_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obter exercÃ­cio por ID"""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ExercÃ­cio nÃ£o encontrado",
        )
    return exercise


@router.post("", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
def create_exercise(
    exercise_data: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Criar novo exercÃ­cio"""
    new_exercise = Exercise(
        question=exercise_data.question,
        options=exercise_data.options,
        correct_answer=exercise_data.correct_answer,
        explanation=exercise_data.explanation,
        difficulty=exercise_data.difficulty,
        subject=exercise_data.subject,
    )
    db.add(new_exercise)
    db.commit()
    db.refresh(new_exercise)
    return new_exercise
