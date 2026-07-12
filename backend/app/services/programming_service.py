from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.repositories.learning_path_repository import default_learning_path_repository
from app.schemas.common import DifficultyLevel
from app.schemas.programming import ProgrammingGenerateRequest, ProgrammingJudgeResult, ProgrammingQuestion, ProgrammingSampleCase, ProgrammingSubmissionRequest
from app.schemas.practice import PracticeRecord
from app.services.judge0_service import Judge0Service
from app.repositories.practice_repository import default_practice_repository
from app.services.profile_service import ProfileService
from app.services.llm_service import LLMService
from app.services.resource_service import ResourceService


def now_iso() -> str: return datetime.now(UTC).isoformat()


class ProgrammingService:
    def __init__(self, judge_service: Judge0Service | None = None) -> None:
        self.judge_service = judge_service or Judge0Service()
        self._questions: dict[str, ProgrammingQuestion] = {}
        self._hidden_cases: dict[str, list[ProgrammingSampleCase]] = {}
        self._submissions: dict[str, list[ProgrammingJudgeResult]] = {}
        self._question_index = 0
        self._submission_index = 0
        self.profile_service = ProfileService()
        self.llm_service = LLMService()
        self.resource_service = ResourceService(llm_service=self.llm_service)

    async def generate_questions(self, payload: ProgrammingGenerateRequest) -> list[ProgrammingQuestion]:
        node = default_learning_path_repository.get_node(payload.node_id or "")
        node_name = node.name if node else "当前知识点"
        difficulty = payload.difficulty or DifficultyLevel.medium
        if settings.enable_mock:
            result = [self._template_question(payload.course_id, node.id if node else payload.node_id, node_name, difficulty) for _ in range(max(1, payload.count))]
        else:
            documents = self.resource_service.search_knowledge_base(course_id=payload.course_id, query_text=node_name, node_id=node.id if node else payload.node_id, top_k=3)
            generated = await self.llm_service.generate_json(self._generation_prompt(node_name, difficulty, documents), mock_data={})
            result = self._parse_generated_questions(generated, payload.course_id, node.id if node else payload.node_id, difficulty)
        for question in result: self._questions[question.id] = question
        return result

    def _generation_prompt(self, node_name: str, difficulty: DifficultyLevel, documents: list[Any]) -> str:
        materials = "\n".join(f"{item.title}: {item.content[:900]}" for item in documents)
        return f'''你是 NodeLearn AI 的 programming_agent。只返回 JSON：{{"questions":[{{"title":"","content":"","inputFormat":"","outputFormat":"","constraints":"","sampleCases":[{{"input":"","output":""}}],"hiddenCases":[{{"input":"","output":""}}],"tags":[""]}}]}}。围绕知识点 {node_name} 生成一道 {difficulty.value} 难度、语言无关的标准输入输出编程题。必须提供至少一个公开样例和两个隐藏用例；输出必须精确含换行。禁止文件、网络、交互式题目。材料：{materials}'''

    def _parse_generated_questions(self, generated: dict[str, Any], course_id: str, node_id: str | None, difficulty: DifficultyLevel) -> list[ProgrammingQuestion]:
        values = generated.get("questions")
        if not isinstance(values, list) or not values: raise RuntimeError("LLM 未返回有效编程题")
        questions: list[ProgrammingQuestion] = []
        for value in values:
            if not isinstance(value, dict): raise RuntimeError("LLM 编程题格式错误")
            samples = [ProgrammingSampleCase.model_validate(item) for item in value.get("sampleCases", [])]
            hidden = [ProgrammingSampleCase.model_validate(item) for item in value.get("hiddenCases", [])]
            if not samples or not hidden: raise RuntimeError("LLM 编程题缺少公开或隐藏测试用例")
            self._question_index += 1; created_at = now_iso(); question_id = f"programming_question_{self._question_index:03d}"
            question = ProgrammingQuestion(id=question_id, course_id=course_id, node_id=node_id, title=str(value.get("title", "编程题")), content=str(value.get("content", "")), input_format=str(value.get("inputFormat", "")), output_format=str(value.get("outputFormat", "")), constraints=str(value.get("constraints", "")), sample_cases=samples, difficulty=difficulty, tags=[str(tag) for tag in value.get("tags", []) if str(tag).strip()] or ["programming"], time_limit_seconds=settings.programming_time_limit_seconds, created_at=created_at, updated_at=created_at)
            self._hidden_cases[question_id] = hidden; questions.append(question)
        return questions

    def list_questions(self, page: int, page_size: int) -> tuple[list[ProgrammingQuestion], int]:
        values = list(self._questions.values())
        return values[(page - 1) * page_size : page * page_size], len(values)

    def get_question(self, question_id: str) -> ProgrammingQuestion | None: return self._questions.get(question_id)
    def list_submissions(self, user_id: str) -> list[ProgrammingJudgeResult]: return list(self._submissions.get(user_id, []))

    async def submit(self, payload: ProgrammingSubmissionRequest) -> ProgrammingJudgeResult:
        question = self.get_question(payload.question_id)
        if question is None: return self._result(payload, "system_error", stderr="编程题不存在")
        if len(payload.source_code) > settings.programming_max_source_length: return self._result(payload, "system_error", stderr="代码长度超过限制")
        cases = [*question.sample_cases, *self._hidden_cases.get(question.id, [])]
        for index, case in enumerate(cases):
            execution = await self.judge_service.execute(payload.language, payload.source_code, case.input)
            if execution.status != "ok":
                result = self._result(payload, execution.status, execution, index if index < len(question.sample_cases) else None); self._record_feedback(payload.user_id, question, result); return result
            verdict = self._compare(execution.stdout or "", case.output)
            if verdict != "AC":
                result = self._result(payload, verdict, execution, index if index < len(question.sample_cases) else None); self._record_feedback(payload.user_id, question, result); return result
        result = self._result(payload, "AC"); self._record_feedback(payload.user_id, question, result); return result

    def _template_question(self, course_id: str, node_id: str | None, node_name: str, difficulty: DifficultyLevel) -> ProgrammingQuestion:
        self._question_index += 1; created_at = now_iso(); question_id = f"programming_question_{self._question_index:03d}"
        question = ProgrammingQuestion(id=question_id, course_id=course_id, node_id=node_id, title=f"{node_name}：两数求和", content=f"读取两个整数并输出它们的和。该题用于练习 {node_name} 的输入、处理和输出。", input_format="一行两个整数 a 和 b。", output_format="输出 a 与 b 的和，末尾换行。", constraints="-100000 <= a, b <= 100000", sample_cases=[ProgrammingSampleCase(input="3 5\n", output="8\n")], difficulty=difficulty, tags=[node_name, "programming"], time_limit_seconds=settings.programming_time_limit_seconds, created_at=created_at, updated_at=created_at)
        self._hidden_cases[question_id] = [ProgrammingSampleCase(input="-4 9\n", output="5\n"), ProgrammingSampleCase(input="0 0\n", output="0\n")]
        return question

    def _result(self, payload: ProgrammingSubmissionRequest, verdict: str, execution: Any | None = None, failed_sample_index: int | None = None) -> ProgrammingJudgeResult:
        self._submission_index += 1; created_at = now_iso()
        result = ProgrammingJudgeResult(submission_id=f"programming_submission_{self._submission_index:03d}", question_id=payload.question_id, language=payload.language, verdict=verdict, stdout=getattr(execution, "stdout", None), stderr=getattr(execution, "stderr", None), compile_output=getattr(execution, "compile_output", None), time_seconds=getattr(execution, "time_seconds", None), memory_kb=getattr(execution, "memory_kb", None), failed_sample_index=failed_sample_index, created_at=created_at, updated_at=created_at)
        self._submissions.setdefault(payload.user_id, []).insert(0, result); return result

    def _record_feedback(self, user_id: str, question: ProgrammingQuestion, result: ProgrammingJudgeResult) -> None:
        is_correct = result.verdict == "AC"
        record = PracticeRecord(id=default_practice_repository.next_record_id(), user_id=user_id, question_id=question.id, node_id=question.node_id, user_answer=result.submission_id, correct_answer="AC", is_correct=is_correct, score=100 if is_correct else 0, mistake_reason=None if is_correct else result.verdict, created_at=result.created_at, updated_at=result.updated_at)
        default_practice_repository.save_record(record)
        if not is_correct: default_practice_repository.add_wrong_question(user_id, question.id)
        if question.node_id:
            default_learning_path_repository.adjust_node_mastery(question.node_id, 5 if is_correct else -8)
        self.profile_service.update_by_practice(__import__("app.schemas.profile", fromlist=["ProfileUpdateByPracticeRequest"]).ProfileUpdateByPracticeRequest(user_id=user_id, course_id=question.course_id, question_id=question.id, node_id=question.node_id, is_correct=is_correct, mistake_reason=None if is_correct else result.verdict))

    @staticmethod
    def _compare(actual: str, expected: str) -> str:
        actual, expected = actual.replace("\r\n", "\n"), expected.replace("\r\n", "\n")
        if actual == expected: return "AC"
        if actual.split() == expected.split(): return "PE"
        return "WA"


default_programming_service = ProgrammingService()
