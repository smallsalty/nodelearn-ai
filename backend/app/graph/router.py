from fastapi import APIRouter

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/")
async def graph_root():
    pass
