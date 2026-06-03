import React from "react";
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from "remotion";
import { UniversalExplainerVideoRenderer } from "./components/UniversalExplainerVideoRenderer";
import type { AnimationScriptContent } from "./types";

export const VideoLesson: React.FC<{ lesson: AnimationScriptContent }> = ({ lesson }) => {
  const { fps } = useVideoConfig();
  let from = 0;

  return (
    <AbsoluteFill>
      {lesson.scenes.map((scene, index) => {
        const duration = Math.max(1, Math.ceil(scene.durationSeconds * fps));
        const start = from;
        from += duration;
        return (
          <Sequence key={scene.sceneId} from={start} durationInFrames={duration}>
            <UniversalExplainerVideoRenderer
              lessonTitle={lesson.title}
              scene={scene}
              sceneIndex={index}
              sceneCount={lesson.scenes.length}
              sceneDurationInFrames={duration}
            />
            <Audio src={scene.audioUrl} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
