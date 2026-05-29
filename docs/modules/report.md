# 报告模块

来源：`docs/interface-contract.md` 第 16、17、18 节。

## 类型

- `LearningRecord`
- `LearningRecordCreateRequest`
- `LearningEvaluation`
- `StudyReport`
- `StudyReportGenerateRequest`
- `AuditResult`
- `AuditCheckRequest`
- `ModelCallLog`

## 路由

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

## 前端

- 页面：`frontend/src/pages/ReportPage.vue`
- API：`frontend/src/api/modules/report.ts`
- 类型：`frontend/src/types/report.ts`

## 后端

- 路由文件：`backend/app/api/v1/reports.py`
- 结构定义文件：`backend/app/schemas/report.py`
- 服务文件：`backend/app/services/report_service.py`
- 智能体文件：`backend/app/agents/report_agent.py`、`backend/app/agents/safety_agent.py`

## 禁止事项

- 不新增 `AuditStatus`、`BehaviorType` 或 audit `targetType` 值。
- 生成报告/资源可用前不得绕过 safety 或 audit。
