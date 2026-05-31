from app.core.config import settings
from app.repositories.learning_path_repository import DEMO_COURSE_ID, LearningPathRepository, default_learning_path_repository
from app.repositories.profile_repository import ProfileRepository, default_profile_repository
from app.schemas.agent import ChatRequest, ChatResult
from app.schemas.common import AgentType
from app.schemas.resource import RetrievedDocument
from app.services.llm_service import LLMService
from app.services.resource_service import ResourceService


class ChatService:
    """RAG question answering over imported Hello Algo source resources."""

    def __init__(
        self,
        resource_service: ResourceService | None = None,
        profile_repository: ProfileRepository | None = None,
        learning_path_repository: LearningPathRepository | None = None,
        llm_service: LLMService | None = None,
    ) -> None:
        self.resource_service = resource_service or ResourceService()
        self.profile_repository = profile_repository or default_profile_repository
        self.learning_path_repository = learning_path_repository or default_learning_path_repository
        self.llm_service = llm_service or LLMService()

    async def send(self, payload: ChatRequest) -> ChatResult:
        profile = self.profile_repository.get_by_user_id(payload.user_id)
        course_id = payload.course_id or profile.current_course_id or DEMO_COURSE_ID
        current_node = self.learning_path_repository.get_node(payload.node_id) if payload.node_id else None
        retrieved_documents: list[RetrievedDocument] = []
        used_agent_types: list[AgentType] = []

        if payload.use_rag:
            used_agent_types.append(AgentType.resource_agent)
            if not settings.enable_mock:
                retrieved_documents = self.resource_service.search_knowledge_base(
                    course_id=course_id,
                    query_text=payload.message,
                    node_id=current_node.id if current_node else payload.node_id,
                    top_k=3,
                )
                if not retrieved_documents:
                    raise RuntimeError("Hello Algo knowledge base returned no source documents")
        if payload.use_profile:
            used_agent_types.append(AgentType.profile_agent)

        prompt = self._build_prompt(payload, profile, current_node.name if current_node else None, retrieved_documents)
        answer = await self.llm_service.generate_text(prompt, mock_text="mock")
        return ChatResult(
            session_id=payload.session_id or ("session_demo_001" if settings.enable_mock else "session_deepseek_001"),
            message_id="message_demo_001" if settings.enable_mock else "message_deepseek_001",
            answer=answer,
            used_agent_types=used_agent_types,
            retrieved_documents=retrieved_documents or None,
        )

    def _build_prompt(self, payload: ChatRequest, profile, node_name: str | None, documents: list[RetrievedDocument]) -> str:
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
        sections.append(f"学生问题: {payload.message}")
        return "\n\n".join(sections)
