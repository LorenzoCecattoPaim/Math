import uuid
from pathlib import Path

from sqlalchemy import text

from app.auth import create_access_token, hash_password
from app.models import Exercise, Profile, User, UserProfile, VestibularExercise


def _create_verified_user(db_session, email: str = "user@example.com", password: str = "secret123") -> User:
    user = User(
        email=email,
        full_name="Test User",
        password_hash=hash_password(password),
        email_verified=True,
    )
    db_session.add(user)
    db_session.flush()
    db_session.add(Profile(user_id=user.id, full_name=user.full_name))
    db_session.commit()
    db_session.refresh(user)
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _set_premium_plan(db_session, user: User) -> None:
    plan = UserProfile(
        id=user.id,
        email=user.email,
        plan="premium",
        is_premium=True,
        subscription_status="active",
        payment_status="paid",
        free_uses=5,
        uses_count=0,
    )
    db_session.add(plan)
    db_session.commit()


def test_database_connection(db_session):
    result = db_session.execute(text("SELECT 1")).scalar_one()
    assert result == 1


def test_signup_creates_user_and_profile(client, db_session):
    payload = {
        "email": "signup@example.com",
        "password": "secret123",
        "confirm_password": "secret123",
        "full_name": "Signup User",
    }

    response = client.post("/auth/signup", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["verification_required"] is True
    assert body["email"] == payload["email"]
    assert "pending_token" in body

    created_user = db_session.query(User).filter(User.email == payload["email"]).first()
    assert created_user is not None
    assert created_user.id is not None
    created_profile = db_session.query(Profile).filter(Profile.user_id == created_user.id).first()
    assert created_profile is not None


def test_login_returns_access_token(client, db_session):
    email = "login@example.com"
    password = "secret123"
    _create_verified_user(db_session, email=email, password=password)

    response = client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["user"]["email"] == email


def test_create_exercise(client, db_session):
    user = _create_verified_user(db_session, email="exercise@example.com")
    payload = {
        "question": "Quanto e 2 + 2?",
        "options": ["1", "2", "3", "4"],
        "correct_answer": "4",
        "explanation": "Soma basica.",
        "difficulty": "easy",
        "subject": "arithmetic",
    }

    response = client.post("/exercises", json=payload, headers=_auth_headers(user))

    assert response.status_code == 201
    body = response.json()
    assert body["question"] == payload["question"]
    assert body["correct_answer"] == payload["correct_answer"]


def test_create_attempt(client, db_session):
    user = _create_verified_user(db_session, email="attempt@example.com")
    exercise = Exercise(
        id=uuid.uuid4(),
        question="Quanto e 3 * 3?",
        options=["6", "7", "8", "9"],
        correct_answer="9",
        explanation="Multiplicacao basica.",
        difficulty="easy",
        subject="arithmetic",
    )
    db_session.add(exercise)
    db_session.commit()

    payload = {
        "exercise_id": str(exercise.id),
        "user_answer": "9",
        "is_correct": True,
        "time_spent_seconds": 20,
    }

    response = client.post("/attempts", json=payload, headers=_auth_headers(user))

    assert response.status_code == 200
    body = response.json()
    assert body["exercise_id"] == str(exercise.id)
    assert body["is_correct"] is True
    assert body["exercise"]["id"] == str(exercise.id)


def test_vestibular_access_blocked_for_free_user(client, db_session):
    user = _create_verified_user(db_session, email="vest-free@example.com")
    exercise = VestibularExercise(
        id=uuid.uuid4(),
        question="Qual e o valor de x em 2x + 3 = 11?",
        options=["2", "3", "4", "5"],
        correct_answer="4",
        explanation="2x = 8, logo x = 4.",
        difficulty="medium",
    )
    db_session.add(exercise)
    db_session.commit()

    response = client.get("/vestibular/exercises?limit=10&offset=0&difficulty=medium", headers=_auth_headers(user))

    assert response.status_code == 403
    assert "premium" in response.json()["detail"].lower()


def test_vestibular_duplicate_answer_is_blocked(client, db_session):
    user = _create_verified_user(db_session, email="vest-premium@example.com")
    _set_premium_plan(db_session, user)

    exercise = VestibularExercise(
        id=uuid.uuid4(),
        question="Resolva: 3x + 9 = 18",
        options=["1", "2", "3", "4"],
        correct_answer="3",
        explanation="3x = 9, x = 3.",
        difficulty="medium",
    )
    db_session.add(exercise)
    db_session.commit()

    first = client.post(
        "/vestibular/answer",
        json={"exercise_id": str(exercise.id), "answer": "3"},
        headers=_auth_headers(user),
    )
    duplicate = client.post(
        "/vestibular/answer",
        json={"exercise_id": str(exercise.id), "answer": "3"},
        headers=_auth_headers(user),
    )

    assert first.status_code == 200
    assert duplicate.status_code == 409
    assert "ja respondido" in duplicate.json()["detail"].lower()


def test_vestibular_stats_are_correct(client, db_session):
    user = _create_verified_user(db_session, email="vest-stats@example.com")
    _set_premium_plan(db_session, user)

    exercise_1 = VestibularExercise(
        id=uuid.uuid4(),
        question="Quanto e 20% de 50?",
        options=["5", "10", "15", "20"],
        correct_answer="10",
        explanation="20/100 * 50 = 10.",
        difficulty="medium",
    )
    exercise_2 = VestibularExercise(
        id=uuid.uuid4(),
        question="Se f(x)=x^2, quanto vale f(4)?",
        options=["8", "12", "16", "20"],
        correct_answer="16",
        explanation="4^2 = 16.",
        difficulty="hard",
    )
    db_session.add_all([exercise_1, exercise_2])
    db_session.commit()

    client.post(
        "/vestibular/answer",
        json={"exercise_id": str(exercise_1.id), "answer": "10"},
        headers=_auth_headers(user),
    )
    client.post(
        "/vestibular/answer",
        json={"exercise_id": str(exercise_2.id), "answer": "12"},
        headers=_auth_headers(user),
    )

    response = client.get("/vestibular/stats", headers=_auth_headers(user))
    body = response.json()

    assert response.status_code == 200
    assert body["exercicios_feitos"] == 2
    assert body["respostas_corretas"] == 1
    assert body["taxa_acerto"] == 50


def test_database_sql_contains_vestibular_rls():
    sql_content = Path("database.sql").read_text(encoding="utf-8")

    assert "CREATE TABLE IF NOT EXISTS public.vestibular_exercises" in sql_content
    assert "CREATE TABLE IF NOT EXISTS public.user_vestibular_progress" in sql_content
    assert "ALTER TABLE public.vestibular_exercises ENABLE ROW LEVEL SECURITY;" in sql_content
    assert "ALTER TABLE public.user_vestibular_progress ENABLE ROW LEVEL SECURITY;" in sql_content
    assert "CREATE POLICY vestibular_exercises_select_premium" in sql_content
    assert "CREATE POLICY user_vestibular_progress_insert_premium" in sql_content
    assert "user_id UUID REFERENCES public.users(id) ON DELETE CASCADE" in sql_content
