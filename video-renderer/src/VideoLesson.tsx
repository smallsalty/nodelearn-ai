import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { AnimationScriptContent, StackOperation, VideoLessonScene } from "./types";

const colors = {
  navy: "#071426",
  panel: "#10233f",
  cyan: "#33d6c5",
  blue: "#5ea1ff",
  amber: "#ffc857",
  text: "#f7fbff",
  muted: "#a9bdd7",
};

export const VideoLesson: React.FC<{ lesson: AnimationScriptContent }> = ({ lesson }) => {
  const { fps } = useVideoConfig();
  let from = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.navy, color: colors.text, fontFamily: "Arial, sans-serif" }}>
      {lesson.scenes.map((scene, index) => {
        const duration = Math.max(1, Math.ceil(scene.durationSeconds * fps));
        const start = from;
        from += duration;
        return (
          <Sequence key={scene.sceneId} from={start} durationInFrames={duration}>
            <Scene
              lessonTitle={lesson.title}
              scene={scene}
              index={index}
              total={lesson.scenes.length}
              sceneDurationInFrames={duration}
            />
            <Audio src={scene.audioUrl} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Scene: React.FC<{
  lessonTitle: string;
  scene: VideoLessonScene;
  index: number;
  total: number;
  sceneDurationInFrames: number;
}> = ({ lessonTitle, scene, index, total, sceneDurationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const progress = Math.min(100, ((index + frame / sceneDurationInFrames) / Math.max(1, total)) * 100);

  return (
    <AbsoluteFill style={{ padding: 76, boxSizing: "border-box", opacity }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: colors.cyan, fontSize: 22, letterSpacing: 3 }}>NODELEARN AI</div>
          <h1 style={{ margin: "14px 0 0", fontSize: 52 }}>{lessonTitle}</h1>
        </div>
        <div style={{ color: colors.muted, fontSize: 24 }}>
          {index + 1} / {total}
        </div>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "1.35fr 0.85fr", gap: 42, marginTop: 48 }}>
        <section style={panelStyle}>
          <h2 style={{ margin: 0, color: colors.amber, fontSize: 42 }}>{scene.title}</h2>
          <div style={{ marginTop: 38, minHeight: 390 }}>
            {scene.visualType === "stack_animation" ? (
              <StackVisual scene={scene} />
            ) : (
              <TextSlide scene={scene} />
            )}
          </div>
        </section>
        <section style={{ display: "grid", gap: 24 }}>
          <div style={panelStyle}>
            <div style={{ color: colors.cyan, fontSize: 22 }}>旁白字幕</div>
            <p style={{ fontSize: 30, lineHeight: 1.6 }}>{scene.narration}</p>
          </div>
          {scene.codeSnippet ? (
            <div style={panelStyle}>
              <div style={{ color: colors.cyan, fontSize: 22 }}>示例代码</div>
              <pre style={{ color: "#d7e8ff", fontSize: 24, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {scene.codeSnippet}
              </pre>
            </div>
          ) : null}
        </section>
      </main>

      <footer style={{ marginTop: 40 }}>
        <div style={{ height: 8, borderRadius: 4, background: "#24415f", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: colors.cyan }} />
        </div>
      </footer>
    </AbsoluteFill>
  );
};

const StackVisual: React.FC<{ scene: VideoLessonScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const items = Array.isArray(scene.visualData.items) ? scene.visualData.items : [];
  const operations = Array.isArray(scene.visualData.operations) ? (scene.visualData.operations as StackOperation[]) : [];
  const operation = operations[Math.floor(frame / 45) % Math.max(1, operations.length)];
  const shown = [...items];
  if (operation?.type === "push" && typeof operation.value === "number" && frame % 45 > 20) {
    shown.push(operation.value);
  }
  if (operation?.type === "pop" && frame % 45 > 20) {
    shown.pop();
  }
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 34, height: 360 }}>
      <div style={{ display: "flex", flexDirection: "column-reverse", gap: 10, width: 250 }}>
        {shown.map((item, index) => (
          <div
            key={`${item}-${index}`}
            style={{
              padding: "18px 24px",
              border: `3px solid ${index === shown.length - 1 ? colors.amber : colors.blue}`,
              borderRadius: 14,
              background: "#173352",
              fontSize: 34,
              textAlign: "center",
            }}
          >
            {item}
          </div>
        ))}
      </div>
      <div style={{ color: colors.cyan, fontSize: 34 }}>
        {operation?.type === "push" ? `push(${operation.value ?? ""})` : "pop()"}
      </div>
    </div>
  );
};

const TextSlide: React.FC<{ scene: VideoLessonScene }> = ({ scene }) => {
  const bullets = Array.isArray(scene.visualData.bullets) ? scene.visualData.bullets : [];
  return (
    <ul style={{ margin: 0, paddingLeft: 34, color: "#d7e8ff", fontSize: 34, lineHeight: 1.8 }}>
      {bullets.map((bullet, index) => (
        <li key={`${bullet}-${index}`}>{String(bullet)}</li>
      ))}
    </ul>
  );
};

const panelStyle: React.CSSProperties = {
  padding: 30,
  border: "1px solid #24415f",
  borderRadius: 20,
  background: colors.panel,
  boxShadow: "0 22px 60px rgba(0, 0, 0, 0.25)",
};
