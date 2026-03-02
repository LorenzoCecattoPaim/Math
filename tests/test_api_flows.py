import uuid

from sqlalchemy import text

from app.auth import create_access_token, hash_password
from app.models import Exercise, Profile, User


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
