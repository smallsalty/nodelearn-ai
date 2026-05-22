import { request } from "@/api/client";
import type { PageRequest, PageResult } from "@/types/contracts";
import type {
  Chapter,
  ChapterCreateRequest,
  Course,
  CourseCreateRequest,
  CourseUpdateRequest,
  KnowledgeNode,
  KnowledgeNodeCreateRequest,
  KnowledgeRelation
} from "@/types/course";

export const courseApi = {
  listCourses(params: PageRequest) {
    return request<PageResult<Course>>({ method: "GET", url: "/courses", params });
  },
  createCourse(payload: CourseCreateRequest) {
    return request<Course>({ method: "POST", url: "/courses", data: payload });
  },
  getCourse(courseId: string) {
    return request<Course>({ method: "GET", url: `/courses/${courseId}` });
  },
  updateCourse(courseId: string, payload: CourseUpdateRequest) {
    return request<Course>({ method: "PUT", url: `/courses/${courseId}`, data: payload });
  },
  deleteCourse(courseId: string) {
    return request<boolean>({ method: "DELETE", url: `/courses/${courseId}` });
  },
  listChapters(courseId: string) {
    return request<Chapter[]>({ method: "GET", url: `/courses/${courseId}/chapters` });
  },
  createChapter(courseId: string, payload: ChapterCreateRequest) {
    return request<Chapter>({ method: "POST", url: `/courses/${courseId}/chapters`, data: payload });
  },
  listNodes(courseId: string) {
    return request<KnowledgeNode[]>({ method: "GET", url: `/courses/${courseId}/nodes` });
  },
  createNode(courseId: string, payload: KnowledgeNodeCreateRequest) {
    return request<KnowledgeNode>({ method: "POST", url: `/courses/${courseId}/nodes`, data: payload });
  },
  getNode(nodeId: string) {
    return request<KnowledgeNode>({ method: "GET", url: `/nodes/${nodeId}` });
  },
  updateNode(nodeId: string, payload: Partial<KnowledgeNode>) {
    return request<KnowledgeNode>({ method: "PUT", url: `/nodes/${nodeId}`, data: payload });
  },
  deleteNode(nodeId: string) {
    return request<boolean>({ method: "DELETE", url: `/nodes/${nodeId}` });
  },
  listRelations(courseId: string) {
    return request<KnowledgeRelation[]>({ method: "GET", url: `/courses/${courseId}/relations` });
  },
  createRelation(courseId: string, payload: KnowledgeRelation) {
    return request<KnowledgeRelation>({ method: "POST", url: `/courses/${courseId}/relations`, data: payload });
  }
};
