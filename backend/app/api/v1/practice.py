from fastapi import APIRouter, Path, Query

from app.core.response import page_result, success_response
from app.schemas.practice import PracticeGenerateRequest, PracticeSubmitRequest
from app.services.practice_service import PracticeService

router = APIRouter()
practice_service = PracticeService()


@router.post("/practices/generate")
async def generate_practices(payload: PracticeGenerateRequest):
    return success_response(await practice_service.generate_questions(payload))


@router.get("/practices/questions")
def list_questions(
    page: int = 1,
    page_size: int = Query(10, alias="pageSize"),
    keyword: str | None = None,
    sort_by: str | None = Query(None, alias="sortBy"),
    sort_order: str | None = Query(None, alias="sortOrder"),
):
    items, total = practice_service.list_questions(page=page, page_size=page_size, keyword=keyword)
    return success_response(page_result(items, total, page, page_size))


@router.get("/practices/questions/{questionId}")
def get_question(question_id: str = Path(alias="questionId")):
    return success_response(practice_service.get_question(question_id))


@router.post("/practices/submit")
async def submit_practice(payload: PracticeSubmitRequest):
    result = await practice_service.submit_answer(payload)
    return success_response(result.practice_record)


@router.get("/users/{userId}/practice-records")
def list_practice_records(user_id: str = Path(alias="userId")):
    return success_response(practice_service.list_practice_records(user_id))


@router.get("/users/{userId}/wrong-questions")
def list_wrong_questions(user_id: str = Path(alias="userId")):
    return success_response(practice_service.list_wrong_questions(user_id))


@router.delete("/users/{userId}/wrong-questions/{questionId}")
def remove_wrong_question(user_id: str = Path(alias="userId"), question_id: str = Path(alias="questionId")):
    return success_response(practice_service.remove_wrong_question(user_id, question_id))
