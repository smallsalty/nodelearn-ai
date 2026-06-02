import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType
from app.services.agent_service import AgentService


def run(coro):
    return asyncio.run(coro)


def test_agent_service_dispatches_profile_agent():
    service = AgentService()
    result = run(
        service.run_agent(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                agent_type=AgentType.profile_agent,
                input={},
            )
        )
    )

    assert result.agent_type == "profile_agent"
    assert result.status == "success"
    assert result.output["profile"]["userId"] == "user_demo_001"
    assert result.output["profileAnalysis"]["learningStage"] == "基础补强阶段"


def test_agent_service_dispatches_qa_agent():
    service = AgentService()
    result = run(
        service.run_agent(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                node_id="node_stack_001",
                agent_type=AgentType.qa_agent,
                input={"message": "请解释栈为什么是后进先出。"},
            )
        )
    )

    assert result.agent_type == "qa_agent"
    assert result.status == "success"
    assert result.output["answer"] == "mock"
    assert result.output["usedAgentTypes"] == ["qa_agent", "resource_agent", "profile_agent"]


def test_agent_service_returns_failed_for_unregistered_contract_agent():
    service = AgentService()
    result = run(
        service.run_agent(
            AgentRunRequest(
                user_id="user_demo_001",
                agent_type=AgentType.recommendation_agent,
                input={},
            )
        )
    )

    assert result.agent_type == "recommendation_agent"
    assert result.status == "failed"
    assert result.error_message is not None


def test_safety_agent_rejects_empty_content():
    service = AgentService()
    result = run(
        service.run_agent(
            AgentRunRequest(
                user_id="user_demo_001",
                agent_type=AgentType.safety_agent,
                input={"content": ""},
            )
        )
    )

    assert result.status == "success"
    assert result.output["auditStatus"] == "rejected"


def test_safety_agent_marks_abnormal_content_need_review():
    service = AgentService()
    result = run(
        service.run_agent(
            AgentRunRequest(
                user_id="user_demo_001",
                agent_type=AgentType.safety_agent,
                input={"content": "这是一段明显异常内容"},
            )
        )
    )

    assert result.status == "success"
    assert result.output["auditStatus"] == "need_review"


def test_safety_agent_passes_normal_content():
    service = AgentService()
    result = run(
        service.run_agent(
            AgentRunRequest(
                user_id="user_demo_001",
                agent_type=AgentType.safety_agent,
                input={"content": "请讲解数组的基本概念"},
            )
        )
    )

    assert result.status == "success"
    assert result.output["auditStatus"] == "passed"
