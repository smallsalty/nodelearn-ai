export type VideoStyle = "clean_motion_graphics";
export type VideoAspect = "16:9" | "9:16" | "1:1";
export type VideoQualityPreset = "standard" | "high" | "ultra";
export type VideoTheme = "warm_academic" | "chalk_classroom" | "technical_blueprint";
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
  narration?: string;
  durationSeconds: number;
  teachingPurpose: string;
  concreteObjects?: string[];
  animationSteps?: AnimationStep[];
  stateChanges?: string[];
  screenText?: string[];
  misconceptionFix: string;
  componentHints?: string[];
  auditChecklist?: string[];
  visualPlan?: VisualPlan;
  audioUrl?: string;
  beats?: VideoNarrationBeat[];
}

export interface VideoSourceReference {
  id: string;
  title: string;
  sourceId?: string;
}

export interface VideoNarrationBeat {
  beatId: string;
  narration: string;
  durationSeconds: number;
  screenText: string[];
  claims: string[];
  sourceIds: string[];
  visualPlan: VisualPlan;
  audioUrl: string;
}

export interface AnimationScriptContent {
  schemaVersion?: "1.0" | "2.0";
  title: string;
  style: VideoStyle;
  theme?: VideoTheme;
  durationSeconds: number;
  targetDurationSeconds?: number;
  aspectRatio: VideoAspect;
  courseId?: string;
  nodeId?: string;
  learnerProfileSummary?: string;
  qualityScore?: number;
  subtitleEnabled?: boolean;
  sources?: VideoSourceReference[];
  scenes: VideoLessonScene[];
  output: {
    videoUrl: string;
    audioUrls: string[];
  };
}

export type InternalSceneType =
  | "problem_hook"
  | "direct_mapping_demo"
  | "process_flow"
  | "step_by_step"
  | "compare_race"
  | "collision_demo"
  | "misconception_correction"
  | "code_execution"
  | "data_structure_operation"
  | "algorithm_trace"
  | "concept_relationship"
  | "before_after"
  | "timeline"
  | "zoom_focus"
  | "summary_recall";

export type SlotName = "stage" | "center" | "top" | "bottom" | "left" | "right" | "left_lane" | "right_lane" | "foreground" | "background";
export type ActionType = "appear" | "move" | "grow" | "draw" | "highlight" | "count" | "type" | "reveal" | "follow_path" | "camera" | "collision" | "state_transition" | "code_highlight";

interface ActorBase {
  id: string;
  slot: SlotName;
  label?: string;
  continuityKey?: string;
}

export type SceneActor =
  | (ActorBase & { kind: "key" | "data_token"; value: string })
  | (ActorBase & { kind: "bucket_row"; bucketCount: number; focusIndices: number[] })
  | (ActorBase & { kind: "formula"; expression: string; steps: string[] })
  | (ActorBase & { kind: "arrow"; fromActorId: string; toActorId: string })
  | (ActorBase & { kind: "code_panel"; language: string; codeLines: string[] })
  | (ActorBase & { kind: "variable_panel"; variables: Record<string, string> })
  | (ActorBase & { kind: "array" | "list" | "stack" | "queue" | "tree" | "graph"; items: string[] })
  | (ActorBase & { kind: "counter"; start: number; end: number; suffix?: string })
  | (ActorBase & { kind: "callout"; text: string; tone: "neutral" | "positive" | "warning" | "result" })
  | (ActorBase & { kind: "comparison_lane"; title: string; items: string[] });

export interface ResolvedActionBeat {
  id: string;
  action: ActionType;
  targets: string[];
  startFrame: number;
  endFrame: number;
  emphasis?: string;
}

export interface SubtitleCue {
  id: string;
  text: string;
  startFrame: number;
  endFrame: number;
  highlightTerms: string[];
}

export interface ManifestTransition {
  type: "match_cut" | "object_continuity" | "camera_focus" | "fade_through_background" | "directional_slide";
  continuityActorId?: string;
  direction?: "left" | "right" | "up" | "down";
}

export interface RenderManifestScene {
  id: string;
  narrativeRole: SceneType;
  sceneType: InternalSceneType;
  title: string;
  teachingPurpose: string;
  narration: string;
  screenText: string[];
  actors: SceneActor[];
  beats: ResolvedActionBeat[];
  subtitles: SubtitleCue[];
  audioUrl: string;
  startFrame: number;
  durationFrames: number;
  namedSlots: Record<string, string[]>;
  transitionOut: ManifestTransition;
}

export interface RenderManifest {
  schemaVersion: "1.0";
  courseId: string;
  nodeId: string;
  title: string;
  theme: VideoTheme;
  aspectRatio: VideoAspect;
  qualityPreset: VideoQualityPreset;
  subtitleEnabled: boolean;
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  scenes: RenderManifestScene[];
}

export interface VideoLessonProps extends Record<string, unknown> {
  lesson: AnimationScriptContent;
  renderManifest?: RenderManifest;
}
