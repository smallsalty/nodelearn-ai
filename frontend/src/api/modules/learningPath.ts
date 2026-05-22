import { request } from "@/api/client";
import type {
  LearningPath,
  LearningPathGenerateRequest,
  LearningTask,
  LearningTaskStatusUpdateRequest
} from "@/types/learningPath";

export const learningPathApi = {
  generatePath(payload: LearningPathGenerateRequest) {
    return request<LearningPath>({ method: "POST", url: "/learning-paths/generate", data: payload });
  },
  listUserPaths(userId: string) {
    return request<LearningPath[]>({ method: "GET", url: `/users/${userId}/learning-paths` });
  },
  getPath(pathId: string) {
    return request<LearningPath>({ method: "GET", url: `/learning-paths/${pathId}` });
  },
  updatePath(pathId: string, payload: Partial<LearningPath>) {
    return request<LearningPath>({ method: "PUT", url: `/learning-paths/${pathId}`, data: payload });
  },
  listPathTasks(pathId: string) {
    return request<LearningTask[]>({ method: "GET", url: `/learning-paths/${pathId}/tasks` });
  },
  updateTaskStatus(taskId: string, payload: LearningTaskStatusUpdateRequest) {
    return request<LearningTask>({ method: "PUT", url: `/learning-tasks/${taskId}/status`, data: payload });
  }
};
