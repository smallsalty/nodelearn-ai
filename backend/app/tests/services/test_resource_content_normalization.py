import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from app.schemas.common import ResourceType
from app.services.mind_map_service import MindMapGenerationContext, build_mock_mind_map
from app.services.resource_service import ResourceService


def test_mind_map_normalization_accepts_knowledge_mind_map_json():
    payload = build_mock_mind_map(
        MindMapGenerationContext(
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
    )

    normalized = ResourceService._normalize_generated_content(
        ResourceType.mind_map,
        json.dumps(payload, ensure_ascii=False),
    )

    assert json.loads(normalized)["centralTopic"] == "链表"


def test_mind_map_normalization_rejects_mermaid_content():
    content = """```mermaid
mindmap
  root((栈))
    定义
      ::icon(fa fa-layer-group)
      后进先出
      push(): O(1)
```"""

    try:
        ResourceService._normalize_generated_content(ResourceType.mind_map, content)
    except RuntimeError as exc:
        assert "KnowledgeMindMap JSON" in str(exc)
    else:
        raise AssertionError("Mermaid mind_map content should be rejected")
