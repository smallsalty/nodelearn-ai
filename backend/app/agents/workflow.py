from typing import Any
from uuid import uuid4

from app.core.config import settings
from app.repositories.learning_path_repository import default_learning_path_repository
from app.repositories.profile_repository import default_profile_repository
from app.schemas.agent import (
    AgentContext,
    AgentRunRequest,
    AgentRunResult,
    AgentTaskEvent,
    MultiAgentWorkflowRequest,
    MultiAgentWorkflowResult,
)
from app.schemas.common import AgentType, QuestionType, ResourceType, TaskStatus
from app.schemas.learning_path import LearningPath
from app.services.resource_service import ResourceService

MOCK_TIME = "2026-05-19T10:00:00Z"
DEFAULT_DEMO_NODE_ID = "node_linked_list_001"

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
    def __init__(self, agent_service=None) -> None:
        if agent_service is None:
            from app.services.agent_service import AgentService

            agent_service = AgentService()
        self.agent_service = agent_service
        self.profile_repository = default_profile_repository
        self.learning_path_repository = default_learning_path_repository
        self.resource_service = ResourceService(
            profile_repository=self.profile_repository,
            learning_path_repository=self.learning_path_repository,
        )

    async def run(self, request: MultiAgentWorkflowRequest) -> MultiAgentWorkflowResult:
        task_id = (
            f"workflow_task_{request.workflow_type}_mock"
            if settings.enable_mock
            else f"workflow_task_{request.workflow_type}_{uuid4().hex[:12]}"
        )
        events: list[AgentTaskEvent] = []
        steps: list[AgentRunResult]
        final_output: dict[str, Any]

        if request.workflow_type == "profile_build":
            steps, final_output = await self._run_profile_build(request, task_id, events)
        elif request.workflow_type == "path_plan":
            steps, final_output = await self._run_path_plan(request, task_id, events)
        elif request.workflow_type == "resource_generate":
            steps, final_output = await self._run_resource_generate(request, task_id, events)
        elif request.workflow_type == "practice_review":
            steps, final_output = await self._run_practice_review(request, task_id, events)
        elif request.workflow_type == "qa":
            steps, final_output = await self._run_qa(request, task_id, events)
        elif request.workflow_type == "report_generate":
            steps, final_output = await self._run_report_generate(request, task_id, events)
        else:  # pragma: no cover - guarded by MultiAgentWorkflowRequest literal contract
            steps, final_output = [], {}

        status = TaskStatus.success if steps and all(step.status == TaskStatus.success for step in steps) else TaskStatus.failed
        result = MultiAgentWorkflowResult(
            task_id=task_id,
            workflow_type=request.workflow_type,
            status=status,
            steps=steps,
            final_output=final_output,
        )
        record_task_result(result, events)
        return result

    async def _run_profile_build(
        self,
        request: MultiAgentWorkflowRequest,
        task_id: str,
        events: list[AgentTaskEvent],
    ) -> tuple[list[AgentRunResult], dict[str, Any]]:
        profile = self.profile_repository.get_by_user_id(request.user_id)
        profile_step = await self._run_step(
            request,
            task_id,
            events,
            AgentType.profile_agent,
            input_payload={"message": request.input.get("message")} if request.input.get("message") else {},
            context=AgentContext(profile=profile),
        )
        profile = self.profile_repository.get_by_user_id(request.user_id)
        profile_analysis = profile_step.output.get("profileAnalysis", {})
        final_output = {
            "profile": profile_step.output.get("profile", {}),
            "profileAnalysis": profile_analysis,
            "demoSummary": self._profile_demo_summary(profile_analysis, profile.weak_node_ids),
        }
        return [profile_step], final_output

    async def _run_path_plan(
        self,
        request: MultiAgentWorkflowRequest,
        task_id: str,
        events: list[AgentTaskEvent],
    ) -> tuple[list[AgentRunResult], dict[str, Any]]:
        profile, profile_step, profile_analysis = await self._profile_step(request, task_id, events)
        planner_step = await self._planner_step(request, task_id, events, profile, profile_analysis)
        final_output = {
            "profileAnalysis": profile_analysis,
            "learningPath": planner_step.output.get("learningPath", {}),
            "learningTasks": planner_step.output.get("learningTasks", []),
            "planningReason": planner_step.output.get("planningReason", ""),
        }
        return [profile_step, planner_step], final_output

    async def _run_resource_generate(
        self,
        request: MultiAgentWorkflowRequest,
        task_id: str,
        events: list[AgentTaskEvent],
    ) -> tuple[list[AgentRunResult], dict[str, Any]]:
        profile, profile_step, profile_analysis = await self._profile_step(request, task_id, events)
        planner_step = await self._planner_step(request, task_id, events, profile, profile_analysis)
        learning_path_payload = planner_step.output.get("learningPath", {})
        learning_tasks = planner_step.output.get("learningTasks", [])
        node_id = request.node_id or learning_path_payload.get("currentNodeId") or DEFAULT_DEMO_NODE_ID
        learning_path = LearningPath(**learning_path_payload) if learning_path_payload else None
        current_node = self.learning_path_repository.get_node(node_id)
        node_id = current_node.id if current_node else node_id
        retrieved_documents = []
        if not settings.enable_mock:
            retrieved_documents = self.resource_service.search_knowledge_base(
                course_id=request.course_id,
                query_text=request.input.get("message") or request.input.get("targetGoal") or (current_node.name if current_node else ""),
                node_id=node_id,
                top_k=3,
            )
            if not retrieved_documents:
                raise RuntimeError("Hello Algo knowledge base returned no source documents")
        context = AgentContext(
            profile=profile,
            current_node=current_node,
            learning_path=learning_path,
            retrieved_documents=retrieved_documents or None,
        )

        resource_step = await self._run_step(
            request,
            task_id,
            events,
            AgentType.resource_agent,
            input_payload={
                "profileAnalysis": profile_analysis,
                "learningPath": learning_path_payload,
                "learningTasks": learning_tasks,
                "resourceTypes": request.input.get("resourceTypes")
                or [
                    ResourceType.lecture_doc.value,
                    ResourceType.mind_map.value,
                    ResourceType.practice_question.value,
                    ResourceType.code_case.value,
                ],
                "targetGoal": request.input.get("targetGoal") or profile.learning_goal,
                "customRequirement": request.input.get("customRequirement"),
            },
            context=context,
            node_id=node_id,
        )
        multimodal_step = await self._run_step(
            request,
            task_id,
            events,
            AgentType.multimodal_agent,
            input_payload={
                "profileAnalysis": profile_analysis,
                "resourceTypes": request.input.get("multimodalResourceTypes")
                or [ResourceType.mind_map.value, ResourceType.animation_script.value],
                "targetGoal": request.input.get("targetGoal") or profile.learning_goal,
                "customRequirement": request.input.get("customRequirement"),
            },
            context=context,
            node_id=node_id,
        )
        generated_resources = multimodal_step.output.get("generatedResources", [])
        safety_step = await self._run_step(
            request,
            task_id,
            events,
            AgentType.safety_agent,
            input_payload={
                "targetType": "resource",
                "targetId": generated_resources[0]["id"] if generated_resources else "workflow_resource_summary",
                "content": self._resource_content_summary(generated_resources),
            },
            node_id=node_id,
        )
        final_output = {
            "learningPath": learning_path_payload,
            "learningTasks": learning_tasks,
            "resourceAgentOutput": resource_step.output,
            "multimodalAgentOutput": multimodal_step.output,
            "safetyAudit": safety_step.output,
            "generatedResources": generated_resources,
            "recommendations": resource_step.output.get("recommendations", []),
            "retrievedDocuments": [document.model_dump(by_alias=True) for document in retrieved_documents],
        }
        return [profile_step, planner_step, resource_step, multimodal_step, safety_step], final_output

    async def _run_practice_review(
        self,
        request: MultiAgentWorkflowRequest,
        task_id: str,
        events: list[AgentTaskEvent],
    ) -> tuple[list[AgentRunResult], dict[str, Any]]:
        profile, profile_step, profile_analysis = await self._profile_step(request, task_id, events)
        node_id = request.node_id or (profile.weak_node_ids[0] if profile.weak_node_ids else DEFAULT_DEMO_NODE_ID)
        generate_step = await self._run_step(
            request,
            task_id,
            events,
            AgentType.practice_agent,
            input_payload={
                "questionTypes": request.input.get(
                    "questionTypes",
                    [QuestionType.single_choice.value, QuestionType.short_answer.value, QuestionType.coding.value],
                ),
                "count": request.input.get("count", 3),
                "difficulty": request.input.get("difficulty"),
            },
            context=AgentContext(profile=profile),
            node_id=node_id,
        )
        questions = generate_step.output.get("questions", [])
        submit_step = await self._run_step(
            request,
            task_id,
            events,
            AgentType.practice_agent,
            input_payload={
                "questionId": questions[0]["id"] if questions else "practice_question_missing",
                "userAnswer": request.input.get("mockUserAnswer", "B"),
                "durationSeconds": request.input.get("durationSeconds", 30),
            },
            context=AgentContext(profile=profile),
            node_id=node_id,
        )
        updated_profile = self.profile_repository.get_by_user_id(request.user_id)
        updated_profile_step = await self._run_step(
            request,
            task_id,
            events,
            AgentType.profile_agent,
            input_payload={"message": request.input.get("message")} if request.input.get("message") else {},
            context=AgentContext(profile=updated_profile),
        )
        final_output = {
            "questions": questions,
            "practiceRecord": submit_step.output.get("practiceRecord", {}),
            "masteryUpdate": submit_step.output.get("masteryUpdate", {}),
            "profileUpdate": submit_step.output.get("profileUpdate", {}),
            "updatedProfileAnalysis": updated_profile_step.output.get("profileAnalysis", {}),
        }
        return [profile_step, generate_step, submit_step, updated_profile_step], final_output

    async def _run_qa(
        self,
        request: MultiAgentWorkflowRequest,
        task_id: str,
        events: list[AgentTaskEvent],
    ) -> tuple[list[AgentRunResult], dict[str, Any]]:
        profile = self.profile_repository.get_by_user_id(request.user_id)
        node_id = request.node_id or DEFAULT_DEMO_NODE_ID
        current_node = self.learning_path_repository.get_node(node_id)
        step = await self._run_step(
            request,
            task_id,
            events,
            AgentType.multimodal_agent,
            input_payload=request.input,
            context=AgentContext(profile=profile, current_node=current_node),
            node_id=node_id,
        )
        return [step], step.output

    async def _run_report_generate(
        self,
        request: MultiAgentWorkflowRequest,
        task_id: str,
        events: list[AgentTaskEvent],
    ) -> tuple[list[AgentRunResult], dict[str, Any]]:
        step = await self._run_step(
            request,
            task_id,
            events,
            AgentType.safety_agent,
            input_payload={
                "content": request.input.get("content", "workflow report content"),
                "targetId": request.input.get("targetId", "workflow_report_mock"),
                "targetType": request.input.get("targetType", "report"),
            },
        )
        return [step], step.output

    async def _profile_step(
        self,
        request: MultiAgentWorkflowRequest,
        task_id: str,
        events: list[AgentTaskEvent],
    ):
        profile = self.profile_repository.get_by_user_id(request.user_id)
        profile_step = await self._run_step(
            request,
            task_id,
            events,
            AgentType.profile_agent,
            input_payload={"message": request.input.get("message")} if request.input.get("message") else {},
            context=AgentContext(profile=profile),
        )
        profile = self.profile_repository.get_by_user_id(request.user_id)
        return profile, profile_step, profile_step.output.get("profileAnalysis", {})

    async def _planner_step(
        self,
        request: MultiAgentWorkflowRequest,
        task_id: str,
        events: list[AgentTaskEvent],
        profile,
        profile_analysis: dict[str, Any],
    ) -> AgentRunResult:
        planning_hints = profile_analysis.get("planningHints", {})
        suggested_minutes = planning_hints.get("suggestedDailyTaskMinutes")
        time_budget = request.input.get("timeBudget") or profile.available_study_time
        if time_budget is None and suggested_minutes:
            time_budget = f"daily {suggested_minutes} minutes"
        return await self._run_step(
            request,
            task_id,
            events,
            AgentType.planner_agent,
            input_payload={
                "profileAnalysis": profile_analysis,
                "weakNodeIds": request.input.get("weakNodeIds") or profile.weak_node_ids,
                "targetGoal": request.input.get("targetGoal") or planning_hints.get("targetGoal") or profile.learning_goal,
                "timeBudget": time_budget,
            },
            context=AgentContext(profile=profile),
        )

    async def _run_step(
        self,
        request: MultiAgentWorkflowRequest,
        task_id: str,
        events: list[AgentTaskEvent],
        agent_type: AgentType,
        input_payload: dict[str, Any],
        context: AgentContext | None = None,
        node_id: str | None = None,
    ) -> AgentRunResult:
        events.append(
            AgentTaskEvent(
                task_id=task_id,
                agent_type=agent_type,
                event_type="start",
                message=None,
                payload={"input": input_payload},
                created_at=MOCK_TIME,
            )
        )
        step = await self.agent_service.run_agent(
            AgentRunRequest(
                user_id=request.user_id,
                course_id=request.course_id,
                node_id=node_id if node_id is not None else request.node_id,
                agent_type=agent_type,
                input=input_payload,
                context=context,
            )
        )
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
        return step

    def _profile_demo_summary(self, profile_analysis: dict[str, Any], weak_node_ids: list[str]) -> dict[str, Any]:
        return {
            "learningStage": profile_analysis.get("learningStage"),
            "weakNodeIds": weak_node_ids,
            "preferredResourceTypes": profile_analysis.get("preferredResourceTypes", []),
            "suggestedDailyTaskMinutes": profile_analysis.get("planningHints", {}).get("suggestedDailyTaskMinutes"),
        }

    def _resource_content_summary(self, generated_resources: list[dict[str, Any]]) -> str:
        contents = [str(resource.get("content", ""))[:300] for resource in generated_resources if resource.get("content")]
        return "\n\n".join(contents) if contents else "workflow resource content"
