import random
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.auth import get_current_user
from app.database import get_db
from app.dependencies.plan import check_plan_limit
from app.models import Exercise, ExerciseAttempt, User
from app.schemas import ExerciseCreate, ExerciseResponse

router = APIRouter(prefix="/exercises", tags=["Exercises"])


@router.get("", response_model=List[ExerciseResponse])
def list_exercises(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    source: Optional[str] = Query(None, description="Filter by source"),
    theme: Optional[str] = Query(None, description="Filter by theme"),
    level: Optional[str] = Query(None, description="Filter by level"),
    exam_year: Optional[int] = Query(None, description="Filter by exam year"),
    limit: int = Query(50, ge=1, le=100, description="Result limit"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List exercises with optional filters."""
    query = db.query(Exercise)

    if subject:
        query = query.filter(Exercise.subject == subject)
    if difficulty:
        query = query.filter(Exercise.difficulty == difficulty)
    if source:
        query = query.filter(Exercise.source == source)
    if theme:
        query = query.filter(Exercise.theme == theme)
    if level:
        query = query.filter(Exercise.level == level)
    if exam_year:
        query = query.filter(Exercise.exam_year == exam_year)

    exercises = query.order_by(Exercise.created_at.desc()).limit(limit).all()
    return exercises


@router.get("/seo", response_model=List[ExerciseResponse])
def list_seo_exercises(
    source: Optional[str] = Query(None, description="Question source"),
    theme: Optional[str] = Query(None, description="Question theme"),
    level: Optional[str] = Query(None, description="Question level"),
    exam_year: Optional[int] = Query(None, description="Exam year"),
    subject: Optional[str] = Query(None, description="Base subject"),
    difficulty: Optional[str] = Query(None, description="Base difficulty"),
    limit: int = Query(5, ge=3, le=20, description="Number of items"),
    db: Session = Depends(get_db),
):
    """Public endpoint used by SEO landing pages."""
    query = db.query(Exercise)

    if source:
        query = query.filter(Exercise.source == source)
    if theme:
        query = query.filter(Exercise.theme == theme)
    if level:
        query = query.filter(Exercise.level == level)
    if exam_year:
        query = query.filter(Exercise.exam_year == exam_year)
    if subject:
        query = query.filter(Exercise.subject == subject)
    if difficulty:
        query = query.filter(Exercise.difficulty == difficulty)

    exercises = query.order_by(Exercise.created_at.desc()).limit(limit).all()
    return exercises


@router.get("/random", response_model=ExerciseResponse)
def get_random_exercise(
    subject: str = Query(..., description="Exercise subject"),
    difficulty: str = Query(..., description="Exercise difficulty"),
    source: Optional[str] = Query(None, description="Exercise source"),
    theme: Optional[str] = Query(None, description="Exercise theme"),
    level: Optional[str] = Query(None, description="Exercise level"),
    exam_year: Optional[int] = Query(None, description="Exercise exam year"),
    exclude_answered: bool = Query(
        True,
        description="Exclude exercises already answered by current user",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_plan_limit(increment_use=True)),
):
    """Get one random exercise by filters."""
    base_query = db.query(Exercise).filter(
        Exercise.subject == subject,
        Exercise.difficulty == difficulty,
    )

    if source:
        base_query = base_query.filter(Exercise.source == source)
    if theme:
        base_query = base_query.filter(Exercise.theme == theme)
    if level:
        base_query = base_query.filter(Exercise.level == level)
    if exam_year:
        base_query = base_query.filter(Exercise.exam_year == exam_year)

    if exclude_answered:
        answered_exercises = db.query(ExerciseAttempt.exercise_id).filter(
            ExerciseAttempt.user_id == current_user.id
        )
        base_query = base_query.filter(~Exercise.id.in_(answered_exercises))

    total = base_query.with_entities(func.count(Exercise.id)).scalar() or 0
    if total == 0:
        detail = (
            f"No new exercise found for {subject} ({difficulty})."
            if exclude_answered
            else f"No exercise found for {subject} ({difficulty})."
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )

    random_offset = random.randint(0, total - 1)
    exercise = base_query.order_by(Exercise.id).offset(random_offset).limit(1).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No exercise found for {subject} ({difficulty}).",
        )
    return exercise


@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(
    exercise_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get exercise by id."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found.",
        )
    return exercise


@router.post("", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
def create_exercise(
    exercise_data: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create exercise."""
    new_exercise = Exercise(
        question=exercise_data.question,
        options=exercise_data.options,
        correct_answer=exercise_data.correct_answer,
        explanation=exercise_data.explanation,
        difficulty=exercise_data.difficulty,
        subject=exercise_data.subject,
        source=exercise_data.source,
        theme=exercise_data.theme,
        level=exercise_data.level,
        exam_year=exercise_data.exam_year,
    )
    db.add(new_exercise)
    db.commit()
    db.refresh(new_exercise)
    return new_exercise
