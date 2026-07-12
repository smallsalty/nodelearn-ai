import React from "react";
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from "remotion";
import { UniversalExplainerVideoRenderer } from "./components/UniversalExplainerVideoRenderer";
import type { AnimationScriptContent } from "./types";

export const VideoLesson: React.FC<{ lesson: AnimationScriptContent }> = ({ lesson }) => {
  const { fps } = useVideoConfig();
  let from = 0;
  const theme = lesson.theme ?? "warm_academic";

  return (
    <AbsoluteFill>
      {lesson.scenes.flatMap((scene) => {
        const beats = scene.beats?.length
          ? scene.beats
          : scene.visualPlan
            ? [{ beatId: `${scene.sceneId}_legacy`, narration: scene.narration ?? "", durationSeconds: scene.durationSeconds, screenText: scene.screenText?.length ? scene.screenText : [scene.title], claims: [], sourceIds: [], visualPlan: scene.visualPlan, audioUrl: scene.audioUrl ?? "" }]
            : [];
        return beats.map((beat) => {
          const duration = Math.max(1, Math.ceil(beat.durationSeconds * fps));
          const start = from;
          from += duration;
          return (
            <Sequence key={beat.beatId} from={start} durationInFrames={duration}>
              <UniversalExplainerVideoRenderer scene={scene} beat={beat} theme={theme} subtitleEnabled={lesson.subtitleEnabled !== false} beatDurationInFrames={duration} />
              {beat.audioUrl ? <Audio src={beat.audioUrl} /> : null}
            </Sequence>
          );
        });
      })}
    </AbsoluteFill>
  );
};
