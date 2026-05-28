from app.schemas.common import AuditStatus
from app.schemas.report import AuditResult

MOCK_TIME = "2026-05-19T10:00:00Z"


class AuditService:
    """Minimal mock content audit rules for the current scaffold stage."""

    abnormal_markers = (
        "明显异常",
        "异常内容",
        "ignore previous",
        "drop table",
        "rm -rf",
        "hack",
        "attack",
    )

    async def check_content(
        self,
        content: str,
        target_type: str = "message",
        target_id: str = "audit_target_mock",
    ) -> AuditResult:
        normalized = content.strip()
        lowered = normalized.lower()

        if not normalized:
            return AuditResult(
                id="audit_result_mock_rejected",
                target_type=target_type,
                target_id=target_id,
                audit_status=AuditStatus.rejected,
                risk_labels=["empty_content"],
                reason="content is empty",
                created_at=MOCK_TIME,
            )

        if any(marker in lowered or marker in normalized for marker in self.abnormal_markers):
            return AuditResult(
                id="audit_result_mock_need_review",
                target_type=target_type,
                target_id=target_id,
                audit_status=AuditStatus.need_review,
                risk_labels=["abnormal_content"],
                reason="content needs manual review",
                created_at=MOCK_TIME,
            )

        return AuditResult(
            id="audit_result_mock_passed",
            target_type=target_type,
            target_id=target_id,
            audit_status=AuditStatus.passed,
            risk_labels=[],
            reason=None,
            created_at=MOCK_TIME,
        )
