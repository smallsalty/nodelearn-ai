from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import func, or_, select

from app.core.config import settings
from app.db.session import session_context
from app.models import ChatMessageModel, ChatSessionModel
from app.schemas.agent import ChatMessage, ChatSession
from app.schemas.common import AgentType
from app.schemas.resource import RetrievedDocument


def now_utc() -> datetime:
    return datetime.now(UTC)


def as_iso(value: datetime | str) -> str:
    return value.isoformat() if isinstance(value, datetime) else value


class ChatRepository:
    """Persist shared QA history for the full page and the learning sidebar."""

    def __init__(self) -> None:
        self._sessions: dict[str, ChatSession] = {}
        self._messages: dict[str, list[ChatMessage]] = {}

    def create_session(
        self,
        *,
        user_id: str,
        title: str,
        course_id: str | None = None,
        node_id: str | None = None,
        session_type: str = "qa",
    ) -> ChatSession:
        timestamp = now_utc()
        session_id = f"session_chat_{uuid4().hex[:12]}"
        if settings.enable_mock:
            result = ChatSession(
                id=session_id,
                user_id=user_id,
                course_id=course_id,
                node_id=node_id,
                title=title or "新的问答",
                session_type=session_type,
                created_at=timestamp.isoformat(),
                updated_at=timestamp.isoformat(),
            )
            self._sessions[result.id] = result
            self._messages[result.id] = []
            return result.model_copy(deep=True)

        with session_context() as session:
            model = ChatSessionModel(
                id=session_id,
                user_id=user_id,
                course_id=course_id,
                node_id=node_id,
                title=title or "新的问答",
                session_type=session_type,
                created_at=timestamp,
                updated_at=timestamp,
            )
            session.add(model)
            session.flush()
            return self._session_from_model(model)

    def list_sessions(
        self,
        *,
        page: int,
        page_size: int,
        user_id: str | None = None,
        keyword: str | None = None,
    ) -> tuple[list[ChatSession], int]:
        if settings.enable_mock:
            items = list(self._sessions.values())
            if user_id:
                items = [item for item in items if item.user_id == user_id]
            if keyword:
                normalized = keyword.strip().lower()
                items = [item for item in items if normalized in item.title.lower()]
            items.sort(key=lambda item: (item.updated_at, item.created_at), reverse=True)
            start = max(page - 1, 0) * page_size
            return [item.model_copy(deep=True) for item in items[start : start + page_size]], len(items)

        with session_context() as session:
            filters = []
            if user_id:
                filters.append(ChatSessionModel.user_id == user_id)
            if keyword:
                filters.append(ChatSessionModel.title.like(f"%{keyword.strip()}%"))
            query = select(ChatSessionModel)
            count_query = select(func.count()).select_from(ChatSessionModel)
            if filters:
                query = query.where(*filters)
                count_query = count_query.where(*filters)
            models = session.scalars(
                query.order_by(ChatSessionModel.updated_at.desc(), ChatSessionModel.created_at.desc())
                .offset(max(page - 1, 0) * page_size)
                .limit(page_size)
            ).all()
            total = session.scalar(count_query) or 0
            return [self._session_from_model(model) for model in models], total

    def get_session(self, session_id: str) -> ChatSession | None:
        if settings.enable_mock:
            result = self._sessions.get(session_id)
            return result.model_copy(deep=True) if result else None
        with session_context() as session:
            model = session.get(ChatSessionModel, session_id)
            return self._session_from_model(model) if model else None

    def find_latest_session(self, user_id: str, course_id: str | None = None) -> ChatSession | None:
        if settings.enable_mock:
            items, _ = self.list_sessions(page=1, page_size=100, user_id=user_id)
            items = [
                item
                for item in items
                if item.session_type == "qa" and (not course_id or item.course_id in {None, course_id})
            ]
            return items[0] if items else None
        with session_context() as session:
            query = select(ChatSessionModel).where(
                ChatSessionModel.user_id == user_id,
                ChatSessionModel.session_type == "qa",
            )
            if course_id:
                query = query.where(
                    or_(ChatSessionModel.course_id == course_id, ChatSessionModel.course_id.is_(None))
                )
            model = session.scalars(
                query.order_by(ChatSessionModel.updated_at.desc(), ChatSessionModel.created_at.desc()).limit(1)
            ).first()
            return self._session_from_model(model) if model else None

    def list_messages(self, session_id: str) -> list[ChatMessage]:
        if settings.enable_mock:
            return [item.model_copy(deep=True) for item in self._messages.get(session_id, [])]
        with session_context() as session:
            models = session.scalars(
                select(ChatMessageModel)
                .where(ChatMessageModel.session_id == session_id)
                .order_by(ChatMessageModel.created_at.asc(), ChatMessageModel.id.asc())
            ).all()
            return [self._message_from_model(model) for model in models]

    def save_exchange(
        self,
        *,
        session_id: str | None,
        user_id: str,
        course_id: str | None,
        node_id: str | None,
        question: str,
        answer: str,
        used_documents: list[RetrievedDocument],
    ) -> tuple[ChatSession, ChatMessage]:
        current = self.get_session(session_id) if session_id else self.find_latest_session(user_id, course_id)
        if current is None or current.user_id != user_id:
            current = self.create_session(
                user_id=user_id,
                course_id=course_id,
                node_id=node_id,
                title=self._title_from_question(question),
            )

        timestamp = now_utc()
        assistant_timestamp = timestamp + timedelta(microseconds=1)
        user_message = ChatMessage(
            id=f"message_chat_{uuid4().hex[:12]}",
            session_id=current.id,
            user_id=user_id,
            role="user",
            content=question,
            content_type="text",
            created_at=timestamp.isoformat(),
        )
        assistant_message = ChatMessage(
            id=f"message_chat_{uuid4().hex[:12]}",
            session_id=current.id,
            user_id=user_id,
            role="assistant",
            content=answer,
            content_type="markdown",
            agent_type=AgentType.qa_agent,
            used_documents=used_documents or None,
            created_at=assistant_timestamp.isoformat(),
        )

        if settings.enable_mock:
            self._messages.setdefault(current.id, []).extend([user_message, assistant_message])
            updated = current.model_copy(
                update={
                    "course_id": course_id or current.course_id,
                    "node_id": node_id or current.node_id,
                    "updated_at": assistant_timestamp.isoformat(),
                }
            )
            self._sessions[current.id] = updated
            return updated.model_copy(deep=True), assistant_message.model_copy(deep=True)

        with session_context() as session:
            model = session.get(ChatSessionModel, current.id)
            if model is None:
                raise RuntimeError("问答会话不存在")
            model.course_id = course_id or model.course_id
            model.node_id = node_id or model.node_id
            model.updated_at = assistant_timestamp
            session.add_all(
                [
                    ChatMessageModel(
                        id=user_message.id,
                        session_id=current.id,
                        user_id=user_id,
                        role=user_message.role,
                        content=user_message.content,
                        content_type=user_message.content_type,
                        used_documents=[],
                        created_at=timestamp,
                    ),
                    ChatMessageModel(
                        id=assistant_message.id,
                        session_id=current.id,
                        user_id=user_id,
                        role=assistant_message.role,
                        content=assistant_message.content,
                        content_type=assistant_message.content_type,
                        agent_type=AgentType.qa_agent.value,
                        used_documents=[document.model_dump(by_alias=True) for document in used_documents],
                        created_at=assistant_timestamp,
                    ),
                ]
            )
            session.flush()
            return self._session_from_model(model), assistant_message

    def _title_from_question(self, question: str) -> str:
        normalized = " ".join(question.split())
        return normalized[:28] + ("…" if len(normalized) > 28 else "")

    def _session_from_model(self, model: ChatSessionModel) -> ChatSession:
        return ChatSession(
            id=model.id,
            user_id=model.user_id,
            course_id=model.course_id,
            node_id=model.node_id,
            title=model.title,
            session_type=model.session_type,
            created_at=as_iso(model.created_at),
            updated_at=as_iso(model.updated_at),
        )

    def _message_from_model(self, model: ChatMessageModel) -> ChatMessage:
        return ChatMessage(
            id=model.id,
            session_id=model.session_id,
            user_id=model.user_id,
            role=model.role,
            content=model.content,
            content_type=model.content_type,
            agent_type=model.agent_type,
            audio_url=model.audio_url,
            video_url=model.video_url,
            provider_task_id=model.provider_task_id,
            used_documents=model.used_documents or None,
            created_at=as_iso(model.created_at),
        )


default_chat_repository = ChatRepository()
