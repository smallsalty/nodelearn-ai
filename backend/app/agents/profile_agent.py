from __future__ import annotations

import re
from typing import Any

from app.agents.base_agent import BaseAgent
from app.repositories.profile_repository import ProfileRepository, default_profile_repository
from app.schemas.agent import AgentRunRequest
from app.schemas.common import CognitiveStyle, DifficultyLevel, PracticePreference, ResourceType
from app.services.llm_service import LLMService


PROFILE_FIELD_NAMES = {
    "major",
    "grade",
    "currentCourseId",
    "learningGoal",
    "knowledgeBaseLevel",
    "learningProgress",
    "weakNodeIds",
    "cognitiveStyle",
    "practicePreference",
    "resourcePreference",
    "commonMistakes",
    "availableStudyTime",
    "profileSummary",
}

COGNITIVE_VALUES = {item.value for item in CognitiveStyle}
PRACTICE_VALUES = {item.value for item in PracticePreference}
RESOURCE_VALUES = {item.value for item in ResourceType}
DIFFICULTY_VALUES = {item.value for item in DifficultyLevel}

NODE_KEYWORDS = {
    "数组": "node_array_001",
    "链表": "node_linked_list_001",
    "栈": "node_stack_001",
    "队列": "node_queue_001",
    "树": "node_tree_001",
    "图": "node_graph_001",
    "排序": "node_sort_001",
    "递归": "node_recursion_001",
}

PROGRESS_PATTERN = r"((数组|链表|栈|队列|树|图|递归|排序)[^。；;]{0,24}(已学完|学习中|学完|学到)[^。；;，,]{0,24})"
GOAL_PATTERN = r"(准备[^。；;，,]{2,30}|通过[^。；;，,]{2,30}|掌握[^。；;，,]{2,40})"
TIME_PATTERN = r"(每天|每周|周末|晚上|白天)[^。；;，,]{1,20}"


