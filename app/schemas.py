import json
from typing import Any, Optional, List
from uuid import UUID
from datetime import datetime

try:
    from pydantic import BaseModel, EmailStr, field_validator

    def options_validator(*fields):
        return field_validator(*fields, mode="before")

except ImportError:
    from pydantic import BaseModel, EmailStr, validator

    def options_validator(*fields):
        return validator(*fields, pre=True)

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


class ProfileSummaryResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class AuthSessionResponse(TokenResponse):
    user: UserResponse
    profile: Optional[ProfileSummaryResponse] = None


class EmailVerificationChallengeResponse(BaseModel):
    pending_token: str
    pending_token_type: str = "bearer"
    verification_required: bool = True
    email: str
    code_expires_in_seconds: int
    message: str


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
    is_premium: bool
    subscription_status: str
    payment_status: str
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


class VestibularExerciseResponse(BaseModel):
    id: UUID
    question: str
    options: List[str]
    difficulty: str
    created_at: datetime

    @options_validator("options")
    @classmethod
    def normalize_options(cls, value: Any) -> List[str]:
        if isinstance(value, list):
            return [str(item) for item in value]

        if isinstance(value, dict):
            # Keep a predictable option order for labeled maps like {"A": "...", "B": "..."}.
            ordered_keys = sorted(value.keys(), key=lambda key: str(key))
            return [str(value[key]) for key in ordered_keys]

        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                pass
            else:
                if isinstance(parsed, list):
                    return [str(item) for item in parsed]
                if isinstance(parsed, dict):
                    ordered_keys = sorted(parsed.keys(), key=lambda key: str(key))
                    return [str(parsed[key]) for key in ordered_keys]

        raise ValueError("Formato invalido para options. Esperado lista ou objeto JSON.")

    class Config:
        from_attributes = True


class VestibularExercisesPageResponse(BaseModel):
    items: List[VestibularExerciseResponse]
    limit: int
    offset: int
    has_more: bool


class VestibularAnswerRequest(BaseModel):
    exercise_id: UUID
    answer: str


class VestibularAnswerResponse(BaseModel):
    correct: bool
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    accuracy: int


class VestibularStatsResponse(BaseModel):
    exercicios_feitos: int
    respostas_corretas: int
    taxa_acerto: int


class VestibularExercisesApiResponse(BaseModel):
    success: bool
    message: str
    data: VestibularExercisesPageResponse


class VestibularAnswerApiResponse(BaseModel):
    success: bool
    message: str
    data: VestibularAnswerResponse


class VestibularStatsApiResponse(BaseModel):
    success: bool
    message: str
    data: VestibularStatsResponse
