import asyncio

from app.schemas.programming import ProgrammingGenerateRequest, ProgrammingSubmissionRequest
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
