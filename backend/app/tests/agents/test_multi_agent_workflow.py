import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from app.agents.workflow import MultiAgentWorkflowRunner
from app.schemas.agent import MultiAgentWorkflowRequest

WORKFLOW_RESULT_FIELDS = {"taskId", "workflowType", "status", "steps", "finalOutput"}


def run(coro):
    return asyncio.run(coro)


def make_request(workflow_type: str, user_id: str = "user_demo_001", input_payload: dict | None = None) -> MultiAgentWorkflowRequest:
    return MultiAgentWorkflowRequest(
        user_id=user_id,
        course_id="course_ds_001",
        node_id="node_linked_list_001",
        workflow_type=workflow_type,
        input=input_payload or {},
    )


def step_agent_types(result) -> list[str]:
    return [step.agent_type for step in result.steps]


def test_profile_build_workflow_runs_from_demo_profile_without_natural_language_input():
    result = run(MultiAgentWorkflowRunner().run(make_request("profile_build")))

    assert result.status == "success"
    assert step_agent_types(result) == ["profile_agent"]
    assert result.final_output["profile"]["userId"] == "user_demo_001"
    assert result.final_output["profileAnalysis"]["planningHints"]["suggestedDailyTaskMinutes"] == 30
    assert set(result.model_dump(by_alias=True).keys()) == WORKFLOW_RESULT_FIELDS


def test_path_plan_workflow_runs_profile_then_planner_and_returns_learning_path():
    result = run(MultiAgentWorkflowRunner().run(make_request("path_plan")))

    assert result.status == "success"
    assert step_agent_types(result) == ["profile_agent", "planner_agent"]
    assert result.final_output["learningPath"]["pathNodeIds"]
    assert "learningTasks" in result.final_output
    assert result.final_output["planningReason"]


def test_resource_generate_workflow_runs_resource_multimodal_and_safety_steps():
    result = run(
        MultiAgentWorkflowRunner().run(
            make_request(
                "resource_generate",
                user_id="user_workflow_resource_001",
                input_payload={
                    "resourceTypes": ["lecture_doc", "mind_map", "practice_question", "code_case"],
                    "multimodalResourceTypes": ["mind_map"],
                },
            )
        )
    )

    agent_types = step_agent_types(result)

    assert result.status == "success"
    assert agent_types == [
        "profile_agent",
        "planner_agent",
        "qa_agent",
        "resource_agent",
        "practice_agent",
        "multimodal_agent",
        "safety_agent",
    ]
    assert result.final_output["answer"]
    assert len(result.final_output["questions"]) == 3
    assert "resource_agent" in agent_types
    assert "multimodal_agent" in agent_types
    assert "safety_agent" in agent_types
    assert result.final_output["generatedResources"]
    assert result.final_output["recommendations"]
    assert result.final_output["safetyAudit"]["auditStatus"] == "passed"


def test_practice_review_workflow_generates_questions_and_grades_mock_answer():
    result = run(MultiAgentWorkflowRunner().run(make_request("practice_review", user_id="user_workflow_practice_001")))

    agent_types = step_agent_types(result)

    assert result.status == "success"
    assert agent_types.count("practice_agent") == 2
    assert agent_types[0] == "profile_agent"
    assert agent_types[-1] == "profile_agent"
    assert len(result.final_output["questions"]) == 3
    assert result.final_output["practiceRecord"]
    assert result.final_output["masteryUpdate"]
    assert result.final_output["profileUpdate"]["lastUpdatedBy"] == "practice"


def test_workflow_steps_use_contract_agent_type_values():
    result = run(MultiAgentWorkflowRunner().run(make_request("resource_generate", user_id="user_workflow_contract_001")))
    allowed_agent_types = {
        "profile_agent",
        "planner_agent",
        "qa_agent",
        "resource_agent",
        "practice_agent",
        "multimodal_agent",
        "safety_agent",
    }

    data = result.model_dump(by_alias=True)

    assert set(data.keys()) == WORKFLOW_RESULT_FIELDS
    assert all(step["agentType"] in allowed_agent_types for step in data["steps"])
    assert all(set(step.keys()) <= {"taskId", "agentType", "status", "output", "errorMessage"} for step in data["steps"])


def test_qa_workflow_runs_only_qa_agent():
    result = run(
        MultiAgentWorkflowRunner().run(
            make_request("qa", input_payload={"message": "请解释栈为什么是后进先出。"})
        )
    )

    assert result.status == "success"
    assert step_agent_types(result) == ["qa_agent"]
    assert result.final_output["answer"] == "mock"
    assert result.final_output["usedAgentTypes"] == ["qa_agent", "resource_agent", "profile_agent"]
