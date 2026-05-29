import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.main import app

API_RESPONSE_FIELDS = {"code", "message", "data", "traceId", "timestamp"}
WORKFLOW_RESULT_FIELDS = {"taskId", "workflowType", "status", "steps", "finalOutput"}
EVENT_FIELDS = {"taskId", "agentType", "eventType", "message", "payload", "createdAt"}


def test_workflow_run_returns_api_response_multi_agent_workflow_result():
    client = TestClient(app)
    payload = client.post(
        "/api/v1/agents/workflows/run",
        json={
            "userId": "user_api_workflow_resource_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "workflowType": "resource_generate",
            "input": {
                "resourceTypes": ["lecture_doc", "mind_map", "practice_question", "code_case"],
                "multimodalResourceTypes": ["mind_map", "animation_script"],
            },
        },
    ).json()

    data = payload["data"]

    assert set(payload.keys()) == API_RESPONSE_FIELDS
    assert set(data.keys()) == WORKFLOW_RESULT_FIELDS
    assert data["workflowType"] == "resource_generate"
    assert data["status"] == "success"
    assert {step["agentType"] for step in data["steps"]} >= {"resource_agent", "multimodal_agent", "safety_agent"}
    assert data["finalOutput"]["generatedResources"]
    assert data["finalOutput"]["recommendations"]


def test_workflow_task_and_events_can_be_read_back():
    client = TestClient(app)
    created = client.post(
        "/api/v1/agents/workflows/run",
        json={
            "userId": "user_api_workflow_events_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "workflowType": "resource_generate",
            "input": {"multimodalResourceTypes": ["mind_map"]},
        },
    ).json()["data"]

    task = client.get(f"/api/v1/agents/tasks/{created['taskId']}").json()["data"]
    events = client.get(f"/api/v1/agents/tasks/{created['taskId']}/events").json()["data"]
    event_pairs = {(event["agentType"], event["eventType"]) for event in events}

    assert task["taskId"] == created["taskId"]
    assert task["workflowType"] == "resource_generate"
    assert task["status"] == created["status"]
    assert events
    assert all(set(event.keys()) == EVENT_FIELDS for event in events)
    assert ("resource_agent", "start") in event_pairs
    assert ("resource_agent", "done") in event_pairs
    assert ("multimodal_agent", "start") in event_pairs
    assert ("multimodal_agent", "done") in event_pairs
    assert ("safety_agent", "start") in event_pairs
    assert ("safety_agent", "done") in event_pairs


def test_profile_build_workflow_api_does_not_require_natural_language_input():
    client = TestClient(app)
    data = client.post(
        "/api/v1/agents/workflows/run",
        json={
            "userId": "user_demo_001",
            "courseId": "course_ds_001",
            "workflowType": "profile_build",
            "input": {},
        },
    ).json()["data"]

    assert data["status"] == "success"
    assert [step["agentType"] for step in data["steps"]] == ["profile_agent"]
    assert data["finalOutput"]["profile"]["userId"] == "user_demo_001"
    assert "profileAnalysis" in data["finalOutput"]


def test_practice_review_workflow_api_returns_practice_feedback():
    client = TestClient(app)
    data = client.post(
        "/api/v1/agents/workflows/run",
        json={
            "userId": "user_api_workflow_practice_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "workflowType": "practice_review",
            "input": {"mockUserAnswer": "B"},
        },
    ).json()["data"]

    assert data["status"] == "success"
    assert data["finalOutput"]["questions"]
    assert data["finalOutput"]["practiceRecord"]
    assert data["finalOutput"]["masteryUpdate"]
    assert data["finalOutput"]["profileUpdate"]["lastUpdatedBy"] == "practice"
