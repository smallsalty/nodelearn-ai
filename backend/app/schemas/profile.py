from typing import Any, Literal

from pydantic import Field

from app.schemas.common import BehaviorType, CognitiveStyle, ContractModel, DifficultyLevel, PracticePreference, ResourceType


class StudentProfile(ContractModel):
    id: str
    user_id: str
    major: str | None = None
    grade: str | None = None
    current_course_id: str | None = None
    learning_goal: str | None = None
    knowledge_base_level: DifficultyLevel | None = None
    learning_progress: str | None = None
    weak_node_ids: list[str] = Field(default_factory=list)
    cognitive_style: CognitiveStyle
    practice_preference: PracticePreference
    resource_preference: list[ResourceType] = Field(default_factory=list)
    common_mistakes: list[str] = Field(default_factory=list)
    available_study_time: str | None = None
    profile_summary: str | None = None
    confidence_score: float
    last_updated_by: Literal["dialogue", "behavior", "practice", "manual"]
    created_at: str
    updated_at: str


class ProfileExtractRequest(ContractModel):
    user_id: str
    message: str
    history_messages: list[Any] | None = None


class ProfileExtractResult(ContractModel):
    extracted_fields: dict[str, Any]
    missing_fields: list[str]
    confidence_score: float
    follow_up_questions: list[str]


class ProfileUpdateByBehaviorRequest(ContractModel):
    user_id: str
    course_id: str | None = None
    node_id: str | None = None
    behavior_type: BehaviorType
    behavior_data: dict[str, Any]


class ProfileUpdateByPracticeRequest(ContractModel):
    user_id: str
    course_id: str
    question_id: str
    node_id: str | None = None
    is_correct: bool
    mistake_reason: str | None = None