class ProfileAgent(BaseAgent):
    agent_type = "profile_agent"

    def __init__(
        self,
        repository: ProfileRepository | None = None,
        llm_service: LLMService | None = None,
    ) -> None:
        self.repository = repository or default_profile_repository
        self.llm_service = llm_service or LLMService()

    async def extract_fields(self, message: str, history_messages: list[Any] | None = None) -> dict[str, Any]:
        prompt = self.build_deepseek_prompt(message, history_messages)
        model_fields = await self.llm_service.generate_json(prompt, mock_data=self._extract_with_rules(message))
        if model_fields:
            return self.filter_contract_fields(model_fields)
        return self.filter_contract_fields(self._extract_with_rules(message))

    async def run(self, request: AgentRunRequest):
        profile = request.context.profile if request.context and request.context.profile else self.repository.get_by_user_id(request.user_id)
        message = request.input.get("message")
        if isinstance(message, str) and message.strip():
            extracted_fields = await self.extract_fields(message)
            if extracted_fields:
                profile = self.repository.update_profile(
                    request.user_id,
                    {**extracted_fields, "lastUpdatedBy": "dialogue"},
                )

        profile_analysis = self._analyze_profile(profile)
        output = {
            "profile": self.to_contract_output(profile),
            "profileAnalysis": profile_analysis,
            "nextAgentInput": {
                "forPlannerAgent": profile_analysis["planningHints"],
                "forResourceAgent": profile_analysis["resourceHints"],
                "forPracticeAgent": profile_analysis["practiceHints"],
            },
        }
        return self.build_result(request, output)

    def build_deepseek_prompt(self, message: str, history_messages: list[Any] | None = None) -> str:
        history_count = len(history_messages or [])
        return (
            "You are profile_agent for NodeLearn AI. Extract only StudentProfile "
            "contract fields as JSON. Do not invent fields or enum values. "
            f"historyMessages={history_count}; message={message}"
        )

    def filter_contract_fields(self, fields: dict[str, Any]) -> dict[str, Any]:
        filtered: dict[str, Any] = {}
        for key, value in fields.items():
            if key not in PROFILE_FIELD_NAMES or value in (None, "", []):
                continue
            if key == "cognitiveStyle" and value not in COGNITIVE_VALUES:
                continue
            if key == "practicePreference" and value not in PRACTICE_VALUES:
                continue
            if key == "knowledgeBaseLevel" and value not in DIFFICULTY_VALUES:
                continue
            if key == "resourcePreference":
                resources = [item for item in value if item in RESOURCE_VALUES]
                if resources:
                    filtered[key] = resources
                continue
            filtered[key] = value
        return filtered

    def _extract_with_rules(self, message: str) -> dict[str, Any]:
        text = message.strip()
        fields: dict[str, Any] = {}

        major = self._match_first(text, ["计算机科学与技术", "计算机", "软件工程", "人工智能", "数据科学"])
        if major:
            fields["major"] = "计算机科学与技术" if major == "计算机" else major

        grade = self._match_first(text, ["大一", "大二", "大三", "大四", "研一", "研二", "研三"])
        if not grade:
            grade_match = re.search(r"(20\d{2}级)", text)
            grade = grade_match.group(1) if grade_match else None
        if grade:
            fields["grade"] = grade

        if "数据结构" in text:
            fields["currentCourseId"] = "course_ds_001"
        goal_match = re.search(GOAL_PATTERN, text)
        if goal_match:
            fields["learningGoal"] = self._compact_text(goal_match.group(0), 80)
        elif "目标" in text or "想" in text or "希望" in text:
            fields["learningGoal"] = self._compact_text(text, 80)

        fields.update(self._extract_level(text))
        fields.update(self._extract_learning_progress(text))
        fields.update(self._extract_weak_nodes(text))
        fields.update(self._extract_styles(text))
        fields.update(self._extract_mistakes(text))
        fields.update(self._extract_time(text))
        return fields

    def _extract_level(self, text: str) -> dict[str, Any]:
        if any(word in text for word in ["零基础", "基础弱", "刚开始", "入门"]):
            return {"knowledgeBaseLevel": DifficultyLevel.easy.value}
        if any(word in text for word in ["一般", "有一点基础", "学过一点"]):
            return {"knowledgeBaseLevel": DifficultyLevel.medium.value}
        if any(word in text for word in ["基础较好", "比较熟", "熟悉"]):
            return {"knowledgeBaseLevel": DifficultyLevel.hard.value}
        if any(word in text for word in ["竞赛", "挑战", "拔高"]):
            return {"knowledgeBaseLevel": DifficultyLevel.challenge.value}
        return {}

    def _extract_learning_progress(self, text: str) -> dict[str, Any]:
        progress_match = re.search(PROGRESS_PATTERN, text)
        if not progress_match:
            progress_match = re.search(r"(学到|进度|目前)([^。；;，,]{2,30})", text)
        if progress_match:
            return {"learningProgress": self._compact_text(progress_match.group(0), 50)}
        return {}

    def _extract_weak_nodes(self, text: str) -> dict[str, Any]:
        weak_nodes = [node_id for keyword, node_id in NODE_KEYWORDS.items() if keyword in text and any(word in text for word in ["薄弱", "不懂", "不会", "困难", "错"])]
        return {"weakNodeIds": list(dict.fromkeys(weak_nodes))} if weak_nodes else {}

    def _extract_styles(self, text: str) -> dict[str, Any]:
        fields: dict[str, Any] = {}
        if any(word in text for word in ["文字", "文档"]):
            fields["cognitiveStyle"] = CognitiveStyle.text.value
        if any(word in text for word in ["图示", "图解", "思维导图"]):
            fields["cognitiveStyle"] = CognitiveStyle.diagram.value
        if any(word in text for word in ["例子", "示例", "例题"]):
            fields["cognitiveStyle"] = CognitiveStyle.example.value
        if any(word in text for word in ["代码", "编程"]):
            fields["cognitiveStyle"] = CognitiveStyle.code.value
        if "混合" in text:
            fields["cognitiveStyle"] = CognitiveStyle.mixed.value

        if "选择" in text:
            fields["practicePreference"] = PracticePreference.choice.value
        if any(word in text for word in ["编程", "代码题"]):
            fields["practicePreference"] = PracticePreference.coding.value
        if any(word in text for word in ["案例", "综合"]):
            fields["practicePreference"] = PracticePreference.case.value
        if "混合练习" in text:
            fields["practicePreference"] = PracticePreference.mixed.value

        resources: list[str] = []
        if any(word in text for word in ["讲解", "文档"]):
            resources.append(ResourceType.lecture_doc.value)
        if any(word in text for word in ["图示", "图解", "思维导图"]):
            resources.append(ResourceType.mind_map.value)
        if any(word in text for word in ["题目", "练习"]):
            resources.append(ResourceType.practice_question.value)
        if any(word in text for word in ["代码案例", "实操", "代码"]):
            resources.append(ResourceType.code_case.value)
        if resources:
            fields["resourcePreference"] = list(dict.fromkeys(resources))
        return fields

    def _extract_mistakes(self, text: str) -> dict[str, Any]:
        mistakes = []
        for keyword in ["链表指针断链", "数组下标越界", "指针断链", "头节点处理错误", "空指针", "递归终止条件错误", "递归边界", "时间复杂度"]:
            if keyword in text:
                mistakes.append(keyword)
        return {"commonMistakes": mistakes} if mistakes else {}

    def _extract_time(self, text: str) -> dict[str, Any]:
        time_match = re.search(TIME_PATTERN, text)
        return {"availableStudyTime": time_match.group(0)} if time_match else {}

    def _match_first(self, text: str, candidates: list[str]) -> str | None:
        return next((candidate for candidate in candidates if candidate in text), None)

    def _compact_text(self, text: str, limit: int) -> str:
        return text.strip()[:limit]

    def _analyze_profile(self, profile) -> dict[str, Any]:
        preferred_resource_types = [str(item) for item in profile.resource_preference]
        daily_minutes_match = re.search(r"(\d+)\s*分钟", profile.available_study_time or "")
        suggested_minutes = int(daily_minutes_match.group(1)) if daily_minutes_match else 30
        weak_summary = "、".join(profile.common_mistakes or profile.weak_node_ids) or "暂无明确薄弱点"
        return {
            "learningStage": "基础补强阶段" if profile.weak_node_ids else "正常学习阶段",
            "riskLevel": "medium" if profile.weak_node_ids else "low",
            "weakNodeSummary": weak_summary,
            "preferredResourceTypes": preferred_resource_types,
            "recommendedQuestionTypes": ["single_choice", "short_answer", "coding"],
            "planningHints": {
                "targetGoal": profile.learning_goal or "完成当前课程学习",
                "timeBudget": profile.available_study_time,
                "suggestedDailyTaskMinutes": suggested_minutes,
                "weakNodeIds": profile.weak_node_ids,
            },
            "resourceHints": {
                "preferDiagram": profile.cognitive_style == CognitiveStyle.diagram,
                "preferredResourceTypes": preferred_resource_types,
            },
            "practiceHints": {
                "recommendedQuestionTypes": ["single_choice", "short_answer", "coding"],
                "commonMistakes": profile.common_mistakes,
            },
        }
