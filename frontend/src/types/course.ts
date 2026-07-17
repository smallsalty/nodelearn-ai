import type { CourseStatus, DifficultyLevel, MasteryStatus, NodeType } from "./contracts";

export interface Course {
  id: string;
  name: string;
  code?: string;
  description?: string;
  targetMajor?: string;
  status: CourseStatus;
  coverUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseCreateRequest {
  name: string;
  code?: string;
  description?: string;
  targetMajor?: string;
  coverUrl?: string;
}

export interface CourseUpdateRequest {
  name?: string;
  code?: string;
  description?: string;
  targetMajor?: string;
  status?: CourseStatus;
  coverUrl?: string;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  description?: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterCreateRequest {
  courseId: string;
  title: string;
  orderIndex: number;
  description?: string;
  content?: string;
}

export interface KnowledgeNode {
  id: string;
  courseId: string;
  chapterId?: string;
  name: string;
  nodeType: NodeType;
  description?: string;
  content: string;
  orderIndex: number;
  difficulty: DifficultyLevel;
  learningValue: number;
  prerequisiteNodeIds: string[];
  nextNodeIds: string[];
  resourceIds: string[];
  commonMistakes: string[];
  recommendedPracticeIds: string[];
  masteryStatus?: MasteryStatus;
  masteryScore?: number;
  x?: number;
  y?: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeNodeCreateRequest {
  courseId: string;
  chapterId?: string;
  name: string;
  nodeType: NodeType;
  description?: string;
  content: string;
  orderIndex: number;
  difficulty: DifficultyLevel;
  learningValue: number;
  prerequisiteNodeIds?: string[];
  nextNodeIds?: string[];
  commonMistakes?: string[];
  recommendedPracticeIds?: string[];
}

export interface KnowledgeRelation {
  id: string;
  courseId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: "prerequisite" | "related" | "advanced" | "contains";
  weight: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseContentAttribution {
  name: string;
  url: string;
  license: string;
}

export interface CourseContentSection {
  nodeId: string;
  title: string;
  orderIndex: number;
  content: string;
}

export interface CourseContentChapter {
  id: string;
  title: string;
  orderIndex: number;
  content?: string;
  sections: CourseContentSection[];
}

export interface CourseContent {
  courseId: string;
  courseName: string;
  attribution?: CourseContentAttribution;
  chapters: CourseContentChapter[];
}
