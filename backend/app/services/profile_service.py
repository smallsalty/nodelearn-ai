from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.agents.profile_agent import ProfileAgent
from app.schemas.common import CognitiveStyle, DifficultyLevel, PracticePreference, ResourceType
from app.schemas.profile import (
    ProfileExtractRequest,
    ProfileExtractResult,
    ProfileUpdateByBehaviorRequest,
    ProfileUpdateByPracticeRequest,
    StudentProfile,
)

MOCK_TIME = "2026-05-28T10:00:00Z"

PROFILE_FIELDS = [
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
]

PROFILE_LABELS = {
    "major": "专业",
    "grade": "年级",
    "currentCourseId": "当前课程",
    "learningGoal": "学习目标",
    "knowledgeBaseLevel": "知识基础水平",
    "learningProgress": "学习进度",
    "weakNodeIds": "薄弱知识点",
    "cognitiveStyle": "认知风格",
    "practicePreference": "练习偏好",
    "resourcePreference": "资源偏好",
    "commonMistakes": "常见易错点",
    "availableStudyTime": "学习时间安排",
}

SNAKE_TO_CAMEL = {
    "user_id": "userId",
    "current_course_id": "currentCourseId",
    "learning_goal": "learningGoal",
    "knowledge_base_level": "knowledgeBaseLevel",
    "learning_progress": "learningProgress",
    "weak_node_ids": "weakNodeIds",
    "cognitive_style": "cognitiveStyle",
    "practice_preference": "practicePreference",
    "resource_preference": "resourcePreference",
    "common_mistakes": "commonMistakes",
    "available_study_time": "availableStudyTime",
    "profile_summary": "profileSummary",
    "confidence_score": "confidenceScore",
    "last_updated_by": "lastUpdatedBy",
    "created_at": "createdAt",
    "updated_at": "updatedAt",
}

CAMEL_TO_SNAKE = {value: key for key, value in SNAKE_TO_CAMEL.items()}


