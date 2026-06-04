import { reportApi } from "./report";

export const auditApi = {
  checkAudit: reportApi.checkAudit,
  getAuditLogs: reportApi.listAuditLogs,
  getModelCallLogs: reportApi.listModelCallLogs
};

