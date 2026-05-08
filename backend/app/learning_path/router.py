from fastapi import APIRouter

router = APIRouter(prefix="/learning-path", tags=["learning_path"])


@router.get("/")
async def learning_path_root():
    pass
