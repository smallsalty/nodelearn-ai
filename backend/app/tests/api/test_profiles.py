import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.main import app


def test_get_profile_returns_demo_profile():
    client = TestClient(app)
    payload = client.get("/api/v1/profiles/user_demo_001").json()

    assert set(payload.keys()) == {"code", "message", "data", "traceId", "timestamp"}
    assert payload["data"]["id"] == "profile_demo_001"
    assert payload["data"]["userId"] == "user_demo_001"
    assert payload["data"]["knowledgeBaseLevel"] == "easy"
    assert payload["data"]["cognitiveStyle"] == "diagram"
    assert payload["data"]["practicePreference"] == "coding"


def test_update_profile_returns_student_profile():
    client = TestClient(app)
    payload = client.put(
        "/api/v1/profiles/user_api_update_001",
        json={"learningGoal": "准备数据结构期末考试"},
    ).json()

    assert set(payload.keys()) == {"code", "message", "data", "traceId", "timestamp"}
    assert payload["data"]["userId"] == "user_api_update_001"
    assert payload["data"]["learningGoal"] == "准备数据结构期末考试"


def test_update_profile_by_behavior_returns_student_profile():
    client = TestClient(app)
    payload = client.post(
        "/api/v1/profiles/update-by-behavior",
        json={
            "userId": "user_api_behavior_001",
            "courseId": "course_ds_001",
            "nodeId": "node_array_001",
            "behaviorType": "view_resource",
            "behaviorData": {},
        },
    ).json()

    assert payload["data"]["userId"] == "user_api_behavior_001"
    assert payload["data"]["lastUpdatedBy"] == "behavior"


def test_update_profile_by_practice_returns_student_profile():
    client = TestClient(app)
    payload = client.post(
        "/api/v1/profiles/update-by-practice",
        json={
            "userId": "user_api_practice_001",
            "courseId": "course_ds_001",
            "questionId": "question_demo_001",
            "nodeId": "node_recursion_001",
            "isCorrect": False,
            "mistakeReason": "递归终止条件错误",
        },
    ).json()

    assert payload["data"]["userId"] == "user_api_practice_001"
    assert payload["data"]["lastUpdatedBy"] == "practice"
    assert "node_recursion_001" in payload["data"]["weakNodeIds"]
