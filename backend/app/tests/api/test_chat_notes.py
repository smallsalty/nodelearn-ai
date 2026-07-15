from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def assert_api_response(response):
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"code", "message", "data", "traceId", "timestamp"}
    assert payload["code"] == 200
    return payload["data"]


def test_chat_session_placeholder_contracts():
    session = assert_api_response(
        client.post(
            "/api/v1/chat/sessions",
            json={"userId": "user_contract_001", "title": "契约会话", "sessionType": "qa"},
        )
    )
    assert session["id"] == "session_demo_001"
    sessions = assert_api_response(client.get("/api/v1/chat/sessions", params={"page": 1, "pageSize": 5}))
    assert sessions["total"] == 1
    assert assert_api_response(client.get("/api/v1/chat/sessions/session_contract_001"))["id"] == "session_contract_001"
    messages = assert_api_response(client.get("/api/v1/chat/sessions/session_contract_001/messages"))
    assert messages[0]["sessionId"] == "session_contract_001"


def test_note_placeholder_crud_and_relation_contracts():
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
    assert assert_api_response(client.get("/api/v1/notes", params={"page": 1, "pageSize": 5}))["list"]
    assert assert_api_response(client.get("/api/v1/notes/note_contract_001"))["id"] == "note_contract_001"
    assert assert_api_response(client.put("/api/v1/notes/note_contract_001", json={"title": "更新笔记"}))["id"] == "note_contract_001"
    assert assert_api_response(
        client.post("/api/v1/notes/note_contract_001/pin", json={"pinned": True})
    )["pinned"] is True
    assert assert_api_response(
        client.post(
            "/api/v1/notes/note_contract_001/relations",
            json={"relationType": "node", "relationId": "node_contract_001"},
        )
    )["id"] == "note_contract_001"
    assert assert_api_response(client.get("/api/v1/users/user_contract_001/notes"))[0]["userId"] == "user_contract_001"
    assert assert_api_response(client.get("/api/v1/nodes/node_contract_001/notes"))
    assert assert_api_response(client.delete("/api/v1/notes/note_contract_001")) is True
