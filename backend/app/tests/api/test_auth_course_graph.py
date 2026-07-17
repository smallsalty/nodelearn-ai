from fastapi.testclient import TestClient

from app.api.v1 import course as course_api
from app.core.config import settings
from app.main import app


client = TestClient(app)


def assert_api_response(response, *, code: int = 200):
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"code", "message", "data", "traceId", "timestamp"}
    assert payload["code"] == code
    return payload["data"]


def test_auth_and_current_user_placeholder_contracts():
    user = assert_api_response(
        client.post(
            "/api/v1/auth/register",
            json={"username": "contract_student", "password": "contract_password", "role": "student"},
        )
    )
    assert user["id"] == "user_demo_001"

    token = assert_api_response(
        client.post(
            "/api/v1/auth/login",
            json={"username": "demo_student", "password": "demo_password"},
        )
    )
    assert token["tokenType"] == "Bearer"
    assert token["accessToken"]
    assert token["refreshToken"]

    assert assert_api_response(
        client.post("/api/v1/auth/refresh-token", json={"refreshToken": token["refreshToken"]})
    )["accessToken"]
    assert assert_api_response(client.get("/api/v1/users/me"))["id"] == "user_demo_001"
    assert assert_api_response(client.put("/api/v1/users/me", json={"username": "renamed"}))["id"] == "user_demo_001"
    assert assert_api_response(client.post("/api/v1/auth/logout")) is True


def test_course_chapter_node_and_relation_crud_contracts():
    course_id = "course_contract_001"
    course = assert_api_response(
        client.post(
            "/api/v1/courses",
            json={"name": "契约测试课程", "code": "CONTRACT_001", "description": "route coverage"},
        )
    )
    assert course["name"]
    assert assert_api_response(client.get("/api/v1/courses", params={"page": 1, "pageSize": 5}))["list"]
    assert assert_api_response(client.get(f"/api/v1/courses/{course_id}"))["id"] == course_id
    assert assert_api_response(client.put(f"/api/v1/courses/{course_id}", json={"name": "更新课程"}))["id"] == course_id

    chapter = assert_api_response(
        client.post(
            f"/api/v1/courses/{course_id}/chapters",
            json={"courseId": course_id, "title": "第一章", "orderIndex": 1},
        )
    )
    assert chapter["courseId"] == course_id
    assert assert_api_response(client.get(f"/api/v1/courses/{course_id}/chapters"))

    node_payload = {
        "courseId": course_id,
        "name": "数组",
        "nodeType": "concept",
        "content": "# 数组\n\n数组使用连续内存保存元素。",
        "orderIndex": 1,
        "difficulty": "easy",
        "learningValue": 80,
    }
    node = assert_api_response(client.post(f"/api/v1/courses/{course_id}/nodes", json=node_payload))
    assert node["courseId"] == course_id
    assert node["content"].startswith("# Array")
    assert assert_api_response(client.get(f"/api/v1/courses/{course_id}/nodes"))
    assert assert_api_response(client.get("/api/v1/nodes/node_contract_001"))["id"] == "node_contract_001"
    assert assert_api_response(client.put("/api/v1/nodes/node_contract_001", json={"name": "动态数组"}))["id"] == "node_contract_001"

    relation_payload = {
        "id": "relation_contract_001",
        "courseId": course_id,
        "sourceNodeId": "node_contract_001",
        "targetNodeId": "node_contract_002",
        "relationType": "prerequisite",
        "weight": 1,
        "createdAt": "2026-07-14T00:00:00Z",
        "updatedAt": "2026-07-14T00:00:00Z",
    }
    relation = assert_api_response(client.post(f"/api/v1/courses/{course_id}/relations", json=relation_payload))
    assert relation["id"] == "relation_contract_001"
    assert assert_api_response(client.get(f"/api/v1/courses/{course_id}/relations"))

    assert isinstance(assert_api_response(client.delete("/api/v1/nodes/node_contract_001")), bool)
    assert isinstance(assert_api_response(client.delete(f"/api/v1/courses/{course_id}")), bool)


def test_course_content_contract_and_missing_course_http_status(monkeypatch):
    data = assert_api_response(client.get("/api/v1/courses/course_ds_001/content"))
    assert set(data) == {"courseId", "courseName", "attribution", "chapters"}
    assert data["chapters"][0]["content"]
    assert data["chapters"][0]["sections"][0]["orderIndex"] == 1

    monkeypatch.setattr(settings, "enable_mock", False)
    monkeypatch.setattr(course_api.course_service, "get_course_content", lambda _course_id: None)
    response = client.get("/api/v1/courses/missing/content")
    assert response.status_code == 404
    assert response.json()["code"] == 404


def test_course_validation_rejects_invalid_enum():
    response = client.post(
        "/api/v1/courses/course_contract_001/nodes",
        json={
            "courseId": "course_contract_001",
            "name": "非法节点",
            "nodeType": "not-a-node-type",
            "content": "非法节点正文",
            "difficulty": "easy",
            "learningValue": 1,
        },
    )
    assert response.status_code == 422


def test_course_validation_rejects_blank_node_content():
    response = client.post(
        "/api/v1/courses/course_contract_001/nodes",
        json={
            "courseId": "course_contract_001",
            "name": "空正文节点",
            "nodeType": "concept",
            "content": "   ",
            "difficulty": "easy",
            "learningValue": 1,
        },
    )
    assert response.status_code == 422

    update_response = client.put(
        "/api/v1/nodes/node_contract_001",
        json={"content": "\n\t"},
    )
    assert update_response.status_code == 422


def test_graph_and_mastery_contracts():
    course_graph = assert_api_response(client.get("/api/v1/courses/course_ds_001/graph"))
    assert course_graph["courseId"] == "course_ds_001"
    assert course_graph["nodes"]

    user_graph = assert_api_response(
        client.get("/api/v1/users/user_contract_001/courses/course_ds_001/graph")
    )
    assert user_graph["courseId"] == "course_ds_001"

    mastery = assert_api_response(
        client.put(
            "/api/v1/users/user_contract_001/nodes/node_array_001/mastery",
            json={"masteryScore": 55, "masteryStatus": "weak"},
        )
    )
    assert mastery["id"] == "node_array_001"
    assert mastery["masteryStatus"] == "weak"
    assert mastery["masteryScore"] == 55
