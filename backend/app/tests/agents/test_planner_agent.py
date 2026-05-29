import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.agents.planner_agent import PlannerAgent
from app.main import app
from app.repositories.learning_path_repository import LearningPathRepository
from app.repositories.profile_repository import ProfileRepository
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType
from app.services.learning_path_service import LearningPathService


def run(coro):
    return asyncio.run(coro)


def make_agent() -> PlannerAgent:
    return PlannerAgent(
        learning_path_service=LearningPathService(
            repository=LearningPathRepository(),
            profile_repository=ProfileRepository(),
        )
    )


def test_planner_agent_prioritizes_weak_linked_list_with_prerequisite_first():
    result = run(
        make_agent().run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                agent_type=AgentType.planner_agent,
                input={
                    "weakNodeIds": ["node_linked_list_001"],
                    "targetGoal": "准备数据结构期末考试",
                    "timeBudget": "每天30分钟",
                },
            )
        )
    )

    node_ids = result.output["learningPath"]["pathNodeIds"]
    assert node_ids.index("node_array_001") < node_ids.index("node_linked_list_001")
    assert "node_stack_001" not in node_ids or node_ids.index("node_linked_list_001") < node_ids.index("node_stack_001")


def test_planner_agent_does_not_recommend_high_order_node_before_unmastered_prerequisite():
    result = run(
        make_agent().run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                agent_type=AgentType.planner_agent,
                input={
                    "weakNodeIds": ["node_stack_001"],
                    "targetGoal": "项目应用",
                    "timeBudget": "每天30分钟",
                },
            )
        )
    )

    node_ids = result.output["learningPath"]["pathNodeIds"]
    assert node_ids[0] != "node_stack_001"
    assert node_ids.index("node_linked_list_001") < node_ids.index("node_stack_001")


def test_agents_run_planner_agent_returns_agent_run_result_contract():
    client = TestClient(app)
    response = client.post(
        "/api/v1/agents/run",
        json={
            "userId": "user_demo_001",
            "courseId": "course_ds_001",
            "agentType": "planner_agent",
            "input": {
                "weakNodeIds": ["node_linked_list_001"],
                "targetGoal": "准备数据结构期末考试",
                "timeBudget": "每天30分钟",
            },
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert set(data.keys()) <= {"taskId", "agentType", "status", "output", "errorMessage"}
    assert data["agentType"] == "planner_agent"
    assert data["status"] == "success"
    assert set(data["output"].keys()) == {"learningPath", "learningTasks", "planningReason", "nextAgentInput"}
