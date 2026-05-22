from fastapi import APIRouter, Path, Query

from app.core.response import page_result, success_response
from app.schemas.common import DifficultyLevel, QuestionType
from app.schemas.practice import PracticeGenerateRequest, PracticeQuestion, PracticeRecord, PracticeSubmitRequest

router = APIRouter()

MOCK_TIME = "2026-05-19T10:00:00Z"


def mock_question(question_id: str = "question_demo_001") -> PracticeQuestion:
    return PracticeQuestion(
        id=question_id,
        course_id="course_ds_001",
        node_id="node_array_001",
        question_type=QuestionType.single_choice,
        title="Mock Question",
        content="mock",
        options=[],
        answer="mock",
        difficulty=DifficultyLevel.easy,
        tags=[],
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


@router.post("/practices/generate")
def generate_practices(payload: PracticeGenerateRequest):
    return success_response([mock_question()])


@router.get("/practices/questions")
def list_questions(page: int = 1, page_size: int = Query(10, alias="pageSize"), keyword: str | None = None, sort_by: str | None = Query(None, alias="sortBy"), sort_order: str | None = Query(None, alias="sortOrder")):
    items = [mock_question()]
    return success_response(page_result(items, len(items), page, page_size))


@router.get("/practices/questions/{questionId}")
def get_question(question_id: str = Path(alias="questionId")):
    return success_response(mock_question(question_id))


@router.post("/practices/submit")
def submit_practice(payload: PracticeSubmitRequest):
    record = PracticeRecord(
        id="practice_record_demo_001",
        user_id=payload.user_id,
        question_id=payload.question_id,
        node_id="node_array_001",
        user_answer=payload.user_answer,
        correct_answer="mock",
        is_correct=False,
        score=0,
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )
    return success_response(record)


@router.get("/users/{userId}/practice-records")
def list_practice_records(user_id: str = Path(alias="userId")):
    return success_response([])


@router.get("/users/{userId}/wrong-questions")
def list_wrong_questions(user_id: str = Path(alias="userId")):
    return success_response([mock_question()])


@router.delete("/users/{userId}/wrong-questions/{questionId}")
def remove_wrong_question(user_id: str = Path(alias="userId"), question_id: str = Path(alias="questionId")):
    return success_response(True)
