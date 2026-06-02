from app.agents.base_agent import BaseAgent
from app.schemas.agent import AgentRunRequest, ChatRequest
from app.schemas.common import AgentType
from app.services.chat_service import ChatService


class QaAgent(BaseAgent):
    agent_type = AgentType.qa_agent

    def __init__(self, chat_service: ChatService | None = None) -> None:
        super().__init__()
        self.chat_service = chat_service or ChatService(llm_service=self.llm_service)

    async def run(self, request: AgentRunRequest):
        message = str(request.input.get("message") or "").strip()
        if not message:
            raise RuntimeError("qa_agent requires input.message")

        result = await self.chat_service.send(
            ChatRequest(
                user_id=request.user_id,
                session_id=request.input.get("sessionId"),
                course_id=request.course_id,
                node_id=request.node_id or request.input.get("nodeId"),
                message=message,
                use_rag=bool(request.input.get("useRag", True)),
                use_profile=bool(request.input.get("useProfile", True)),
            ),
            retrieved_documents=request.context.retrieved_documents if request.context else None,
        )
        return self.build_result(request, self.to_contract_output(result))
