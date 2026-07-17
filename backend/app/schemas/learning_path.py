from typing import Literal

from pydantic import Field

from app.schemas.common import ContractModel, TaskStatus


class LearningPath(ContractModel):
    id: str
    user_id: str
    course_id: str
    title: str
    description: str | None = None
    current_stage: str
    target_goal: str
    path_node_ids: list[str] = Field(default_factory=list)
    current_node_id: str | None = None
    status: TaskStatus
    created_at: str
    updated_at: str


class LearningTask(ContractModel):
    id: str
    path_id: str
    user_id: str
    course_id: str
    node_id: str
    title: str
    task_type: Literal["learn", "practice", "review", "project"]
    resource_ids: list[str] = Field(default_factory=list)
    order_index: int
    status: TaskStatus
    due_at: str | None = None
    completed_at: str | None = None
    created_at: str
    updated_at: str


class LearningPathGenerateRequest(ContractModel):
    user_id: str
    course_id: str
    target_goal: str | None = None
    time_budget: str | None = None
    weak_node_ids: list[str] | None = None
    additional_requirements: str | None = None


class LearningTaskStatusUpdateRequest(ContractModel):
    status: TaskStatus
    completed_at: str | None = None
