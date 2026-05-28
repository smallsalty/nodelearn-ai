from app.agents.base_agent import BaseAgent
from app.schemas.agent import AgentRunRequest
from app.schemas.common import AgentType, DifficultyLevel, QuestionType
from app.schemas.practice import PracticeGenerateRequest, PracticeSubmitRequest
from app.services.practice_service import PracticeService


class PracticeAgent(BaseAgent):
    agent_type = AgentType.practice_agent

    def __init__(self, practice_service: PracticeService | None = None) -> None:
        super().__init__()
        self.practice_service = practice_service or PracticeService(llm_service=self.llm_service)

    async def run(self, request: AgentRunRequest):
        if "questionId" in request.input and "userAnswer" in request.input:
            result = await self.practice_service.submit_answer(
                PracticeSubmitRequest(
                    user_id=request.user_id,
                    question_id=request.input["questionId"],
                    user_answer=request.input["userAnswer"],
                    duration_seconds=request.input.get("durationSeconds"),
                )
            )
            return self.build_result(
                request,
                {
                    "practiceRecord": self.to_contract_output(result.practice_record),
                    "masteryUpdate": result.mastery_update,
                    "profileUpdate": self.to_contract_output(result.profile_update),
                },
            )

        questions = self.practice_service.generate_questions(
            PracticeGenerateRequest(
                user_id=request.user_id,
                course_id=request.course_id or "course_ds_001",
                node_id=request.node_id or request.input.get("nodeId"),
                question_types=self._question_types(request),
                difficulty=self._difficulty(request),
                count=request.input.get("count", 1),
            )
        )
        return self.build_result(
            request,
            {"questions": [self.to_contract_output(question) for question in questions]},
        )

    def _question_types(self, request: AgentRunRequest) -> list[QuestionType]:
        values = request.input.get("questionTypes") or [QuestionType.single_choice]
        return [QuestionType(value) for value in values]

    def _difficulty(self, request: AgentRunRequest) -> DifficultyLevel | None:
        value = request.input.get("difficulty")
        return DifficultyLevel(value) if value else None
