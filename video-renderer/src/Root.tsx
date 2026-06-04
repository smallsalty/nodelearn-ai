import React from "react";
import { Composition } from "remotion";
import { VideoLesson } from "./VideoLesson";
import type { AnimationScriptContent } from "./types";

const FPS = 30;
const defaultLesson: AnimationScriptContent = {
  title: "NodeLearn AI",
  style: "clean_motion_graphics",
  durationSeconds: 1,
  aspectRatio: "16:9",
  scenes: [],
  output: { videoUrl: "", audioUrls: [] },
};

export const Root: React.FC = () => (
  <Composition
    id="VideoLesson"
    component={VideoLesson}
    durationInFrames={FPS}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={{ lesson: defaultLesson }}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(
        1,
        props.lesson.scenes.reduce((total, scene) => total + Math.ceil(scene.durationSeconds * FPS), 0)
      ),
    })}
  />
);
