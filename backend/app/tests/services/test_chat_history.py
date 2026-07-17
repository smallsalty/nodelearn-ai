import asyncio

import pytest

from app.repositories.chat_repository import ChatRepository
from app.repositories.learning_path_repository import LearningPathRepository
from app.repositories.profile_repository import ProfileRepository
from app.schemas.agent import ChatRequest
from app.services.chat_service import ChatService


class StubLlmService:
    def __init__(self) -> None:
        self.calls: list[str] = []

    async def generate_text(self, prompt: str, mock_text: str = "") -> str:
        self.calls.append(prompt)
        return f"这是第{len(self.calls)}次真实形态的课程回答。"


def run(coro):
    return asyncio.run(coro)


def test_page_and_sidebar_questions_reuse_session_and_persist_unique_history():
    repository = ChatRepository()
    llm_service = StubLlmService()
    service = ChatService(
        chat_repository=repository,
        learning_path_repository=LearningPathRepository(),
        profile_repository=ProfileRepository(),
        llm_service=llm_service,
    )

    first = run(
        service.send(
            ChatRequest(
                user_id="user_chat_history_001",
                course_id="course_ds_001",
                message="请解释栈的后进先出。",
                use_rag=False,
                use_profile=False,
            )
        )
    )
    second = run(
        service.send(
            ChatRequest(
                user_id="user_chat_history_001",
                session_id=first.session_id,
                course_id="course_ds_001",
                message="再给我一道自检题。",
                use_rag=False,
                use_profile=False,
            )
        )
    )

    history = service.list_messages(first.session_id)
    assert first.session_id == second.session_id
    assert [message.role for message in history] == ["user", "assistant", "user", "assistant"]
    assert len({message.id for message in history}) == 4
    assert history[-1].content == "这是第2次真实形态的课程回答。"
    assert "最近问答历史" in llm_service.calls[1]


def test_chat_history_rejects_a_session_owned_by_another_user_before_model_call():
    repository = ChatRepository()
    llm_service = StubLlmService()
    service = ChatService(
        chat_repository=repository,
        learning_path_repository=LearningPathRepository(),
        profile_repository=ProfileRepository(),
        llm_service=llm_service,
    )
    first = run(
        service.send(
            ChatRequest(
                user_id="user_chat_owner_001",
                course_id="course_ds_001",
                message="请解释栈。",
                use_rag=False,
                use_profile=False,
            )
        )
    )

    with pytest.raises(RuntimeError, match="无权访问"):
        run(
            service.send(
                ChatRequest(
                    user_id="user_chat_other_001",
                    session_id=first.session_id,
                    course_id="course_ds_001",
                    message="读取另一个用户的历史。",
                    use_rag=False,
                    use_profile=False,
                )
            )
        )

    assert len(llm_service.calls) == 1
