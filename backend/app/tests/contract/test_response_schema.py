import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.main import app


def test_response_uses_api_response_envelope():
    client = TestClient(app)
    payload = client.get("/api/v1/system/health").json()
    assert set(["code", "message", "data", "traceId", "timestamp"]).issubset(payload.keys())
    # TODO: validate all non-stream HTTP routes return ApiResponse<T>.


def test_profile_extract_uses_contract_fields_only():
    client = TestClient(app)
    response = client.post(
        "/api/v1/profiles/extract",
        json={
            "userId": "user_contract_profile_001",
            "message": "我是计算机科学与技术专业大二学生，正在学习数据结构，准备数据结构期末考试。数组已学完，链表学习中，链表和递归比较薄弱，常犯链表指针断链和递归终止条件错误，喜欢图解和代码案例，每天晚上30分钟。",
            "historyMessages": [],
        },
    )
    payload = response.json()
    assert set(["code", "message", "data", "traceId", "timestamp"]).issubset(payload.keys())
    assert response.status_code == 200

    profile_fields = {
        "major",
        "grade",
        "currentCourseId",
        "learningGoal",
        "knowledgeBaseLevel",
        "learningProgress",
        "weakNodeIds",
        "cognitiveStyle",
        "practicePreference",
        "resourcePreference",
        "commonMistakes",
        "availableStudyTime",
        "profileSummary",
        "confidenceScore",
        "lastUpdatedBy",
        "createdAt",
        "updatedAt",
        "id",
        "userId",
    }
    extracted_fields = payload["data"]["extractedFields"]
    assert set(extracted_fields.keys()).issubset(profile_fields)
    assert payload["data"]["missingFields"]
    assert payload["data"]["followUpQuestions"]


def test_demo_profile_matches_contract_example_shape():
    client = TestClient(app)
    payload = client.get("/api/v1/profiles/user_demo_001").json()
    data = payload["data"]

    assert data["id"] == "profile_demo_001"
    assert data["userId"] == "user_demo_001"
    assert data["knowledgeBaseLevel"] == "easy"
    assert data["cognitiveStyle"] == "diagram"
    assert data["practicePreference"] == "coding"
    assert data["resourcePreference"] == ["lecture_doc", "mind_map", "practice_question", "code_case"]
    assert data["lastUpdatedBy"] == "manual"


def test_profile_update_sources_are_contract_values():
    client = TestClient(app)
    behavior_payload = client.post(
        "/api/v1/profiles/update-by-behavior",
        json={
            "userId": "user_contract_profile_002",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "behaviorType": "view_resource",
            "behaviorData": {
                "resourceId": "resource_001",
                "durationSeconds": 180,
            },
        },
    ).json()
    assert behavior_payload["data"]["lastUpdatedBy"] == "behavior"
    assert behavior_payload["data"]["currentCourseId"] == "course_ds_001"

    practice_payload = client.post(
        "/api/v1/profiles/update-by-practice",
        json={
            "userId": "user_contract_profile_002",
            "courseId": "course_ds_001",
            "questionId": "question_demo_001",
            "nodeId": "node_linked_list_001",
            "isCorrect": False,
            "mistakeReason": "递归边界",
        },
    ).json()
    assert practice_payload["data"]["lastUpdatedBy"] == "practice"
