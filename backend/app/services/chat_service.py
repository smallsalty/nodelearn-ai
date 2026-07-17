from app.core.config import settings
from app.repositories.chat_repository import ChatRepository, default_chat_repository
from app.repositories.learning_path_repository import DEMO_COURSE_ID, LearningPathRepository, default_learning_path_repository
from app.repositories.profile_repository import ProfileRepository, default_profile_repository
from app.schemas.agent import ChatRequest, ChatResult
from app.schemas.common import AgentType
from app.schemas.resource import RetrievedDocument
from app.services.llm_service import LLMService
from app.services.audit_service import AuditService
from app.schemas.common import AuditStatus
from app.services.resource_service import ResourceService


class ChatService:
    """RAG question answering over imported Hello Algo source resources."""

    def __init__(
        self,
        resource_service: ResourceService | None = None,
        profile_repository: ProfileRepository | None = None,
        learning_path_repository: LearningPathRepository | None = None,
        chat_repository: ChatRepository | None = None,
        llm_service: LLMService | None = None,
        audit_service: AuditService | None = None,
    ) -> None:
        self.resource_service = resource_service or ResourceService()
        self.profile_repository = profile_repository or default_profile_repository
        self.learning_path_repository = learning_path_repository or default_learning_path_repository
        self.chat_repository = chat_repository or default_chat_repository
        self.llm_service = llm_service or LLMService()
        self.audit_service = audit_service or AuditService()

    async def send(
        self,
        payload: ChatRequest,
        retrieved_documents: list[RetrievedDocument] | None = None,
    ) -> ChatResult:
        profile = self.profile_repository.get_by_user_id(payload.user_id)
        course_id = payload.course_id or profile.current_course_id or DEMO_COURSE_ID
        current_node = self.learning_path_repository.get_node(payload.node_id) if payload.node_id else None
        documents = list(retrieved_documents or [])
        used_agent_types: list[AgentType] = [AgentType.qa_agent]

        if payload.use_rag:
            used_agent_types.append(AgentType.resource_agent)
            if not settings.enable_mock and not documents:
                documents = self.resource_service.search_knowledge_base(
                    course_id=course_id,
                    query_text=payload.message,
                    node_id=current_node.id if current_node else payload.node_id,
                    top_k=3,
                )
                if not documents:
                    raise RuntimeError("Hello Algo knowledge base returned no source documents")
        if payload.use_profile:
            used_agent_types.append(AgentType.profile_agent)

        history = []
        if payload.session_id:
            requested_session = self.chat_repository.get_session(payload.session_id)
            if requested_session is None:
                raise RuntimeError("问答会话不存在")
            if requested_session.user_id != payload.user_id:
                raise RuntimeError("无权访问该问答会话")
            history = self.chat_repository.list_messages(payload.session_id)
        prompt = self._build_prompt(payload, profile, current_node.name if current_node else None, documents, history[-6:])
        answer = await self.llm_service.generate_text(prompt, mock_text="这是演示模式下的课程问答。")
        audit = await self.audit_service.check_content(answer, target_type="message", target_id="chat_answer_pending")
        if audit.audit_status != AuditStatus.passed:
            raise RuntimeError("问答内容未通过安全校验")
        chat_session, assistant_message = self.chat_repository.save_exchange(
            session_id=payload.session_id,
            user_id=payload.user_id,
            course_id=course_id,
            node_id=current_node.id if current_node else payload.node_id,
            question=payload.message,
            answer=answer,
            used_documents=documents,
        )
        return ChatResult(
            session_id=chat_session.id,
            message_id=assistant_message.id,
            answer=answer,
            used_agent_types=used_agent_types,
            retrieved_documents=documents or None,
        )

    def _build_prompt(self, payload: ChatRequest, profile, node_name: str | None, documents: list[RetrievedDocument], history) -> str:
        sections = [
            "你是 NodeLearn AI 的学习助手。请严格优先依据给定的 Hello 算法参考材料回答，内容清晰、简洁、可执行。",
            f"courseId: {payload.course_id or profile.current_course_id or DEMO_COURSE_ID}",
            f"node: {node_name or payload.node_id or '未指定'}",
        ]
        if payload.use_profile:
            sections.append(f"学生画像摘要: {profile.profile_summary or '暂无'}")
            sections.append(f"薄弱节点: {','.join(profile.weak_node_ids) or '暂无'}")
        if documents:
            sections.append("Hello 算法参考材料:")
            for index, document in enumerate(documents, start=1):
                sections.append(f"[{index}] {document.title}\n{document.content[:1600]}")
        if history:
            sections.append("最近问答历史:")
            for message in history:
                role = "学生" if message.role == "user" else "助手"
                sections.append(f"{role}: {message.content[:600]}")
        sections.append(f"学生问题: {payload.message}")
        return "\n\n".join(sections)

    def create_session(self, payload: dict):
        return self.chat_repository.create_session(
            user_id=payload.get("userId") or payload.get("user_id") or "user_demo_001",
            course_id=payload.get("courseId") or payload.get("course_id"),
            node_id=payload.get("nodeId") or payload.get("node_id"),
            title=payload.get("title") or "新的问答",
            session_type=payload.get("sessionType") or payload.get("session_type") or "qa",
        )

    def list_sessions(self, *, page: int, page_size: int, user_id: str | None, keyword: str | None):
        return self.chat_repository.list_sessions(page=page, page_size=page_size, user_id=user_id, keyword=keyword)

    def get_session(self, session_id: str):
        return self.chat_repository.get_session(session_id)

    def list_messages(self, session_id: str):
        return self.chat_repository.list_messages(session_id)
