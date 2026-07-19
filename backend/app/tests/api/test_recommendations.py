import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.main import app
from app.repositories.resource_repository import ResourceRepository
from app.schemas.resource import GeneratedResource
from app.services.resource_service import ResourceService

RESOURCE_RECOMMENDATION_FIELDS = {
    "id",
    "userId",
    "courseId",
    "nodeId",
    "resourceId",
    "resourceType",
    "title",
    "reason",
    "score",
    "createdAt",
}
RESOURCE_PUSH_RECORD_FIELDS = {
    "id",
    "userId",
    "resourceId",
    "nodeId",
    "reason",
    "viewed",
    "viewedAt",
    "createdAt",
    "updatedAt",
}


def test_recommend_resources_returns_api_response_recommendation_list():
    client = TestClient(app)
    payload = client.post(
        "/api/v1/recommendations/resources",
        json={
            "userId": "user_api_recommendation_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "limit": 10,
        },
    ).json()

    assert set(payload.keys()) == {"code", "message", "data", "traceId", "timestamp"}
    assert payload["data"]
    assert all(set(item.keys()) == RESOURCE_RECOMMENDATION_FIELDS for item in payload["data"])
    assert "mind_map" in [item["resourceType"] for item in payload["data"]]
    assert "code_case" in [item["resourceType"] for item in payload["data"]]


def test_recommendation_read_viewed_and_push_record_routes():
    client = TestClient(app)
    recommendation = client.post(
        "/api/v1/recommendations/resources",
        json={
            "userId": "user_api_recommendation_002",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "limit": 3,
        },
    ).json()["data"][0]

    recommendations = client.get("/api/v1/users/user_api_recommendation_002/recommendations").json()["data"]
    viewed = client.post(f"/api/v1/recommendations/{recommendation['id']}/viewed").json()["data"]
    push_records = client.get("/api/v1/users/user_api_recommendation_002/push-records").json()["data"]

    assert any(item["id"] == recommendation["id"] for item in recommendations)
    assert viewed is True
    assert push_records
    assert all(set(item.keys()) == RESOURCE_PUSH_RECORD_FIELDS for item in push_records)
    assert any(item["viewed"] is True for item in push_records)


def test_failed_audit_resource_is_not_recommended():
    client = TestClient(app)
    generated = client.post(
        "/api/v1/resources/generate",
        json={
            "userId": "user_api_recommendation_failed_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "resourceTypes": ["lecture_doc"],
            "customRequirement": "明显异常内容",
        },
    ).json()["data"]
    failed_resource_id = generated["resourceIds"][0]

    recommendations = client.post(
        "/api/v1/recommendations/resources",
        json={
            "userId": "user_api_recommendation_failed_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
        },
    ).json()["data"]

    assert generated["status"] == "failed"
    assert all(item["resourceId"] != failed_resource_id for item in recommendations)


def build_knowledge_video(
    *,
    resource_id: str,
    user_id: str,
    status: str = "success",
    audit_status: str = "passed",
    file_url: str | None = "/storage/generated_resources/video/lesson.mp4",
    created_at: str = "2026-07-19T08:00:00Z",
) -> GeneratedResource:
    return GeneratedResource(
        id=resource_id,
        user_id=user_id,
        course_id="course_ds_001",
        node_id="node_stack_001",
        title="栈的视频讲解",
        resource_type="knowledge_video",
        content='{"schemaVersion":"2.0","scenes":[]}',
        file_url=file_url,
        status=status,
        audit_status=audit_status,
        created_at=created_at,
        updated_at=created_at,
    )


def test_existing_successful_knowledge_video_is_backfilled_idempotently():
    repository = ResourceRepository()
    service = ResourceService(repository=repository)
    resource = build_knowledge_video(
        resource_id="resource_knowledge_video_existing_001",
        user_id="user_knowledge_video_existing_001",
    )
    repository.save_resource(resource)

    first = service.list_user_recommendations(resource.user_id)
    second = service.list_user_recommendations(resource.user_id)
    push_records = service.list_push_records(resource.user_id)

    assert [item.resource_id for item in first] == [resource.id]
    assert [item.resource_id for item in second] == [resource.id]
    assert [item.resource_id for item in push_records] == [resource.id]


def test_unusable_knowledge_videos_are_excluded_from_recommendations():
    repository = ResourceRepository()
    service = ResourceService(repository=repository)
    user_id = "user_knowledge_video_excluded_001"
    repository.save_resource(
        build_knowledge_video(resource_id="video_failed", user_id=user_id, status="failed")
    )
    repository.save_resource(
        build_knowledge_video(resource_id="video_unchecked", user_id=user_id, audit_status="unchecked")
    )
    repository.save_resource(
        build_knowledge_video(resource_id="video_without_file", user_id=user_id, file_url=None)
    )

    assert service.list_user_recommendations(user_id) == []
    assert service.list_push_records(user_id) == []


def test_knowledge_video_recommendations_are_sorted_newest_first():
    repository = ResourceRepository()
    service = ResourceService(repository=repository)
    user_id = "user_knowledge_video_order_001"
    repository.save_resource(
        build_knowledge_video(
            resource_id="video_older",
            user_id=user_id,
            created_at="2026-07-18T08:00:00Z",
        )
    )
    repository.save_resource(
        build_knowledge_video(
            resource_id="video_newer",
            user_id=user_id,
            created_at="2026-07-19T08:00:00Z",
        )
    )

    recommendations = service.list_user_recommendations(user_id)

    assert [item.resource_id for item in recommendations] == ["video_newer", "video_older"]


def test_recommendation_reads_never_invoke_video_generation():
    class VideoGenerationMustNotRun:
        async def generate(self, **kwargs):
            raise AssertionError("recommendation reads must not generate videos")

    service = ResourceService(
        repository=ResourceRepository(),
        video_generation_service=VideoGenerationMustNotRun(),
    )

    assert service.list_user_recommendations("user_recommendation_read_only_001") == []
