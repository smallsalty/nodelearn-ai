export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  traceId: string;
  timestamp: string;
}

export interface PageRequest {
  page: number;
  pageSize: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  version?: number;
}

export type UserRole = "student" | "teacher" | "admin";
export type UserStatus = "active" | "disabled" | "pending";
export type CourseStatus = "draft" | "published" | "archived";

export type NodeType =
  | "concept"
  | "algorithm"
  | "syntax"
  | "question_type"
  | "experiment"
  | "project"
  | "summary";

export type DifficultyLevel = "easy" | "medium" | "hard" | "challenge";

export type MasteryStatus =
  | "not_started"
  | "learning"
  | "weak"
  | "basic"
  | "mastered";

export type ResourceType =
  | "lecture_doc"
  | "mind_map"
  | "practice_question"
  | "reading_material"
  | "code_case"
  | "video_script"
  | "animation_script"
  | "knowledge_video"
  | "digital_human_video"
  | "digital_human_dialogue"
  | "audio_explanation"
  | "subtitle"
  | "storyboard"
  | "project_task"
  | "summary_note";

export type AgentType =
  | "profile_agent"
  | "planner_agent"
  | "qa_agent"
  | "resource_agent"
  | "practice_agent"
  | "multimodal_agent"
  | "digital_human_agent"
  | "video_generation_agent"
  | "script_agent"
  | "storyboard_agent"
  | "narration_agent"
  | "recommendation_agent"
  | "safety_agent"
  | "knowledge_graph_agent"
  | "note_agent"
  | "report_agent"
  | "programming_agent";

export type ProgrammingLanguage = "cpp" | "c" | "python";
export type JudgeVerdict = "AC" | "WA" | "TLE" | "PE" | "CE" | "RE" | "system_error";

export type TaskStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled";

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "blank"
  | "short_answer"
  | "coding"
  | "case_analysis";

export type CognitiveStyle = "text" | "diagram" | "example" | "code" | "mixed";
export type PracticePreference = "choice" | "coding" | "case" | "mixed";
export type AuditStatus = "unchecked" | "passed" | "rejected" | "need_review";

export type VideoAspect = "16:9" | "9:16" | "1:1";
export type VideoQualityPreset = "standard" | "high" | "ultra";
export type VideoGenerationStage =
  | "queued"
  | "script"
  | "storyboard"
  | "quality_audit"
  | "tts"
  | "render"
  | "audit"
  | "persist"
  | "done"
  | "error";
export type VideoMaterialSource = "none" | "local_assets" | "generated_motion_assets";

export type BehaviorType =
  | "view_resource"
  | "finish_resource"
  | "answer_question"
  | "ask_question"
  | "create_note"
  | "review_wrong_question";

export interface HealthCheckResult {
  status: "ok" | "error";
  database: "ok" | "error";
  redis?: "ok" | "error";
  vectorStore?: "ok" | "error";
  graphDb?: "ok" | "error";
  llmService?: "ok" | "error";
  iflytekSpark?: "mock" | "ok" | "error";
  iflytekTts?: "mock" | "ok" | "error";
  iflytekDigitalHuman?: "mock" | "ok" | "error";
}

export interface SystemConfig {
  appName: string;
  appVersion: string;
  enableMock: boolean;
  enableStreamOutput: boolean;
  enableSafetyAudit: boolean;
}
