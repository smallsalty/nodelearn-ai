import type { PageRequest } from "./contracts";

export type NoteRelationType = "node" | "question" | "resource" | "path";

export interface Note {
  id: string;
  userId: string;
  courseId?: string | null;
  nodeId?: string | null;
  questionId?: string | null;
  title: string;
  content: string;
  tags: string[];
  relationType?: NoteRelationType | null;
  relationId?: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteCreateRequest {
  userId: string;
  courseId?: string;
  nodeId?: string;
  questionId?: string;
  title: string;
  content: string;
  tags?: string[];
  relationType?: NoteRelationType;
  relationId?: string;
}

export interface NoteUpdateRequest {
  courseId?: string | null;
  nodeId?: string | null;
  questionId?: string | null;
  title?: string;
  content?: string;
  tags?: string[];
  relationType?: NoteRelationType | null;
  relationId?: string | null;
}

export interface NoteQuery extends PageRequest {
  userId: string;
  courseId?: string;
  nodeId?: string;
  tag?: string;
  pinned?: boolean;
  relationType?: NoteRelationType;
}

export interface PinNoteRequest {
  pinned: boolean;
}

export interface NoteRelationRequest {
  relationType: NoteRelationType;
  relationId: string;
}

export interface FloatingMenuState {
  visible: boolean;
  activeTab: "qa" | "note" | "wrong_book" | "resource";
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  collapsed: boolean;
}