class ProfileService:
    """Profile orchestration with mock persistence and agent boundaries."""

    def __init__(self, profile_agent: ProfileAgent | None = None) -> None:
        self.profile_agent = profile_agent or ProfileAgent()
        self._profiles: dict[str, StudentProfile] = {}

    def get_profile(self, user_id: str) -> StudentProfile:
        if user_id not in self._profiles:
            self._profiles[user_id] = self._create_default_profile(user_id)
        return self._profiles[user_id]

    def update_profile(self, user_id: str, payload: dict[str, Any], updated_by: str = "manual") -> StudentProfile:
        profile_data = self._to_camel_dict(self.get_profile(user_id))
        for key, value in payload.items():
            camel_key = SNAKE_TO_CAMEL.get(key, key)
            if camel_key in profile_data and value is not None:
                profile_data[camel_key] = value
        profile_data["lastUpdatedBy"] = updated_by
        profile_data["updatedAt"] = self._now()
        profile_data["profileSummary"] = self._build_profile_summary(profile_data)
        profile_data["confidenceScore"] = self._calculate_confidence(profile_data)
        profile = StudentProfile.model_validate(self._to_snake_dict(profile_data))
        self._profiles[user_id] = profile
        return profile

    def extract_profile(self, payload: ProfileExtractRequest) -> ProfileExtractResult:
        extracted_fields = self.profile_agent.extract_fields(payload.message, payload.history_messages)
        profile_data = self._to_camel_dict(self.get_profile(payload.user_id))
        merged = {**profile_data, **extracted_fields}
        merged["lastUpdatedBy"] = "dialogue"
        merged["profileSummary"] = self._build_profile_summary(merged)
        merged["confidenceScore"] = self._calculate_confidence(merged)
        missing_fields = self._missing_fields(merged)
        follow_up_questions = self._build_follow_up_questions(missing_fields)
        extracted_fields["profileSummary"] = merged["profileSummary"]
        return ProfileExtractResult(
            extracted_fields=extracted_fields,
            missing_fields=missing_fields,
            confidence_score=merged["confidenceScore"],
            follow_up_questions=follow_up_questions,
        )

    def update_by_behavior(self, payload: ProfileUpdateByBehaviorRequest) -> StudentProfile:
        patch: dict[str, Any] = {}
        if payload.course_id:
            patch["currentCourseId"] = payload.course_id
        if payload.node_id and str(payload.behavior_type) in {"answer_question", "review_wrong_question"}:
            existing = self._to_camel_dict(self.get_profile(payload.user_id)).get("weakNodeIds", [])
            patch["weakNodeIds"] = list(dict.fromkeys([*existing, payload.node_id]))
        return self.update_profile(payload.user_id, patch, "behavior")

    def update_by_practice(self, payload: ProfileUpdateByPracticeRequest) -> StudentProfile:
        profile = self._to_camel_dict(self.get_profile(payload.user_id))
        patch: dict[str, Any] = {"currentCourseId": payload.course_id}
        if not payload.is_correct and payload.node_id:
            patch["weakNodeIds"] = list(dict.fromkeys([*profile.get("weakNodeIds", []), payload.node_id]))
        if payload.mistake_reason:
            patch["commonMistakes"] = list(dict.fromkeys([*profile.get("commonMistakes", []), payload.mistake_reason]))
        return self.update_profile(payload.user_id, patch, "practice")

    def _create_default_profile(self, user_id: str) -> StudentProfile:
        if user_id == "user_demo_001":
            return self._create_demo_profile()
        return StudentProfile(
            id=f"profile_{user_id}",
            user_id=user_id,
            weak_node_ids=[],
            cognitive_style=CognitiveStyle.mixed,
            practice_preference=PracticePreference.mixed,
            resource_preference=[ResourceType.lecture_doc],
            common_mistakes=[],
            confidence_score=0.1,
            last_updated_by="manual",
            created_at=MOCK_TIME,
            updated_at=MOCK_TIME,
        )

    def _create_demo_profile(self) -> StudentProfile:
        return StudentProfile(
            id="profile_demo_001",
            user_id="user_demo_001",
            major="计算机科学与技术",
            grade="大二",
            current_course_id="course_ds_001",
            learning_goal="准备数据结构期末考试",
            knowledge_base_level=DifficultyLevel.easy,
            learning_progress="数组已学完，链表学习中",
            weak_node_ids=["node_linked_list_001", "node_recursion_001"],
            cognitive_style=CognitiveStyle.diagram,
            practice_preference=PracticePreference.coding,
            resource_preference=[
                ResourceType.lecture_doc,
                ResourceType.mind_map,
                ResourceType.practice_question,
                ResourceType.code_case,
            ],
            common_mistakes=["链表指针断链", "递归终止条件错误", "数组下标越界"],
            available_study_time="每天晚上30分钟",
            profile_summary="学生具备基础编程能力，但链表和递归较弱，偏好图解和代码练习。",
            confidence_score=0.82,
            last_updated_by="manual",
            created_at=MOCK_TIME,
            updated_at=MOCK_TIME,
        )

    def _missing_fields(self, profile_data: dict[str, Any]) -> list[str]:
        return [field for field in PROFILE_FIELDS if not profile_data.get(field)]

    def _build_follow_up_questions(self, missing_fields: list[str]) -> list[str]:
        question_map = {
            "currentCourseId": "你当前主要学习哪门课程？例如数据结构。",
            "learningGoal": "你希望通过这门课达成什么学习目标？",
            "knowledgeBaseLevel": "你觉得自己的基础更接近入门、一般、较好还是挑战提升？",
            "weakNodeIds": "目前哪些知识点最薄弱？比如数组、链表、栈、树或排序。",
            "learningProgress": "你现在学到课程的哪个章节或知识点了？",
            "commonMistakes": "做题时最常见的错误是什么？",
            "cognitiveStyle": "你更喜欢文字讲解、图示、示例、代码，还是混合方式？",
            "practicePreference": "你更偏好选择题、编程题、案例分析，还是混合练习？",
            "resourcePreference": "你更想要讲解文档、思维导图、练习题还是代码案例？",
            "availableStudyTime": "你通常每周或每天能安排多少学习时间？",
            "major": "你的专业是什么？",
            "grade": "你现在是哪个年级？",
        }
        return [question_map[field] for field in missing_fields[:2] if field in question_map]

    def _build_profile_summary(self, profile_data: dict[str, Any]) -> str:
        labels = []
        for field in PROFILE_FIELDS:
            value = profile_data.get(field)
            if value:
                labels.append(f"{PROFILE_LABELS[field]}：{value}")
        return "；".join(labels[:10])

    def _calculate_confidence(self, profile_data: dict[str, Any]) -> float:
        filled_count = len(PROFILE_FIELDS) - len(self._missing_fields(profile_data))
        return round(filled_count / len(PROFILE_FIELDS), 2)

    def _to_camel_dict(self, profile: StudentProfile) -> dict[str, Any]:
        return profile.model_dump(by_alias=True)

    def _to_snake_dict(self, data: dict[str, Any]) -> dict[str, Any]:
        return {CAMEL_TO_SNAKE.get(key, key): value for key, value in data.items()}

    def _now(self) -> str:
        return datetime.now(UTC).isoformat()
