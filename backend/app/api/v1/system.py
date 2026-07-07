from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.core.response import success_response
from app.db.session import engine
from app.schemas.common import HealthCheckResult, SystemConfig, VersionResult

router = APIRouter()


@router.get("/system/health")
def health_check():
    database_status = _database_status()
    llm_status = "ok" if settings.enable_mock or (settings.llm_api_key and settings.llm_base_url) else "error"
    status = "ok" if database_status == "ok" and llm_status == "ok" else "error"
    result = HealthCheckResult(
        status=status,
        database=database_status,
        redis="ok",
        vector_store="ok",
        graph_db="ok",
        llm_service=llm_status,
        iflytek_spark=_iflytek_status("spark"),
        iflytek_tts=_iflytek_status("tts"),
        iflytek_digital_human=_iflytek_status("digital_human"),
    )
    return success_response(result)


def _database_status() -> str:
    if settings.enable_mock:
        return "ok"
    if engine is None:
        return "error"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "ok"
    except Exception:
        return "error"


def _iflytek_status(kind: str) -> str:
    if settings.enable_mock or settings.iflytek_enable_mock:
        return "mock"
    has_common_config = bool(settings.iflytek_app_id and settings.iflytek_api_key and settings.iflytek_api_secret)
    if not has_common_config:
        return "mock"
    if kind == "spark":
        return "ok" if settings.iflytek_base_url and settings.iflytek_spark_model else "error"
    if kind == "tts":
        return "ok" if settings.iflytek_base_url and settings.iflytek_tts_voice else "error"
    if kind == "digital_human":
        return "ok" if settings.iflytek_digital_human_base_url else "error"
    return "error"


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
