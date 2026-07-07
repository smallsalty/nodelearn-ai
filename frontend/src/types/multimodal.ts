import type { DifficultyLevel, TaskStatus } from "@/types/contracts";
import type { ChatMessage } from "@/types/agent";
import type { RetrievedDocument } from "@/types/resource";

export interface MultimodalVideoGenerateRequest {
  userId: string;
  courseId: string;
  nodeId: string;
  title?: string;
  learningGoal?: string;
  difficulty?: DifficultyLevel;
  durationSeconds?: number;
  style?: string;
  useDigitalHuman?: boolean;
  useRag: boolean;
  customRequirement?: string;
}

export interface MultimodalTaskResult {
  taskId: string;
  status: TaskStatus;
  progress: number;
  currentStep?: string;
  resourceId?: string;
  fileUrl?: string;
  videoUrl?: string;
  script?: string;
  storyboard?: Record<string, any>[];
  subtitleText?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MultimodalTaskEvent {
  taskId: string;
  eventType: "start" | "progress" | "step" | "done" | "error";
  stepName: string;
  progress: number;
  message: string;
  payload?: Record<string, any>;
  createdAt: string;
}

export interface MultimodalStreamEvent {
  taskId: string;
  eventType: "start" | "progress" | "step" | "done" | "error";
  progress: number;
  stepName?: string;
  message?: string;
  errorMessage?: string;
}

export interface DigitalHumanExplainRequest {
  userId: string;
  courseId: string;
  nodeId: string;
  avatarId?: string;
  voiceId?: string;
  useRag: boolean;
  customRequirement?: string;
}

export interface DigitalHumanExplainResult {
  taskId: string;
  status: TaskStatus;
  resourceId?: string;
  videoUrl?: string;
  script?: string;
  progress: number;
}

export interface DigitalHumanChatRequest {
  userId: string;
  courseId?: string;
  nodeId?: string;
  sessionId?: string;
  message: string;
  avatarId?: string;
  voiceId?: string;
  useRag: boolean;
  useProfile: boolean;
}

export interface DigitalHumanChatResult {
  sessionId: string;
  messageId: string;
  answer: string;
  audioUrl?: string;
  videoUrl?: string;
  providerTaskId?: string;
  usedDocuments?: RetrievedDocument[];
  status: TaskStatus;
}

export interface DigitalHumanCallbackRequest {
  taskId: string;
  providerTaskId?: string;
  status: TaskStatus;
  fileUrl?: string;
  videoUrl?: string;
  errorMessage?: string;
  token?: string;
  payload?: Record<string, any>;
}

export interface DigitalHumanMessagesResult {
  messages: ChatMessage[];
}
