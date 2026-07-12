from pydantic import Field

from app.schemas.common import ContractModel, DifficultyLevel, MasteryStatus, NodeType


class GraphNode(ContractModel):
    id: str
    label: str
    node_type: NodeType
    difficulty: DifficultyLevel
    mastery_status: MasteryStatus
    mastery_score: float
    x: float | None = None
    y: float | None = None
    size: float | None = None
    selected: bool | None = None
    disabled: bool | None = None


class GraphEdge(ContractModel):
    id: str
    source: str
    target: str
    relation_type: str
    weight: float
    label: str | None = None


class KnowledgeGraph(ContractModel):
    course_id: str
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)


class GraphViewState(ContractModel):
    selected_node_id: str | None = None
    expanded_chapter_id: str | None = None
    zoom: float
    center_x: float
    center_y: float
    show_weak_only: bool
    show_completed_only: bool
