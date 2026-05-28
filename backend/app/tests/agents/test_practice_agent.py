import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from app.agents.practice_agent import PracticeAgent
from app.repositories.learning_path_repository import LearningPathRepository
from app.repositories.practice_repository import PracticeRepository
from app.repositories.profile_repository import ProfileRepository
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType
from app.services.practice_service import PracticeService
from app.services.profile_service import ProfileService

AGENT_RESULT_FIELDS = {"taskId", "agentType", "status", "output", "errorMessage"}
QUESTION_FIELDS = {
    "id",
    "courseId",
    "nodeId",
    "questionType",
    "title",
    "content",
    "options",
    "answer",
    "explanation",
    "difficulty",
    "tags",
    "createdAt",
    "updatedAt",
}


def run(coro):
    return asyncio.run(coro)


def make_agent() -> PracticeAgent:
    return PracticeAgent(
        practice_service=PracticeService(
            repository=PracticeRepository(),
            learning_path_repository=LearningPathRepository(),
            profile_service=ProfileService(ProfileRepository()),
        )
    )


def test_practice_agent_generates_single_short_answer_and_coding_questions():
    result = run(
        make_agent().run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                node_id="node_linked_list_001",
                agent_type=AgentType.practice_agent,
                input={
                    "questionTypes": ["single_choice", "short_answer", "coding"],
                    "count": 3,
                },
            )
        )
    )

    questions = result.output["questions"]
    question_types = {question["questionType"] for question in questions}

    assert result.status == "success"
    assert question_types == {"single_choice", "short_answer", "coding"}
    assert all(set(question.keys()) == QUESTION_FIELDS for question in questions)
    assert all(question["questionType"] in {"single_choice", "short_answer", "coding"} for question in questions)


def test_practice_agent_auto_grades_single_choice_and_updates_profile_and_mastery():
    agent = make_agent()
    generated = run(
        agent.run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                node_id="node_linked_list_001",
                agent_type=AgentType.practice_agent,
                input={"questionTypes": ["single_choice"], "count": 1},
            )
        )
    )
    question = generated.output["questions"][0]

    result = run(
        agent.run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                agent_type=AgentType.practice_agent,
                input={
                    "questionId": question["id"],
                    "userAnswer": "B",
                    "durationSeconds": 30,
                },
            )
        )
    )

    output = result.output

    assert result.status == "success"
    assert output["practiceRecord"]["isCorrect"] is False
    assert output["practiceRecord"]["mistakeReason"] == "单选题选项不正确"
    assert output["masteryUpdate"]["nodeId"] == "node_linked_list_001"
    assert output["masteryUpdate"]["masteryScore"] == 37
    assert output["profileUpdate"]["lastUpdatedBy"] == "practice"


def test_practice_agent_result_uses_contract_top_level_fields():
    result = run(
        make_agent().run(
            AgentRunRequest(
                user_id="user_demo_001",
                course_id="course_ds_001",
                agent_type=AgentType.practice_agent,
                input={"questionTypes": ["coding"], "count": 1},
            )
        )
    )

    data = result.model_dump(by_alias=True)

    assert set(data.keys()) <= AGENT_RESULT_FIELDS
    assert set(data["output"].keys()) == {"questions"}
