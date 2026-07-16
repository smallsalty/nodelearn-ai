import type {
  AuditStatus,
  DifficultyLevel,
  ResourceType,
  TaskStatus,
  VideoAspect,
  VideoGenerationStage,
  VideoMaterialSource,
  VideoQualityPreset,
  VideoTheme
} from "./contracts";

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
  chapterId?: string;
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
  | { type: "code"; content: string; animation: VisualAnimationType }
  | { type: "hash_table_buckets"; buckets: string[]; activeIndex: number; keyLabel?: string; collisionIndices?: number[]; animation: VisualAnimationType }
  | { type: "hash_function_panel"; inputKey: string; expression: string; outputIndex: number; animation: VisualAnimationType }
  | { type: "collision_chain"; bucketIndex: number; nodes: string[]; activeNodeIndex?: number; animation: VisualAnimationType }
  | { type: "array_cells"; items: string[]; activeIndices?: number[]; pointerLabels?: Record<string, string>; animation: VisualAnimationType }
  | { type: "linked_list_nodes"; nodes: string[]; activeIndex?: number; pointerLabel?: string; animation: VisualAnimationType }
  | { type: "stack_blocks"; items: string[]; activeIndex?: number; operation: string; animation: VisualAnimationType }
  | { type: "queue_line"; items: string[]; headIndex?: number; tailIndex?: number; operation: string; animation: VisualAnimationType }
  | { type: "tree_node_graph"; nodes: string[]; edges?: string[][]; activePath?: string[]; animation: VisualAnimationType }
  | { type: "code_trace_panel"; codeLines: string[]; activeLineIndex?: number; variables?: Record<string, string>; animation: VisualAnimationType }
  | { type: "pointer_arrow"; fromLabel: string; toLabel: string; label: string; animation: VisualAnimationType }
  | { type: "memory_box"; address: string; value: string; active?: boolean; animation: VisualAnimationType }
  | { type: "complexity_chart"; items: string[]; activeIndex?: number; label: string; animation: VisualAnimationType };

export interface VisualPlan {
  layout: VisualLayout;
  elements: VisualElement[];
}

export interface AnimationStep {
  startState: string;
  endState: string;
  visualAction: string;
  narrationSentence: string;
  durationSeconds?: number;
}

export interface VideoSourceReference {
  id: string;
  title: string;
  sourceId?: string;
}

export interface VideoNarrationBeat {
  beatId: string;
  narration: string;
  durationSeconds: number;
  screenText: string[];
  claims: string[];
  sourceIds: string[];
  visualPlan: VisualPlan;
  audioUrl: string;
}

export interface VideoLessonScene {
  sceneId: string;
  sceneType: SceneType;
  title: string;
  narration?: string;
  durationSeconds: number;
  teachingPurpose: string;
  concreteObjects?: string[];
  animationSteps?: AnimationStep[];
  stateChanges?: string[];
  screenText?: string[];
  misconceptionFix: string;
  componentHints?: string[];
  auditChecklist?: string[];
  visualPlan?: VisualPlan;
  audioUrl?: string;
  beats?: VideoNarrationBeat[];
}

export interface VideoLessonOutput {
  videoUrl: string;
  audioUrls: string[];
}

export interface AnimationScriptContent {
  schemaVersion?: "1.0" | "2.0";
  title: string;
  style: VideoStyle;
  theme?: VideoTheme;
  durationSeconds: number;
  targetDurationSeconds?: number;
  aspectRatio: VideoAspect;
  courseId?: string;
  nodeId?: string;
  learnerProfileSummary?: string;
  qualityScore?: number;
  subtitleEnabled?: boolean;
  sources?: VideoSourceReference[];
  scenes: VideoLessonScene[];
  output: VideoLessonOutput;
}

export interface VideoGenerateOptions {
  aspectRatio?: VideoAspect;
  qualityPreset?: VideoQualityPreset;
  materialSource?: VideoMaterialSource;
  versionCount?: number;
  subtitleEnabled?: boolean;
  bgmEnabled?: boolean;
  bgmVolume?: number;
  theme?: VideoTheme;
}

export interface ResourceGenerateRequest {
  userId: string;
  courseId: string;
  nodeId?: string;
  resourceTypes: ResourceType[];
  difficulty?: DifficultyLevel;
  learningGoal?: string;
  customRequirement?: string;
  videoOptions?: VideoGenerateOptions;
}

export interface ResourceGenerateResult {
  taskId: string;
  resourceIds: string[];
  status: TaskStatus;
  progress?: number;
  currentStage?: VideoGenerationStage;
  errorMessage?: string;
}

export interface ResourceStreamEvent {
  taskId: string;
  eventType: "start" | "progress" | "chunk" | "done" | "error";
  progress: number;
  stage?: VideoGenerationStage;
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
