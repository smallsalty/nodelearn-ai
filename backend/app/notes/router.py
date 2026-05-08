from fastapi import APIRouter

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("/")
async def notes_root():
    pass
