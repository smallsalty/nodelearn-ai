from fastapi import APIRouter, Path

from app.core.response import success_response
from app.schemas.profile import (
    ProfileExtractRequest,
    ProfileUpdateByBehaviorRequest,
    ProfileUpdateByPracticeRequest,
)
from app.services.profile_service import ProfileService

router = APIRouter()
profile_service = ProfileService()


@router.get("/profiles/{userId}")
def get_profile(user_id: str = Path(alias="userId")):
    return success_response(profile_service.get_profile(user_id))


@router.put("/profiles/{userId}")
def update_profile(payload: dict, user_id: str = Path(alias="userId")):
    return success_response(profile_service.update_profile(user_id, payload))


@router.post("/profiles/extract")
async def extract_profile(payload: ProfileExtractRequest):
    return success_response(await profile_service.extract_profile(payload))


@router.post("/profiles/update-by-behavior")
def update_by_behavior(payload: ProfileUpdateByBehaviorRequest):
    return success_response(profile_service.update_by_behavior(payload))


@router.post("/profiles/update-by-practice")
def update_by_practice(payload: ProfileUpdateByPracticeRequest):
    return success_response(profile_service.update_by_practice(payload))
