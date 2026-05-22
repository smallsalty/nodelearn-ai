from fastapi import APIRouter

from app.core.config import settings
from app.core.response import success_response
from app.schemas.common import HealthCheckResult, SystemConfig, VersionResult

router = APIRouter()


@router.get("/system/health")
def health_check():
    result = HealthCheckResult(
        status="ok",
        database="ok",
        redis="ok",
        vector_store="ok",
        graph_db="ok",
        llm_service="ok",
    )
    return success_response(result)


@router.get("/system/config")
def system_config():
    result = SystemConfig(
        app_name=settings.app_name,
        app_version=settings.app_version,
        enable_mock=settings.enable_mock,
        enable_stream_output=settings.enable_stream_output,
        enable_safety_audit=settings.enable_safety_audit,
    )
    return success_response(result)


@router.get("/system/version")
def system_version():
    return success_response(VersionResult(version=settings.app_version))
