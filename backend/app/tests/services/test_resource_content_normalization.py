from app.schemas.common import ResourceType
from app.services.resource_service import ResourceService


def test_mind_map_normalization_removes_code_fences_and_optional_icons():
    content = """```mermaid
mindmap
  root((栈))
    定义
      ::icon(fa fa-layer-group)
      后进先出
      push(): O(1)
```"""

    normalized = ResourceService._normalize_generated_content(ResourceType.mind_map, content)

    assert normalized == "mindmap\n  root((栈))\n    定义\n      后进先出\n      push（）: O（1）"
