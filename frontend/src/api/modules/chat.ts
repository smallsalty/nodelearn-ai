import { request, requestSseEvent } from "@/api/client";
import type { PageResult } from "@/types/contracts";
import type { ChatMessage, ChatRequest, ChatResult, ChatSession, ChatSessionQuery, ChatStreamEvent } from "@/types/agent";

export const chatApi = {
  createSession(payload: Partial<ChatSession>) {
    return request<ChatSession>({ method: "POST", url: "/chat/sessions", data: payload });
  },
  getSessions(params: ChatSessionQuery = { page: 1, pageSize: 20 }) {
    return request<PageResult<ChatSession>>({ method: "GET", url: "/chat/sessions", params });
  },
  getSession(sessionId: string) {
    return request<ChatSession>({ method: "GET", url: `/chat/sessions/${sessionId}` });
  },
  getMessages(sessionId: string) {
    return request<ChatMessage[]>({ method: "GET", url: `/chat/sessions/${sessionId}/messages` });
  },
  sendMessage(payload: ChatRequest) {
    return request<ChatResult>({ method: "POST", url: "/chat/send", data: payload, timeout: 2 * 60 * 1000 });
  },
  streamChat(sessionId: string) {
    return requestSseEvent<ChatStreamEvent>("/chat/stream", { sessionId });
  }
};

