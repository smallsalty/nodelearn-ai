from pathlib import Path

from app.models.content import KnowledgeNodeModel


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
