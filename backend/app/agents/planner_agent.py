from app.agents.base_agent import BaseAgent
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType
from app.schemas.learning_path import LearningPathGenerateRequest
from app.services.learning_path_service import LearningPathService


class PlannerAgent(BaseAgent):
    agent_type = AgentType.planner_agent

    def __init__(self, learning_path_service: LearningPathService | None = None) -> None:
        super().__init__()
        self.learning_path_service = learning_path_service or LearningPathService()

    async def run(self, request: AgentRunRequest):
        profile = request.context.profile if request.context and request.context.profile else None
        profile_analysis = request.input.get("profileAnalysis", {})
        weak_node_ids = request.input.get("weakNodeIds") or (profile.weak_node_ids if profile else None)
        target_goal = request.input.get("targetGoal") or profile_analysis.get("planningHints", {}).get("targetGoal")
        time_budget = request.input.get("timeBudget")
        if time_budget is None:
            suggested_minutes = profile_analysis.get("planningHints", {}).get("suggestedDailyTaskMinutes")
            if suggested_minutes:
                time_budget = f"每天{suggested_minutes}分钟"

        plan = await self.learning_path_service.generate_learning_path(
            LearningPathGenerateRequest(
                user_id=request.user_id,
                course_id=request.course_id or "course_ds_001",
                target_goal=target_goal,
                time_budget=time_budget,
                weak_node_ids=weak_node_ids,
                additional_requirements=request.input.get("additionalRequirements"),
            ),
            profile=profile,
        )
        output = {
            "learningPath": self.to_contract_output(plan.learning_path),
            "learningTasks": [self.to_contract_output(task) for task in plan.learning_tasks],
            "planningReason": plan.planning_reason,
            "nextAgentInput": plan.next_agent_input,
        }
        return self.build_result(request, output)
