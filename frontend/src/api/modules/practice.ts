import { request } from "@/api/client";
import type { ApiResponse, PageRequest, PageResult } from "@/types/contracts";
import type {
  PracticeGenerateRequest,
  PracticeQuestion,
  PracticeRecord,
  PracticeSubmitRequest
} from "@/types/practice";

const enableMock = import.meta.env.VITE_ENABLE_MOCK === "true";

function mockResponse<T>(data: T): ApiResponse<T> {
  return {
    code: 200,
    message: "success",
    data,
    traceId: `trace_mock_${Date.now()}`,
    timestamp: new Date().toISOString()
  };
}

function mockPracticeRecord(payload: PracticeSubmitRequest): ApiResponse<PracticeRecord> {
  const correctAnswer = "栈顶";
  const isCorrect = payload.userAnswer.trim() === correctAnswer;

  return mockResponse({
    id: `practice_record_${Date.now()}`,
    userId: payload.userId,
    questionId: payload.questionId,
    nodeId: "node_stack_001",
    userAnswer: payload.userAnswer,
    correctAnswer,
    isCorrect,
    score: isCorrect ? 100 : 60,
    mistakeReason: isCorrect ? "" : "需要区分栈顶和栈底，出栈遵循后进先出。",
    durationSeconds: payload.durationSeconds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

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
    if (enableMock) {
      return Promise.resolve(mockPracticeRecord(payload));
    }
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
