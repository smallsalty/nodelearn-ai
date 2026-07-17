from fastapi import APIRouter, Path, Query

from app.core.response import page_result, success_response
from app.schemas.common import AuditStatus, BehaviorType
from app.schemas.report import (
    AuditResult,
    LearningEvaluation,
    LearningRecord,
    LearningRecordCreateRequest,
    ModelCallLog,
    StudyReport,
    StudyReportGenerateRequest,
)
from app.services.providers.iflytek.client import PROVIDER_CALL_LOGS

router = APIRouter()

MOCK_TIME = "2026-05-19T10:00:00Z"


def mock_record(user_id: str = "user_demo_001") -> LearningRecord:
    return LearningRecord(id="learning_record_demo_001", user_id=user_id, course_id="course_ds_001", behavior_type=BehaviorType.view_resource, created_at=MOCK_TIME)


def mock_evaluation(user_id: str = "user_demo_001", course_id: str = "course_ds_001") -> LearningEvaluation:
    return LearningEvaluation(
        user_id=user_id,
        course_id=course_id,
        completion_rate=0,
        correct_rate=0,
        weak_node_ids=[],
        mastered_node_ids=[],
        average_mastery_score=0,
        progress_trend=[],
        advice="mock",
    )


def mock_report(report_id: str = "report_demo_001", user_id: str = "user_demo_001") -> StudyReport:
    return StudyReport(
        id=report_id,
        user_id=user_id,
        course_id="course_ds_001",
        title="Mock Report",
        summary="mock",
        completion_rate=0,
        correct_rate=0,
        weak_node_summary="mock",
        improvement_advice="mock",
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


@router.post("/learning-records")
def create_learning_record(payload: LearningRecordCreateRequest):
    return success_response(mock_record(payload.user_id))


@router.get("/users/{userId}/learning-records")
def list_learning_records(user_id: str = Path(alias="userId")):
    return success_response([mock_record(user_id)])


@router.get("/users/{userId}/courses/{courseId}/evaluation")
def get_evaluation(user_id: str = Path(alias="userId"), course_id: str = Path(alias="courseId")):
    return success_response(mock_evaluation(user_id, course_id))


@router.post("/users/{userId}/courses/{courseId}/evaluation/refresh")
def refresh_evaluation(user_id: str = Path(alias="userId"), course_id: str = Path(alias="courseId")):
    return success_response(mock_evaluation(user_id, course_id))


@router.post("/reports/generate")
def generate_report(payload: StudyReportGenerateRequest):
    return success_response(mock_report(user_id=payload.user_id))


@router.get("/users/{userId}/reports")
def list_user_reports(user_id: str = Path(alias="userId")):
    return success_response([mock_report(user_id=user_id)])


@router.get("/reports/{reportId}")
def get_report(report_id: str = Path(alias="reportId")):
    return success_response(mock_report(report_id))


@router.get("/reports/{reportId}/export-pdf")
def export_report_pdf(report_id: str = Path(alias="reportId")):
    return success_response({"pdfUrl": f"/reports/{report_id}.pdf"})


@router.delete("/reports/{reportId}")
def delete_report(report_id: str = Path(alias="reportId")):
    return success_response(True)


@router.get("/audit/logs")
def list_audit_logs(page: int = 1, page_size: int = Query(10, alias="pageSize"), keyword: str | None = None, sort_by: str | None = Query(None, alias="sortBy"), sort_order: str | None = Query(None, alias="sortOrder")):
    result = AuditResult(id="audit_demo_001", target_type="message", target_id="message_demo_001", audit_status=AuditStatus.unchecked, risk_labels=[], created_at=MOCK_TIME)
    return success_response(page_result([result], 1, page, page_size))


@router.get("/model-call-logs")
def list_model_call_logs(page: int = 1, page_size: int = Query(10, alias="pageSize"), keyword: str | None = None, sort_by: str | None = Query(None, alias="sortBy"), sort_order: str | None = Query(None, alias="sortOrder")):
    logs = [
        ModelCallLog(
            id=entry.id,
            provider=entry.provider,
            model_name=entry.model_name,
            latency_ms=entry.latency_ms,
            success=entry.success,
            error_message=entry.error_message,
            created_at=MOCK_TIME,
        )
        for entry in PROVIDER_CALL_LOGS
    ]
    if not logs:
        logs = [ModelCallLog(id="model_log_demo_001", provider="mock", model_name="mock", success=True, created_at=MOCK_TIME)]
    return success_response(page_result(logs, len(logs), page, page_size))
