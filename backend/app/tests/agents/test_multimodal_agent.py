import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.agents.multimodal_agent import MultimodalAgent
from app.main import app
from app.repositories.learning_path_repository import LearningPathRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.resource_repository import ResourceRepository
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType
from app.services.resource_service import ResourceService

AGENT_RESULT_FIELDS = {"taskId", "agentType", "status", "output", "errorMessage"}
GENERATED_RESOURCE_FIELDS = {
    "id",
    "userId",
    "courseId",
    "nodeId",
    "title",
    "resourceType",
    "content",
    "fileUrl",
    "prompt",
    "modelName",
    "status",
    "auditStatus",
    "createdAt",
    "updatedAt",
}


def run(coro):
    return asyncio.run(coro)


def make_agent(repository: ResourceRepository | None = None) -> MultimodalAgent:
    return MultimodalAgent(
        resource_service=ResourceService(
            repository=repository or ResourceRepository(),
            profile_repository=ProfileRepository(),
            learning_path_repository=LearningPathRepository(),
        )
    )


def test_multimodal_agent_generates_mermaid_mind_map():
    result = run(
        make_agent().run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                node_id="node_linked_list_001",
                agent_type=AgentType.multimodal_agent,
                input={"resourceTypes": ["mind_map"]},
            )
        )
    )

    resource = result.output["generatedResources"][0]

    assert result.status == "success"
    assert resource["resourceType"] == "mind_map"
    assert resource["content"].startswith("mindmap")
    assert "链表" in resource["content"]
    assert result.output["renderHints"] == {"mindMapRenderer": "mermaid", "contentType": "markdown"}
    assert set(resource.keys()) == GENERATED_RESOURCE_FIELDS


def test_multimodal_agent_generates_video_script_structure():
    result = run(
        make_agent().run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                node_id="node_linked_list_001",
                agent_type=AgentType.multimodal_agent,
                input={"resourceTypes": ["video_script"]},
            )
        )
    )

    content = result.output["generatedResources"][0]["content"]

    assert "# 视频标题" in content
    assert "## 适合对象" in content
    assert "## 时长建议" in content
    assert "## 分镜脚本" in content
    assert "## 旁白内容" in content
    assert "## 屏幕元素" in content
    assert "## 互动提问" in content
    assert "## 总结" in content


def test_multimodal_agent_prioritizes_diagram_resources_for_demo_profile():
    result = run(
        make_agent().run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                node_id="node_linked_list_001",
                agent_type=AgentType.multimodal_agent,
                input={},
            )
        )
    )

    resource_types = [resource["resourceType"] for resource in result.output["generatedResources"]]

    assert resource_types[:2] == ["mind_map", "animation_script"]
    assert "code_case" in resource_types


def test_multimodal_agent_failed_audit_resource_is_not_success():
    repository = ResourceRepository()
    result = run(
        make_agent(repository).run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                node_id="node_linked_list_001",
                agent_type=AgentType.multimodal_agent,
                input={
                    "resourceTypes": ["lecture_doc"],
                    "customRequirement": "明显异常内容",
                },
            )
        )
    )

    resource = repository.get_resource(result.output["resourceIds"][0])

    assert result.status == "failed"
    assert resource is not None
    assert resource.status == "failed"
    assert resource.audit_status == "need_review"


def test_agents_run_multimodal_agent_returns_contract_output():
    client = TestClient(app)
    payload = client.post(
        "/api/v1/agents/run",
        json={
            "userId": "user_multimodal_agent_api_001",
            "courseId": "course_ds_001",
            "nodeId": "node_linked_list_001",
            "agentType": "multimodal_agent",
            "input": {"resourceTypes": ["mind_map"]},
        },
    ).json()

    data = payload["data"]

    assert set(data.keys()) <= AGENT_RESULT_FIELDS
    assert data["agentType"] == "multimodal_agent"
    assert data["status"] == "success"
    assert set(data["output"].keys()) == {"resourceIds", "generatedResources", "renderHints"}
    assert data["output"]["generatedResources"][0]["resourceType"] == "mind_map"
