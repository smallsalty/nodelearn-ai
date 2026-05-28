import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.main import app

QUESTION_FIELDS = {
    "id",
    "courseId",
    "nodeId",
    "questionType",
    "title",
    "content",
    "options",
    "answer",
    "explanation",
    "difficulty",
    "tags",
    "createdAt",
    "updatedAt",
}
PRACTICE_RECORD_FIELDS = {
    "id",
    "userId",
    "questionId",
    "nodeId",
    "userAnswer",
    "correctAnswer",
    "isCorrect",
    "score",
    "mistakeReason",
    "durationSeconds",
    "createdAt",
    "updatedAt",
}
CONTRACT_QUESTION_TYPES = {
    "single_choice",
    "multiple_choice",
    "blank",
    "short_answer",
    "coding",
    "case_analysis",
}


def test_generate_practices_returns_api_response_question_list():
    client = TestClient(app)
    payload = client.post(
        "/api/v1/practices/generate",
        json={
            "userId": "user_api_practice_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "questionTypes": ["single_choice", "short_answer", "coding"],
            "difficulty": "easy",
            "count": 3,
        },
    ).json()

    assert set(payload.keys()) == {"code", "message", "data", "traceId", "timestamp"}
    assert len(payload["data"]) == 3
    assert {question["questionType"] for question in payload["data"]} == {"single_choice", "short_answer", "coding"}
    assert all(set(question.keys()) == QUESTION_FIELDS for question in payload["data"])
    assert all(question["questionType"] in CONTRACT_QUESTION_TYPES for question in payload["data"])


def test_single_choice_submit_returns_practice_record_for_correct_and_wrong_answers():
    client = TestClient(app)
    question = client.post(
        "/api/v1/practices/generate",
        json={
            "userId": "user_api_practice_002",
            "courseId": "course_ds_001",
            "nodeId": "node_array_001",
            "questionTypes": ["single_choice"],
            "count": 1,
        },
    ).json()["data"][0]

    correct_record = client.post(
        "/api/v1/practices/submit",
        json={
            "userId": "user_api_practice_002",
            "questionId": question["id"],
            "userAnswer": question["answer"],
            "durationSeconds": 20,
        },
    ).json()["data"]
    wrong_record = client.post(
        "/api/v1/practices/submit",
        json={
            "userId": "user_api_practice_002",
            "questionId": question["id"],
            "userAnswer": "B",
            "durationSeconds": 20,
        },
    ).json()["data"]

    assert set(correct_record.keys()) == PRACTICE_RECORD_FIELDS
    assert correct_record["isCorrect"] is True
    assert correct_record["score"] == 100
    assert set(wrong_record.keys()) == PRACTICE_RECORD_FIELDS
    assert wrong_record["isCorrect"] is False
    assert wrong_record["score"] == 0
    assert wrong_record["mistakeReason"] == "单选题选项不正确"


def test_wrong_answer_enters_wrong_questions_and_can_be_removed():
    client = TestClient(app)
    user_id = "user_api_practice_wrong_001"
    question = client.post(
        "/api/v1/practices/generate",
        json={
            "userId": user_id,
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "questionTypes": ["single_choice"],
            "count": 1,
        },
    ).json()["data"][0]

    client.post(
        "/api/v1/practices/submit",
        json={"userId": user_id, "questionId": question["id"], "userAnswer": "B"},
    )
    wrong_questions = client.get(f"/api/v1/users/{user_id}/wrong-questions").json()["data"]
    removed = client.delete(f"/api/v1/users/{user_id}/wrong-questions/{question['id']}").json()["data"]

    assert any(item["id"] == question["id"] for item in wrong_questions)
    assert removed is True


def test_wrong_answer_updates_profile_and_lowers_mastery_score():
    client = TestClient(app)
    user_id = "user_api_practice_mastery_001"
    node_id = "node_recursion_001"
    client.put(
        f"/api/v1/users/{user_id}/nodes/{node_id}/mastery",
        json={"masteryScore": 40, "masteryStatus": "weak"},
    )
    question = client.post(
        "/api/v1/practices/generate",
        json={
            "userId": user_id,
            "courseId": "course_ds_001",
            "nodeId": node_id,
            "questionTypes": ["single_choice"],
            "count": 1,
        },
    ).json()["data"][0]

    record = client.post(
        "/api/v1/practices/submit",
        json={"userId": user_id, "questionId": question["id"], "userAnswer": "B"},
    ).json()["data"]
    profile = client.get(f"/api/v1/profiles/{user_id}").json()["data"]
    graph = client.get("/api/v1/courses/course_ds_001/graph").json()["data"]
    recursion = next(node for node in graph["nodes"] if node["id"] == node_id)

    assert record["isCorrect"] is False
    assert set(record.keys()) == PRACTICE_RECORD_FIELDS
    assert profile["lastUpdatedBy"] == "practice"
    assert node_id in profile["weakNodeIds"]
    assert record["mistakeReason"] in profile["commonMistakes"]
    assert recursion["masteryScore"] == 32
    assert recursion["masteryStatus"] == "weak"


def test_question_read_and_practice_record_routes():
    client = TestClient(app)
    user_id = "user_api_practice_records_001"
    question = client.post(
        "/api/v1/practices/generate",
        json={
            "userId": user_id,
            "courseId": "course_ds_001",
            "nodeId": "node_array_001",
            "questionTypes": ["coding"],
            "count": 1,
        },
    ).json()["data"][0]
    client.post(
        "/api/v1/practices/submit",
        json={
            "userId": user_id,
            "questionId": question["id"],
            "userAnswer": "def demo():\n    return \"数组\"",
        },
    )

    detail = client.get(f"/api/v1/practices/questions/{question['id']}").json()["data"]
    page = client.get("/api/v1/practices/questions").json()["data"]
    records = client.get(f"/api/v1/users/{user_id}/practice-records").json()["data"]

    assert detail["id"] == question["id"]
    assert set(detail.keys()) == QUESTION_FIELDS
    assert page["total"] >= 1
    assert records
    assert all(set(record.keys()) == PRACTICE_RECORD_FIELDS for record in records)
