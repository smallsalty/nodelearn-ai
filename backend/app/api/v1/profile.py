from fastapi import APIRouter, Path

from app.core.response import success_response
from app.schemas.common import CognitiveStyle, PracticePreference
from app.schemas.profile import (
    ProfileExtractRequest,
    ProfileExtractResult,
    ProfileUpdateByBehaviorRequest,
    ProfileUpdateByPracticeRequest,
    StudentProfile,
)

router = APIRouter()

MOCK_TIME = "2026-05-19T10:00:00Z"


def mock_profile(user_id: str = "user_demo_001") -> StudentProfile:
    return StudentProfile(
        id="profile_demo_001",
        user_id=user_id,
        weak_node_ids=[],
        cognitive_style=CognitiveStyle.mixed,
        practice_preference=PracticePreference.mixed,
        resource_preference=[],
        common_mistakes=[],
        confidence_score=0.8,
        last_updated_by="manual",
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


@router.get("/profiles/{userId}")
def get_profile(user_id: str = Path(alias="userId")):
    return success_response(mock_profile(user_id))


@router.put("/profiles/{userId}")
def update_profile(payload: dict, user_id: str = Path(alias="userId")):
    return success_response(mock_profile(user_id))


@router.post("/profiles/extract")
def extract_profile(payload: ProfileExtractRequest):
    result = ProfileExtractResult(extracted_fields={}, missing_fields=[], confidence_score=0.5, follow_up_questions=[])
    return success_response(result)


@router.post("/profiles/update-by-behavior")
def update_by_behavior(payload: ProfileUpdateByBehaviorRequest):
    return success_response(mock_profile(payload.user_id))


@router.post("/profiles/update-by-practice")
def update_by_practice(payload: ProfileUpdateByPracticeRequest):
    return success_response(mock_profile(payload.user_id))
