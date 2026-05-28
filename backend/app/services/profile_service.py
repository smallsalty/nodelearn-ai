from typing import Any

from app.repositories.profile_repository import ProfileRepository, default_profile_repository
from app.schemas.profile import (
    ProfileExtractRequest,
    ProfileExtractResult,
    ProfileUpdateByBehaviorRequest,
    ProfileUpdateByPracticeRequest,
    StudentProfile,
)


class ProfileService:
    def __init__(self, repository: ProfileRepository | None = None) -> None:
        self.repository = repository or default_profile_repository

    def get_profile(self, user_id: str) -> StudentProfile:
        return self.repository.get_by_user_id(user_id)

    def update_profile(self, user_id: str, updates: dict[str, Any]) -> StudentProfile:
        return self.repository.update_profile(user_id, updates)

    def extract_profile(self, payload: ProfileExtractRequest) -> ProfileExtractResult:
        return ProfileExtractResult(extracted_fields={}, missing_fields=[], confidence_score=0.5, follow_up_questions=[])

    def update_by_behavior(self, payload: ProfileUpdateByBehaviorRequest) -> StudentProfile:
        return self.repository.update_by_behavior(payload)

    def update_by_practice(self, payload: ProfileUpdateByPracticeRequest) -> StudentProfile:
        return self.repository.update_by_practice(payload)
