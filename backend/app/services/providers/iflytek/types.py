from typing import Any

from app.schemas.common import ContractModel, TaskStatus
from app.schemas.resource import RetrievedDocument


class IflytekProviderResult(ContractModel):
    provider: str = "iflytek"
    provider_task_id: str | None = None
    status: TaskStatus
    text: str | None = None
    audio_url: str | None = None
    video_url: str | None = None
    file_url: str | None = None
    error_message: str | None = None
    raw_payload: dict[str, Any] | None = None


class IflytekDigitalHumanRequest(ContractModel):
    user_id: str
    course_id: str
    node_id: str | None = None
    title: str
    script: str
    avatar_id: str | None = None
    voice_id: str | None = None
    callback_url: str | None = None


class IflytekChatRequest(ContractModel):
    user_id: str
    course_id: str | None = None
    node_id: str | None = None
    message: str
    profile_summary: str | None = None
    documents: list[RetrievedDocument] | None = None
    avatar_id: str | None = None
    voice_id: str | None = None
