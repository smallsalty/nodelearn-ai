export type MindMapBranchType =
  | "definition"
  | "structure"
  | "principle"
  | "classification"
  | "operation"
  | "algorithm"
  | "complexity"
  | "relation"
  | "application";

export type MindMapRelationType = "contains" | "prerequisite" | "related" | "advanced";
export type MindMapScope = "chapter" | "node";

export interface KnowledgeMindMapNode {
  id: string;
  title: string;
  branchType: MindMapBranchType;
  importance?: 1 | 2 | 3 | 4 | 5;
  knowledgePoint?: string;
  description?: string;
  children: KnowledgeMindMapNode[];
}

export interface KnowledgeMindMapRelation {
  sourceId: string;
  targetId: string;
  relationType: MindMapRelationType;
  label: string;
}

export interface KnowledgeMindMap {
  title: string;
  scope: MindMapScope;
  courseId: string;
  chapterId: string | null;
  nodeId: string | null;
  centralTopic: string;
  summary: string;
  branches: KnowledgeMindMapNode[];
  relations: KnowledgeMindMapRelation[];
}
