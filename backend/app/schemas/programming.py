from typing import Literal

from pydantic import Field

from app.schemas.common import ContractModel, DifficultyLevel

ProgrammingLanguage = Literal["cpp", "c", "python"]
JudgeVerdict = Literal["AC", "WA", "TLE", "PE", "CE", "RE", "system_error"]


class ProgrammingSampleCase(ContractModel):
    input: str
    output: str


class ProgrammingQuestion(ContractModel):
    id: str
    course_id: str
    node_id: str | None = None
    title: str
    content: str
    input_format: str
    output_format: str
    constraints: str
    sample_cases: list[ProgrammingSampleCase] = Field(default_factory=list)
    difficulty: DifficultyLevel
    tags: list[str] = Field(default_factory=list)
    time_limit_seconds: float = 2
    created_at: str
    updated_at: str


class ProgrammingGenerateRequest(ContractModel):
    user_id: str
    course_id: str
    node_id: str | None = None
    difficulty: DifficultyLevel | None = None
    count: int = 1


class ProgrammingSubmissionRequest(ContractModel):
    user_id: str
    question_id: str
    language: ProgrammingLanguage
    source_code: str
    duration_seconds: int | None = None


class ProgrammingJudgeResult(ContractModel):
    submission_id: str
    question_id: str
    language: ProgrammingLanguage
    verdict: JudgeVerdict
    stdout: str | None = None
    stderr: str | None = None
    compile_output: str | None = None
    time_seconds: float | None = None
    memory_kb: float | None = None
    failed_sample_index: int | None = None
    created_at: str
    updated_at: str
