import { request } from "@/api/client";
import type { PageRequest, PageResult } from "@/types/contracts";
import type {
  AuditCheckRequest,
  AuditResult,
  LearningEvaluation,
  LearningRecord,
  LearningRecordCreateRequest,
  ModelCallLog,
  StudyReport,
  StudyReportGenerateRequest
} from "@/types/report";

export const reportApi = {
  createLearningRecord(payload: LearningRecordCreateRequest) {
    return request<LearningRecord>({ method: "POST", url: "/learning-records", data: payload });
  },
  listLearningRecords(userId: string) {
    return request<LearningRecord[]>({ method: "GET", url: `/users/${userId}/learning-records` });
  },
  getEvaluation(userId: string, courseId: string) {
    return request<LearningEvaluation>({ method: "GET", url: `/users/${userId}/courses/${courseId}/evaluation` });
  },
  refreshEvaluation(userId: string, courseId: string) {
    return request<LearningEvaluation>({
      method: "POST",
      url: `/users/${userId}/courses/${courseId}/evaluation/refresh`
    });
  },
  generateReport(payload: StudyReportGenerateRequest) {
    return request<StudyReport>({ method: "POST", url: "/reports/generate", data: payload });
  },
  listUserReports(userId: string) {
    return request<StudyReport[]>({ method: "GET", url: `/users/${userId}/reports` });
  },
  getReport(reportId: string) {
    return request<StudyReport>({ method: "GET", url: `/reports/${reportId}` });
  },
  exportReportPdf(reportId: string) {
    return request<{ pdfUrl: string }>({ method: "GET", url: `/reports/${reportId}/export-pdf` });
  },
  deleteReport(reportId: string) {
    return request<boolean>({ method: "DELETE", url: `/reports/${reportId}` });
  },
  checkAudit(payload: AuditCheckRequest) {
    return request<AuditResult>({ method: "POST", url: "/audit/check", data: payload });
  },
  listAuditLogs(params: PageRequest) {
    return request<PageResult<AuditResult>>({ method: "GET", url: "/audit/logs", params });
  },
  listModelCallLogs(params: PageRequest) {
    return request<PageResult<ModelCallLog>>({ method: "GET", url: "/model-call-logs", params });
  }
};
