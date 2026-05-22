import type { DifficultyLevel, QuestionType } from "./contracts";

export interface PracticeQuestion {
  id: string;
  courseId: string;
  nodeId?: string;
  questionType: QuestionType;
  title: string;
  content: string;
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: DifficultyLevel;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PracticeGenerateRequest {
  userId: string;
  courseId: string;
  nodeId?: string;
  questionTypes: QuestionType[];
  difficulty?: DifficultyLevel;
  count: number;
}

export interface PracticeSubmitRequest {
  userId: string;
  questionId: string;
  userAnswer: string;
  durationSeconds?: number;
}

export interface PracticeRecord {
  id: string;
  userId: string;
  questionId: string;
  nodeId?: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  score: number;
  mistakeReason?: string;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}
