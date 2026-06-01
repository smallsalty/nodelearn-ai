export type VideoVisualType = "stack_animation" | "text_slide";

export interface StackOperation {
  type: "push" | "pop";
  value?: number;
}

export interface VideoLessonScene {
  sceneId: string;
  title: string;
  narration: string;
  visualType: VideoVisualType;
  visualData: Record<string, any>;
  codeSnippet: string;
  durationSeconds: number;
  audioUrl: string;
}

export interface AnimationScriptContent {
  title: string;
  durationSeconds: number;
  aspectRatio: "16:9";
  scenes: VideoLessonScene[];
  output: {
    videoUrl: string;
    audioUrls: string[];
  };
}
