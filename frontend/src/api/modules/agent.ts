import { request } from "@/api/client";
import type { PageRequest, PageResult } from "@/types/contracts";
import type {
  AgentRunRequest,
  AgentRunResult,
  AgentTaskEvent,
  ChatMessage,
  ChatRequest,
  ChatResult,
  ChatSession,
  MultiAgentWorkflowRequest,
  MultiAgentWorkflowResult
} from "@/types/agent";

export const agentApi = {
  createChatSession(payload: Partial<ChatSession>) {
    return request<ChatSession>({ method: "POST", url: "/chat/sessions", data: payload });
  },
  listChatSessions(params: PageRequest) {
    return request<PageResult<ChatSession>>({ method: "GET", url: "/chat/sessions", params });
  },
  getChatSession(sessionId: string) {
    return request<ChatSession>({ method: "GET", url: `/chat/sessions/${sessionId}` });
  },
  listChatMessages(sessionId: string) {
    return request<ChatMessage[]>({ method: "GET", url: `/chat/sessions/${sessionId}/messages` });
  },
  sendChat(payload: ChatRequest) {
    return request<ChatResult>({ method: "POST", url: "/chat/send", data: payload });
  },
  runAgent(payload: AgentRunRequest) {
    return request<AgentRunResult>({ method: "POST", url: "/agents/run", data: payload });
  },
  runWorkflow(payload: MultiAgentWorkflowRequest) {
    return request<MultiAgentWorkflowResult>({ method: "POST", url: "/agents/workflows/run", data: payload });
  },
  getAgentTask(taskId: string) {
    return request<MultiAgentWorkflowResult>({ method: "GET", url: `/agents/tasks/${taskId}` });
  },
  listAgentTaskEvents(taskId: string) {
    return request<AgentTaskEvent[]>({ method: "GET", url: `/agents/tasks/${taskId}/events` });
  }
};
