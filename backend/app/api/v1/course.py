from fastapi import APIRouter, Path, Query
from fastapi.exceptions import RequestValidationError
from pydantic import TypeAdapter, ValidationError

from app.core.config import settings
from app.core.response import error_response, page_result, success_response
from app.schemas.common import CourseStatus, DifficultyLevel, MasteryStatus, NodeType
from app.schemas.course import (
    Chapter,
    ChapterCreateRequest,
    Course,
    CourseCreateRequest,
    CourseUpdateRequest,
    KnowledgeNode,
    KnowledgeNodeCreateRequest,
    KnowledgeRelation,
    NodeContent,
)
from app.services.course_service import CourseService

router = APIRouter()

MOCK_TIME = "2026-05-19T10:00:00Z"
course_service = CourseService()
node_content_adapter = TypeAdapter(NodeContent)


def mock_course(course_id: str = "course_ds_001") -> Course:
    return Course(
        id=course_id,
        name="Data Structures",
        code="DATA_STRUCTURE",
        description="Contract mock course for data structures.",
        target_major="computer_science",
        status=CourseStatus.published,
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


def mock_chapter(course_id: str = "course_ds_001") -> Chapter:
    return Chapter(
        id="chapter_demo_001",
        course_id=course_id,
        title="Linear List",
        order_index=1,
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


def mock_node(course_id: str = "course_ds_001", node_id: str = "node_array_001") -> KnowledgeNode:
    return KnowledgeNode(
        id=node_id,
        course_id=course_id,
        name="Array",
        node_type=NodeType.concept,
        description="Array stores elements in contiguous memory and supports indexed access.",
        content="# Array\n\nArray stores elements in contiguous memory and supports indexed access.",
        difficulty=DifficultyLevel.easy,
        learning_value=80,
        prerequisite_node_ids=[],
        next_node_ids=["node_linked_list_001"],
        resource_ids=[],
        common_mistakes=[],
        recommended_practice_ids=[],
        mastery_status=MasteryStatus.basic,
        mastery_score=70,
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


def mock_relation(course_id: str = "course_ds_001") -> KnowledgeRelation:
    return KnowledgeRelation(
        id="relation_demo_001",
        course_id=course_id,
        source_node_id="node_array_001",
        target_node_id="node_linked_list_001",
        relation_type="prerequisite",
        weight=1,
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


@router.get("/courses")
def list_courses(
    page: int = 1,
    page_size: int = Query(10, alias="pageSize"),
    keyword: str | None = None,
    sort_by: str | None = Query(None, alias="sortBy"),
    sort_order: str | None = Query(None, alias="sortOrder"),
):
    if settings.enable_mock:
        items = [mock_course()]
        return success_response(page_result(items, len(items), page, page_size))
    try:
        items, total = course_service.list_courses(page=page, page_size=page_size, keyword=keyword)
        if items or not settings.enable_mock:
            return success_response(page_result(items, total, page, page_size))
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database query failed: {exc}")
    return success_response(page_result([], 0, page, page_size))


@router.post("/courses")
def create_course(payload: CourseCreateRequest):
    if settings.enable_mock:
        return success_response(mock_course())
    try:
        return success_response(course_service.create_course(payload))
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database write failed: {exc}")
    return success_response(mock_course())


@router.get("/courses/{courseId}")
def get_course(course_id: str = Path(alias="courseId")):
    if settings.enable_mock:
        return success_response(mock_course(course_id))
    try:
        course = course_service.get_course(course_id)
        if course is not None:
            return success_response(course)
        if not settings.enable_mock:
            return error_response(f"course not found: {course_id}", code=404)
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database query failed: {exc}")
    return success_response(mock_course(course_id))


@router.put("/courses/{courseId}")
def update_course(payload: CourseUpdateRequest, course_id: str = Path(alias="courseId")):
    if settings.enable_mock:
        return success_response(mock_course(course_id))
    try:
        course = course_service.update_course(course_id, payload)
        if course is not None:
            return success_response(course)
        if not settings.enable_mock:
            return error_response(f"course not found: {course_id}", code=404)
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database write failed: {exc}")
    return success_response(mock_course(course_id))


@router.delete("/courses/{courseId}")
def delete_course(course_id: str = Path(alias="courseId")):
    if settings.enable_mock:
        return success_response(True)
    try:
        return success_response(course_service.delete_course(course_id))
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database write failed: {exc}")
    return success_response(True)


@router.get("/courses/{courseId}/chapters")
def list_chapters(course_id: str = Path(alias="courseId")):
    if settings.enable_mock:
        return success_response([mock_chapter(course_id)])
    try:
        chapters = course_service.list_chapters(course_id)
        if chapters or not settings.enable_mock:
            return success_response(chapters)
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database query failed: {exc}")
    return success_response([mock_chapter(course_id)])


@router.post("/courses/{courseId}/chapters")
def create_chapter(payload: ChapterCreateRequest, course_id: str = Path(alias="courseId")):
    if settings.enable_mock:
        return success_response(mock_chapter(course_id))
    try:
        return success_response(course_service.create_chapter(course_id, payload))
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database write failed: {exc}")
    return success_response(mock_chapter(course_id))


@router.get("/courses/{courseId}/nodes")
def list_nodes(course_id: str = Path(alias="courseId")):
    if settings.enable_mock:
        return success_response([mock_node(course_id)])
    try:
        nodes = course_service.list_nodes(course_id)
        if nodes or not settings.enable_mock:
            return success_response(nodes)
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database query failed: {exc}")
    return success_response([mock_node(course_id)])


@router.post("/courses/{courseId}/nodes")
def create_node(payload: KnowledgeNodeCreateRequest, course_id: str = Path(alias="courseId")):
    if settings.enable_mock:
        return success_response(mock_node(course_id))
    try:
        return success_response(course_service.create_node(course_id, payload))
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database write failed: {exc}")
    return success_response(mock_node(course_id))


@router.get("/nodes/{nodeId}")
def get_node(node_id: str = Path(alias="nodeId")):
    if settings.enable_mock:
        return success_response(mock_node(node_id=node_id))
    try:
        node = course_service.get_node(node_id)
        if node is not None:
            return success_response(node)
        if not settings.enable_mock:
            return error_response(f"node not found: {node_id}", code=404)
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database query failed: {exc}")
    return success_response(mock_node(node_id=node_id))


@router.put("/nodes/{nodeId}")
def update_node(payload: dict, node_id: str = Path(alias="nodeId")):
    if "content" in payload:
        try:
            payload["content"] = node_content_adapter.validate_python(payload["content"])
        except ValidationError as exc:
            raise RequestValidationError(exc.errors()) from exc
    if settings.enable_mock:
        return success_response(mock_node(node_id=node_id))
    try:
        node = course_service.update_node(node_id, payload)
        if node is not None:
            return success_response(node)
        if not settings.enable_mock:
            return error_response(f"node not found: {node_id}", code=404)
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database write failed: {exc}")
    return success_response(mock_node(node_id=node_id))


@router.delete("/nodes/{nodeId}")
def delete_node(node_id: str = Path(alias="nodeId")):
    if settings.enable_mock:
        return success_response(True)
    try:
        return success_response(course_service.delete_node(node_id))
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database write failed: {exc}")
    return success_response(True)


@router.get("/courses/{courseId}/relations")
def list_relations(course_id: str = Path(alias="courseId")):
    if settings.enable_mock:
        return success_response([mock_relation(course_id)])
    try:
        relations = course_service.list_relations(course_id)
        if relations or not settings.enable_mock:
            return success_response(relations)
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database query failed: {exc}")
    return success_response([mock_relation(course_id)])


@router.post("/courses/{courseId}/relations")
def create_relation(payload: KnowledgeRelation, course_id: str = Path(alias="courseId")):
    if settings.enable_mock:
        return success_response(payload)
    try:
        return success_response(course_service.create_relation(course_id, payload))
    except Exception as exc:
        if not settings.enable_mock:
            return error_response(f"database write failed: {exc}")
    return success_response(payload)
