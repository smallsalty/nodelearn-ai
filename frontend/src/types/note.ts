export interface Note {
  id: string;
  userId: string;
  courseId?: string;
  nodeId?: string;
  questionId?: string;
  title: string;
  content: string;
  tags: string[];
  relationType?: "node" | "question" | "resource" | "path";
  relationId?: string;
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
  relationType?: "node" | "question" | "resource" | "path";
  relationId?: string;
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
