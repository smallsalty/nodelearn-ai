from typing import Any, Literal

from pydantic import Field

from app.schemas.agent import ChatMessage
from app.schemas.common import ContractModel, DifficultyLevel, TaskStatus
from app.schemas.resource import RetrievedDocument


class MultimodalVideoGenerateRequest(ContractModel):
    user_id: str
    course_id: str
    node_id: str
    title: str | None = None
    learning_goal: str | None = None
    difficulty: DifficultyLevel | None = None
    duration_seconds: int | None = Field(default=None, ge=30, le=1200)
    style: str | None = None
    use_digital_human: bool | None = False
    use_rag: bool = True
    custom_requirement: str | None = None


class MultimodalTaskResult(ContractModel):
    task_id: str
    status: TaskStatus
    progress: float
    current_step: str | None = None
    resource_id: str | None = None
    file_url: str | None = None
    video_url: str | None = None
    script: str | None = None
    storyboard: list[dict[str, Any]] | None = None
    subtitle_text: str | None = None
    error_message: str | None = None
    created_at: str
    updated_at: str


class MultimodalTaskEvent(ContractModel):
    task_id: str
    event_type: Literal["start", "progress", "step", "done", "error"]
    step_name: str
    progress: float
    message: str
    payload: dict[str, Any] | None = None
    created_at: str


class MultimodalStreamEvent(ContractModel):
    task_id: str
    event_type: Literal["start", "progress", "step", "done", "error"]
    progress: float
    step_name: str | None = None
    message: str | None = None
    error_message: str | None = None


class DigitalHumanExplainRequest(ContractModel):
    user_id: str
    course_id: str
    node_id: str
    avatar_id: str | None = None
    voice_id: str | None = None
    use_rag: bool = True
    custom_requirement: str | None = None


class DigitalHumanExplainResult(ContractModel):
    task_id: str
    status: TaskStatus
    resource_id: str | None = None
    video_url: str | None = None
    script: str | None = None
    progress: float


class DigitalHumanChatRequest(ContractModel):
    user_id: str
    course_id: str | None = None
    node_id: str | None = None
    session_id: str | None = None
    message: str
    avatar_id: str | None = None
    voice_id: str | None = None
    use_rag: bool = True
    use_profile: bool = True


class DigitalHumanChatResult(ContractModel):
    session_id: str
    message_id: str
    answer: str
    audio_url: str | None = None
    video_url: str | None = None
    provider_task_id: str | None = None
    used_documents: list[RetrievedDocument] | None = None
    status: TaskStatus


class DigitalHumanCallbackRequest(ContractModel):
    task_id: str
    provider_task_id: str | None = None
    status: TaskStatus
    file_url: str | None = None
    video_url: str | None = None
    error_message: str | None = None
    token: str | None = None
    payload: dict[str, Any] | None = None


class DigitalHumanMessagesResult(ContractModel):
    messages: list[ChatMessage]
