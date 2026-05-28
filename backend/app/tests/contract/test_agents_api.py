import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.main import app


def test_agents_run_profile_agent_returns_contract_envelope():
    client = TestClient(app)
    response = client.post(
        "/api/v1/agents/run",
        json={
            "userId": "user_demo_001",
            "courseId": "course_ds_001",
            "nodeId": "node_array_001",
            "agentType": "profile_agent",
            "input": {"content": "我想学习数据结构"},
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {"code", "message", "data", "traceId", "timestamp"}

    data = payload["data"]
    assert set(data.keys()) <= {"taskId", "agentType", "status", "output", "errorMessage"}
    assert {"taskId", "agentType", "status", "output"}.issubset(data.keys())
    assert data["agentType"] == "profile_agent"
    assert data["status"] == "success"


def test_agents_run_profile_agent_data_has_no_undefined_fields():
    client = TestClient(app)
    payload = client.post(
        "/api/v1/agents/run",
        json={
            "userId": "user_demo_001",
            "agentType": "profile_agent",
            "input": {},
        },
    ).json()

    assert set(payload["data"].keys()) <= {"taskId", "agentType", "status", "output", "errorMessage"}
