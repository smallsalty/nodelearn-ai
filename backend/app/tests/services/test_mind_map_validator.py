from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

import pytest

from app.services.mind_map_service import (
    MindMapGenerationContext,
    MindMapValidationError,
    MindMapValidator,
    build_mock_mind_map,
)


def valid_mind_map() -> dict:
    context = MindMapGenerationContext(
        course_id="course_ds_001",
        node_id="node_linked_list_001",
        node_name="链表",
        chapter_id=None,
        scope="node",
        central_topic="链表",
        target_goal="理解链表结构",
        custom_requirement=None,
        nodes=[],
        relations=[],
        retrieved_documents=[],
    )
    return build_mock_mind_map(context)


def assert_invalid(payload: dict, expected: str) -> None:
    with pytest.raises(MindMapValidationError) as exc_info:
        MindMapValidator.validate(payload)
    assert expected in str(exc_info.value)


def test_valid_knowledge_mind_map_passes_validation():
    payload = valid_mind_map()

    MindMapValidator.validate(payload)


def test_numeric_string_importance_is_coerced():
    payload = valid_mind_map()
    payload["branches"][0]["importance"] = "5"

    MindMapValidator.validate(payload)

    assert payload["branches"][0]["importance"] == 5


def test_descriptive_other_data_structure_title_is_allowed():
    payload = valid_mind_map()
    payload["branches"][0]["children"][0]["title"] = "\u4f5c\u4e3a\u5176\u4ed6\u6570\u636e\u7ed3\u6784\u7684\u57fa\u7840"

    MindMapValidator.validate(payload)


def test_duplicate_node_id_is_rejected():
    payload = valid_mind_map()
    payload["branches"][0]["children"][1]["id"] = payload["branches"][0]["children"][0]["id"]

    assert_invalid(payload, "duplicated node id")


def test_relation_to_missing_node_is_rejected():
    payload = valid_mind_map()
    payload["relations"][0]["targetId"] = "missing_node"

    assert_invalid(payload, "targetId not found")


def test_forbidden_first_level_branch_is_rejected():
    payload = valid_mind_map()
    payload["branches"][0]["title"] = "练习建议"

    assert_invalid(payload, "forbidden first-level branch title")


def test_leaf_without_description_is_rejected():
    payload = valid_mind_map()
    del payload["branches"][0]["children"][0]["description"]

    assert_invalid(payload, "description is required")


def test_node_branch_count_out_of_range_is_rejected():
    payload = valid_mind_map()
    payload["branches"] = payload["branches"][:3]

    assert_invalid(payload, "node mind map must contain 4 to 7 first-level branches")


def test_node_total_count_out_of_range_is_rejected():
    payload = valid_mind_map()
    for branch in payload["branches"]:
        branch["children"] = branch["children"][:1]

    assert_invalid(payload, "node mind map must contain 18 to 45 tree nodes")


def test_mermaid_content_is_rejected_by_normalizer():
    with pytest.raises(RuntimeError, match="not Markdown or Mermaid"):
        MindMapValidator.normalize_content("mindmap\n  root((链表))")


def test_valid_json_content_is_normalized():
    payload = valid_mind_map()

    normalized = MindMapValidator.normalize_content(json.dumps(payload, ensure_ascii=False))

    parsed = json.loads(normalized)
    assert parsed["centralTopic"] == "链表"
