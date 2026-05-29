import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.main import app

RESOURCE_GENERATE_RESULT_FIELDS = {"taskId", "resourceIds", "status"}
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


def test_generate_mind_map_resource_can_be_read_back():
    client = TestClient(app)
    generated = client.post(
        "/api/v1/resources/generate",
        json={
            "userId": "user_api_multimodal_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "resourceTypes": ["mind_map"],
        },
    ).json()["data"]
    detail = client.get(f"/api/v1/resources/{generated['resourceIds'][0]}").json()["data"]

    assert set(generated.keys()) == RESOURCE_GENERATE_RESULT_FIELDS
    assert generated["status"] == "success"
    assert set(detail.keys()) == GENERATED_RESOURCE_FIELDS
    assert detail["resourceType"] == "mind_map"
    assert detail["content"].startswith("mindmap")
    assert "链表" in detail["content"]
    assert detail["auditStatus"] == "passed"
    assert detail["status"] == "success"


def test_node_generated_resources_include_multimodal_resource():
    client = TestClient(app)
    generated = client.post(
        "/api/v1/resources/generate",
        json={
            "userId": "user_api_multimodal_002",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "resourceTypes": ["video_script"],
        },
    ).json()["data"]
    node_resources = client.get("/api/v1/nodes/node_linked_list_001/generated-resources").json()["data"]

    resource = next(item for item in node_resources if item["id"] == generated["resourceIds"][0])

    assert resource["resourceType"] == "video_script"
    assert "# 视频标题" in resource["content"]
    assert "## 分镜脚本" in resource["content"]


def test_audit_check_marks_abnormal_multimodal_content_need_review():
    client = TestClient(app)
    payload = client.post(
        "/api/v1/audit/check",
        json={
            "targetType": "resource",
            "targetId": "resource_multimodal_audit_001",
            "content": "明显异常内容",
            "userId": "user_api_multimodal_003",
            "courseId": "course_ds_001",
        },
    ).json()

    assert payload["data"]["auditStatus"] == "need_review"


def test_failed_audit_multimodal_resource_is_not_success():
    client = TestClient(app)
    generated = client.post(
        "/api/v1/resources/generate",
        json={
            "userId": "user_api_multimodal_failed_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "resourceTypes": ["lecture_doc"],
            "customRequirement": "明显异常内容",
        },
    ).json()["data"]
    detail = client.get(f"/api/v1/resources/{generated['resourceIds'][0]}").json()["data"]

    assert generated["status"] == "failed"
    assert detail["status"] == "failed"
    assert detail["auditStatus"] == "need_review"
