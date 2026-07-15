import sys
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from app.db.migrations.knowledge_node_content import migrate_knowledge_node_content
from app.db.base import Base
from app.schemas.course import KnowledgeNodeCreateRequest
from app.services.course_service import CourseService
from app.services.hello_algo_import_service import parse_hello_algo_repo


def test_content_migration_backfills_resource_then_description_and_is_idempotent():
    test_engine = create_engine("sqlite+pysqlite:///:memory:")
    with test_engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE knowledge_node (
                    id TEXT PRIMARY KEY,
                    description TEXT
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE generated_resource (
                    id TEXT PRIMARY KEY,
                    node_id TEXT,
                    resource_type TEXT,
                    content TEXT,
                    created_at TEXT
                )
                """
            )
        )
        connection.execute(
            text("INSERT INTO knowledge_node (id, description) VALUES ('node_resource', '摘要'), ('node_description', '备用正文')")
        )
        connection.execute(
            text(
                """
                INSERT INTO generated_resource (id, node_id, resource_type, content, created_at)
                VALUES ('resource_1', 'node_resource', 'reading_material', '# 完整正文', '2026-07-15T00:00:00Z')
                """
            )
        )

    assert migrate_knowledge_node_content(test_engine, create_tables=False) == 2
    assert migrate_knowledge_node_content(test_engine, create_tables=False) == 0

    with test_engine.connect() as connection:
        values = dict(connection.execute(text("SELECT id, content FROM knowledge_node ORDER BY id")).all())
    assert values == {"node_description": "备用正文", "node_resource": "# 完整正文"}


def test_course_service_creates_reads_and_updates_required_content(monkeypatch):
    import app.models  # noqa: F401

    test_engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(test_engine)
    test_session = sessionmaker(bind=test_engine, expire_on_commit=False)

    @contextmanager
    def test_session_context():
        session = test_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    monkeypatch.setattr("app.services.course_service.session_context", test_session_context)
    service = CourseService()
    created = service.create_node(
        "course_content_test",
        KnowledgeNodeCreateRequest(
            course_id="course_content_test",
            name="数组正文测试",
            node_type="concept",
            description="数组摘要",
            content="# 数组\n\n完整正文",
            difficulty="easy",
            learning_value=80,
        ),
    )

    assert created.content == "# 数组\n\n完整正文"
    assert service.get_node(created.id).content == created.content
    assert service.update_node(created.id, {"content": "# 动态数组\n\n更新后的正文"}).content.startswith("# 动态数组")

    try:
        service.update_node(created.id, {"content": "  "})
    except ValueError as exc:
        assert "must not be blank" in str(exc)
    else:
        raise AssertionError("blank knowledge node content must be rejected")


def test_hello_algo_nodes_share_full_content_with_reading_material():
    project_root = Path(__file__).resolve().parents[4]
    repo_dir = project_root / "data_sources" / "hello-algo"
    if not repo_dir.exists():
        return

    dataset = parse_hello_algo_repo(repo_dir, doc_language="zh", code_languages=["all"])
    resources = {resource.id: resource for resource in dataset.resources}

    assert len(dataset.nodes) == 105
    assert all(node.content.strip() for node in dataset.nodes)
    assert all(node.content == resources[node.resource_ids[0]].content for node in dataset.nodes)
    assert all("License: CC BY-NC-SA 4.0" in node.content for node in dataset.nodes)
