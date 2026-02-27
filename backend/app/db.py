from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from .config import get_settings


settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session_with_org(org_id: str | None = None) -> Generator[Session, None, None]:
    """Context manager that sets PostgreSQL app.current_org_id for RLS."""
    db = SessionLocal()
    try:
        if org_id is not None:
            db.execute(text("SET LOCAL app.current_org_id = :org_id"), {"org_id": org_id})
        yield db
    finally:
        db.close()

