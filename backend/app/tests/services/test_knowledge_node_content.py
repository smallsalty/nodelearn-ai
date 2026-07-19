import sys
from contextlib import contextmanager
from dataclasses import replace
from pathlib import Path

import pytest
from sqlalchemy import create_engine, event, func, select, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from app.db.migrations.knowledge_node_content import migrate_knowledge_node_content
from app.db.base import Base
from app.models import ChapterModel, GeneratedResourceModel, KnowledgeNodeModel, KnowledgeRelationModel
from app.schemas.course import KnowledgeNodeCreateRequest
from app.services.course_service import CourseService
from app.services import hello_algo_import_service
from app.services.hello_algo_import_service import (
    get_repo_commit,
    import_hello_algo_dataset,
    parse_hello_algo_repo,
    publish_assets,
    rewrite_images,
    stable_id,
)


def test_get_repo_commit_accepts_explicit_commit_when_git_is_unavailable(monkeypatch, tmp_path):
    def raise_missing_git(*args, **kwargs):
        raise FileNotFoundError("git")

    monkeypatch.setattr(hello_algo_import_service, "run_git", raise_missing_git)

    assert get_repo_commit(tmp_path, "ABCDEF1234567") == "abcdef1234567"


def test_get_repo_commit_requires_explicit_commit_when_git_is_unavailable(monkeypatch, tmp_path):
    def raise_missing_git(*args, **kwargs):
        raise FileNotFoundError("git")

    monkeypatch.setattr(hello_algo_import_service, "run_git", raise_missing_git)

    with pytest.raises(RuntimeError, match="requires an explicit source commit"):
        get_repo_commit(tmp_path)


@pytest.fixture(scope="module")
def hello_algo_dataset():
    project_root = Path(__file__).resolve().parents[4]
    repo_dir = project_root / "data_sources" / "hello-algo"
    if not repo_dir.exists():
        pytest.skip("Hello Algo source checkout is not available")
    return parse_hello_algo_repo(
        repo_dir,
        doc_language="zh",
        code_languages=["cpp", "python", "java"],
        source_commit="1f9eaee5be4f5e85ad562fb57878d939104d21ea",
    )


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
            order_index=1,
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


def test_hello_algo_content_is_normalized_while_reading_material_keeps_provenance(tmp_path, hello_algo_dataset):
    dataset = hello_algo_dataset
    resources = {resource.id: resource for resource in dataset.resources}

    assert len(dataset.chapters) == 20
    assert len(dataset.nodes) == 85
    assert len(dataset.relations) == 68
    assert all(chapter.content.strip() for chapter in dataset.chapters)
    assert all(node.content.strip() for node in dataset.nodes)
    assert dataset.assets
    assert all(asset.public_url.startswith("/storage/course-content/hello-algo/") for asset in dataset.assets)
    display_content = "\n".join([*(chapter.content for chapter in dataset.chapters), *(node.content for node in dataset.nodes)])
    assert "Source:" not in display_content
    assert "Commit:" not in display_content
    assert "License:" not in display_content
    assert "\\newline" not in display_content
    assert ":::code-tabs" in display_content
    assert "vector<int>" in display_content
    assert "#### <1>" not in display_content
    assert all("Source:" not in node.content for node in dataset.nodes)
    assert all("License: CC BY-NC-SA 4.0" in resources[node.resource_ids[0]].content for node in dataset.nodes)
    assert not any(marker in node.content for node in dataset.nodes for marker in ("```src", "!!!", '=== "', "<id>"))
    publish_assets(replace(dataset, assets=dataset.assets[:3]), storage_root=tmp_path)
    version_root = tmp_path / "course-content" / "hello-algo" / dataset.source_commit
    assert len([path for path in version_root.rglob("*") if path.is_file()]) == 3
    assert not (version_root.parent / f".{dataset.source_commit}.tmp").exists()


