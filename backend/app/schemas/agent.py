from typing import Any, Literal

from pydantic import Field

from app.schemas.course import KnowledgeNode
from app.schemas.learning_path import LearningPath
from app.schemas.profile import StudentProfile
from app.schemas.report import LearningRecord
from app.schemas.resource import RetrievedDocument
from app.schemas.common import AgentType, ContractModel, TaskStatus


class ChatSession(ContractModel):
    id: str
    user_id: str
    course_id: str | None = None
    node_id: str | None = None
    title: str
    session_type: Literal["profile", "qa", "resource", "practice"]
    created_at: str
    updated_at: str


class ChatMessage(ContractModel):
    id: str
    session_id: str
    user_id: str
    role: Literal["user", "assistant", "system", "agent"]
    content: str
    content_type: Literal["text", "markdown", "json"]
    agent_type: AgentType | None = None
    created_at: str


class ChatRequest(ContractModel):
    user_id: str
    session_id: str | None = None
    course_id: str | None = None
    node_id: str | None = None
    message: str
    use_rag: bool
    use_profile: bool


class ChatResult(ContractModel):
    session_id: str
    message_id: str
    answer: str
    used_agent_types: list[AgentType] = Field(default_factory=list)
    retrieved_documents: list[Any] | None = None


class ChatStreamEvent(ContractModel):
    session_id: str
    event_type: Literal["start", "chunk", "agent_step", "done", "error"]
    content_chunk: str | None = None
    agent_type: AgentType | None = None
    error_message: str | None = None


class AgentContext(ContractModel):
    profile: StudentProfile | None = None
    current_node: KnowledgeNode | None = None
    learning_path: LearningPath | None = None
    recent_records: list[LearningRecord] | None = None
    retrieved_documents: list[RetrievedDocument] | None = None


class AgentRunRequest(ContractModel):
    user_id: str
    course_id: str | None = None
    node_id: str | None = None
    agent_type: AgentType
    input: dict[str, Any]
    context: AgentContext | None = None


class AgentRunResult(ContractModel):
    task_id: str
    agent_type: AgentType
    status: TaskStatus
    output: dict[str, Any]
    error_message: str | None = None


class MultiAgentWorkflowRequest(ContractModel):
    user_id: str
    course_id: str
    node_id: str | None = None
    workflow_type: Literal["profile_build", "path_plan", "resource_generate", "qa", "practice_review", "report_generate"]
    input: dict[str, Any]


class MultiAgentWorkflowResult(ContractModel):
    task_id: str
    workflow_type: str
    status: TaskStatus
    steps: list[AgentRunResult] = Field(default_factory=list)
    final_output: dict[str, Any]


class AgentTaskEvent(ContractModel):
    task_id: str
    agent_type: AgentType
    event_type: Literal["start", "thinking", "tool_call", "result", "error", "done"]
    message: str | None = None
    payload: dict[str, Any] | None = None
    created_at: str
