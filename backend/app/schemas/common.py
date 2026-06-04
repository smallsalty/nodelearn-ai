from enum import Enum
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class ContractModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, use_enum_values=True)


T = TypeVar("T")


class ApiResponse(ContractModel, Generic[T]):
    code: int
    message: str
    data: T
    trace_id: str
    timestamp: str


class PageRequest(ContractModel):
    page: int = 1
    page_size: int = 10
    keyword: str | None = None
    sort_by: str | None = None
    sort_order: Literal["asc", "desc"] | None = None


class PageResult(ContractModel, Generic[T]):
    list: list[T]
    total: int
    page: int
    page_size: int


class BaseEntity(ContractModel):
    id: str
    created_at: str
    updated_at: str
    deleted_at: str | None = None
    version: int | None = None


class UserRole(str, Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"


class UserStatus(str, Enum):
    active = "active"
    disabled = "disabled"
    pending = "pending"


class CourseStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class NodeType(str, Enum):
    concept = "concept"
    algorithm = "algorithm"
    syntax = "syntax"
    question_type = "question_type"
    experiment = "experiment"
    project = "project"
    summary = "summary"


class DifficultyLevel(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"
    challenge = "challenge"


class MasteryStatus(str, Enum):
    not_started = "not_started"
    learning = "learning"
    weak = "weak"
    basic = "basic"
    mastered = "mastered"


class ResourceType(str, Enum):
    lecture_doc = "lecture_doc"
    mind_map = "mind_map"
    practice_question = "practice_question"
    reading_material = "reading_material"
    code_case = "code_case"
    video_script = "video_script"
    animation_script = "animation_script"
    project_task = "project_task"
    summary_note = "summary_note"


class AgentType(str, Enum):
    profile_agent = "profile_agent"
    planner_agent = "planner_agent"
    qa_agent = "qa_agent"
    resource_agent = "resource_agent"
    practice_agent = "practice_agent"
    multimodal_agent = "multimodal_agent"
    recommendation_agent = "recommendation_agent"
    safety_agent = "safety_agent"
    knowledge_graph_agent = "knowledge_graph_agent"
    note_agent = "note_agent"
    report_agent = "report_agent"


class TaskStatus(str, Enum):
    pending = "pending"
    running = "running"
    success = "success"
    failed = "failed"
    cancelled = "cancelled"


class QuestionType(str, Enum):
    single_choice = "single_choice"
    multiple_choice = "multiple_choice"
    blank = "blank"
    short_answer = "short_answer"
    coding = "coding"
    case_analysis = "case_analysis"


class CognitiveStyle(str, Enum):
    text = "text"
    diagram = "diagram"
    example = "example"
    code = "code"
    mixed = "mixed"


class PracticePreference(str, Enum):
    choice = "choice"
    coding = "coding"
    case = "case"
    mixed = "mixed"


class AuditStatus(str, Enum):
    unchecked = "unchecked"
    passed = "passed"
    rejected = "rejected"
    need_review = "need_review"


class BehaviorType(str, Enum):
    view_resource = "view_resource"
    finish_resource = "finish_resource"
    answer_question = "answer_question"
    ask_question = "ask_question"
    create_note = "create_note"
    review_wrong_question = "review_wrong_question"


class RefreshTokenRequest(ContractModel):
    refresh_token: str


class MasteryUpdateRequest(ContractModel):
    mastery_score: float
    mastery_status: MasteryStatus


class EmbedRequest(ContractModel):
    text: str
    course_id: str | None = None


class PinNoteRequest(ContractModel):
    pinned: bool


class NoteRelationRequest(ContractModel):
    relation_type: str
    relation_id: str


class HealthCheckResult(ContractModel):
    status: Literal["ok", "error"]
    database: Literal["ok", "error"]
    redis: Literal["ok", "error"] | None = None
    vector_store: Literal["ok", "error"] | None = None
    graph_db: Literal["ok", "error"] | None = None
    llm_service: Literal["ok", "error"] | None = None


class SystemConfig(ContractModel):
    app_name: str
    app_version: str
    enable_mock: bool
    enable_stream_output: bool
    enable_safety_audit: bool


class VersionResult(ContractModel):
    version: str


JsonObject = dict[str, Any]
