import asyncio

from app.schemas.programming import ProgrammingGenerateRequest, ProgrammingSubmissionRequest
from app.repositories.learning_path_repository import default_learning_path_repository
from app.services.judge0_service import JudgeExecution
from app.services.programming_service import ProgrammingService


class StaticJudge:
    def __init__(self, stdout: str) -> None: self.stdout = stdout
    async def execute(self, language: str, source_code: str, stdin: str) -> JudgeExecution:
        return JudgeExecution(status="ok", stdout=self.stdout)


def generate(service: ProgrammingService):
    return asyncio.run(service.generate_questions(ProgrammingGenerateRequest(user_id="user_programming_test", course_id="course_ds_001", node_id="node_array_001", count=1))) [0]


def test_programming_question_hides_judge_cases():
    service = ProgrammingService(judge_service=StaticJudge("8\n"))
    question = generate(service)
    assert question.sample_cases[0].input == "3 5\n"
    assert len(service._hidden_cases[question.id]) == 2


def test_programming_submission_reports_ac_and_pe():
    service = ProgrammingService(judge_service=StaticJudge("8\n"))
    question = generate(service)
    service._hidden_cases[question.id] = []
    accepted = asyncio.run(service.submit(ProgrammingSubmissionRequest(user_id="user_programming_test", question_id=question.id, language="cpp", source_code="int main(){}")))
    assert accepted.verdict == "AC"
    service = ProgrammingService(judge_service=StaticJudge("8 \n"))
    question = generate(service); service._hidden_cases[question.id] = []
    presentation_error = asyncio.run(service.submit(ProgrammingSubmissionRequest(user_id="user_programming_test", question_id=question.id, language="python", source_code="print(8)")))
    assert presentation_error.verdict == "PE"


def test_real_generation_normalizes_request_difficulty(monkeypatch):
    service = ProgrammingService()
    node = default_learning_path_repository.get_node("node_array_001")

    async def generate_json(*_args, **_kwargs):
        return {
            "questions": [
                {
                    "title": "两数求和",
                    "content": "读取两个整数并输出和。",
                    "inputFormat": "两个整数",
                    "outputFormat": "一个整数",
                    "constraints": "整数范围内",
                    "sampleCases": [{"input": "1 2\n", "output": "3\n"}],
                    "hiddenCases": [{"input": "-1 1\n", "output": "0\n"}],
                    "tags": ["array"],
                }
            ]
        }

    monkeypatch.setattr("app.services.programming_service.settings.enable_mock", False)
    monkeypatch.setattr(default_learning_path_repository, "get_node", lambda _node_id: node)
    monkeypatch.setattr(service.llm_service, "generate_json", generate_json)
    monkeypatch.setattr(service.resource_service, "search_knowledge_base", lambda **_kwargs: [])

    question = asyncio.run(
        service.generate_questions(
            ProgrammingGenerateRequest(
                user_id="user_programming_real_test",
                course_id="course_ds_001",
                node_id="node_array_001",
                difficulty="easy",
                count=1,
            )
        )
    )[0]

    assert question.difficulty == "easy"
