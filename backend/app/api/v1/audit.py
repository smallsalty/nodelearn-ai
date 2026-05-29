from fastapi import APIRouter

from app.core.response import success_response
from app.schemas.report import AuditCheckRequest
from app.services.audit_service import AuditService

router = APIRouter()
audit_service = AuditService()


@router.post("/audit/check")
async def check_audit(payload: AuditCheckRequest):
    result = await audit_service.check_content(
        content=payload.content,
        target_type=payload.target_type,
        target_id=payload.target_id,
    )
    return success_response(result)
