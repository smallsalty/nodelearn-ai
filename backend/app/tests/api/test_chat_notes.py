from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def assert_api_response(response):
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"code", "message", "data", "traceId", "timestamp"}
    assert payload["code"] == 200
    return payload["data"]


def test_chat_session_crud_and_empty_history_contracts():
    session = assert_api_response(
        client.post(
            "/api/v1/chat/sessions",
            json={"userId": "user_contract_001", "title": "契约会话", "sessionType": "qa"},
        )
    )
    assert session["id"].startswith("session_chat_")
    assert session["userId"] == "user_contract_001"
    sessions = assert_api_response(
        client.get(
            "/api/v1/chat/sessions",
            params={"page": 1, "pageSize": 5, "userId": "user_contract_001"},
        )
    )
    assert sessions["total"] == 1
    assert assert_api_response(client.get(f"/api/v1/chat/sessions/{session['id']}"))["id"] == session["id"]
    messages = assert_api_response(client.get(f"/api/v1/chat/sessions/{session['id']}/messages"))
    assert messages == []


def test_note_crud_filtering_and_relation_contracts():
    note_payload = {
        "userId": "user_contract_001",
        "courseId": "course_contract_001",
        "nodeId": "node_contract_001",
        "title": "契约笔记",
        "content": "笔记内容",
        "tags": ["contract"],
    }
    note = assert_api_response(client.post("/api/v1/notes", json=note_payload))
    assert note["userId"] == "user_contract_001"
    note_id = note["id"]
    listed = assert_api_response(
        client.get(
            "/api/v1/notes",
            params={"userId": "user_contract_001", "page": 1, "pageSize": 5, "keyword": "契约"},
        )
    )
    assert listed["list"][0]["id"] == note_id
    assert assert_api_response(client.get(f"/api/v1/notes/{note_id}"))["id"] == note_id
    updated = assert_api_response(client.put(f"/api/v1/notes/{note_id}", json={"title": "更新笔记"}))
    assert updated["title"] == "更新笔记"
    assert assert_api_response(
        client.post(f"/api/v1/notes/{note_id}/pin", json={"pinned": True})
    )["pinned"] is True
    assert assert_api_response(
        client.post(
            f"/api/v1/notes/{note_id}/relations",
            json={"relationType": "node", "relationId": "node_contract_001"},
        )
    )["relationId"] == "node_contract_001"
    assert assert_api_response(client.get("/api/v1/users/user_contract_001/notes"))[0]["userId"] == "user_contract_001"
    assert assert_api_response(
        client.get("/api/v1/nodes/node_contract_001/notes", params={"userId": "user_contract_001"})
    )
    assert assert_api_response(client.delete(f"/api/v1/notes/{note_id}")) is True
    missing = client.get(f"/api/v1/notes/{note_id}")
    assert missing.status_code == 404
    assert missing.json()["code"] == 404


def test_note_validation_and_user_scoping():
    empty = client.post(
        "/api/v1/notes",
        json={"userId": "user_contract_002", "title": "   ", "content": "正文"},
    )
    assert empty.status_code == 400
    assert empty.json()["code"] == 400

    created = assert_api_response(
        client.post(
            "/api/v1/notes",
            json={
                "userId": "user_contract_002",
                "title": "标签笔记",
                "content": "用于筛选",
                "tags": ["复习", " 复习 ", "数组"],
            },
        )
    )
    assert created["tags"] == ["复习", "数组"]
    assert assert_api_response(
        client.get("/api/v1/notes", params={"userId": "user_contract_002", "tag": "复习"})
    )["total"] == 1
    assert assert_api_response(
        client.get("/api/v1/notes", params={"userId": "another_user"})
    )["total"] == 0
    assert_api_response(client.delete(f"/api/v1/notes/{created['id']}"))
