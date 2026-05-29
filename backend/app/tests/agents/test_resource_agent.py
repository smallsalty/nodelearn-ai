import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.agents.resource_agent import ResourceAgent
from app.main import app
from app.repositories.learning_path_repository import LearningPathRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.resource_repository import ResourceRepository
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType
from app.services.resource_service import ResourceService


def run(coro):
    return asyncio.run(coro)


def make_agent(repository: ResourceRepository | None = None) -> ResourceAgent:
    return ResourceAgent(
        resource_service=ResourceService(
            repository=repository or ResourceRepository(),
            profile_repository=ProfileRepository(),
            learning_path_repository=LearningPathRepository(),
        )
    )


def test_resource_agent_generates_mind_map_for_diagram_profile():
    result = run(
        make_agent().run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                node_id="node_linked_list_001",
                agent_type=AgentType.resource_agent,
                input={},
            )
        )
    )

    resource_types = [item["resourceType"] for item in result.output["resourcePlan"]]
    recommendation_types = [item["resourceType"] for item in result.output["recommendations"]]

    assert result.status == "success"
    assert "mind_map" in resource_types
    assert "mind_map" in recommendation_types


def test_resource_agent_generates_code_case_for_coding_profile():
    result = run(
        make_agent().run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                node_id="node_linked_list_001",
                agent_type=AgentType.resource_agent,
                input={},
            )
        )
    )

    resource_types = [item["resourceType"] for item in result.output["resourcePlan"]]
    recommendation_types = [item["resourceType"] for item in result.output["recommendations"]]

    assert "code_case" in resource_types
    assert "code_case" in recommendation_types


def test_resource_agent_result_uses_agent_run_result_fields():
    result = run(
        make_agent().run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                agent_type=AgentType.resource_agent,
                input={"resourceTypes": ["mind_map"]},
            )
        )
    )

    data = result.model_dump(by_alias=True)
    assert set(data.keys()) <= {"taskId", "agentType", "status", "output", "errorMessage"}
    assert set(data["output"].keys()) == {
        "resourcePlan",
        "resourceIds",
        "recommendations",
        "pushRecords",
        "nextAgentInput",
    }


def test_agents_run_resource_agent_returns_expected_output():
    client = TestClient(app)
    response = client.post(
        "/api/v1/agents/run",
        json={
            "userId": "user_resource_agent_api_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "agentType": "resource_agent",
            "input": {"resourceTypes": ["mind_map"]},
        },
    )

    data = response.json()["data"]

    assert response.status_code == 200
    assert data["agentType"] == "resource_agent"
    assert data["status"] == "success"
    assert set(data["output"].keys()) == {
        "resourcePlan",
        "resourceIds",
        "recommendations",
        "pushRecords",
        "nextAgentInput",
    }
    assert data["output"]["resourcePlan"][0]["resourceType"] == "mind_map"


def test_resource_agent_does_not_recommend_failed_audit_resource():
    repository = ResourceRepository()
    result = run(
        make_agent(repository).run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                node_id="node_linked_list_001",
                agent_type=AgentType.resource_agent,
                input={
                    "resourceTypes": ["lecture_doc"],
                    "customRequirement": "明显异常内容",
                },
            )
        )
    )

    resource_id = result.output["resourceIds"][0]
    resource = repository.get_resource(resource_id)

    assert result.status == "failed"
    assert result.output["recommendations"] == []
    assert result.output["pushRecords"] == []
    assert resource is not None
    assert resource.audit_status == "need_review"
    assert resource.status == "failed"
