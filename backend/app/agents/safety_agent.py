from app.agents.base_agent import BaseAgent
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType
from app.services.audit_service import AuditService


class SafetyAgent(BaseAgent):
    agent_type = AgentType.safety_agent

    def __init__(self, audit_service: AuditService | None = None) -> None:
        super().__init__()
        self.audit_service = audit_service or AuditService()

    async def run(self, request: AgentRunRequest):
        content = str(request.input.get("content", ""))
        target_id = str(request.input.get("targetId", "audit_target_mock"))
        target_type = str(request.input.get("targetType", "message"))
        audit_result = await self.audit_service.check_content(
            content=content,
            target_type=target_type,
            target_id=target_id,
        )
        return self.build_result(request, self.to_contract_output(audit_result))
