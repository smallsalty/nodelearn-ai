from __future__ import annotations

import argparse
import time

from sqlalchemy import Engine, inspect, text
from sqlalchemy.exc import OperationalError

from app.db.base import Base
from app.db.session import engine


def migrate_knowledge_node_content(bind: Engine | None = None, *, create_tables: bool = True) -> int:
    """Add and backfill knowledge_node.content without inventing placeholder text."""

    target = bind or engine
    if target is None:
        raise RuntimeError("DATABASE_URL is not configured")

    import app.models  # noqa: F401

    if create_tables:
        Base.metadata.create_all(bind=target)

    with target.begin() as connection:
        columns = {column["name"] for column in inspect(connection).get_columns("knowledge_node")}
        if "content" not in columns:
            connection.execute(text("ALTER TABLE knowledge_node ADD COLUMN content TEXT"))

        trim = "BTRIM" if target.dialect.name == "postgresql" else "TRIM"
        result = connection.execute(
            text(
                f"""
                UPDATE knowledge_node
                SET content = COALESCE(
                    NULLIF({trim}(content), ''),
                    (
                        SELECT generated_resource.content
                        FROM generated_resource
                        WHERE generated_resource.node_id = knowledge_node.id
                          AND generated_resource.resource_type = 'reading_material'
                          AND generated_resource.content IS NOT NULL
                          AND {trim}(generated_resource.content) <> ''
                        ORDER BY generated_resource.created_at DESC, generated_resource.id DESC
                        LIMIT 1
                    ),
                    NULLIF({trim}(description), '')
                )
                WHERE content IS NULL OR {trim}(content) = ''
                """
            )
        )

        missing_ids = list(
            connection.execute(
                text(
                    f"SELECT id FROM knowledge_node WHERE content IS NULL OR {trim}(content) = '' ORDER BY id"
                )
            ).scalars()
        )
        if missing_ids:
            preview = ", ".join(missing_ids[:20])
            suffix = " ..." if len(missing_ids) > 20 else ""
            raise RuntimeError(f"knowledge_node content backfill failed for {len(missing_ids)} node(s): {preview}{suffix}")

        if target.dialect.name == "postgresql":
            connection.execute(text("ALTER TABLE knowledge_node ALTER COLUMN content SET NOT NULL"))
        elif target.dialect.name not in {"sqlite"}:
            raise RuntimeError(f"unsupported database dialect for content migration: {target.dialect.name}")

        return max(result.rowcount or 0, 0)


def run_with_retry(wait_seconds: int) -> int:
    deadline = time.monotonic() + max(wait_seconds, 0)
    while True:
        try:
            return migrate_knowledge_node_content()
        except OperationalError:
            if time.monotonic() >= deadline:
                raise
            time.sleep(2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Add and backfill knowledge_node.content.")
    parser.add_argument("--wait-seconds", type=int, default=0, help="Retry while the database starts.")
    args = parser.parse_args()
    updated = run_with_retry(args.wait_seconds)
    print({"migration": "knowledge_node_content", "backfilledRows": updated})


if __name__ == "__main__":
    main()
