from fastapi import APIRouter, File, Path, Query, UploadFile

from app.core.response import page_result, success_response
from app.schemas.common import AuditStatus, EmbedRequest, ResourceType, TaskStatus
from app.schemas.resource import (
    GeneratedResource,
    KnowledgeBuildRequest,
    KnowledgeBuildTask,
    KnowledgeSearchRequest,
    RecommendationRequest,
    ResourceGenerateRequest,
    ResourceGenerateResult,
    ResourcePushRecord,
    ResourceRecommendation,
    RetrievedDocument,
    UploadedFile,
)
from app.services.resource_service import ResourceService

router = APIRouter()

MOCK_TIME = "2026-05-19T10:00:00Z"
resource_service = ResourceService()


def mock_uploaded_file(file_id: str = "file_demo_001") -> UploadedFile:
    return UploadedFile(
        id=file_id,
        user_id="user_demo_001",
        course_id="course_ds_001",
        filename="mock.pdf",
        file_type="application/pdf",
        file_size=0,
        file_url="/storage/mock.pdf",
        parse_status=TaskStatus.success,
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


def mock_build_task(task_id: str = "kb_task_demo_001") -> KnowledgeBuildTask:
    return KnowledgeBuildTask(id=task_id, course_id="course_ds_001", file_ids=["file_demo_001"], status=TaskStatus.success, progress=100, created_at=MOCK_TIME, updated_at=MOCK_TIME)


def mock_resource(resource_id: str = "resource_demo_001") -> GeneratedResource:
    return GeneratedResource(
        id=resource_id,
        user_id="user_demo_001",
        course_id="course_ds_001",
        node_id="node_array_001",
        title="Mock Resource",
        resource_type=ResourceType.summary_note,
        content="mock",
        status=TaskStatus.success,
        audit_status=AuditStatus.unchecked,
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


@router.post("/files/upload")
def upload_file(file: UploadFile = File(...)):
    return success_response(mock_uploaded_file())


@router.get("/files/{fileId}")
def get_file(file_id: str = Path(alias="fileId")):
    try:
        file = resource_service.get_file(file_id)
        if file is not None:
            return success_response(file)
    except Exception:
        pass
    return success_response(mock_uploaded_file(file_id))


@router.delete("/files/{fileId}")
def delete_file(file_id: str = Path(alias="fileId")):
    return success_response(True)


@router.post("/knowledge-base/build")
def build_knowledge_base(payload: KnowledgeBuildRequest):
    return success_response(mock_build_task())


@router.get("/knowledge-base/build-tasks/{taskId}")
def get_build_task(task_id: str = Path(alias="taskId")):
    try:
        task = resource_service.get_build_task(task_id)
        if task is not None:
            return success_response(task)
    except Exception:
        pass
    return success_response(mock_build_task(task_id))


@router.post("/knowledge-base/search")
def search_knowledge_base(payload: KnowledgeSearchRequest):
    try:
        documents = resource_service.search_knowledge_base(
            course_id=payload.course_id,
            query_text=payload.query,
            node_id=payload.node_id,
            top_k=payload.top_k,
        )
        if documents:
            return success_response(documents)
    except Exception:
        pass
    document = RetrievedDocument(id="doc_demo_001", source_id="file_demo_001", title="Mock", content="mock", score=1)
    return success_response([document])


@router.post("/knowledge-base/embed")
def embed_text(payload: EmbedRequest):
    return success_response([0.0])


@router.post("/resources/generate")
def generate_resource(payload: ResourceGenerateRequest):
    return success_response(ResourceGenerateResult(task_id="resource_task_demo_001", resource_ids=["resource_demo_001"], status=TaskStatus.success))


@router.get("/resources/generation-tasks/{taskId}")
def get_generation_task(task_id: str = Path(alias="taskId")):
    return success_response(ResourceGenerateResult(task_id=task_id, resource_ids=["resource_demo_001"], status=TaskStatus.success))


@router.get("/resources/{resourceId}")
def get_resource(resource_id: str = Path(alias="resourceId")):
    try:
        resource = resource_service.get_resource(resource_id)
        if resource is not None:
            return success_response(resource)
    except Exception:
        pass
    return success_response(mock_resource(resource_id))


@router.get("/users/{userId}/resources")
def list_user_resources(user_id: str = Path(alias="userId"), page: int = 1, page_size: int = Query(10, alias="pageSize"), keyword: str | None = None, sort_by: str | None = Query(None, alias="sortBy"), sort_order: str | None = Query(None, alias="sortOrder")):
    try:
        items, total = resource_service.list_user_resources(user_id=user_id, page=page, page_size=page_size, keyword=keyword)
        if items:
            return success_response(page_result(items, total, page, page_size))
    except Exception:
        pass
    items = [mock_resource()]
    return success_response(page_result(items, len(items), page, page_size))


@router.get("/nodes/{nodeId}/generated-resources")
def list_node_resources(node_id: str = Path(alias="nodeId")):
    try:
        resources = resource_service.list_node_resources(node_id)
        if resources:
            return success_response(resources)
    except Exception:
        pass
    return success_response([mock_resource()])


@router.delete("/resources/{resourceId}")
def delete_resource(resource_id: str = Path(alias="resourceId")):
    return success_response(True)


@router.get("/resources/generate/stream")
def stream_resource_generation(task_id: str = Query(alias="taskId")):
    return success_response({"taskId": task_id, "eventType": "done", "progress": 100})


@router.post("/recommendations/resources")
def recommend_resources(payload: RecommendationRequest):
    recommendation = ResourceRecommendation(
        id="recommendation_demo_001",
        user_id=payload.user_id,
        course_id=payload.course_id,
        resource_id="resource_demo_001",
        resource_type=ResourceType.summary_note,
        title="Mock Resource",
        reason="mock",
        score=1,
        created_at=MOCK_TIME,
    )
    return success_response([recommendation])


@router.get("/users/{userId}/recommendations")
def list_user_recommendations(user_id: str = Path(alias="userId")):
    recommendation = ResourceRecommendation(
        id="recommendation_demo_001",
        user_id=user_id,
        course_id="course_ds_001",
        resource_id="resource_demo_001",
        resource_type=ResourceType.summary_note,
        title="Mock Resource",
        reason="mock",
        score=1,
        created_at=MOCK_TIME,
    )
    return success_response([recommendation])


@router.post("/recommendations/{recommendationId}/viewed")
def mark_recommendation_viewed(recommendation_id: str = Path(alias="recommendationId")):
    return success_response(True)


@router.get("/users/{userId}/push-records")
def list_push_records(user_id: str = Path(alias="userId")):
    record = ResourcePushRecord(id="push_demo_001", user_id=user_id, resource_id="resource_demo_001", reason="mock", viewed=False, created_at=MOCK_TIME, updated_at=MOCK_TIME)
    return success_response([record])
