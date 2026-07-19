from sqlalchemy import create_engine, inspect

from app.db.base import Base
from app.db.migrations.notes import migrate_notes
from app.models import ChapterModel, CourseModel, KnowledgeNodeModel, PracticeQuestionModel


def test_note_migration_creates_normalized_tables_and_is_idempotent():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[
            CourseModel.__table__,
            ChapterModel.__table__,
            KnowledgeNodeModel.__table__,
            PracticeQuestionModel.__table__,
        ],
    )

    assert migrate_notes(engine) == 3
    assert migrate_notes(engine) == 0

    inspector = inspect(engine)
    assert set(inspector.get_table_names()) >= {"note", "note_tag", "note_relation"}
    assert {column["name"] for column in inspector.get_columns("note")} >= {
        "id",
        "user_id",
        "course_id",
        "node_id",
        "question_id",
        "title",
        "content",
        "pinned",
        "created_at",
        "updated_at",
    }
    assert {tuple(item["column_names"]) for item in inspector.get_unique_constraints("note_tag")} >= {
        ("note_id", "tag")
    }
    assert {tuple(item["column_names"]) for item in inspector.get_unique_constraints("note_relation")} >= {
        ("note_id",)
    }
