from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def assert_api_response(response, *, code: int = 200):
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"code", "message", "data", "traceId", "timestamp"}
    assert payload["code"] == code
    return payload["data"]


def test_learning_records_evaluation_and_report_placeholder_contracts():
    record = assert_api_response(
        client.post(
            "/api/v1/learning-records",
            json={
                "userId": "user_contract_001",
                "courseId": "course_contract_001",
                "nodeId": "node_contract_001",
                "behaviorType": "view_resource",
                "durationSeconds": 30,
            },
        )
    )
    assert record["userId"] == "user_contract_001"
    assert assert_api_response(client.get("/api/v1/users/user_contract_001/learning-records"))

    evaluation_path = "/api/v1/users/user_contract_001/courses/course_contract_001/evaluation"
    evaluation = assert_api_response(client.get(evaluation_path))
    assert evaluation["courseId"] == "course_contract_001"
    assert assert_api_response(client.post(f"{evaluation_path}/refresh"))["userId"] == "user_contract_001"

    report = assert_api_response(
        client.post(
            "/api/v1/reports/generate",
            json={
                "userId": "user_contract_001",
                "courseId": "course_contract_001",
                "includeChart": True,
                "exportPdf": False,
            },
        )
    )
    assert report["userId"] == "user_contract_001"
    assert assert_api_response(client.get("/api/v1/users/user_contract_001/reports"))
    assert assert_api_response(client.get("/api/v1/reports/report_contract_001"))["id"] == "report_contract_001"
    assert assert_api_response(client.get("/api/v1/reports/report_contract_001/export-pdf"))["pdfUrl"].endswith(".pdf")
    assert assert_api_response(client.delete("/api/v1/reports/report_contract_001")) is True
    assert assert_api_response(client.get("/api/v1/audit/logs"))["list"]
    assert assert_api_response(client.get("/api/v1/model-call-logs"))["list"]


def test_audit_service_pass_review_and_reject_contracts():
    base = {"targetType": "message", "targetId": "message_contract_001"}
    passed = assert_api_response(client.post("/api/v1/audit/check", json={**base, "content": "正常学习问题"}))
    assert passed["auditStatus"] == "passed"

    review = assert_api_response(client.post("/api/v1/audit/check", json={**base, "content": "drop table users"}))
    assert review["auditStatus"] == "need_review"
    assert review["riskLabels"] == ["abnormal_content"]

    rejected = assert_api_response(client.post("/api/v1/audit/check", json={**base, "content": "   "}))
    assert rejected["auditStatus"] == "rejected"
    assert rejected["riskLabels"] == ["empty_content"]


def test_system_health_config_and_version_contracts():
    health = assert_api_response(client.get("/api/v1/system/health"))
    assert health["status"] == "ok"
    assert health["database"] == "ok"

    config = assert_api_response(client.get("/api/v1/system/config"))
    assert config["enableMock"] is True
    assert isinstance(config["enableSafetyAudit"], bool)

    version = assert_api_response(client.get("/api/v1/system/version"))
    assert version["version"]


def test_programming_question_and_submission_contracts_hide_private_cases():
    questions = assert_api_response(
        client.post(
            "/api/v1/programming/questions/generate",
            json={
                "userId": "user_contract_001",
                "courseId": "course_contract_001",
                "nodeId": "node_contract_001",
                "difficulty": "easy",
                "count": 1,
            },
        )
    )
    assert len(questions) == 1
    question = questions[0]
    assert question["sampleCases"]
    assert "hiddenCases" not in question

    listed = assert_api_response(client.get("/api/v1/programming/questions", params={"page": 1, "pageSize": 10}))
    assert listed["total"] >= 1
    assert "hiddenCases" not in listed["list"][0]
    assert assert_api_response(client.get(f"/api/v1/programming/questions/{question['id']}"))["id"] == question["id"]

    not_found = assert_api_response(client.get("/api/v1/programming/questions/not-found"), code=404)
    assert not_found is None

    result = assert_api_response(
        client.post(
            "/api/v1/programming/submissions",
            json={
                "userId": "user_contract_001",
                "questionId": "not-found",
                "language": "python",
                "sourceCode": "print(0)",
            },
        )
    )
    assert result["verdict"] == "system_error"
    assert "hiddenCases" not in result
    submissions = assert_api_response(client.get("/api/v1/users/user_contract_001/programming-submissions"))
    assert submissions[0]["submissionId"] == result["submissionId"]
