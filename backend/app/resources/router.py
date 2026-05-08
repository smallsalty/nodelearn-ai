from fastapi import APIRouter

router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("/")
async def resources_root():
    pass
