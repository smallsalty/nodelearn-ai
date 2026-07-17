import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.main import app

LEARNING_PATH_FIELDS = {
    "id",
    "userId",
    "courseId",
    "title",
    "description",
    "currentStage",
    "targetGoal",
    "pathNodeIds",
    "currentNodeId",
    "status",
    "createdAt",
    "updatedAt",
}

LEARNING_TASK_FIELDS = {
    "id",
    "pathId",
    "userId",
    "courseId",
    "nodeId",
    "title",
    "taskType",
    "resourceIds",
    "orderIndex",
    "status",
    "dueAt",
    "completedAt",
    "createdAt",
    "updatedAt",
}


def test_generate_learning_path_returns_api_response_learning_path():
    client = TestClient(app)
    payload = client.post(
        "/api/v1/learning-paths/generate",
        json={
            "userId": "user_learning_path_api_001",
            "courseId": "course_ds_001",
            "targetGoal": "准备数据结构期末考试",
            "timeBudget": "每天30分钟",
            "weakNodeIds": ["node_linked_list_001"],
            "additionalRequirements": "每项任务安排建议完成时间，并提供学习工具提示词。",
        },
    ).json()

    assert set(payload.keys()) == {"code", "message", "data", "traceId", "timestamp"}
    assert set(payload["data"].keys()) == LEARNING_PATH_FIELDS
    assert payload["data"]["userId"] == "user_learning_path_api_001"
    assert payload["data"]["pathNodeIds"][0] == "node_array_001"
    assert "node_linked_list_001" in payload["data"]["pathNodeIds"]


def test_learning_path_read_routes_return_same_mock_path_and_tasks():
    client = TestClient(app)
    generated = client.post(
        "/api/v1/learning-paths/generate",
        json={
            "userId": "user_learning_path_api_002",
            "courseId": "course_ds_001",
            "targetGoal": "准备数据结构期末考试",
            "timeBudget": "每天30分钟",
            "weakNodeIds": ["node_linked_list_001"],
        },
    ).json()["data"]

    path_id = generated["id"]
    paths = client.get("/api/v1/users/user_learning_path_api_002/learning-paths").json()["data"]
    detail = client.get(f"/api/v1/learning-paths/{path_id}").json()["data"]
    tasks = client.get(f"/api/v1/learning-paths/{path_id}/tasks").json()["data"]

    assert any(path["id"] == path_id for path in paths)
    assert detail["id"] == path_id
    assert tasks
    assert all(set(task.keys()) == LEARNING_TASK_FIELDS for task in tasks)
    assert all(task["dueAt"] for task in tasks)


def test_update_learning_task_status_uses_contract_status():
    client = TestClient(app)
    generated = client.post(
        "/api/v1/learning-paths/generate",
        json={
            "userId": "user_learning_path_api_003",
            "courseId": "course_ds_001",
            "targetGoal": "准备数据结构期末考试",
            "timeBudget": "每天30分钟",
            "weakNodeIds": ["node_linked_list_001"],
        },
    ).json()["data"]
    task = client.get(f"/api/v1/learning-paths/{generated['id']}/tasks").json()["data"][0]

    updated = client.put(
        f"/api/v1/learning-tasks/{task['id']}/status",
        json={"status": "success", "completedAt": "2026-05-28T10:30:00Z"},
    ).json()["data"]

    assert set(updated.keys()) == LEARNING_TASK_FIELDS
    assert updated["status"] == "success"
    assert updated["completedAt"] == "2026-05-28T10:30:00Z"
