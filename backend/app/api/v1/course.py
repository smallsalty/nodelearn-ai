from fastapi import APIRouter, Path, Query

from app.core.response import page_result, success_response
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
)

router = APIRouter()

MOCK_TIME = "2026-05-19T10:00:00Z"


def mock_course(course_id: str = "course_ds_001") -> Course:
    return Course(
        id=course_id,
        name="数据结构",
        code="DATA_STRUCTURE",
        description="面向软件项目演示的数据结构课程知识库",
        target_major="计算机科学与技术",
        status=CourseStatus.published,
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


def mock_chapter(course_id: str = "course_ds_001") -> Chapter:
    return Chapter(id="chapter_demo_001", course_id=course_id, title="线性表", order_index=1, created_at=MOCK_TIME, updated_at=MOCK_TIME)


def mock_node(course_id: str = "course_ds_001", node_id: str = "node_array_001") -> KnowledgeNode:
    return KnowledgeNode(
        id=node_id,
        course_id=course_id,
        name="数组",
        node_type=NodeType.concept,
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
def list_courses(page: int = 1, page_size: int = Query(10, alias="pageSize"), keyword: str | None = None, sort_by: str | None = Query(None, alias="sortBy"), sort_order: str | None = Query(None, alias="sortOrder")):
    items = [mock_course()]
    return success_response(page_result(items, len(items), page, page_size))


@router.post("/courses")
def create_course(payload: CourseCreateRequest):
    return success_response(mock_course())


@router.get("/courses/{courseId}")
def get_course(course_id: str = Path(alias="courseId")):
    return success_response(mock_course(course_id))


@router.put("/courses/{courseId}")
def update_course(payload: CourseUpdateRequest, course_id: str = Path(alias="courseId")):
    return success_response(mock_course(course_id))


@router.delete("/courses/{courseId}")
def delete_course(course_id: str = Path(alias="courseId")):
    return success_response(True)


@router.get("/courses/{courseId}/chapters")
def list_chapters(course_id: str = Path(alias="courseId")):
    return success_response([mock_chapter(course_id)])


@router.post("/courses/{courseId}/chapters")
def create_chapter(payload: ChapterCreateRequest, course_id: str = Path(alias="courseId")):
    return success_response(mock_chapter(course_id))


@router.get("/courses/{courseId}/nodes")
def list_nodes(course_id: str = Path(alias="courseId")):
    return success_response([mock_node(course_id)])


@router.post("/courses/{courseId}/nodes")
def create_node(payload: KnowledgeNodeCreateRequest, course_id: str = Path(alias="courseId")):
    return success_response(mock_node(course_id))


@router.get("/nodes/{nodeId}")
def get_node(node_id: str = Path(alias="nodeId")):
    return success_response(mock_node(node_id=node_id))


@router.put("/nodes/{nodeId}")
def update_node(payload: dict, node_id: str = Path(alias="nodeId")):
    return success_response(mock_node(node_id=node_id))


@router.delete("/nodes/{nodeId}")
def delete_node(node_id: str = Path(alias="nodeId")):
    return success_response(True)


@router.get("/courses/{courseId}/relations")
def list_relations(course_id: str = Path(alias="courseId")):
    return success_response([mock_relation(course_id)])


@router.post("/courses/{courseId}/relations")
def create_relation(payload: KnowledgeRelation, course_id: str = Path(alias="courseId")):
    return success_response(payload)
