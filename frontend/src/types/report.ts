import type { AgentType, AuditStatus, BehaviorType } from "./contracts";

export interface LearningRecord {
  id: string;
  userId: string;
  courseId: string;
  nodeId?: string;
  resourceId?: string;
  behaviorType: BehaviorType;
  durationSeconds?: number;
  extraData?: Record<string, any>;
  createdAt: string;
}

export interface LearningRecordCreateRequest {
  userId: string;
  courseId: string;
  nodeId?: string;
  resourceId?: string;
  behaviorType: BehaviorType;
  durationSeconds?: number;
  extraData?: Record<string, any>;
}

export interface LearningEvaluation {
  userId: string;
  courseId: string;
  completionRate: number;
  correctRate: number;
  weakNodeIds: string[];
  masteredNodeIds: string[];
  averageMasteryScore: number;
  progressTrend: number[];
  advice: string;
}

export interface StudyReport {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  summary: string;
  completionRate: number;
  correctRate: number;
  weakNodeSummary: string;
  improvementAdvice: string;
  chartData?: Record<string, any>;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyReportGenerateRequest {
  userId: string;
  courseId: string;
  startDate?: string;
  endDate?: string;
  includeChart: boolean;
  exportPdf: boolean;
}

export interface AuditResult {
  id: string;
  targetType: "message" | "resource" | "answer" | "report";
  targetId: string;
  auditStatus: AuditStatus;
  riskLabels: string[];
  reason?: string;
  createdAt: string;
}

export interface AuditCheckRequest {
  targetType: "message" | "resource" | "answer" | "report";
  targetId: string;
  content: string;
  userId?: string;
  courseId?: string;
}

export interface ModelCallLog {
  id: string;
  userId?: string;
  agentType?: AgentType;
  provider: string;
  modelName: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}
