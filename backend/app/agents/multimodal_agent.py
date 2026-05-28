from app.agents.base_agent import BaseAgent
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType, CognitiveStyle, PracticePreference, ResourceType
from app.schemas.resource import ResourceGenerateRequest
from app.services.resource_service import ResourceService


ALLOWED_MULTIMODAL_TYPES = {
    ResourceType.mind_map,
    ResourceType.video_script,
    ResourceType.animation_script,
    ResourceType.code_case,
    ResourceType.summary_note,
    ResourceType.lecture_doc,
}


class MultimodalAgent(BaseAgent):
    agent_type = AgentType.multimodal_agent

    def __init__(self, resource_service: ResourceService | None = None) -> None:
        super().__init__()
        self.resource_service = resource_service or ResourceService(llm_service=self.llm_service)

    async def run(self, request: AgentRunRequest):
        profile = request.context.profile if request.context and request.context.profile else None
        if profile is None:
            profile = self.resource_service.profile_repository.get_by_user_id(request.user_id)
        current_node = request.context.current_node if request.context and request.context.current_node else None
        retrieved_documents = request.context.retrieved_documents if request.context else None
        resource_types = self._resource_types(request, profile)

        plan = await self.resource_service.generate_resources(
            ResourceGenerateRequest(
                user_id=request.user_id,
                course_id=request.course_id or profile.current_course_id or "course_ds_001",
                node_id=request.node_id or request.input.get("nodeId") or (current_node.id if current_node else None),
                resource_types=resource_types,
                learning_goal=request.input.get("targetGoal") or request.input.get("learningGoal") or profile.learning_goal,
                custom_requirement=request.input.get("customRequirement"),
            ),
            profile=profile,
            profile_analysis=request.input.get("profileAnalysis", {}),
            retrieved_documents=retrieved_documents,
        )
        output = {
            "resourceIds": plan.result.resource_ids,
            "generatedResources": [self.to_contract_output(resource) for resource in plan.resources],
            "renderHints": {
                "mindMapRenderer": "mermaid",
                "contentType": "markdown",
            },
        }
        return self.build_result(request, output, status=plan.result.status)

    def _resource_types(self, request: AgentRunRequest, profile) -> list[ResourceType]:
        requested = self._parse_requested_types(request.input.get("resourceTypes") or [])
        if requested:
            return requested

        selected: list[ResourceType] = []
        profile_analysis = request.input.get("profileAnalysis", {})
        resource_hints = profile_analysis.get("resourceHints", {})
        if profile.cognitive_style == CognitiveStyle.diagram or resource_hints.get("preferDiagram"):
            selected.extend([ResourceType.mind_map, ResourceType.animation_script])
        if profile.cognitive_style == CognitiveStyle.code or profile.practice_preference == PracticePreference.coding:
            selected.append(ResourceType.code_case)
        for resource_type in profile.resource_preference:
            try:
                parsed_type = ResourceType(resource_type)
            except ValueError:
                continue
            if parsed_type in ALLOWED_MULTIMODAL_TYPES:
                selected.append(parsed_type)
        if not selected:
            selected.append(ResourceType.summary_note)
        return self._unique(selected)

    def _parse_requested_types(self, values: list[str]) -> list[ResourceType]:
        parsed: list[ResourceType] = []
        for value in values:
            try:
                resource_type = ResourceType(value)
            except ValueError:
                continue
            if resource_type in ALLOWED_MULTIMODAL_TYPES:
                parsed.append(resource_type)
        return self._unique(parsed)

    def _unique(self, values: list[ResourceType]) -> list[ResourceType]:
        result: list[ResourceType] = []
        for value in values:
            if value not in result:
                result.append(value)
        return result
