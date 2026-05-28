from app.schemas.agent import AgentRunRequest, AgentRunResult, AgentTaskEvent, MultiAgentWorkflowRequest, MultiAgentWorkflowResult
from app.schemas.common import AgentType, TaskStatus

MOCK_TIME = "2026-05-19T10:00:00Z"

_TASK_RESULTS: dict[str, MultiAgentWorkflowResult] = {}
_TASK_EVENTS: dict[str, list[AgentTaskEvent]] = {}


def record_task_result(result: MultiAgentWorkflowResult, events: list[AgentTaskEvent] | None = None) -> None:
    _TASK_RESULTS[result.task_id] = result
    _TASK_EVENTS[result.task_id] = events or []


def record_single_agent_result(result: AgentRunResult) -> None:
    workflow_result = MultiAgentWorkflowResult(
        task_id=result.task_id,
        workflow_type="qa",
        status=result.status,
        steps=[result],
        final_output=result.output,
    )
    events = [
        AgentTaskEvent(
            task_id=result.task_id,
            agent_type=result.agent_type,
            event_type="done" if result.status == TaskStatus.success else "error",
            message=result.error_message,
            payload=result.output,
            created_at=MOCK_TIME,
        )
    ]
    record_task_result(workflow_result, events)


def get_task_result(task_id: str) -> MultiAgentWorkflowResult | None:
    return _TASK_RESULTS.get(task_id)


def get_task_events(task_id: str) -> list[AgentTaskEvent]:
    return _TASK_EVENTS.get(task_id, [])


class MultiAgentWorkflowRunner:
    workflow_agents: dict[str, list[AgentType]] = {
        "profile_build": [AgentType.profile_agent],
        "path_plan": [AgentType.planner_agent],
        "resource_generate": [AgentType.resource_agent],
        "qa": [AgentType.multimodal_agent],
        "practice_review": [AgentType.practice_agent],
        "report_generate": [AgentType.safety_agent],
    }

    def __init__(self, agent_service=None) -> None:
        if agent_service is None:
            from app.services.agent_service import AgentService

            agent_service = AgentService()
        self.agent_service = agent_service

    async def run(self, request: MultiAgentWorkflowRequest) -> MultiAgentWorkflowResult:
        task_id = f"workflow_task_{request.workflow_type}_mock"
        steps: list[AgentRunResult] = []
        events: list[AgentTaskEvent] = []

        for agent_type in self.workflow_agents.get(request.workflow_type, []):
            events.append(
                AgentTaskEvent(
                    task_id=task_id,
                    agent_type=agent_type,
                    event_type="start",
                    message=None,
                    payload=None,
                    created_at=MOCK_TIME,
                )
            )
            step = await self.agent_service.run_agent(
                AgentRunRequest(
                    user_id=request.user_id,
                    course_id=request.course_id,
                    node_id=request.node_id,
                    agent_type=agent_type,
                    input=request.input,
                )
            )
            steps.append(step)
            events.append(
                AgentTaskEvent(
                    task_id=task_id,
                    agent_type=agent_type,
                    event_type="done" if step.status == TaskStatus.success else "error",
                    message=step.error_message,
                    payload=step.output,
                    created_at=MOCK_TIME,
                )
            )

        status = TaskStatus.success if steps and all(step.status == TaskStatus.success for step in steps) else TaskStatus.failed
        result = MultiAgentWorkflowResult(
            task_id=task_id,
            workflow_type=request.workflow_type,
            status=status,
            steps=steps,
            final_output=steps[-1].output if steps else {},
        )
        record_task_result(result, events)
        return result
