from fastapi import APIRouter, Path, Query

from app.core.response import error_response, page_result, success_response
from app.schemas.programming import ProgrammingGenerateRequest, ProgrammingSubmissionRequest
from app.services.programming_service import default_programming_service

router = APIRouter()

@router.post("/programming/questions/generate")
async def generate_questions(payload: ProgrammingGenerateRequest): return success_response(await default_programming_service.generate_questions(payload))
@router.get("/programming/questions")
def list_questions(page: int = 1, page_size: int = Query(10, alias="pageSize")):
    values, total = default_programming_service.list_questions(page, page_size); return success_response(page_result(values, total, page, page_size))
@router.get("/programming/questions/{questionId}")
def get_question(question_id: str = Path(alias="questionId")):
    question = default_programming_service.get_question(question_id); return success_response(question) if question else error_response("programming question not found", code=404)
@router.post("/programming/submissions")
async def submit(payload: ProgrammingSubmissionRequest): return success_response(await default_programming_service.submit(payload))
@router.get("/users/{userId}/programming-submissions")
def list_submissions(user_id: str = Path(alias="userId")): return success_response(default_programming_service.list_submissions(user_id))
