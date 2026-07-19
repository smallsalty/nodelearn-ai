from __future__ import annotations

import argparse
import time

from sqlalchemy import Engine, inspect
from sqlalchemy.exc import OperationalError

from app.db.session import engine


NOTE_TABLES = ("note", "note_tag", "note_relation")
REQUIRED_COLUMNS = {
    "note": {
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
    },
    "note_tag": {"id", "note_id", "tag", "created_at"},
    "note_relation": {
        "id",
        "note_id",
        "relation_type",
        "relation_id",
        "created_at",
        "updated_at",
    },
}


def migrate_notes(bind: Engine | None = None) -> int:
    """Create and validate the normalized note tables without overwriting legacy data."""

    target = bind or engine
    if target is None:
        raise RuntimeError("DATABASE_URL is not configured")

    import app.models  # noqa: F401
    from app.db.base import Base

    inspector = inspect(target)
    existing = set(inspector.get_table_names())
    dependencies = {"course", "knowledge_node", "practice_question"}
    missing_dependencies = dependencies - existing
    if missing_dependencies:
        names = ", ".join(sorted(missing_dependencies))
        raise RuntimeError(f"note migration requires existing tables: {names}")

    created = 0
    for table_name in NOTE_TABLES:
        table = Base.metadata.tables[table_name]
        if table_name not in existing:
            table.create(bind=target, checkfirst=True)
            created += 1

    inspector = inspect(target)
    for table_name, required in REQUIRED_COLUMNS.items():
        actual = {column["name"] for column in inspector.get_columns(table_name)}
        missing = required - actual
        if missing:
            names = ", ".join(sorted(missing))
            raise RuntimeError(f"existing {table_name} table is incompatible; missing columns: {names}")

    unique_tag_columns = {
        tuple(constraint["column_names"])
        for constraint in inspector.get_unique_constraints("note_tag")
    }
    if ("note_id", "tag") not in unique_tag_columns:
        raise RuntimeError("existing note_tag table is incompatible; missing UNIQUE(note_id, tag)")
    unique_relation_columns = {
        tuple(constraint["column_names"])
        for constraint in inspector.get_unique_constraints("note_relation")
    }
    if ("note_id",) not in unique_relation_columns:
        raise RuntimeError("existing note_relation table is incompatible; missing UNIQUE(note_id)")

    for table_name in NOTE_TABLES:
        for index in Base.metadata.tables[table_name].indexes:
            index.create(bind=target, checkfirst=True)
    return created


def run_with_retry(wait_seconds: int) -> int:
    deadline = time.monotonic() + max(wait_seconds, 0)
    while True:
        try:
            return migrate_notes()
        except OperationalError:
            if time.monotonic() >= deadline:
                raise
            time.sleep(2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create and validate PostgreSQL note tables.")
    parser.add_argument("--wait-seconds", type=int, default=0)
    args = parser.parse_args()
    print({"noteTablesCreated": run_with_retry(args.wait_seconds)})


if __name__ == "__main__":
    main()
