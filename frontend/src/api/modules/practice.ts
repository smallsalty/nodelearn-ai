import { request } from "@/api/client";
import type { PageRequest, PageResult } from "@/types/contracts";
import type {
  PracticeGenerateRequest,
  PracticeQuestion,
  PracticeRecord,
  PracticeSubmitRequest
} from "@/types/practice";

export const practiceApi = {
  generateQuestions(payload: PracticeGenerateRequest) {
    return request<PracticeQuestion[]>({ method: "POST", url: "/practices/generate", data: payload });
  },
  listQuestions(params: PageRequest) {
    return request<PageResult<PracticeQuestion>>({ method: "GET", url: "/practices/questions", params });
  },
  getQuestion(questionId: string) {
    return request<PracticeQuestion>({ method: "GET", url: `/practices/questions/${questionId}` });
  },
  submitAnswer(payload: PracticeSubmitRequest) {
    return request<PracticeRecord>({ method: "POST", url: "/practices/submit", data: payload });
  },
  listPracticeRecords(userId: string) {
    return request<PracticeRecord[]>({ method: "GET", url: `/users/${userId}/practice-records` });
  },
  listWrongQuestions(userId: string) {
    return request<PracticeQuestion[]>({ method: "GET", url: `/users/${userId}/wrong-questions` });
  },
  removeWrongQuestion(userId: string, questionId: string) {
    return request<boolean>({ method: "DELETE", url: `/users/${userId}/wrong-questions/${questionId}` });
  }
};
