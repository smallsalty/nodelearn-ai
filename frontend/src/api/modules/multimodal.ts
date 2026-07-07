import { request } from "@/api/client";
import type { ChatMessage } from "@/types/agent";
import type {
  DigitalHumanCallbackRequest,
  DigitalHumanChatRequest,
  DigitalHumanChatResult,
  DigitalHumanExplainRequest,
  DigitalHumanExplainResult,
  MultimodalStreamEvent,
  MultimodalTaskEvent,
  MultimodalTaskResult,
  MultimodalVideoGenerateRequest
} from "@/types/multimodal";

export const multimodalApi = {
  generateVideo(payload: MultimodalVideoGenerateRequest) {
    return request<MultimodalTaskResult>({
      method: "POST",
      url: "/multimodal/videos/generate",
      data: payload,
      timeout: 10 * 60 * 1000
    });
  },
  getVideoTask(taskId: string) {
    return request<MultimodalTaskResult>({ method: "GET", url: `/multimodal/videos/tasks/${taskId}` });
  },
  getVideoTaskEvents(taskId: string) {
    return request<MultimodalTaskEvent[]>({ method: "GET", url: `/multimodal/videos/tasks/${taskId}/events` });
  },
  streamVideoTask(taskId: string) {
    return request<MultimodalStreamEvent>({ method: "GET", url: "/multimodal/videos/stream", params: { taskId } });
  },
  explainWithDigitalHuman(payload: DigitalHumanExplainRequest) {
    return request<DigitalHumanExplainResult>({
      method: "POST",
      url: "/multimodal/digital-human/explain",
      data: payload,
      timeout: 10 * 60 * 1000
    });
  },
  chatWithDigitalHuman(payload: DigitalHumanChatRequest) {
    return request<DigitalHumanChatResult>({
      method: "POST",
      url: "/multimodal/digital-human/chat",
      data: payload,
      timeout: 2 * 60 * 1000
    });
  },
  getDigitalHumanMessages(sessionId: string) {
    return request<ChatMessage[]>({ method: "GET", url: `/multimodal/digital-human/sessions/${sessionId}/messages` });
  },
  handleDigitalHumanCallback(payload: DigitalHumanCallbackRequest) {
    return request<MultimodalTaskResult>({ method: "POST", url: "/multimodal/digital-human/callback", data: payload });
  }
};
