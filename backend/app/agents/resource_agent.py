from app.agents.base_agent import BaseAgent
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType
from app.schemas.learning_path import LearningPath, LearningTask
from app.schemas.resource import ResourceGenerateRequest
from app.services.resource_service import ResourceService


class ResourceAgent(BaseAgent):
    agent_type = AgentType.resource_agent

    def __init__(self, resource_service: ResourceService | None = None) -> None:
        super().__init__()
        self.resource_service = resource_service or ResourceService(llm_service=self.llm_service)

    async def run(self, request: AgentRunRequest):
        profile = request.context.profile if request.context and request.context.profile else None
        learning_path = self._resolve_learning_path(request)
        learning_tasks = self._resolve_learning_tasks(request)
        profile_analysis = request.input.get("profileAnalysis", {})
        resource_types = request.input.get("resourceTypes", [])
        target_goal = request.input.get("targetGoal") or request.input.get("learningGoal")
        retrieved_documents = request.context.retrieved_documents if request.context else None

        plan = await self.resource_service.generate_resources(
            ResourceGenerateRequest(
                user_id=request.user_id,
                course_id=request.course_id or "course_ds_001",
                node_id=request.node_id or request.input.get("nodeId"),
                resource_types=resource_types,
                learning_goal=target_goal,
                custom_requirement=request.input.get("customRequirement"),
            ),
            profile=profile,
            profile_analysis=profile_analysis,
            learning_path=learning_path,
            learning_tasks=learning_tasks,
            retrieved_documents=retrieved_documents,
        )
        output = {
            "resourcePlan": plan.resource_plan,
            "resourceIds": plan.result.resource_ids,
            "recommendations": [self.to_contract_output(item) for item in plan.recommendations],
            "pushRecords": [self.to_contract_output(item) for item in plan.push_records],
            "nextAgentInput": {
                "forMultimodalAgent": {
                    "resourceIds": [
                        resource.id
                        for resource in plan.resources
                        if resource.resource_type in {"video_script", "animation_script"}
                    ]
                },
                "forPracticeAgent": {
                    "resourceIds": [
                        resource.id
                        for resource in plan.resources
                        if resource.resource_type == "practice_question"
                    ]
                },
            },
        }
        return self.build_result(request, output, status=plan.result.status)

    def _resolve_learning_path(self, request: AgentRunRequest) -> LearningPath | None:
        if request.context and request.context.learning_path:
            return request.context.learning_path
        payload = request.input.get("learningPath")
        return LearningPath(**payload) if isinstance(payload, dict) else None

    def _resolve_learning_tasks(self, request: AgentRunRequest) -> list[LearningTask] | None:
        payload = request.input.get("learningTasks")
        if not isinstance(payload, list):
            return None
        return [LearningTask(**item) for item in payload if isinstance(item, dict)]
