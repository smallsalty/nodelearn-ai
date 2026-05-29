import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from app.agents.profile_agent import ProfileAgent
from app.repositories.profile_repository import ProfileRepository
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType


def run(coro):
    return asyncio.run(coro)


def test_profile_agent_analyzes_demo_profile():
    result = run(
        ProfileAgent(repository=ProfileRepository()).run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                agent_type=AgentType.profile_agent,
                input={},
            )
        )
    )

    output = result.output
    analysis = output["profileAnalysis"]

    assert analysis["learningStage"] == "基础补强阶段"
    assert "mind_map" in analysis["preferredResourceTypes"]
    assert "code_case" in analysis["preferredResourceTypes"]
    assert analysis["planningHints"]["suggestedDailyTaskMinutes"] == 30


def test_profile_agent_result_uses_agent_run_result_fields():
    result = run(
        ProfileAgent(repository=ProfileRepository()).run(
            AgentRunRequest(
                user_id="user_demo_001",
                agent_type=AgentType.profile_agent,
                input={},
            )
        )
    )

    data = result.model_dump(by_alias=True)
    assert set(data.keys()) <= {"taskId", "agentType", "status", "output", "errorMessage"}
    assert set(data["output"].keys()) == {"profile", "profileAnalysis", "nextAgentInput"}


def test_profile_agent_uses_context_profile_first():
    repository = ProfileRepository()
    context_profile = repository.get_by_user_id("user_demo_001")
    context_profile = context_profile.model_copy(update={"learning_goal": "自定义学习目标"})

    result = run(
        ProfileAgent(repository=repository).run(
            AgentRunRequest(
                user_id="user_demo_001",
                agent_type=AgentType.profile_agent,
                input={},
                context={"profile": context_profile},
            )
        )
    )

    assert result.output["profile"]["learningGoal"] == "自定义学习目标"
    assert result.output["profileAnalysis"]["planningHints"]["targetGoal"] == "自定义学习目标"
