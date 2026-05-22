from typing import Any, Literal

from pydantic import Field

from app.schemas.common import AgentType, AuditStatus, BehaviorType, ContractModel


class LearningRecord(ContractModel):
    id: str
    user_id: str
    course_id: str
    node_id: str | None = None
    resource_id: str | None = None
    behavior_type: BehaviorType
    duration_seconds: int | None = None
    extra_data: dict[str, Any] | None = None
    created_at: str


class LearningRecordCreateRequest(ContractModel):
    user_id: str
    course_id: str
    node_id: str | None = None
    resource_id: str | None = None
    behavior_type: BehaviorType
    duration_seconds: int | None = None
    extra_data: dict[str, Any] | None = None


class LearningEvaluation(ContractModel):
    user_id: str
    course_id: str
    completion_rate: float
    correct_rate: float
    weak_node_ids: list[str] = Field(default_factory=list)
    mastered_node_ids: list[str] = Field(default_factory=list)
    average_mastery_score: float
    progress_trend: list[float] = Field(default_factory=list)
    advice: str


class StudyReport(ContractModel):
    id: str
    user_id: str
    course_id: str
    title: str
    summary: str
    completion_rate: float
    correct_rate: float
    weak_node_summary: str
    improvement_advice: str
    chart_data: dict[str, Any] | None = None
    pdf_url: str | None = None
    created_at: str
    updated_at: str


class StudyReportGenerateRequest(ContractModel):
    user_id: str
    course_id: str
    start_date: str | None = None
    end_date: str | None = None
    include_chart: bool
    export_pdf: bool


class AuditResult(ContractModel):
    id: str
    target_type: Literal["message", "resource", "answer", "report"]
    target_id: str
    audit_status: AuditStatus
    risk_labels: list[str] = Field(default_factory=list)
    reason: str | None = None
    created_at: str


class AuditCheckRequest(ContractModel):
    target_type: Literal["message", "resource", "answer", "report"]
    target_id: str
    content: str
    user_id: str | None = None
    course_id: str | None = None


class ModelCallLog(ContractModel):
    id: str
    user_id: str | None = None
    agent_type: AgentType | None = None
    provider: str
    model_name: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    latency_ms: int | None = None
    success: bool
    error_message: str | None = None
    created_at: str
