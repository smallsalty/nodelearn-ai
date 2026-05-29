from typing import Any

from pydantic import BaseModel

from app.schemas.agent import AgentRunRequest, AgentRunResult
from app.schemas.common import AgentType, TaskStatus
from app.services.llm_service import LLMService


class BaseAgent:
    agent_type: AgentType

    def __init__(self, llm_service: LLMService | None = None) -> None:
        self.llm_service = llm_service or LLMService()

    async def run(self, request: AgentRunRequest) -> AgentRunResult:
        return self.build_result(request, self.mock_output(request))

    def mock_output(self, request: AgentRunRequest) -> dict[str, Any]:
        return {}

    def build_result(
        self,
        request: AgentRunRequest,
        output: dict[str, Any],
        status: TaskStatus = TaskStatus.success,
        error_message: str | None = None,
    ) -> AgentRunResult:
        agent_type = self.resolve_agent_type()
        return AgentRunResult(
            task_id=f"agent_task_{agent_type.value}_mock",
            agent_type=agent_type,
            status=status,
            output=output,
            error_message=error_message,
        )

    def resolve_agent_type(self) -> AgentType:
        if isinstance(self.agent_type, AgentType):
            return self.agent_type
        return AgentType(self.agent_type)

    def to_contract_output(self, value: BaseModel | dict[str, Any]) -> dict[str, Any]:
        if isinstance(value, BaseModel):
            return value.model_dump(by_alias=True)
        return value
