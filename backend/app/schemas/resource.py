from typing import Any, Literal

from pydantic import Field

from app.schemas.common import AuditStatus, ContractModel, DifficultyLevel, ResourceType, TaskStatus


class UploadedFile(ContractModel):
    id: str
    user_id: str
    course_id: str | None = None
    filename: str
    file_type: str
    file_size: int
    file_url: str
    parse_status: TaskStatus
    created_at: str
    updated_at: str


class KnowledgeBuildTask(ContractModel):
    id: str
    course_id: str
    file_ids: list[str] = Field(default_factory=list)
    status: TaskStatus
    progress: float
    error_message: str | None = None
    created_at: str
    updated_at: str


class KnowledgeBuildRequest(ContractModel):
    course_id: str
    file_ids: list[str]
    build_mode: Literal["append", "rebuild"]


class KnowledgeSearchRequest(ContractModel):
    course_id: str
    query: str
    node_id: str | None = None
    top_k: int | None = None


class RetrievedDocument(ContractModel):
    id: str
    source_id: str
    title: str
    content: str
    score: float
    metadata: dict[str, Any] | None = None


class GeneratedResource(ContractModel):
    id: str
    user_id: str
    course_id: str
    node_id: str | None = None
    title: str
    resource_type: ResourceType
    content: str
    file_url: str | None = None
    prompt: str | None = None
    model_name: str | None = None
    status: TaskStatus
    audit_status: AuditStatus
    created_at: str
    updated_at: str


class ResourceGenerateRequest(ContractModel):
    user_id: str
    course_id: str
    node_id: str | None = None
    resource_types: list[ResourceType]
    difficulty: DifficultyLevel | None = None
    learning_goal: str | None = None
    custom_requirement: str | None = None


class ResourceGenerateResult(ContractModel):
    task_id: str
    resource_ids: list[str]
    status: TaskStatus


class ResourceStreamEvent(ContractModel):
    task_id: str
    event_type: Literal["start", "progress", "chunk", "done", "error"]
    progress: float
    content_chunk: str | None = None
    error_message: str | None = None


class ResourceRecommendation(ContractModel):
    id: str
    user_id: str
    course_id: str
    node_id: str | None = None
    resource_id: str
    resource_type: ResourceType
    title: str
    reason: str
    score: float
    created_at: str


class ResourcePushRecord(ContractModel):
    id: str
    user_id: str
    resource_id: str
    node_id: str | None = None
    reason: str
    viewed: bool
    viewed_at: str | None = None
    created_at: str
    updated_at: str


class RecommendationRequest(ContractModel):
    user_id: str
    course_id: str
    node_id: str | None = None
    limit: int | None = None