def test_hello_algo_image_urls_are_same_origin_and_non_ascii_paths_are_encoded_once(tmp_path):
    repo_path = tmp_path / "hello-algo"
    markdown_path = repo_path / "docs" / "chapter_demo" / "index.md"
    asset_path = markdown_path.parent / "示例图.png"
    asset_path.parent.mkdir(parents=True)
    markdown_path.write_text("# 示例", encoding="utf-8")
    asset_path.write_bytes(b"image")

    content, assets = rewrite_images(
        repo_path,
        markdown_path,
        "![本地图片](%E7%A4%BA%E4%BE%8B%E5%9B%BE.png)\n\n![外部图片](https://example.com/demo.png)",
        "abcdef1234567",
        "/storage",
    )

    expected_url = (
        "/storage/course-content/hello-algo/abcdef1234567/"
        "docs/chapter_demo/%E7%A4%BA%E4%BE%8B%E5%9B%BE.png"
    )
    assert expected_url in content
    assert "%25E7" not in content
    assert "https://example.com/demo.png" in content
    assert [(asset.source_path, asset.public_url) for asset in assets] == [
        ("docs/chapter_demo/示例图.png", expected_url)
    ]


def test_hello_algo_import_deletes_overview_relations_before_nodes_and_is_idempotent(hello_algo_dataset):
    dataset = hello_algo_dataset
    test_engine = create_engine("sqlite+pysqlite:///:memory:", poolclass=StaticPool)

    @event.listens_for(test_engine, "connect")
    def enable_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(test_engine)
    session_factory = sessionmaker(bind=test_engine, expire_on_commit=False)
    chapter = next(item for item in dataset.chapters if any(node.chapter_id == item.id for node in dataset.nodes))
    target = next(node for node in dataset.nodes if node.chapter_id == chapter.id)
    overview_id = stable_id("node", f"{chapter.source_path}/index.md")
    with session_factory.begin() as session:
        session.merge(dataset.course)
        session.flush()
        session.merge(
            ChapterModel(
                id=chapter.id,
                course_id=chapter.course_id,
                title=chapter.title,
                order_index=chapter.order_index,
                description=chapter.description,
                content=None,
                created_at=dataset.course.created_at,
                updated_at=dataset.course.updated_at,
            )
        )
        session.flush()
        session.merge(
            KnowledgeNodeModel(
                id=target.id,
                course_id=target.course_id,
                chapter_id=target.chapter_id,
                name=target.name,
                node_type="concept",
                description=target.description,
                content=target.content,
                order_index=target.order_index,
                difficulty=target.difficulty,
                learning_value=target.learning_value,
                prerequisite_node_ids=target.prerequisite_node_ids,
                next_node_ids=target.next_node_ids,
                resource_ids=target.resource_ids,
                common_mistakes=[],
                recommended_practice_ids=[],
                created_at=dataset.course.created_at,
                updated_at=dataset.course.updated_at,
            )
        )
        session.add(
            KnowledgeNodeModel(
                id=overview_id,
                course_id=chapter.course_id,
                chapter_id=chapter.id,
                name=chapter.title,
                node_type="concept",
                description="旧总览",
                content="旧总览正文",
                order_index=1,
                difficulty="easy",
                learning_value=60,
                prerequisite_node_ids=[],
                next_node_ids=[target.id],
                resource_ids=[],
                common_mistakes=[],
                recommended_practice_ids=[],
                created_at=dataset.course.created_at,
                updated_at=dataset.course.updated_at,
            )
        )
        session.flush()
        session.add(
            KnowledgeRelationModel(
                id="relation_old_overview",
                course_id=chapter.course_id,
                source_node_id=overview_id,
                target_node_id=target.id,
                relation_type="prerequisite",
                weight=1,
                created_at=dataset.course.created_at,
                updated_at=dataset.course.updated_at,
            )
        )
        session.add(
            GeneratedResourceModel(
                id="resource_old_overview",
                user_id="user_demo_001",
                course_id=chapter.course_id,
                node_id=overview_id,
                chapter_id=None,
                title="旧章节导图",
                resource_type="mind_map",
                content="{}",
                status="success",
                audit_status="passed",
                created_at=dataset.course.created_at,
                updated_at=dataset.course.updated_at,
            )
        )

    with session_factory.begin() as session:
        first = import_hello_algo_dataset(session, dataset)
    with session_factory.begin() as session:
        second = import_hello_algo_dataset(session, dataset)
        assert session.get(KnowledgeNodeModel, overview_id) is None
        migrated = session.get(GeneratedResourceModel, "resource_old_overview")
        assert migrated is not None
        assert migrated.node_id is None
        assert migrated.chapter_id == chapter.id
        assert session.scalar(select(func.count()).select_from(KnowledgeNodeModel)) == 85
        assert session.scalar(select(func.count()).select_from(KnowledgeRelationModel)) == 68
    assert (first.chapters, first.nodes, first.relations) == (20, 85, 68)
    assert (second.chapters, second.nodes, second.relations) == (20, 85, 68)
