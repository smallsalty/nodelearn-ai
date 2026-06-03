export type VideoStyle = "clean_motion_graphics";
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
  | { type: "code"; content: string; animation: VisualAnimationType };

export interface VisualPlan {
  layout: VisualLayout;
  elements: VisualElement[];
}

export interface VideoLessonScene {
  sceneId: string;
  sceneType: SceneType;
  title: string;
  narration: string;
  durationSeconds: number;
  visualPlan: VisualPlan;
  audioUrl: string;
}

export interface AnimationScriptContent {
  title: string;
  style: VideoStyle;
  durationSeconds: number;
  aspectRatio: "16:9";
  scenes: VideoLessonScene[];
  output: {
    videoUrl: string;
    audioUrls: string[];
  };
}
