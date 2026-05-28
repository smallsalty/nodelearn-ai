from app.agents.base_agent import BaseAgent
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType, DifficultyLevel, QuestionType
from app.schemas.practice import PracticeQuestion

MOCK_TIME = "2026-05-19T10:00:00Z"


class PracticeAgent(BaseAgent):
    agent_type = AgentType.practice_agent

    def mock_output(self, request: AgentRunRequest) -> dict:
        question = PracticeQuestion(
            id="question_mock_001",
            course_id=request.course_id or "course_ds_001",
            node_id=request.node_id,
            question_type=QuestionType.single_choice,
            title="数组基础练习",
            content="数组下标从哪里开始？",
            options=["0", "1", "-1", "不固定"],
            answer="0",
            explanation="多数编程语言数组下标从 0 开始。",
            difficulty=DifficultyLevel.easy,
            tags=[],
            created_at=MOCK_TIME,
            updated_at=MOCK_TIME,
        )
        return self.to_contract_output(question)
