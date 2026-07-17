import React from "react";
import { Composition } from "remotion";
import { VideoLesson } from "./VideoLesson";
import type { AnimationScriptContent, VideoLessonProps } from "./types";

const FPS = 30;
const defaultLesson: AnimationScriptContent = {
  schemaVersion: "2.0",
  title: "NodeLearn AI",
  style: "clean_motion_graphics",
  theme: "warm_academic",
  durationSeconds: 1,
  aspectRatio: "16:9",
  scenes: [],
  output: { videoUrl: "", audioUrls: [] },
};
const defaultProps: VideoLessonProps = { lesson: defaultLesson };

export const Root: React.FC = () => (
  <Composition<any, VideoLessonProps>
    id="VideoLesson"
    component={VideoLesson}
    durationInFrames={FPS}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={defaultProps}
    calculateMetadata={({ props }) => props.renderManifest ? ({
      durationInFrames: Math.max(1, props.renderManifest.totalFrames),
      fps: props.renderManifest.fps,
      width: props.renderManifest.width,
      height: props.renderManifest.height,
    }) : ({
      durationInFrames: Math.max(1, props.lesson.scenes.reduce(
          (total, scene) => total + (scene.beats?.length
            ? scene.beats.reduce((beatTotal, beat) => beatTotal + Math.ceil(beat.durationSeconds * FPS), 0)
            : Math.ceil(scene.durationSeconds * FPS)),
          0
        )),
    })}
  />
);
