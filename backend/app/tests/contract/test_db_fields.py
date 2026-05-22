from pathlib import Path


def test_database_schema_doc_exists():
    root = Path(__file__).resolve().parents[4]
    assert (root / "docs" / "database-schema.md").exists()
    # TODO: compare SQLAlchemy models and migrations against docs/interface-contract.md.
