import asyncio

import pytest

from app.core.config import settings
from app.repositories.learning_path_repository import LearningPathRepository, demo_knowledge_nodes
from app.repositories.practice_repository import PracticeRepository
from app.schemas.practice import PracticeGenerateRequest
from app.schemas.resource import RetrievedDocument
from app.services.practice_service import PracticeService


def run(coro):
    return asyncio.run(coro)


def document() -> RetrievedDocument:
    return RetrievedDocument(
        id="source_stack_001",
        source_id="hello_algo_stack",
        title="栈",
        content="栈遵循后进先出原则。入栈操作将元素加入栈顶，出栈操作移除栈顶元素。",
        score=1,
    )


def generated_question(question_type: str, *, difficulty: str = "medium") -> dict:
    return {
        "questionType": question_type,
        "title": f"{question_type} 标题",
        "content": f"{question_type} 完整题干",
        "options": ["A. 栈顶", "B. 栈底"] if question_type == "single_choice" else None,
        "answer": "A" if question_type == "single_choice" else "完整答案",
        "explanation": "完整解析",
        "difficulty": difficulty,
        "tags": ["栈", question_type],
    }


class StubLlmService:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    async def generate_json(self, *args, **kwargs) -> dict:
        return self.payload


class StubLearningPathRepository(LearningPathRepository):
    def get_node(self, node_id: str):
        return next(node for node in demo_knowledge_nodes() if node.id == node_id)


def request() -> PracticeGenerateRequest:
    return PracticeGenerateRequest(
        user_id="user_real_practice_001",
        course_id="course_ds_001",
        node_id="node_stack_001",
        question_types=["single_choice", "short_answer", "coding"],
        difficulty="medium",
        count=3,
    )


def service(payload: dict) -> PracticeService:
    return PracticeService(
        repository=PracticeRepository(),
        learning_path_repository=StubLearningPathRepository(),
        llm_service=StubLlmService(payload),
    )


def test_real_practice_generation_parses_complete_rag_questions(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "enable_mock", False)
    payload = {
        "questions": [
            generated_question("single_choice"),
            generated_question("short_answer"),
            generated_question("coding"),
        ]
    }

    questions = run(service(payload).generate_questions(request(), retrieved_documents=[document()]))

    assert [question.question_type for question in questions] == ["single_choice", "short_answer", "coding"]
    assert all(question.explanation == "完整解析" for question in questions)


def test_real_practice_generation_rejects_wrong_question_count(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "enable_mock", False)
    payload = {"questions": [generated_question("single_choice")]}

    with pytest.raises(RuntimeError, match="count mismatch"):
        run(service(payload).generate_questions(request(), retrieved_documents=[document()]))


def test_real_practice_generation_rejects_missing_required_field(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "enable_mock", False)
    questions = [
        generated_question("single_choice"),
        generated_question("short_answer"),
        generated_question("coding"),
    ]
    questions[1].pop("explanation")

    with pytest.raises(RuntimeError, match="missing explanation"):
        run(service({"questions": questions}).generate_questions(request(), retrieved_documents=[document()]))
