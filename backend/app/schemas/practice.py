from pydantic import Field

from app.schemas.common import ContractModel, DifficultyLevel, QuestionType


class PracticeQuestion(ContractModel):
    id: str
    course_id: str
    node_id: str | None = None
    question_type: QuestionType
    title: str
    content: str
    options: list[str] | None = None
    answer: str
    explanation: str | None = None
    difficulty: DifficultyLevel
    tags: list[str] = Field(default_factory=list)
    created_at: str
    updated_at: str


class PracticeGenerateRequest(ContractModel):
    user_id: str
    course_id: str
    node_id: str | None = None
    question_types: list[QuestionType]
    difficulty: DifficultyLevel | None = None
    count: int


class PracticeSubmitRequest(ContractModel):
    user_id: str
    question_id: str
    user_answer: str
    duration_seconds: int | None = None


class PracticeRecord(ContractModel):
    id: str
    user_id: str
    question_id: str
    node_id: str | None = None
    user_answer: str
    correct_answer: str
    is_correct: bool
    score: float
    mistake_reason: str | None = None
    duration_seconds: int | None = None
    created_at: str
    updated_at: str
