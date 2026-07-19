from contextlib import contextmanager

import pytest
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.models import NoteModel, NoteRelationModel, NoteTagModel
from app.repositories.note_repository import NoteRepository
from app.schemas.note import NoteCreateRequest, NoteQuery, NoteUpdateRequest
from app.services.note_service import NoteService


@pytest.fixture()
def persistent_note_service(monkeypatch: pytest.MonkeyPatch):
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    @contextmanager
    def test_session_context():
        session = session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    monkeypatch.setattr(settings, "enable_mock", False)
    monkeypatch.setattr("app.repositories.note_repository.session_context", test_session_context)
    return engine, test_session_context, NoteService(NoteRepository())


def test_note_repository_persists_filters_updates_and_restart(persistent_note_service):
    _engine, _session_context, service = persistent_note_service
    created = service.create_note(
        NoteCreateRequest(
            user_id="user_note_real",
            title="  哈希表回顾  ",
            content="桶冲突使用链地址法。",
            tags=["哈希", " 复习 ", "哈希"],
            relation_type="resource",
            relation_id="resource_hash_001",
        )
    )
    assert created.title == "哈希表回顾"
    assert created.tags == ["哈希", "复习"]

    updated = service.update_note(
        created.id,
        NoteUpdateRequest(
            title="哈希表与冲突",
            content="平均查找接近 O(1)。",
            tags=["哈希", "复杂度"],
            relation_type="path",
            relation_id="path_hash_001",
        ),
    )
    assert updated is not None
    assert updated.tags == ["哈希", "复杂度"]
    assert updated.relation_type == "path"
    assert service.pin_note(created.id, True).pinned is True

    results, total = service.list_notes(
        NoteQuery(
            user_id="user_note_real",
            page=1,
            page_size=20,
            keyword="O(1)",
            tag="复杂度",
            pinned=True,
            relation_type="path",
        )
    )
    assert total == 1
    assert results[0].id == created.id

    restarted_service = NoteService(NoteRepository())
    restored = restarted_service.get_note(created.id)
    assert restored is not None
    assert restored.title == "哈希表与冲突"
    assert restored.tags == ["哈希", "复杂度"]
    assert restored.pinned is True


def test_note_delete_cascades_and_failed_create_rolls_back(persistent_note_service):
    _engine, session_context, service = persistent_note_service
    created = service.create_note(
        NoteCreateRequest(
            user_id="user_note_delete",
            title="待删除笔记",
            content="正文",
            tags=["删除"],
            relation_type="resource",
            relation_id="resource_delete_001",
        )
    )
    assert service.delete_note(created.id) is True
    with session_context() as session:
        assert session.scalar(select(func.count()).select_from(NoteModel)) == 0
        assert session.scalar(select(func.count()).select_from(NoteTagModel)) == 0
        assert session.scalar(select(func.count()).select_from(NoteRelationModel)) == 0

    with pytest.raises(IntegrityError):
        service.create_note(
            NoteCreateRequest(
                user_id="user_note_delete",
                course_id="missing_course",
                title="无效外键",
                content="正文",
            )
        )
    with session_context() as session:
        assert session.scalar(select(func.count()).select_from(NoteModel)) == 0


def test_note_update_rejects_partial_relation_and_empty_payload(persistent_note_service):
    _engine, _session_context, service = persistent_note_service
    created = service.create_note(
        NoteCreateRequest(user_id="user_note_validation", title="标题", content="正文")
    )
    with pytest.raises(ValueError, match="至少提供"):
        service.update_note(created.id, NoteUpdateRequest())
    with pytest.raises(ValueError, match="必须同时提供"):
        service.update_note(created.id, NoteUpdateRequest(relation_type="node"))
