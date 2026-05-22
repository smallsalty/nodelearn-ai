import type { AgentType, TaskStatus } from "./contracts";
import type { KnowledgeNode } from "./course";
import type { LearningPath } from "./learningPath";
import type { StudentProfile } from "./profile";
import type { LearningRecord } from "./report";
import type { RetrievedDocument } from "./resource";

export interface ChatSession {
  id: string;
  userId: string;
  courseId?: string;
  nodeId?: string;
  title: string;
  sessionType: "profile" | "qa" | "resource" | "practice";
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: "user" | "assistant" | "system" | "agent";
  content: string;
  contentType: "text" | "markdown" | "json";
  agentType?: AgentType;
  createdAt: string;
}

export interface ChatRequest {
  userId: string;
  sessionId?: string;
  courseId?: string;
  nodeId?: string;
  message: string;
  useRag: boolean;
  useProfile: boolean;
}

export interface ChatResult {
  sessionId: string;
  messageId: string;
  answer: string;
  usedAgentTypes: AgentType[];
  retrievedDocuments?: RetrievedDocument[];
}

export interface ChatStreamEvent {
  sessionId: string;
  eventType: "start" | "chunk" | "agent_step" | "done" | "error";
  contentChunk?: string;
  agentType?: AgentType;
  errorMessage?: string;
}

export interface AgentContext {
  profile?: StudentProfile;
  currentNode?: KnowledgeNode;
  learningPath?: LearningPath;
  recentRecords?: LearningRecord[];
  retrievedDocuments?: RetrievedDocument[];
}

export interface AgentRunRequest {
  userId: string;
  courseId?: string;
  nodeId?: string;
  agentType: AgentType;
  input: Record<string, any>;
  context?: AgentContext;
}

export interface AgentRunResult {
  taskId: string;
  agentType: AgentType;
  status: TaskStatus;
  output: Record<string, any>;
  errorMessage?: string;
}

export interface MultiAgentWorkflowRequest {
  userId: string;
  courseId: string;
  nodeId?: string;
  workflowType:
    | "profile_build"
    | "path_plan"
    | "resource_generate"
    | "qa"
    | "practice_review"
    | "report_generate";
  input: Record<string, any>;
}

export interface MultiAgentWorkflowResult {
  taskId: string;
  workflowType: string;
  status: TaskStatus;
  steps: AgentRunResult[];
  finalOutput: Record<string, any>;
}

export interface AgentTaskEvent {
  taskId: string;
  agentType: AgentType;
  eventType: "start" | "thinking" | "tool_call" | "result" | "error" | "done";
  message?: string;
  payload?: Record<string, any>;
  createdAt: string;
}
