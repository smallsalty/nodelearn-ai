import type { AuditStatus, DifficultyLevel, ResourceType, TaskStatus } from "./contracts";

export interface UploadedFile {
  id: string;
  userId: string;
  courseId?: string;
  filename: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  parseStatus: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBuildTask {
  id: string;
  courseId: string;
  fileIds: string[];
  status: TaskStatus;
  progress: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBuildRequest {
  courseId: string;
  fileIds: string[];
  buildMode: "append" | "rebuild";
}

export interface KnowledgeSearchRequest {
  courseId: string;
  query: string;
  nodeId?: string;
  topK?: number;
}

export interface RetrievedDocument {
  id: string;
  sourceId: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface GeneratedResource {
  id: string;
  userId: string;
  courseId: string;
  nodeId?: string;
  title: string;
  resourceType: ResourceType;
  content: string;
  fileUrl?: string;
  prompt?: string;
  modelName?: string;
  status: TaskStatus;
  auditStatus: AuditStatus;
  createdAt: string;
  updatedAt: string;
}

export type VideoVisualType = "stack_animation" | "text_slide";
export type StackOperationType = "push" | "pop";

export interface StackOperation {
  type: StackOperationType;
  value?: number;
}

export interface StackAnimationVisualData {
  items: number[];
  operations: StackOperation[];
}

export interface TextSlideVisualData {
  bullets: string[];
}

export interface VideoLessonScene {
  sceneId: string;
  title: string;
  narration: string;
  visualType: VideoVisualType;
  visualData: Record<string, any>;
  codeSnippet: string;
  durationSeconds: number;
  audioUrl: string;
}

export interface VideoLessonOutput {
  videoUrl: string;
  audioUrls: string[];
}

export interface AnimationScriptContent {
  title: string;
  durationSeconds: number;
  aspectRatio: "16:9";
  scenes: VideoLessonScene[];
  output: VideoLessonOutput;
}

export interface ResourceGenerateRequest {
  userId: string;
  courseId: string;
  nodeId?: string;
  resourceTypes: ResourceType[];
  difficulty?: DifficultyLevel;
  learningGoal?: string;
  customRequirement?: string;
}

export interface ResourceGenerateResult {
  taskId: string;
  resourceIds: string[];
  status: TaskStatus;
}

export interface ResourceStreamEvent {
  taskId: string;
  eventType: "start" | "progress" | "chunk" | "done" | "error";
  progress: number;
  contentChunk?: string;
  errorMessage?: string;
}

export interface ResourceRecommendation {
  id: string;
  userId: string;
  courseId: string;
  nodeId?: string;
  resourceId: string;
  resourceType: ResourceType;
  title: string;
  reason: string;
  score: number;
  createdAt: string;
}

export interface ResourcePushRecord {
  id: string;
  userId: string;
  resourceId: string;
  nodeId?: string;
  reason: string;
  viewed: boolean;
  viewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationRequest {
  userId: string;
  courseId: string;
  nodeId?: string;
  limit?: number;
}
