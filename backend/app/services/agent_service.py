from app.agents.base_agent import BaseAgent
from app.agents.multimodal_agent import MultimodalAgent
from app.agents.planner_agent import PlannerAgent
from app.agents.practice_agent import PracticeAgent
from app.agents.profile_agent import ProfileAgent
from app.agents.programming_agent import ProgrammingAgent
from app.agents.qa_agent import QaAgent
from app.agents.resource_agent import ResourceAgent
from app.agents.safety_agent import SafetyAgent
from app.agents.workflow import record_single_agent_result
from app.schemas.agent import AgentRunRequest, AgentRunResult
from app.schemas.common import AgentType, TaskStatus


class AgentService:
    def __init__(self, agents: dict[AgentType, BaseAgent] | None = None) -> None:
        self.agents = agents or {
            AgentType.profile_agent: ProfileAgent(),
            AgentType.planner_agent: PlannerAgent(),
            AgentType.qa_agent: QaAgent(),
            AgentType.resource_agent: ResourceAgent(),
            AgentType.practice_agent: PracticeAgent(),
            AgentType.multimodal_agent: MultimodalAgent(),
            AgentType.safety_agent: SafetyAgent(),
            AgentType.programming_agent: ProgrammingAgent(),
        }

    async def run_agent(self, request: AgentRunRequest) -> AgentRunResult:
        agent_type = AgentType(request.agent_type)
        agent = self.agents.get(agent_type)
        if agent is None:
            result = AgentRunResult(
                task_id=f"agent_task_{agent_type.value}_failed",
                agent_type=agent_type,
                status=TaskStatus.failed,
                output={},
                error_message=f"unsupported agentType: {agent_type.value}",
            )
            record_single_agent_result(result)
            return result

        try:
            result = await agent.run(request)
        except Exception as exc:  # pragma: no cover - defensive boundary for future agents
            result = AgentRunResult(
                task_id=f"agent_task_{agent_type.value}_failed",
                agent_type=agent_type,
                status=TaskStatus.failed,
                output={},
                error_message=str(exc),
            )

        record_single_agent_result(result)
        return result
