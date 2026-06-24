import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def test_multimodal_video_generate_task_events_and_resource():
    client = TestClient(app)
    created = client.post(
        "/api/v1/multimodal/videos/generate",
        json={
            "userId": "user_multimodal_api_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "learningGoal": "理解链表节点指针变化",
            "durationSeconds": 120,
            "useDigitalHuman": False,
            "useRag": True,
        },
    ).json()["data"]

    task = client.get(f"/api/v1/multimodal/videos/tasks/{created['taskId']}").json()["data"]
    events = client.get(f"/api/v1/multimodal/videos/tasks/{created['taskId']}/events").json()["data"]

    assert task["status"] == "success"
    assert task["resourceId"]
    assert task["progress"] == 100
    assert [event["stepName"] for event in events]
    assert any(event["stepName"] == "generate_script" for event in events)


def test_digital_human_explain_and_chat_return_mock_media():
    client = TestClient(app)
    explain = client.post(
        "/api/v1/multimodal/digital-human/explain",
        json={
            "userId": "user_multimodal_api_002",
            "courseId": "course_ds_001",
            "nodeId": "node_stack_001",
            "useRag": True,
            "customRequirement": "讲清楚入栈和出栈",
        },
    ).json()["data"]
    chat = client.post(
        "/api/v1/multimodal/digital-human/chat",
        json={
            "userId": "user_multimodal_api_002",
            "courseId": "course_ds_001",
            "nodeId": "node_stack_001",
            "message": "栈为什么只能从栈顶操作？",
            "useRag": True,
            "useProfile": True,
        },
    ).json()["data"]
    messages = client.get(f"/api/v1/multimodal/digital-human/sessions/{chat['sessionId']}/messages").json()["data"]

    assert explain["status"] == "success"
    assert explain["resourceId"]
    assert explain["videoUrl"]
    assert chat["status"] == "success"
    assert chat["answer"]
    assert chat["audioUrl"]
    assert chat["videoUrl"]
    assert len(messages) == 2


def test_digital_human_callback_rejects_invalid_token(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "iflytek_callback_token", "expected-token")
    client = TestClient(app)

    payload = client.post(
        "/api/v1/multimodal/digital-human/callback",
        json={"taskId": "digital_human_task_mock_unknown", "status": "failed", "token": "bad-token"},
    ).json()

    assert payload["code"] == 401
    assert "invalid iflytek callback token" in payload["message"]


def test_resources_generate_bridges_knowledge_video_type():
    client = TestClient(app)
    generated = client.post(
        "/api/v1/resources/generate",
        json={
            "userId": "user_multimodal_api_003",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "resourceTypes": ["knowledge_video"],
            "learningGoal": "稳定生成知识点教学视频",
        },
    ).json()["data"]
    task = client.get(f"/api/v1/resources/generation-tasks/{generated['taskId']}").json()["data"]

    assert generated["status"] == "success"
    assert generated["resourceIds"]
    assert task == generated
