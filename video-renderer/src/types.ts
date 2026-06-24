export type VideoStyle = "clean_motion_graphics";
export type VideoAspect = "16:9" | "9:16" | "1:1";
export type VideoQualityPreset = "standard" | "high" | "ultra";
export type SceneType = "hook" | "definition" | "analogy" | "mechanism" | "comparison" | "process" | "example" | "summary";
export type VisualLayout = "center_focus" | "left_right" | "pipeline" | "comparison" | "timeline" | "grid_focus" | "summary_cards";
export type VisualAnimationType = "fade_in" | "pop_in" | "slide_in_left" | "slide_in_right" | "float" | "draw" | "highlight" | "zoom_in" | "stagger_in";

export type VisualElement =
  | { type: "text" | "keyword"; content: string; animation: VisualAnimationType }
  | { type: "card"; content: string; animation: VisualAnimationType }
  | { type: "icon"; name: string; animation: VisualAnimationType }
  | { type: "arrow"; label: string; animation: VisualAnimationType }
  | { type: "circle"; label: string; animation: VisualAnimationType }
  | { type: "grid"; label: string; items?: string[]; highlightIndex: number; animation: VisualAnimationType }
  | { type: "timeline"; items: string[]; animation: VisualAnimationType }
  | { type: "image"; imageUrl: string; alt: string; animation: VisualAnimationType }
  | { type: "formula"; content: string; animation: VisualAnimationType }
  | { type: "code"; content: string; animation: VisualAnimationType }
  | { type: "hash_table_buckets"; buckets: string[]; activeIndex: number; keyLabel?: string; collisionIndices?: number[]; animation: VisualAnimationType }
  | { type: "hash_function_panel"; inputKey: string; expression: string; outputIndex: number; animation: VisualAnimationType }
  | { type: "collision_chain"; bucketIndex: number; nodes: string[]; activeNodeIndex?: number; animation: VisualAnimationType }
  | { type: "array_cells"; items: string[]; activeIndices?: number[]; pointerLabels?: Record<string, string>; animation: VisualAnimationType }
  | { type: "linked_list_nodes"; nodes: string[]; activeIndex?: number; pointerLabel?: string; animation: VisualAnimationType }
  | { type: "stack_blocks"; items: string[]; activeIndex?: number; operation: string; animation: VisualAnimationType }
  | { type: "queue_line"; items: string[]; headIndex?: number; tailIndex?: number; operation: string; animation: VisualAnimationType }
  | { type: "tree_node_graph"; nodes: string[]; edges?: string[][]; activePath?: string[]; animation: VisualAnimationType }
  | { type: "code_trace_panel"; codeLines: string[]; activeLineIndex?: number; variables?: Record<string, string>; animation: VisualAnimationType }
  | { type: "pointer_arrow"; fromLabel: string; toLabel: string; label: string; animation: VisualAnimationType }
  | { type: "memory_box"; address: string; value: string; active?: boolean; animation: VisualAnimationType }
  | { type: "complexity_chart"; items: string[]; activeIndex?: number; label: string; animation: VisualAnimationType };

export interface VisualPlan {
  layout: VisualLayout;
  elements: VisualElement[];
}

export interface AnimationStep {
  startState: string;
  endState: string;
  visualAction: string;
  narrationSentence: string;
  durationSeconds?: number;
}

export interface VideoLessonScene {
  sceneId: string;
  sceneType: SceneType;
  title: string;
  narration: string;
  durationSeconds: number;
  teachingPurpose: string;
  concreteObjects: string[];
  animationSteps: AnimationStep[];
  stateChanges: string[];
  screenText: string[];
  misconceptionFix: string;
  componentHints: string[];
  auditChecklist: string[];
  visualPlan: VisualPlan;
  audioUrl: string;
}

export interface AnimationScriptContent {
  title: string;
  style: VideoStyle;
  durationSeconds: number;
  aspectRatio: VideoAspect;
  courseId?: string;
  nodeId?: string;
  learnerProfileSummary?: string;
  qualityScore?: number;
  scenes: VideoLessonScene[];
  output: {
    videoUrl: string;
    audioUrls: string[];
  };
}
