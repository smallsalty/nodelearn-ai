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

export type VideoStyle = "clean_motion_graphics";
export type SceneType = "hook" | "definition" | "analogy" | "mechanism" | "comparison" | "process" | "example" | "summary";
export type VisualLayout = "center_focus" | "left_right" | "pipeline" | "comparison" | "timeline" | "grid_focus" | "summary_cards";
export type VisualAnimationType = "fade_in" | "pop_in" | "slide_in_left" | "slide_in_right" | "float" | "draw" | "highlight" | "zoom_in" | "stagger_in";

export type VisualElement =
  | { type: "text" | "keyword"; content: string; animation: VisualAnimationType }
  | { type: "card"; content: string; animation: VisualAnimationType }
  | { type: "icon"; name: string; animation: VisualAnimationType }
  | { type: "arrow"; label: string; animation: VisualAnimationType }
  | { type: "circle"; label: string; animation: VisualAnimationType }
  | { type: "grid"; label: string; items?: string[]; highlightIndex: number; animation: VisualAnimationType }
  | { type: "timeline"; items: string[]; animation: VisualAnimationType }
  | { type: "image"; imageUrl: string; alt: string; animation: VisualAnimationType }
  | { type: "formula"; content: string; animation: VisualAnimationType }
  | { type: "code"; content: string; animation: VisualAnimationType };

export interface VisualPlan {
  layout: VisualLayout;
  elements: VisualElement[];
}

export interface VideoLessonScene {
  sceneId: string;
  sceneType: SceneType;
  title: string;
  narration: string;
  durationSeconds: number;
  visualPlan: VisualPlan;
  audioUrl: string;
}

export interface VideoLessonOutput {
  videoUrl: string;
  audioUrls: string[];
}

export interface AnimationScriptContent {
  title: string;
  style: VideoStyle;
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
