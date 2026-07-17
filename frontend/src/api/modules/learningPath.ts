import { request } from "@/api/client";
import type {
  LearningPath,
  LearningPathGenerateRequest,
  LearningTask,
  LearningTaskStatusUpdateRequest
} from "@/types/learningPath";

const learningPathGenerateTimeout = 3 * 60 * 1000;

export const learningPathApi = {
  generateLearningPath(payload: LearningPathGenerateRequest) {
    return request<LearningPath>({
      method: "POST",
      url: "/learning-paths/generate",
      data: payload,
      timeout: learningPathGenerateTimeout
    });
  },
  generatePath(payload: LearningPathGenerateRequest) {
    return request<LearningPath>({
      method: "POST",
      url: "/learning-paths/generate",
      data: payload,
      timeout: learningPathGenerateTimeout
    });
  },
  getUserLearningPaths(userId: string) {
    return request<LearningPath[]>({ method: "GET", url: `/users/${userId}/learning-paths` });
  },
  listUserPaths(userId: string) {
    return request<LearningPath[]>({ method: "GET", url: `/users/${userId}/learning-paths` });
  },
  getLearningPath(pathId: string) {
    return request<LearningPath>({ method: "GET", url: `/learning-paths/${pathId}` });
  },
  getPath(pathId: string) {
    return request<LearningPath>({ method: "GET", url: `/learning-paths/${pathId}` });
  },
  updatePath(pathId: string, payload: Partial<LearningPath>) {
    return request<LearningPath>({ method: "PUT", url: `/learning-paths/${pathId}`, data: payload });
  },
  updateLearningPath(pathId: string, payload: Partial<LearningPath>) {
    return request<LearningPath>({ method: "PUT", url: `/learning-paths/${pathId}`, data: payload });
  },
  getLearningTasks(pathId: string) {
    return request<LearningTask[]>({ method: "GET", url: `/learning-paths/${pathId}/tasks` });
  },
  listPathTasks(pathId: string) {
    return request<LearningTask[]>({ method: "GET", url: `/learning-paths/${pathId}/tasks` });
  },
  updateLearningTaskStatus(taskId: string, payload: LearningTaskStatusUpdateRequest) {
    return request<LearningTask>({ method: "PUT", url: `/learning-tasks/${taskId}/status`, data: payload });
  },
  updateTaskStatus(taskId: string, payload: LearningTaskStatusUpdateRequest) {
    return request<LearningTask>({ method: "PUT", url: `/learning-tasks/${taskId}/status`, data: payload });
  }
};
