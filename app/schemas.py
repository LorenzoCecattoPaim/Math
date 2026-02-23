from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# ========================
# Auth Schemas
# ========================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str  # email
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    google_id: Optional[str] = None
    email_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GoogleAuthRequest(BaseModel):
    access_token: str


class GoogleAuthResponse(BaseModel):
    pending_token: str
    pending_token_type: str = "bearer"
    verification_required: bool = True
    email: str
    code_expires_in_seconds: int


class VerifyEmailCodeRequest(BaseModel):
    pending_token: str
    code: str


class VerifyEmailLinkRequest(BaseModel):
    magic_token: str


class ResendVerificationCodeRequest(BaseModel):
    pending_token: str


class ResendVerificationCodeResponse(BaseModel):
    message: str
    pending_token: Optional[str] = None
    email: Optional[str] = None
    code_expires_in_seconds: Optional[int] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ResetPasswordResponse(BaseModel):
    message: str

# ========================
# Profile Schemas
# ========================

class ProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserPlanResponse(BaseModel):
    id: UUID
    email: str
    plan: str
    free_uses: int
    uses_count: int
    hotmart_purchase_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ========================
# Exercise Schemas
# ========================

class ExerciseResponse(BaseModel):
    id: UUID
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: str
    subject: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ExerciseCreate(BaseModel):
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: str
    subject: str

# ========================
# Attempt Schemas
# ========================

class AttemptCreate(BaseModel):
    exercise_id: UUID
    user_answer: str
    is_correct: bool
    time_spent_seconds: Optional[int] = None

class AttemptResponse(BaseModel):
    id: UUID
    user_id: UUID
    exercise_id: UUID
    user_answer: str
    is_correct: bool
    time_spent_seconds: Optional[int] = None
    created_at: datetime
    exercise: Optional[ExerciseResponse] = None
    
    class Config:
        from_attributes = True

# ========================
# Stats Schemas
# ========================

class StatsResponse(BaseModel):
    total: int
    correct: int
    accuracy: int

class ProgressResponse(BaseModel):
    attempts: List[AttemptResponse]
    stats: StatsResponse
