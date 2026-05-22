from fastapi import APIRouter, Path

from app.core.response import success_response
from app.schemas.common import DifficultyLevel, MasteryStatus, MasteryUpdateRequest, NodeType
from app.schemas.graph import GraphEdge, GraphNode, KnowledgeGraph

router = APIRouter()


def mock_graph(course_id: str = "course_ds_001") -> KnowledgeGraph:
    node = GraphNode(
        id="node_array_001",
        label="数组",
        node_type=NodeType.concept,
        difficulty=DifficultyLevel.easy,
        mastery_status=MasteryStatus.basic,
        mastery_score=70,
    )
    edge = GraphEdge(id="edge_demo_001", source="node_array_001", target="node_linked_list_001", relation_type="prerequisite", weight=1)
    return KnowledgeGraph(course_id=course_id, nodes=[node], edges=[edge])


@router.get("/courses/{courseId}/graph")
def get_course_graph(course_id: str = Path(alias="courseId")):
    return success_response(mock_graph(course_id))


@router.get("/users/{userId}/courses/{courseId}/graph")
def get_user_course_graph(user_id: str = Path(alias="userId"), course_id: str = Path(alias="courseId")):
    return success_response(mock_graph(course_id))


@router.put("/users/{userId}/nodes/{nodeId}/mastery")
def update_node_mastery(payload: MasteryUpdateRequest, user_id: str = Path(alias="userId"), node_id: str = Path(alias="nodeId")):
    node = GraphNode(
        id=node_id,
        label="数组",
        node_type=NodeType.concept,
        difficulty=DifficultyLevel.easy,
        mastery_status=payload.mastery_status,
        mastery_score=payload.mastery_score,
    )
    return success_response(node)
