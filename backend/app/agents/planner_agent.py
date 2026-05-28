from app.agents.base_agent import BaseAgent
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType, TaskStatus
from app.schemas.learning_path import LearningPath

MOCK_TIME = "2026-05-19T10:00:00Z"


class PlannerAgent(BaseAgent):
    agent_type = AgentType.planner_agent

    def mock_output(self, request: AgentRunRequest) -> dict:
        learning_path = LearningPath(
            id="learning_path_mock_001",
            user_id=request.user_id,
            course_id=request.course_id or "course_ds_001",
            title="数据结构学习路径",
            description="mock learning path",
            current_stage="learning",
            target_goal="掌握数据结构基础",
            path_node_ids=[],
            current_node_id=request.node_id,
            status=TaskStatus.pending,
            created_at=MOCK_TIME,
            updated_at=MOCK_TIME,
        )
        return self.to_contract_output(learning_path)
