import type { DifficultyLevel, JudgeVerdict, ProgrammingLanguage } from "./contracts";

export interface ProgrammingSampleCase { input: string; output: string; }
export interface ProgrammingQuestion {
  id: string; courseId: string; nodeId?: string; title: string; content: string;
  inputFormat: string; outputFormat: string; constraints: string;
  sampleCases: ProgrammingSampleCase[]; difficulty: DifficultyLevel; tags: string[];
  timeLimitSeconds: number; createdAt: string; updatedAt: string;
}
export interface ProgrammingGenerateRequest { userId: string; courseId: string; nodeId?: string; difficulty?: DifficultyLevel; count: number; }
export interface ProgrammingSubmissionRequest { userId: string; questionId: string; language: ProgrammingLanguage; sourceCode: string; durationSeconds?: number; }
export interface ProgrammingJudgeResult {
  submissionId: string; questionId: string; language: ProgrammingLanguage; verdict: JudgeVerdict;
  stdout?: string; stderr?: string; compileOutput?: string; timeSeconds?: number; memoryKb?: number;
  failedSampleIndex?: number; createdAt: string; updatedAt: string;
}
