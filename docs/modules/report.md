# Report Module

Source: `docs/interface-contract.md` sections 16, 17, and 18.

## Types

- `LearningRecord`
- `LearningRecordCreateRequest`
- `LearningEvaluation`
- `StudyReport`
- `StudyReportGenerateRequest`
- `AuditResult`
- `AuditCheckRequest`
- `ModelCallLog`

## Routes

- `POST /api/v1/learning-records`
- `GET /api/v1/users/{userId}/learning-records`
- `GET /api/v1/users/{userId}/courses/{courseId}/evaluation`
- `POST /api/v1/users/{userId}/courses/{courseId}/evaluation/refresh`
- `POST /api/v1/reports/generate`
- `GET /api/v1/users/{userId}/reports`
- `GET /api/v1/reports/{reportId}`
- `GET /api/v1/reports/{reportId}/export-pdf`
- `DELETE /api/v1/reports/{reportId}`
- `POST /api/v1/audit/check`
- `GET /api/v1/audit/logs`
- `GET /api/v1/model-call-logs`

## Frontend

- Page: `frontend/src/pages/ReportPage.vue`
- API: `frontend/src/api/modules/report.ts`
- Types: `frontend/src/types/report.ts`

## Backend

- Route file: `backend/app/api/v1/reports.py`
- Schema file: `backend/app/schemas/report.py`
- Service file: `backend/app/services/report_service.py`
- Agent files: `backend/app/agents/report_agent.py`, `backend/app/agents/safety_agent.py`

## Forbidden

- Do not add `AuditStatus`, `BehaviorType`, or audit `targetType` values.
- Do not bypass safety or audit before generated report/resource availability.
