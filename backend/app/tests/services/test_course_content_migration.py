from sqlalchemy import create_engine, inspect, text

from app.db.migrations.course_content import migrate_course_content


def test_course_content_migration_backfills_stable_order_and_is_idempotent():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE chapter (id TEXT PRIMARY KEY)"))
        connection.execute(
            text(
                """
                CREATE TABLE knowledge_node (
                    id TEXT PRIMARY KEY,
                    course_id TEXT NOT NULL,
                    chapter_id TEXT,
                    created_at TEXT NOT NULL
                )
                """
            )
        )
        connection.execute(text("CREATE TABLE generated_resource (id TEXT PRIMARY KEY)"))
        connection.execute(
            text(
                """
                INSERT INTO knowledge_node (id, course_id, chapter_id, created_at) VALUES
                    ('node_b', 'course_1', 'chapter_1', '2026-01-02T00:00:00Z'),
                    ('node_a', 'course_1', 'chapter_1', '2026-01-01T00:00:00Z'),
                    ('node_c', 'course_1', NULL, '2026-01-01T00:00:00Z')
                """
            )
        )

    assert migrate_course_content(engine) == 3
    assert migrate_course_content(engine) == 0

    with engine.connect() as connection:
        rows = connection.execute(text("SELECT id, order_index FROM knowledge_node ORDER BY id")).all()
    assert rows == [("node_a", 1), ("node_b", 2), ("node_c", 1)]
    assert {column["name"] for column in inspect(engine).get_columns("chapter")} >= {"id", "content"}
    assert {column["name"] for column in inspect(engine).get_columns("generated_resource")} >= {"id", "chapter_id"}
