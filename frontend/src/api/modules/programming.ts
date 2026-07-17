import { request } from "@/api/client";
import type { PageRequest, PageResult } from "@/types/contracts";
import type { ProgrammingGenerateRequest, ProgrammingJudgeResult, ProgrammingQuestion, ProgrammingSubmissionRequest } from "@/types/programming";

const programmingGenerateTimeout = 2 * 60 * 1000;

export const programmingApi = {
  generateQuestions(payload: ProgrammingGenerateRequest) {
    return request<ProgrammingQuestion[]>({
      method: "POST",
      url: "/programming/questions/generate",
      data: payload,
      timeout: programmingGenerateTimeout
    });
  },
  listQuestions(params: PageRequest) { return request<PageResult<ProgrammingQuestion>>({ method: "GET", url: "/programming/questions", params }); },
  getQuestion(questionId: string) { return request<ProgrammingQuestion>({ method: "GET", url: `/programming/questions/${questionId}` }); },
  submit(payload: ProgrammingSubmissionRequest) { return request<ProgrammingJudgeResult>({ method: "POST", url: "/programming/submissions", data: payload }); },
  listSubmissions(userId: string) { return request<ProgrammingJudgeResult[]>({ method: "GET", url: `/users/${userId}/programming-submissions` }); }
};
