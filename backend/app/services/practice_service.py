from dataclasses import dataclass
from typing import Any

from app.core.config import settings
from app.repositories.learning_path_repository import (
    DEMO_TIME,
    LearningPathRepository,
    default_learning_path_repository,
)
from app.repositories.practice_repository import PracticeRepository, default_practice_repository
from app.schemas.common import DifficultyLevel, MasteryStatus, QuestionType
from app.schemas.course import KnowledgeNode
from app.schemas.practice import (
    PracticeGenerateRequest,
    PracticeQuestion,
    PracticeRecord,
    PracticeSubmitRequest,
)
from app.schemas.profile import ProfileUpdateByPracticeRequest, StudentProfile
from app.services.llm_service import LLMService
from app.services.profile_service import ProfileService


@dataclass
class PracticeSubmitResult:
    practice_record: PracticeRecord
    mastery_update: dict[str, Any]
    profile_update: StudentProfile


class PracticeService:
    def __init__(
        self,
        repository: PracticeRepository | None = None,
        learning_path_repository: LearningPathRepository | None = None,
        profile_service: ProfileService | None = None,
        llm_service: LLMService | None = None,
    ) -> None:
        self.repository = repository or default_practice_repository
        self.learning_path_repository = learning_path_repository or default_learning_path_repository
        self.profile_service = profile_service or ProfileService()
        self.llm_service = llm_service or LLMService()

    def generate_questions(self, payload: PracticeGenerateRequest) -> list[PracticeQuestion]:
        node = self._resolve_node(payload.node_id, payload.user_id, payload.course_id)
        question_types = payload.question_types or [QuestionType.single_choice]
        difficulty = payload.difficulty or (node.difficulty if node else DifficultyLevel.easy)
        questions: list[PracticeQuestion] = []

        for index in range(max(payload.count, 1)):
            question_type = QuestionType(question_types[index % len(question_types)])
            questions.append(self._build_question(payload.course_id, node, question_type, difficulty))

        return self.repository.save_questions(questions)

    def list_questions(self, page: int, page_size: int, keyword: str | None = None) -> tuple[list[PracticeQuestion], int]:
        questions = self.repository.list_questions(keyword=keyword)
        if not questions:
            questions = self.generate_questions(
                PracticeGenerateRequest(
                    user_id="user_demo_001",
                    course_id="course_ds_001",
                    node_id="node_array_001",
                    question_types=[QuestionType.single_choice],
                    difficulty=DifficultyLevel.easy,
                    count=1,
                )
            )
        total = len(questions)
        start = (page - 1) * page_size
        return questions[start : start + page_size], total

    def get_question(self, question_id: str) -> PracticeQuestion:
        question = self.repository.get_question(question_id)
        if question is not None:
            return question
        fallback = self._build_question(
            course_id="course_ds_001",
            node=self.learning_path_repository.get_node("node_array_001"),
            question_type=QuestionType.single_choice,
            difficulty=DifficultyLevel.easy,
            question_id=question_id,
        )
        return self.repository.save_question(fallback)

    async def submit_answer(self, payload: PracticeSubmitRequest) -> PracticeSubmitResult:
        question = self.get_question(payload.question_id)
        score, is_correct, mistake_reason = await self._score_answer(question, payload.user_answer)
        record = PracticeRecord(
            id=self.repository.next_record_id(),
            user_id=payload.user_id,
            question_id=question.id,
            node_id=question.node_id,
            user_answer=payload.user_answer,
            correct_answer=question.answer,
            is_correct=is_correct,
            score=score,
            mistake_reason=mistake_reason,
            duration_seconds=payload.duration_seconds,
            created_at=DEMO_TIME,
            updated_at=DEMO_TIME,
        )
        saved_record = self.repository.save_record(record)
        if not is_correct:
            self.repository.add_wrong_question(payload.user_id, question.id)

        profile_update = self.profile_service.update_by_practice(
            ProfileUpdateByPracticeRequest(
                user_id=payload.user_id,
                course_id=question.course_id,
                question_id=question.id,
                node_id=question.node_id,
                is_correct=is_correct,
                mistake_reason=mistake_reason,
            )
        )
        mastery_update = self._update_mastery(question.node_id, is_correct)
        return PracticeSubmitResult(
            practice_record=saved_record,
            mastery_update=mastery_update,
            profile_update=profile_update,
        )

    def list_practice_records(self, user_id: str) -> list[PracticeRecord]:
        return self.repository.list_records_by_user_id(user_id)

    def list_wrong_questions(self, user_id: str) -> list[PracticeQuestion]:
        return self.repository.list_wrong_questions(user_id)

    def remove_wrong_question(self, user_id: str, question_id: str) -> bool:
        return self.repository.remove_wrong_question(user_id, question_id)

    def _resolve_node(self, node_id: str | None, user_id: str, course_id: str) -> KnowledgeNode | None:
        if node_id:
            node = self.learning_path_repository.get_node(node_id)
            if node is not None:
                return node

        profile = self.profile_service.get_profile(user_id)
        for weak_node_id in profile.weak_node_ids:
            node = self.learning_path_repository.get_node(weak_node_id)
            if node is not None and node.course_id == course_id:
                return node
        nodes = self.learning_path_repository.list_nodes(course_id)
        return nodes[0] if nodes else None

    def _build_question(
        self,
        course_id: str,
        node: KnowledgeNode | None,
        question_type: QuestionType,
        difficulty: DifficultyLevel,
        question_id: str | None = None,
    ) -> PracticeQuestion:
        node_name = node.name if node else "当前知识点"
        node_id = node.id if node else None
        builders = {
            QuestionType.single_choice: self._single_choice_payload,
            QuestionType.multiple_choice: self._multiple_choice_payload,
            QuestionType.blank: self._blank_payload,
            QuestionType.short_answer: self._short_answer_payload,
            QuestionType.coding: self._coding_payload,
            QuestionType.case_analysis: self._case_analysis_payload,
        }
        payload = builders[question_type](node_name)
        return PracticeQuestion(
            id=question_id or self.repository.next_question_id(question_type.value),
            course_id=course_id,
            node_id=node_id,
            question_type=question_type,
            title=payload["title"],
            content=payload["content"],
            options=payload.get("options"),
            answer=payload["answer"],
            explanation=payload.get("explanation"),
            difficulty=difficulty,
            tags=[node_name, question_type.value],
            created_at=DEMO_TIME,
            updated_at=DEMO_TIME,
        )

    def _single_choice_payload(self, node_name: str) -> dict[str, Any]:
        return {
            "title": f"{node_name}基础单选题",
            "content": f"关于{node_name}的基础理解，以下哪一项最准确？",
            "options": ["A. 依赖清晰的结构关系", "B. 与任何数据结构无关", "C. 不需要边界处理", "D. 只能用于排序"],
            "answer": "A",
            "explanation": f"A 正确，因为{node_name}学习需要先理解结构关系和边界条件。",
        }

    def _multiple_choice_payload(self, node_name: str) -> dict[str, Any]:
        return {
            "title": f"{node_name}多选题",
            "content": f"学习{node_name}时，哪些做法是正确的？",
            "options": ["A. 关注核心概念", "B. 记录常见错误", "C. 忽略边界条件", "D. 结合练习验证", "E. 只背答案"],
            "answer": "A,B,D",
            "explanation": "A、B、D 正确，分别对应概念理解、错因整理和练习验证。",
        }

    def _blank_payload(self, node_name: str) -> dict[str, Any]:
        return {
            "title": f"{node_name}填空题",
            "content": f"请填写：学习{node_name}时，应优先掌握____和常见错误。",
            "answer": "核心概念",
            "explanation": "标准答案包含“核心概念”即可视为掌握关键点。",
        }

    def _short_answer_payload(self, node_name: str) -> dict[str, Any]:
        return {
            "title": f"{node_name}简答题",
            "content": f"请简要说明{node_name}的核心概念、操作步骤和一个常见错误。",
            "answer": "核心概念、操作步骤、常见错误",
            "explanation": "回答应覆盖概念、步骤和易错点三个方面。",
        }

    def _coding_payload(self, node_name: str) -> dict[str, Any]:
        return {
            "title": f"{node_name}代码题",
            "content": (
                f"请用 Python 写一个函数 demo()，返回字符串 \"{node_name}\"。\n\n"
                "```json\n"
                "{\"testCases\":[{\"input\":\"demo()\",\"expected\":\"知识点名称\"}]}\n"
                "```"
            ),
            "answer": f"def demo(): return \"{node_name}\"",
            "explanation": "代码题当前使用 mock 评测，后续可替换为真实沙箱运行。",
        }

    def _case_analysis_payload(self, node_name: str) -> dict[str, Any]:
        return {
            "title": f"{node_name}案例分析题",
            "content": f"某同学在学习{node_name}时反复出现边界条件错误，请分析原因并给出改进建议。",
            "answer": "错因是概念不清和边界条件遗漏，应通过图解、代码练习和错题复盘改进。",
            "explanation": "案例分析应包含错因识别和改进建议。",
        }

    async def _score_answer(self, question: PracticeQuestion, user_answer: str) -> tuple[float, bool, str | None]:
        question_type = QuestionType(question.question_type)
        if question_type == QuestionType.single_choice:
            is_correct = self._normalize(user_answer) == self._normalize(question.answer)
            return (100 if is_correct else 0, is_correct, None if is_correct else "单选题选项不正确")

        if question_type == QuestionType.multiple_choice:
            is_correct = self._choice_set(user_answer) == self._choice_set(question.answer)
            return (100 if is_correct else 0, is_correct, None if is_correct else "多选题正确选项组合不完整或包含错误选项")

        if question_type == QuestionType.blank:
            is_correct = self._normalize(question.answer) in self._normalize(user_answer)
            return (100 if is_correct else 0, is_correct, None if is_correct else "填空答案未匹配核心关键词")

        if question_type == QuestionType.coding:
            return self._score_coding_answer(question, user_answer)

        return await self._score_subjective_answer(question, user_answer)

    async def _score_subjective_answer(self, question: PracticeQuestion, user_answer: str) -> tuple[float, bool, str | None]:
        keywords = self._subjective_keywords(question)
        matched = [keyword for keyword in keywords if keyword in user_answer]
        score = round(100 * len(matched) / len(keywords), 2) if keywords else 0
        mistake_reason = None if score >= 60 else f"回答缺少关键点：{','.join([item for item in keywords if item not in matched])}"
        if settings.enable_mock:
            await self.llm_service.generate_json(
                f"mock score {question.question_type} answer",
                mock_data={"score": score, "mistakeReason": mistake_reason},
            )
            return score, score >= 60, mistake_reason

        result = await self.llm_service.generate_json(
            "\n".join(
                [
                    "请根据题目、参考答案和学生答案进行评分，只返回 JSON 对象。",
                    'JSON 字段必须是 {"score": number, "isCorrect": boolean, "mistakeReason": string | null}。',
                    f"题型：{question.question_type}",
                    f"题目：{question.content}",
                    f"参考答案：{question.answer}",
                    f"学生答案：{user_answer}",
                    f"关键点：{','.join(keywords)}",
                ]
            ),
            mock_data={"score": score, "isCorrect": score >= 60, "mistakeReason": mistake_reason},
            temperature=0.2,
        )
        llm_score = float(result.get("score", score))
        llm_score = min(100, max(0, llm_score))
        is_correct = bool(result.get("isCorrect", llm_score >= 60))
        llm_mistake_reason = result.get("mistakeReason")
        return llm_score, is_correct, llm_mistake_reason if isinstance(llm_mistake_reason, str) else None

    def _score_coding_answer(self, question: PracticeQuestion, user_answer: str) -> tuple[float, bool, str | None]:
        # TODO: replace this mock evaluator with a real sandbox runner when runtime isolation is available.
        score = 0
        lowered = user_answer.lower()
        if "def " in lowered and "return" in lowered:
            score += 50
        expected = question.answer.split("return", 1)[-1].strip().strip("\"'")
        if expected and expected in user_answer:
            score += 40
        if "demo" in lowered:
            score += 10
        score = min(score, 100)
        mistake_reason = None if score >= 60 else "代码缺少函数结构、return 语句或预期输出"
        return score, score >= 60, mistake_reason

    def _subjective_keywords(self, question: PracticeQuestion) -> list[str]:
        if QuestionType(question.question_type) == QuestionType.case_analysis:
            return ["错因", "边界", "建议"]
        return ["核心概念", "操作步骤", "常见错误"]

    def _update_mastery(self, node_id: str | None, is_correct: bool) -> dict[str, Any]:
        if node_id is None:
            return {}
        updated = self.learning_path_repository.adjust_node_mastery(node_id, 5 if is_correct else -8)
        if updated is None:
            return {}
        return {
            "nodeId": updated.id,
            "masteryScore": updated.mastery_score,
            "masteryStatus": MasteryStatus(updated.mastery_status).value,
        }

    def _normalize(self, value: str) -> str:
        return "".join(value.lower().replace("，", ",").split())

    def _choice_set(self, value: str) -> set[str]:
        normalized = value.replace("，", ",").replace(";", ",")
        return {item.strip().upper() for item in normalized.split(",") if item.strip()}
