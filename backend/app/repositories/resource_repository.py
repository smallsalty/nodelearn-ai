from uuid import uuid4

from app.core.config import settings
from app.schemas.common import TaskStatus, VideoGenerationStage
from app.schemas.resource import (
    GeneratedResource,
    ResourceGenerateResult,
    ResourcePushRecord,
    ResourceRecommendation,
    ResourceStreamEvent,
)
from app.schemas.common import ResourceType

DEMO_TIME = "2026-05-28T10:00:00Z"


class ResourceRepository:
    def __init__(self) -> None:
        self._resources: dict[str, GeneratedResource] = {}
        self._generation_results: dict[str, ResourceGenerateResult] = {}
        self._generation_events: dict[str, list[ResourceStreamEvent]] = {}
        self._recommendations: dict[str, ResourceRecommendation] = {}
        self._push_records: dict[str, ResourcePushRecord] = {}
        self._resource_counter = 0
        self._task_counter = 0
        self._recommendation_counter = 0
        self._push_counter = 0

    def next_task_id(self) -> str:
        self._task_counter += 1
        return f"resource_task_mock_{self._task_counter:03d}" if settings.enable_mock else f"resource_task_{uuid4().hex[:12]}"

    def next_resource_id(self, resource_type: str) -> str:
        self._resource_counter += 1
        return (
            f"resource_{resource_type}_mock_{self._resource_counter:03d}"
            if settings.enable_mock
            else f"resource_{resource_type}_{uuid4().hex[:12]}"
        )

    def next_recommendation_id(self) -> str:
        self._recommendation_counter += 1
        return (
            f"recommendation_mock_{self._recommendation_counter:03d}"
            if settings.enable_mock
            else f"recommendation_{uuid4().hex[:12]}"
        )

    def next_push_record_id(self) -> str:
        self._push_counter += 1
        return f"push_mock_{self._push_counter:03d}" if settings.enable_mock else f"push_{uuid4().hex[:12]}"

    def save_generation_result(self, result: ResourceGenerateResult) -> ResourceGenerateResult:
        self._generation_results[result.task_id] = result.model_copy(deep=True)
        return result.model_copy(deep=True)

    def get_generation_result(self, task_id: str) -> ResourceGenerateResult | None:
        result = self._generation_results.get(task_id)
        return result.model_copy(deep=True) if result else None

    def update_generation_result(
        self,
        task_id: str,
        *,
        resource_ids: list[str] | None = None,
        status: TaskStatus | str | None = None,
        progress: float | None = None,
        current_stage: VideoGenerationStage | str | None = None,
        error_message: str | None = None,
    ) -> ResourceGenerateResult:
        result = self.ensure_generation_result(task_id)
        updates: dict[str, object] = {}
        if resource_ids is not None:
            updates["resource_ids"] = resource_ids
        if status is not None:
            updates["status"] = status
        if progress is not None:
            updates["progress"] = max(0, min(100, progress))
        if current_stage is not None:
            updates["current_stage"] = current_stage
        if error_message is not None:
            updates["error_message"] = error_message
        return self.save_generation_result(result.model_copy(update=updates))

    def save_generation_event(self, event: ResourceStreamEvent) -> ResourceStreamEvent:
        events = self._generation_events.setdefault(event.task_id, [])
        events.append(event.model_copy(deep=True))
        return event.model_copy(deep=True)

    def add_generation_event(
        self,
        task_id: str,
        *,
        event_type: str,
        progress: float,
        stage: VideoGenerationStage | str | None = None,
        content_chunk: str | None = None,
        error_message: str | None = None,
    ) -> ResourceStreamEvent:
        return self.save_generation_event(
            ResourceStreamEvent(
                task_id=task_id,
                event_type=event_type,
                progress=max(0, min(100, progress)),
                stage=stage,
                content_chunk=content_chunk,
                error_message=error_message,
            )
        )

    def list_generation_events(self, task_id: str) -> list[ResourceStreamEvent]:
        return [event.model_copy(deep=True) for event in self._generation_events.get(task_id, [])]

    def save_resource(self, resource: GeneratedResource) -> GeneratedResource:
        self._resources[resource.id] = resource.model_copy(deep=True)
        return resource.model_copy(deep=True)

    def get_resource(self, resource_id: str) -> GeneratedResource | None:
        resource = self._resources.get(resource_id)
        return resource.model_copy(deep=True) if resource else None

    def list_user_resources(self, user_id: str) -> list[GeneratedResource]:
        return [
            resource.model_copy(deep=True)
            for resource in self._resources.values()
            if resource.user_id == user_id and resource.resource_type != ResourceType.practice_question
        ]

    def list_node_resources(self, node_id: str) -> list[GeneratedResource]:
        return [
            resource.model_copy(deep=True)
            for resource in self._resources.values()
            if resource.node_id == node_id and resource.resource_type != ResourceType.practice_question
        ]

    def delete_resource(self, resource_id: str) -> bool:
        existed = self._resources.pop(resource_id, None) is not None
        if existed:
            self._recommendations = {
                recommendation_id: recommendation
                for recommendation_id, recommendation in self._recommendations.items()
                if recommendation.resource_id != resource_id
            }
            self._push_records = {
                record_id: record
                for record_id, record in self._push_records.items()
                if record.resource_id != resource_id
            }
            for task_id, result in list(self._generation_results.items()):
                resource_ids = [item for item in result.resource_ids if item != resource_id]
                self._generation_results[task_id] = result.model_copy(update={"resource_ids": resource_ids})
        return existed

    def save_recommendation(self, recommendation: ResourceRecommendation) -> ResourceRecommendation:
        self._recommendations[recommendation.id] = recommendation.model_copy(deep=True)
        return recommendation.model_copy(deep=True)

    def list_recommendations(
        self,
        user_id: str,
        course_id: str | None = None,
        node_id: str | None = None,
        limit: int | None = None,
    ) -> list[ResourceRecommendation]:
        recommendations = [
            recommendation.model_copy(deep=True)
            for recommendation in self._recommendations.values()
            if recommendation.user_id == user_id
            and (course_id is None or recommendation.course_id == course_id)
            and (node_id is None or recommendation.node_id == node_id)
        ]
        recommendations.sort(key=lambda item: item.created_at, reverse=True)
        return recommendations[:limit] if limit else recommendations

    def get_recommendation(self, recommendation_id: str) -> ResourceRecommendation | None:
        recommendation = self._recommendations.get(recommendation_id)
        return recommendation.model_copy(deep=True) if recommendation else None

    def save_push_record(self, record: ResourcePushRecord) -> ResourcePushRecord:
        self._push_records[record.id] = record.model_copy(deep=True)
        return record.model_copy(deep=True)

    def list_push_records(self, user_id: str) -> list[ResourcePushRecord]:
        return [
            record.model_copy(deep=True)
            for record in self._push_records.values()
            if record.user_id == user_id
        ]

    def mark_recommendation_viewed(self, recommendation_id: str) -> bool:
        recommendation = self._recommendations.get(recommendation_id)
        if recommendation is None:
            return False
        for record_id, record in list(self._push_records.items()):
            if record.resource_id == recommendation.resource_id:
                self._push_records[record_id] = record.model_copy(
                    update={"viewed": True, "viewed_at": DEMO_TIME, "updated_at": DEMO_TIME}
                )
        return True

    def ensure_generation_result(self, task_id: str) -> ResourceGenerateResult:
        existing = self.get_generation_result(task_id)
        if existing is not None:
            return existing
        return self.save_generation_result(
            ResourceGenerateResult(
                task_id=task_id,
                resource_ids=[],
                status=TaskStatus.pending,
                progress=0,
                current_stage=VideoGenerationStage.queued,
            )
        )


default_resource_repository = ResourceRepository()
