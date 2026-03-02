import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
    Integer,
    Enum as SQLEnum,
    JSON,
    Index,
    Uuid,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class DifficultyLevel(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class SubjectType(str, enum.Enum):
    algebra = "algebra"
    geometry = "geometry"
    calculus = "calculus"
    statistics = "statistics"
    trigonometry = "trigonometry"
    arithmetic = "arithmetic"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    password_hash = Column(Text, nullable=True)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    email_verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    profile = relationship("Profile", back_populates="user", uselist=False)
    plan_profile = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    attempts = relationship("ExerciseAttempt", back_populates="user")
    vestibular_progress = relationship(
        "UserVestibularProgress",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    verification_codes = relationship(
        "EmailVerificationCode", back_populates="user", cascade="all, delete-orphan"
    )
    password_reset_tokens = relationship(
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan"
    )
    refresh_sessions = relationship(
        "RefreshSession", back_populates="user", cascade="all, delete-orphan"
    )

class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="profile")

class Exercise(Base):
    __tablename__ = "exercises"
    __table_args__ = (
        Index("idx_exercises_subject_difficulty", "subject", "difficulty"),
        Index("idx_exercises_subject_difficulty_created_at", "subject", "difficulty", "created_at"),
    )
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)  # Array of options
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    difficulty = Column(SQLEnum(DifficultyLevel), nullable=False)
    subject = Column(SQLEnum(SubjectType), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    attempts = relationship("ExerciseAttempt", back_populates="exercise")

class ExerciseAttempt(Base):
    __tablename__ = "exercise_attempts"
    __table_args__ = (
        Index("idx_attempts_user_created_at", "user_id", "created_at"),
    )
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Uuid(as_uuid=True), ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    user_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    time_spent_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="attempts")
    exercise = relationship("Exercise", back_populates="attempts")


class VestibularExercise(Base):
    __tablename__ = "vestibular_exercises"
    __table_args__ = (
        CheckConstraint(
            "difficulty IN ('medium', 'hard')",
            name="ck_vestibular_exercises_difficulty",
        ),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    difficulty = Column(SQLEnum(DifficultyLevel), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    progress_entries = relationship(
        "UserVestibularProgress",
        back_populates="exercise",
        cascade="all, delete-orphan",
    )


class UserVestibularProgress(Base):
    __tablename__ = "user_vestibular_progress"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "exercise_id",
            name="uq_user_vestibular_progress_user_exercise",
        ),
        Index("idx_user_vestibular_progress_user_id", "user_id"),
        Index("idx_user_vestibular_progress_exercise_id", "exercise_id"),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("vestibular_exercises.id", ondelete="CASCADE"),
        nullable=False,
    )
    correct = Column(Boolean, nullable=False)
    answered_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="vestibular_progress")
    exercise = relationship("VestibularExercise", back_populates="progress_entries")


class EmailVerificationCode(Base):
    __tablename__ = "email_verification_codes"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    code_hash = Column(String(255), nullable=False)
    attempts_count = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime, nullable=False)
    consumed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    request_ip = Column(String(64), nullable=True)

    user = relationship("User", back_populates="verification_codes")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash = Column(String(255), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    request_ip = Column(String(64), nullable=True)

    user = relationship("User", back_populates="password_reset_tokens")


class RefreshSession(Base):
    __tablename__ = "refresh_sessions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    request_ip = Column(String(64), nullable=True)

    user = relationship("User", back_populates="refresh_sessions")


class UserProfile(Base):
    __tablename__ = "users_profile"

    id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    email = Column(Text, nullable=False, index=True)
    plan = Column(String(50), nullable=False, default="free")
    is_premium = Column(Boolean, nullable=False, default=False, index=True)
    subscription_status = Column(String(50), nullable=False, default="inactive", index=True)
    payment_status = Column(String(50), nullable=False, default="pending", index=True)
    free_uses = Column(Integer, nullable=False, default=5)
    uses_count = Column(Integer, nullable=False, default=0)
    hotmart_purchase_id = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="plan_profile")
