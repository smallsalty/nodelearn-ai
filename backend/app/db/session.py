from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.base import Base

engine = create_engine(settings.database_url, pool_pre_ping=True) if settings.database_url else None
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False) if engine else None


def get_database_url() -> str:
    return settings.database_url


def init_db() -> None:
    if engine is None:
        raise RuntimeError("DATABASE_URL is not configured")
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    from app.db.migrations.knowledge_node_content import migrate_knowledge_node_content

    migrate_knowledge_node_content(engine, create_tables=False)


@contextmanager
def session_context() -> Generator[Session, None, None]:
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured")
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_session() -> Generator[Session, None, None]:
    with session_context() as session:
        yield session
