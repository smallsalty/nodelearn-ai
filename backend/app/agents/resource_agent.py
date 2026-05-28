from app.agents.base_agent import BaseAgent
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType, AuditStatus, ResourceType, TaskStatus
from app.schemas.resource import GeneratedResource

MOCK_TIME = "2026-05-19T10:00:00Z"


class ResourceAgent(BaseAgent):
    agent_type = AgentType.resource_agent

    def mock_output(self, request: AgentRunRequest) -> dict:
        resource = GeneratedResource(
            id="resource_mock_001",
            user_id=request.user_id,
            course_id=request.course_id or "course_ds_001",
            node_id=request.node_id,
            title="数据结构讲解文档",
            resource_type=ResourceType.lecture_doc,
            content="mock resource content",
            file_url=None,
            prompt="mock resource prompt",
            model_name=self.llm_service.model_name,
            status=TaskStatus.pending,
            audit_status=AuditStatus.unchecked,
            created_at=MOCK_TIME,
            updated_at=MOCK_TIME,
        )
        return self.to_contract_output(resource)
