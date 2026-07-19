from app.core.config import settings
from app.schemas.resource import RetrievedDocument
from app.services.multimodal_service import MultimodalService


def _document(document_id: str, title: str, content: str) -> RetrievedDocument:
    return RetrievedDocument(
        id=document_id,
        source_id=f"https://example.test/{document_id}",
        title=title,
        content=content,
        score=1,
    )


def test_video_context_supplements_hash_node_with_grounded_collision_source(monkeypatch):
    primary = [_document("hash_map", "哈希表", "key 经过哈希函数定位桶")]
    collision = _document(
        "hash_collision",
        "哈希冲突",
        "链式地址在同一个桶中比较 key；负载因子过高时可以扩容。",
    )
    unrelated = _document("array", "数组", "扩容数组")

    class FakeResourceService:
        def __init__(self):
            self.calls = []

        def search_knowledge_base(self, *, course_id, query_text, node_id, top_k):
            self.calls.append((course_id, query_text, node_id, top_k))
            return primary if node_id else [unrelated, collision]

    resource_service = FakeResourceService()
    service = object.__new__(MultimodalService)
    service.resource_service = resource_service
    monkeypatch.setattr(settings, "enable_mock", False)

    documents = service._load_documents(
        "course_ds_001",
        "node_hash",
        "讲清哈希冲突、链式地址、负载因子和扩容",
        True,
    )

    assert [item.id for item in documents] == ["hash_map", "hash_collision"]
    assert resource_service.calls == [
        ("course_ds_001", "讲清哈希冲突、链式地址、负载因子和扩容", "node_hash", 3),
        ("course_ds_001", "哈希冲突 链式地址 负载因子 扩容", None, 20),
    ]
