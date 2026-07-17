from typing import Annotated, Literal

from pydantic import Field, StringConstraints

from app.schemas.common import ContractModel, CourseStatus, DifficultyLevel, MasteryStatus, NodeType


NodeContent = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class Course(ContractModel):
    id: str
    name: str
    code: str | None = None
    description: str | None = None
    target_major: str | None = None
    status: CourseStatus
    cover_url: str | None = None
    created_at: str
    updated_at: str


class CourseCreateRequest(ContractModel):
    name: str
    code: str | None = None
    description: str | None = None
    target_major: str | None = None
    cover_url: str | None = None


class CourseUpdateRequest(ContractModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    target_major: str | None = None
    status: CourseStatus | None = None
    cover_url: str | None = None


class Chapter(ContractModel):
    id: str
    course_id: str
    title: str
    order_index: int
    description: str | None = None
    content: str | None = None
    created_at: str
    updated_at: str


class ChapterCreateRequest(ContractModel):
    course_id: str
    title: str
    order_index: int
    description: str | None = None
    content: str | None = None


class KnowledgeNode(ContractModel):
    id: str
    course_id: str
    chapter_id: str | None = None
    name: str
    node_type: NodeType
    description: str | None = None
    content: NodeContent
    order_index: int
    difficulty: DifficultyLevel
    learning_value: float
    prerequisite_node_ids: list[str] = Field(default_factory=list)
    next_node_ids: list[str] = Field(default_factory=list)
    resource_ids: list[str] = Field(default_factory=list)
    common_mistakes: list[str] = Field(default_factory=list)
    recommended_practice_ids: list[str] = Field(default_factory=list)
    mastery_status: MasteryStatus | None = None
    mastery_score: float | None = None
    x: float | None = None
    y: float | None = None
    created_at: str
    updated_at: str


class KnowledgeNodeCreateRequest(ContractModel):
    course_id: str
    chapter_id: str | None = None
    name: str
    node_type: NodeType
    description: str | None = None
    content: NodeContent
    order_index: int
    difficulty: DifficultyLevel
    learning_value: float
    prerequisite_node_ids: list[str] | None = None
    next_node_ids: list[str] | None = None
    common_mistakes: list[str] | None = None
    recommended_practice_ids: list[str] | None = None


class KnowledgeRelation(ContractModel):
    id: str
    course_id: str
    source_node_id: str
    target_node_id: str
    relation_type: Literal["prerequisite", "related", "advanced", "contains"]
    weight: float
    created_at: str
    updated_at: str


class CourseContentAttribution(ContractModel):
    name: str
    url: str
    license: str


class CourseContentSection(ContractModel):
    node_id: str
    title: str
    order_index: int
    content: str


class CourseContentChapter(ContractModel):
    id: str
    title: str
    order_index: int
    content: str | None = None
    sections: list[CourseContentSection]


class CourseContent(ContractModel):
    course_id: str
    course_name: str
    attribution: CourseContentAttribution | None = None
    chapters: list[CourseContentChapter]
