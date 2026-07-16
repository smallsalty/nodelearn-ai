from __future__ import annotations

import argparse
import time
from collections import defaultdict

from sqlalchemy import Engine, inspect, text
from sqlalchemy.exc import OperationalError

from app.db.session import engine


def _column_names(target: Engine, table_name: str) -> set[str]:
    return {column["name"] for column in inspect(target).get_columns(table_name)}


def _add_columns(target: Engine) -> None:
    with target.begin() as connection:
        if "content" not in _column_names(target, "chapter"):
            connection.execute(text("ALTER TABLE chapter ADD COLUMN content TEXT NULL"))
        if "order_index" not in _column_names(target, "knowledge_node"):
            connection.execute(text("ALTER TABLE knowledge_node ADD COLUMN order_index INTEGER NULL"))
        if "chapter_id" not in _column_names(target, "generated_resource"):
            connection.execute(text("ALTER TABLE generated_resource ADD COLUMN chapter_id VARCHAR(128) NULL"))


def _backfill_node_order(target: Engine) -> int:
    updated = 0
    with target.begin() as connection:
        rows = connection.execute(
            text(
                """
                SELECT id, course_id, chapter_id, order_index
                FROM knowledge_node
                ORDER BY course_id, chapter_id, created_at, id
                """
            )
        ).mappings()
        next_index: dict[tuple[str, str | None], int] = defaultdict(int)
        for row in rows:
            key = (row["course_id"], row["chapter_id"])
            next_index[key] += 1
            if row["order_index"] is None:
                connection.execute(
                    text("UPDATE knowledge_node SET order_index = :order_index WHERE id = :node_id"),
                    {"order_index": next_index[key], "node_id": row["id"]},
                )
                updated += 1
    return updated


def _enforce_postgres_constraints(target: Engine) -> None:
    if target.dialect.name != "postgresql":
        return
    with target.begin() as connection:
        missing = connection.scalar(text("SELECT count(*) FROM knowledge_node WHERE order_index IS NULL")) or 0
        if missing:
            raise RuntimeError(f"knowledge_node.order_index still contains {missing} null rows")
        connection.execute(text("ALTER TABLE knowledge_node ALTER COLUMN order_index SET NOT NULL"))
        constraint_exists = connection.scalar(
            text(
                """
                SELECT count(*)
                FROM information_schema.table_constraints
                WHERE table_name = 'generated_resource'
                  AND constraint_name = 'fk_generated_resource_chapter_id'
                """
            )
        )
        if not constraint_exists:
            connection.execute(
                text(
                    """
                    ALTER TABLE generated_resource
                    ADD CONSTRAINT fk_generated_resource_chapter_id
                    FOREIGN KEY (chapter_id) REFERENCES chapter(id)
                    """
                )
            )


def migrate_course_content(target: Engine = engine) -> int:
    tables = set(inspect(target).get_table_names())
    required = {"chapter", "knowledge_node", "generated_resource"}
    if not required.issubset(tables):
        missing = ", ".join(sorted(required - tables))
        raise RuntimeError(f"course content migration requires tables: {missing}")
    _add_columns(target)
    updated = _backfill_node_order(target)
    _enforce_postgres_constraints(target)
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate chapter content and knowledge-node ordering fields.")
    parser.add_argument("--wait-seconds", type=int, default=0)
    args = parser.parse_args()
    deadline = time.monotonic() + max(0, args.wait_seconds)
    while True:
        try:
            updated = migrate_course_content()
            print({"knowledgeNodeOrderBackfilled": updated})
            return
        except OperationalError:
            if time.monotonic() >= deadline:
                raise
            time.sleep(1)


if __name__ == "__main__":
    main()
