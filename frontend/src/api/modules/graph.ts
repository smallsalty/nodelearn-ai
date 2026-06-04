import { request } from "@/api/client";
import type { MasteryStatus } from "@/types/contracts";
import type { GraphNode, KnowledgeGraph } from "@/types/graph";

export const graphApi = {
  getCourseGraph(courseId: string) {
    return request<KnowledgeGraph>({ method: "GET", url: `/courses/${courseId}/graph` });
  },
  getUserCourseGraph(userId: string, courseId: string) {
    return request<KnowledgeGraph>({ method: "GET", url: `/users/${userId}/courses/${courseId}/graph` });
  },
  updateNodeMastery(userId: string, nodeId: string, payload: { masteryScore: number; masteryStatus: MasteryStatus }) {
    return request<GraphNode>({ method: "PUT", url: `/users/${userId}/nodes/${nodeId}/mastery`, data: payload });
  },
  updateMastery(userId: string, nodeId: string, payload: { masteryScore: number; masteryStatus: MasteryStatus }) {
    return request<GraphNode>({ method: "PUT", url: `/users/${userId}/nodes/${nodeId}/mastery`, data: payload });
  }
};
