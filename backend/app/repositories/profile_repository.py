from typing import Any

from app.schemas.common import CognitiveStyle, DifficultyLevel, PracticePreference, ResourceType
from app.schemas.profile import (
    ProfileUpdateByBehaviorRequest,
    ProfileUpdateByPracticeRequest,
    StudentProfile,
)

DEMO_TIME = "2026-05-28T10:00:00Z"
DEMO_USER_ID = "user_demo_001"


def demo_student_profile() -> StudentProfile:
    return StudentProfile(
        id="profile_demo_001",
        user_id=DEMO_USER_ID,
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
        created_at=DEMO_TIME,
        updated_at=DEMO_TIME,
    )


class ProfileRepository:
    def __init__(self) -> None:
        self._profiles: dict[str, StudentProfile] = {DEMO_USER_ID: demo_student_profile()}

    def get_by_user_id(self, user_id: str) -> StudentProfile:
        profile = self._profiles.get(user_id)
        if profile is None:
            profile = demo_student_profile().model_copy(update={"user_id": user_id})
            self._profiles[user_id] = profile
        return profile.model_copy(deep=True)

    def update_profile(self, user_id: str, updates: dict[str, Any]) -> StudentProfile:
        profile = self.get_by_user_id(user_id)
        payload = profile.model_dump(by_alias=True)
        payload.update(updates)
        payload["userId"] = user_id
        payload["updatedAt"] = DEMO_TIME
        updated = StudentProfile(**payload)
        self._profiles[user_id] = updated
        return updated.model_copy(deep=True)

    def update_by_behavior(self, payload: ProfileUpdateByBehaviorRequest) -> StudentProfile:
        profile = self.get_by_user_id(payload.user_id)
        updated = profile.model_copy(update={"last_updated_by": "behavior", "updated_at": DEMO_TIME})
        self._profiles[payload.user_id] = updated
        return updated.model_copy(deep=True)

    def update_by_practice(self, payload: ProfileUpdateByPracticeRequest) -> StudentProfile:
        profile = self.get_by_user_id(payload.user_id)
        weak_node_ids = list(profile.weak_node_ids)
        common_mistakes = list(profile.common_mistakes)

        if not payload.is_correct and payload.node_id and payload.node_id not in weak_node_ids:
            weak_node_ids.append(payload.node_id)
        if payload.mistake_reason and payload.mistake_reason not in common_mistakes:
            common_mistakes.append(payload.mistake_reason)

        updated = profile.model_copy(
            update={
                "current_course_id": payload.course_id,
                "weak_node_ids": weak_node_ids,
                "common_mistakes": common_mistakes,
                "last_updated_by": "practice",
                "updated_at": DEMO_TIME,
            }
        )
        self._profiles[payload.user_id] = updated
        return updated.model_copy(deep=True)


default_profile_repository = ProfileRepository()
