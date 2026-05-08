from fastapi import APIRouter

router = APIRouter(prefix="/admin/kb", tags=["admin_kb"])


@router.get("/")
async def admin_kb_root():
    pass
