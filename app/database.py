import logging

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import (
    DATABASE_URL,
    DB_MAX_OVERFLOW,
    DB_POOL_SIZE,
    DB_POOL_TIMEOUT_SECONDS,
)

logger = logging.getLogger(__name__)


def _normalize_database_url(raw_url: str | None) -> str:
    if not raw_url:
        raise RuntimeError("DATABASE_URL is not configured.")

    normalized = raw_url.strip()
    if normalized.startswith("postgres://"):
        normalized = normalized.replace("postgres://", "postgresql://", 1)

    url = make_url(normalized)
    drivername = url.drivername
    if drivername in {"postgres", "postgresql"}:
        url = url.set(drivername="postgresql+psycopg2")

    host = (url.host or "").lower()
    if "pooler.supabase.com" in host and url.port == 6543:
        url = url.set(port=5432)
        logger.warning(
            "Supabase pooler URL detected on port 6543. Using direct connection port 5432."
        )

    query = dict(url.query)
    if "supabase.com" in host and "sslmode" not in query:
        query["sslmode"] = "require"
        url = url.set(query=query)

    return url.render_as_string(hide_password=False)


normalized_database_url = _normalize_database_url(DATABASE_URL)

engine = create_engine(
    normalized_database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=DB_POOL_SIZE,
    max_overflow=DB_MAX_OVERFLOW,
    pool_timeout=DB_POOL_TIMEOUT_SECONDS,
    connect_args={"connect_timeout": 10},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
