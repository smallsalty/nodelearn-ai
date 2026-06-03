import { request } from "@/api/client";
import type { PageRequest, PageResult } from "@/types/contracts";
import type { ChatMessage, ChatRequest, ChatResult, ChatSession, ChatStreamEvent } from "@/types/agent";

export const chatApi = {
  createSession(payload: Partial<ChatSession>) {
    return request<ChatSession>({ method: "POST", url: "/chat/sessions", data: payload });
  },
  getSessions(params: PageRequest = { page: 1, pageSize: 20 }) {
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
    return request<ChatStreamEvent>({ method: "GET", url: "/chat/stream", params: { sessionId } });
  }
};

