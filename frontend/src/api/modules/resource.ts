import { request } from "@/api/client";
import type { PageRequest, PageResult } from "@/types/contracts";
import type {
  GeneratedResource,
  KnowledgeBuildRequest,
  KnowledgeBuildTask,
  KnowledgeSearchRequest,
  RecommendationRequest,
  ResourceGenerateRequest,
  ResourceGenerateResult,
  ResourcePushRecord,
  ResourceRecommendation,
  RetrievedDocument,
  UploadedFile
} from "@/types/resource";

export const resourceApi = {
  uploadFile(payload: FormData) {
    return request<UploadedFile>({ method: "POST", url: "/files/upload", data: payload });
  },
  getFile(fileId: string) {
    return request<UploadedFile>({ method: "GET", url: `/files/${fileId}` });
  },
  deleteFile(fileId: string) {
    return request<boolean>({ method: "DELETE", url: `/files/${fileId}` });
  },
  buildKnowledgeBase(payload: KnowledgeBuildRequest) {
    return request<KnowledgeBuildTask>({ method: "POST", url: "/knowledge-base/build", data: payload });
  },
  getKnowledgeBuildTask(taskId: string) {
    return request<KnowledgeBuildTask>({ method: "GET", url: `/knowledge-base/build-tasks/${taskId}` });
  },
  searchKnowledgeBase(payload: KnowledgeSearchRequest) {
    return request<RetrievedDocument[]>({ method: "POST", url: "/knowledge-base/search", data: payload });
  },
  embedText(payload: { text: string; courseId?: string }) {
    return request<number[]>({ method: "POST", url: "/knowledge-base/embed", data: payload });
  },
  generateResource(payload: ResourceGenerateRequest) {
    return request<ResourceGenerateResult>({ method: "POST", url: "/resources/generate", data: payload });
  },
  getGenerationTask(taskId: string) {
    return request<ResourceGenerateResult>({ method: "GET", url: `/resources/generation-tasks/${taskId}` });
  },
  getResource(resourceId: string) {
    return request<GeneratedResource>({ method: "GET", url: `/resources/${resourceId}` });
  },
  listUserResources(userId: string, params: PageRequest) {
    return request<PageResult<GeneratedResource>>({ method: "GET", url: `/users/${userId}/resources`, params });
  },
  listNodeResources(nodeId: string) {
    return request<GeneratedResource[]>({ method: "GET", url: `/nodes/${nodeId}/generated-resources` });
  },
  deleteResource(resourceId: string) {
    return request<boolean>({ method: "DELETE", url: `/resources/${resourceId}` });
  },
  recommendResources(payload: RecommendationRequest) {
    return request<ResourceRecommendation[]>({ method: "POST", url: "/recommendations/resources", data: payload });
  },
  listUserRecommendations(userId: string) {
    return request<ResourceRecommendation[]>({ method: "GET", url: `/users/${userId}/recommendations` });
  },
  markRecommendationViewed(recommendationId: string) {
    return request<boolean>({ method: "POST", url: `/recommendations/${recommendationId}/viewed` });
  },
  listPushRecords(userId: string) {
    return request<ResourcePushRecord[]>({ method: "GET", url: `/users/${userId}/push-records` });
  }
};
