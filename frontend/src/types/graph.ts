import type { DifficultyLevel, MasteryStatus, NodeType } from "./contracts";

export interface GraphNode {
  id: string;
  label: string;
  nodeType: NodeType;
  difficulty: DifficultyLevel;
  masteryStatus: MasteryStatus;
  masteryScore: number;
  x?: number;
  y?: number;
  size?: number;
  selected?: boolean;
  disabled?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationType: string;
  weight: number;
  label?: string;
}

export interface KnowledgeGraph {
  courseId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphViewState {
  selectedNodeId?: string;
  expandedChapterId?: string;
  zoom: number;
  centerX: number;
  centerY: number;
  showWeakOnly: boolean;
  showCompletedOnly: boolean;
}
