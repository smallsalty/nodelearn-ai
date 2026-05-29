import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.main import app

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
