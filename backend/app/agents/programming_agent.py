from app.agents.base_agent import BaseAgent
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType, DifficultyLevel
from app.schemas.programming import ProgrammingGenerateRequest
from app.services.programming_service import default_programming_service


class ProgrammingAgent(BaseAgent):
    agent_type = AgentType.programming_agent

    async def run(self, request: AgentRunRequest):
        questions = await default_programming_service.generate_questions(ProgrammingGenerateRequest(user_id=request.user_id, course_id=request.course_id or "course_ds_001", node_id=request.node_id or request.input.get("nodeId"), difficulty=DifficultyLevel(request.input["difficulty"]) if request.input.get("difficulty") else None, count=request.input.get("count", 1)))
        return self.build_result(request, {"questions": [self.to_contract_output(question) for question in questions]})
