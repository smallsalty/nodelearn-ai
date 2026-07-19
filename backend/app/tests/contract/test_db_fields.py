from pathlib import Path

from app.models.content import KnowledgeNodeModel, NoteModel, NoteRelationModel, NoteTagModel


def test_database_schema_doc_exists():
    root = Path(__file__).resolve().parents[4]
    assert (root / "docs" / "database-schema.md").exists()


def test_knowledge_node_content_is_required_in_model_and_contract():
    root = Path(__file__).resolve().parents[4]
    content_column = KnowledgeNodeModel.__table__.columns["content"]

    assert content_column.nullable is False
    assert str(content_column.type).upper() == "TEXT"

    contract = (root / "docs" / "interface-contract.md").read_text(encoding="utf-8")
    database_doc = (root / "docs" / "database-schema.md").read_text(encoding="utf-8")
    assert "content: string;" in contract
    assert "content TEXT NOT NULL" in contract
    assert "knowledge_node.content" in database_doc


def test_note_models_match_normalized_contract():
    root = Path(__file__).resolve().parents[4]
    assert set(NoteModel.__table__.columns.keys()) == {
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
    assert set(NoteTagModel.__table__.columns.keys()) == {"id", "note_id", "tag", "created_at"}
    assert set(NoteRelationModel.__table__.columns.keys()) == {
        "id",
        "note_id",
        "relation_type",
        "relation_id",
        "created_at",
        "updated_at",
    }
    contract = (root / "docs" / "interface-contract.md").read_text(encoding="utf-8")
    assert 'type NoteRelationType = "node" | "question" | "resource" | "path";' in contract
    assert "UNIQUE (note_id, tag)" in contract
    assert "UNIQUE (note_id)" in contract
