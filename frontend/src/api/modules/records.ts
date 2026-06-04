import { reportApi } from "./report";

export const recordsApi = {
  createLearningRecord: reportApi.createLearningRecord,
  getUserLearningRecords: reportApi.getUserLearningRecords,
  getEvaluation: reportApi.getEvaluation,
  refreshEvaluation: reportApi.refreshEvaluation
};

