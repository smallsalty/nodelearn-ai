import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.main import app

RESOURCE_GENERATE_RESULT_FIELDS = {"taskId", "resourceIds", "status", "progress", "currentStage", "errorMessage"}
GENERATED_RESOURCE_FIELDS = {
    "id",
    "userId",
    "courseId",
    "nodeId",
    "title",
    "resourceType",
    "content",
    "fileUrl",
    "prompt",
    "modelName",
    "status",
    "auditStatus",
    "createdAt",
    "updatedAt",
}


def test_generate_resource_returns_api_response_resource_generate_result():
    client = TestClient(app)
    payload = client.post(
        "/api/v1/resources/generate",
        json={
            "userId": "user_api_resource_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "resourceTypes": [],
            "learningGoal": "准备数据结构期末考试",
        },
    ).json()

    assert set(payload.keys()) == {"code", "message", "data", "traceId", "timestamp"}
    assert set(payload["data"].keys()) == RESOURCE_GENERATE_RESULT_FIELDS
    assert payload["data"]["status"] == "success"
    assert payload["data"]["resourceIds"]


def test_resource_read_routes_return_generated_resource_with_audit_status():
    client = TestClient(app)
    generated = client.post(
        "/api/v1/resources/generate",
        json={
            "userId": "user_api_resource_002",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "resourceTypes": ["mind_map", "code_case"],
            "learningGoal": "准备数据结构期末考试",
        },
    ).json()["data"]
    resource_id = generated["resourceIds"][0]

    task = client.get(f"/api/v1/resources/generation-tasks/{generated['taskId']}").json()["data"]
    detail = client.get(f"/api/v1/resources/{resource_id}").json()["data"]
    user_resources = client.get("/api/v1/users/user_api_resource_002/resources").json()["data"]
    node_resources = client.get("/api/v1/nodes/node_linked_list_001/generated-resources").json()["data"]

    assert task == generated
    assert set(detail.keys()) == GENERATED_RESOURCE_FIELDS
    assert detail["auditStatus"] == "passed"
    assert any(item["id"] == resource_id for item in user_resources["list"])
    assert any(item["id"] == resource_id for item in node_resources)


def test_delete_generated_resource_returns_boolean():
    client = TestClient(app)
    generated = client.post(
        "/api/v1/resources/generate",
        json={
            "userId": "user_api_resource_003",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "resourceTypes": ["summary_note"],
        },
    ).json()["data"]

    deleted = client.delete(f"/api/v1/resources/{generated['resourceIds'][0]}").json()["data"]

    assert deleted is True


def test_audit_check_route_returns_audit_result():
    client = TestClient(app)
    payload = client.post(
        "/api/v1/audit/check",
        json={
            "targetType": "resource",
            "targetId": "resource_audit_api_001",
            "content": "明显异常内容",
            "userId": "user_api_resource_004",
            "courseId": "course_ds_001",
        },
    ).json()

    assert payload["data"]["auditStatus"] == "need_review"
