import json

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def read_sse_event(path: str, params: dict[str, str]) -> dict:
    with client.stream("GET", path, params=params) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        data_lines = [line for line in response.iter_lines() if line.startswith("data:")]
    assert len(data_lines) == 1
    return json.loads(data_lines[0].removeprefix("data:").strip())


def test_chat_stream_uses_sse_and_contract_fields():
    event = read_sse_event("/api/v1/chat/stream", {"sessionId": "session_contract_001"})
    assert event == {"sessionId": "session_contract_001", "eventType": "done"}


def test_resource_stream_uses_sse_and_contract_fields():
    event = read_sse_event("/api/v1/resources/generate/stream", {"taskId": "task_contract_001"})
    assert event["taskId"] == "task_contract_001"
    assert event["eventType"] in {"start", "progress", "chunk", "done", "error"}
    assert isinstance(event["progress"], int | float)


def test_multimodal_stream_uses_sse_and_contract_fields():
    event = read_sse_event("/api/v1/multimodal/videos/stream", {"taskId": "task_contract_001"})
    assert event["taskId"] == "task_contract_001"
    assert event["eventType"] in {"start", "progress", "step", "done", "error"}
    assert isinstance(event["progress"], int | float)
