import type {
  BehaviorType,
  CognitiveStyle,
  DifficultyLevel,
  PracticePreference,
  ResourceType
} from "./contracts";
import type { ChatMessage } from "./agent";

export interface StudentProfile {
  id: string;
  userId: string;
  major?: string;
  grade?: string;
  currentCourseId?: string;
  learningGoal?: string;
  knowledgeBaseLevel?: DifficultyLevel;
  learningProgress?: string;
  weakNodeIds: string[];
  cognitiveStyle: CognitiveStyle;
  practicePreference: PracticePreference;
  resourcePreference: ResourceType[];
  commonMistakes: string[];
  availableStudyTime?: string;
  profileSummary?: string;
  confidenceScore: number;
  lastUpdatedBy: "dialogue" | "behavior" | "practice" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface ProfileExtractRequest {
  userId: string;
  message: string;
  historyMessages?: ChatMessage[];
}

export interface ProfileExtractResult {
  extractedFields: Partial<StudentProfile>;
  missingFields: string[];
  confidenceScore: number;
  followUpQuestions: string[];
}

export interface ProfileUpdateByBehaviorRequest {
  userId: string;
  courseId?: string;
  nodeId?: string;
  behaviorType: BehaviorType;
  behaviorData: Record<string, any>;
}

export interface ProfileUpdateByPracticeRequest {
  userId: string;
  courseId: string;
  questionId: string;
  nodeId?: string;
  isCorrect: boolean;
  mistakeReason?: string;
}
