import type { TaskStatus } from "./contracts";

export interface LearningPath {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  description?: string;
  currentStage: string;
  targetGoal: string;
  pathNodeIds: string[];
  currentNodeId?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LearningTask {
  id: string;
  pathId: string;
  userId: string;
  courseId: string;
  nodeId: string;
  title: string;
  taskType: "learn" | "practice" | "review" | "project";
  resourceIds: string[];
  orderIndex: number;
  status: TaskStatus;
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPathGenerateRequest {
  userId: string;
  courseId: string;
  targetGoal?: string;
  timeBudget?: string;
  weakNodeIds?: string[];
  additionalRequirements?: string;
}

export interface LearningTaskStatusUpdateRequest {
  status: TaskStatus;
  completedAt?: string;
}
