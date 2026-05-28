from app.agents.base_agent import BaseAgent
from app.schemas.agent import AgentRunRequest
from app.repositories.profile_repository import ProfileRepository, default_profile_repository
from app.schemas.common import AgentType, CognitiveStyle, DifficultyLevel, PracticePreference, QuestionType, ResourceType
from app.schemas.profile import StudentProfile


class ProfileAgent(BaseAgent):
    agent_type = AgentType.profile_agent

    def __init__(self, repository: ProfileRepository | None = None) -> None:
        super().__init__()
        self.repository = repository or default_profile_repository

    async def run(self, request: AgentRunRequest):
        profile = request.context.profile if request.context and request.context.profile else self.repository.get_by_user_id(request.user_id)
        profile_analysis = self.analyze_profile(profile)
        output = {
            "profile": self.to_contract_output(profile),
            "profileAnalysis": profile_analysis,
            "nextAgentInput": {
                "forPlannerAgent": profile_analysis["planningHints"],
                "forResourceAgent": {
                    "preferredResourceTypes": profile_analysis["preferredResourceTypes"],
                    **profile_analysis["resourceHints"],
                },
                "forPracticeAgent": profile_analysis["practiceHints"],
            },
        }
        return self.build_result(request, output)

    def analyze_profile(self, profile: StudentProfile) -> dict:
        preferred_resource_types = self._preferred_resource_types(profile)
        focus_question_types = self._focus_question_types(profile)
        focus_mistakes = [mistake for mistake in profile.common_mistakes if "递归" in mistake or "链表" in mistake]

        risk_level = "low"
        if profile.weak_node_ids:
            risk_level = "medium"
        if profile.confidence_score < 0.6:
            risk_level = "high"

        planning_hints = {
            "prioritizeWeakNodes": bool(profile.weak_node_ids),
            "needPrerequisiteReview": bool(profile.weak_node_ids) or self._enum_value(profile.knowledge_base_level) == DifficultyLevel.easy.value,
            "suggestedDailyTaskMinutes": self._suggested_daily_task_minutes(profile.available_study_time),
            "targetGoal": profile.learning_goal,
        }
        resource_hints = {
            "preferDiagram": self._enum_value(profile.cognitive_style) == CognitiveStyle.diagram.value,
            "preferCodeCase": self._enum_value(profile.practice_preference) == PracticePreference.coding.value,
            "preferShortTask": planning_hints["suggestedDailyTaskMinutes"] <= 30,
        }
        practice_hints = {
            "focusQuestionTypes": focus_question_types,
            "focusMistakes": focus_mistakes,
        }

        return {
            "profileCompleteness": self._profile_completeness(profile),
            "learningStage": self._learning_stage(profile),
            "riskLevel": risk_level,
            "weaknessSummary": self._weakness_summary(profile),
            "preferredResourceTypes": preferred_resource_types,
            "preferredPracticeMode": self._enum_value(profile.practice_preference),
            "planningHints": planning_hints,
            "resourceHints": resource_hints,
            "practiceHints": practice_hints,
        }

    def _profile_completeness(self, profile: StudentProfile) -> float:
        required_values = [
            profile.major,
            profile.current_course_id,
            profile.learning_goal,
            profile.knowledge_base_level,
            profile.cognitive_style,
            profile.practice_preference,
        ]
        missing_count = sum(1 for value in required_values if value in (None, "", []))
        return round(max(0.0, 0.9 - missing_count * 0.1), 2)

    def _learning_stage(self, profile: StudentProfile) -> str:
        if self._enum_value(profile.knowledge_base_level) == DifficultyLevel.easy.value:
            return "基础补强阶段"
        return "持续提升阶段"

    def _weakness_summary(self, profile: StudentProfile) -> str:
        weak_text = " ".join(profile.weak_node_ids + profile.common_mistakes)
        if "链表" in weak_text and "递归" in weak_text:
            return "链表和递归是当前主要薄弱点"
        if profile.weak_node_ids:
            return "当前存在薄弱知识点，需要优先补强"
        return "当前画像未显示明显薄弱点"

    def _preferred_resource_types(self, profile: StudentProfile) -> list[str]:
        values: list[str] = []

        if self._enum_value(profile.cognitive_style) == CognitiveStyle.diagram.value:
            values.append(ResourceType.mind_map.value)
        if self._enum_value(profile.practice_preference) == PracticePreference.coding.value:
            values.append(ResourceType.code_case.value)
            values.append(ResourceType.practice_question.value)

        for resource_type in profile.resource_preference:
            values.append(self._enum_value(resource_type))

        return self._unique(values)

    def _focus_question_types(self, profile: StudentProfile) -> list[str]:
        values = []
        if self._enum_value(profile.practice_preference) == PracticePreference.coding.value:
            values.append(QuestionType.coding.value)
        values.extend([QuestionType.single_choice.value, QuestionType.short_answer.value])
        return self._unique(values)

    def _suggested_daily_task_minutes(self, available_study_time: str | None) -> int:
        if available_study_time and ("30分钟" in available_study_time or "30 分钟" in available_study_time):
            return 30
        return 45

    def _enum_value(self, value) -> str | None:
        if value is None:
            return None
        return getattr(value, "value", value)

    def _unique(self, values: list[str | None]) -> list[str]:
        result = []
        for value in values:
            if value and value not in result:
                result.append(value)
        return result
