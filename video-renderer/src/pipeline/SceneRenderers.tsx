import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderManifestScene, SceneActor } from "../types";
import {
  CameraFocus,
  CollisionImpact,
  DrawArrow,
  Fade,
  Highlight,
  MoveTo,
  NumberCount,
  Reveal,
  Scale,
  Slide,
  TypeText,
} from "./primitives";

export interface SceneRendererProps { scene: RenderManifestScene }

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const actor = (scene: RenderManifestScene, kind: SceneActor["kind"], index = 0) => scene.actors.filter((item) => item.kind === kind)[index];
const action = (scene: RenderManifestScene, actionType: string, index = 0) => scene.beats.filter((item) => item.action === actionType)[index];
const range = (scene: RenderManifestScene, actionType: string, index = 0): [number, number] => {
  const item = action(scene, actionType, index);
  return item ? [item.startFrame, item.endFrame] : [0, Math.max(1, Math.round(scene.durationFrames * 0.45))];
};
const actorRange = (scene: RenderManifestScene, actorId: string, index = 0): [number, number] => {
  const targeted = scene.beats.find((item) => item.targets.includes(actorId));
  const fallback = scene.beats[index % Math.max(1, scene.beats.length)];
  const item = targeted ?? fallback;
  return item
    ? [item.startFrame, item.endFrame]
    : [0, Math.max(1, scene.durationFrames)];
};
const useActionProgress = (scene: RenderManifestScene, actionType: string, index = 0) => {
  const frame = useCurrentFrame();
  const [from, to] = range(scene, actionType, index);
  return interpolate(frame, [from, Math.max(from + 1, to)], [0, 1], clamp);
};
const labelFor = (item: SceneActor) => {
  if ("value" in item) return item.value;
  if ("text" in item) return item.text;
  if ("title" in item) return item.title;
  if ("expression" in item) return item.expression;
  return item.label ?? item.kind.replace(/_/g, " ");
};

const stageStyle: React.CSSProperties = { width: "100%", height: "100%", minHeight: 0, display: "grid", alignItems: "center" };
const panelStyle: React.CSSProperties = {
  border: "1px solid var(--video-border)",
  borderRadius: 24,
  background: "var(--video-surface)",
  boxShadow: "0 20px 60px rgba(0,0,0,.12)",
  padding: "4%",
  boxSizing: "border-box",
};

const Token: React.FC<{ children: React.ReactNode; accent?: boolean }> = ({ children, accent = false }) => <div style={{
  display: "grid", placeItems: "center", minWidth: 110, minHeight: 78, padding: "0.7em 1em", boxSizing: "border-box",
  border: `2px solid ${accent ? "var(--video-accent)" : "var(--video-secondary)"}`, borderRadius: 20,
  background: accent ? "color-mix(in srgb, var(--video-accent) 18%, var(--video-surface))" : "var(--video-surface)",
  color: "var(--video-text)", fontSize: 34, fontWeight: 850, boxShadow: "0 14px 34px rgba(0,0,0,.12)",
}}>{children}</div>;

const BucketStrip: React.FC<{ bucket: SceneActor | undefined; active?: number; compact?: boolean }> = ({ bucket, active, compact = false }) => {
  if (!bucket || bucket.kind !== "bucket_row") return null;
  const focus = bucket.focusIndices.length ? bucket.focusIndices : [0];
  const center = focus[Math.floor(focus.length / 2)];
  const values = focus.length >= 4 ? focus : Array.from({ length: compact ? 5 : 7 }, (_, offset) => Math.max(0, center - Math.floor((compact ? 5 : 7) / 2) + offset));
  return <div style={{ display: "flex", width: "100%", justifyContent: "center", alignItems: "stretch", gap: compact ? 8 : 14 }}>
    {values.map((value) => <div key={value} style={{
      flex: "0 1 11%", minWidth: compact ? 64 : 84, aspectRatio: "1", display: "grid", placeItems: "center",
      borderRadius: 16, border: `2px solid ${value === active || focus.includes(value) ? "var(--video-accent)" : "var(--video-border)"}`,
      background: value === active ? "var(--video-accent)" : focus.includes(value) ? "color-mix(in srgb, var(--video-accent) 15%, var(--video-surface))" : "var(--video-surface-strong)",
      color: value === active ? "var(--video-background)" : "var(--video-text)", fontSize: 28, fontWeight: 800,
    }}>#{value}</div>)}
  </div>;
};

const CodeLines: React.FC<{ item: SceneActor | undefined; progress?: number }> = ({ item, progress = 0 }) => {
  if (!item || item.kind !== "code_panel") return null;
  const active = Math.min(item.codeLines.length - 1, Math.floor(progress * item.codeLines.length));
  return <div style={{ ...panelStyle, display: "grid", gap: 10, fontFamily: "Consolas, monospace", padding: "4%" }}>
    <div style={{ color: "var(--video-muted)", fontSize: 20 }}>{item.language}</div>
    {item.codeLines.map((line, index) => <div key={`${line}-${index}`} style={{
      borderRadius: 10, padding: "0.55em 0.7em", background: index === active ? "color-mix(in srgb, var(--video-accent) 24%, transparent)" : "transparent",
      color: index === active ? "var(--video-accent)" : "var(--video-text)", fontSize: 27, fontWeight: 700,
    }}><span style={{ display: "inline-block", width: 34, color: "var(--video-muted)" }}>{index + 1}</span>{line}</div>)}
  </div>;
};

export const ProblemHookRenderer: React.FC<SceneRendererProps> = ({ scene }) => {
  const progress = useActionProgress(scene, "follow_path");
  const countBeat = range(scene, "count");
  const lane = actor(scene, "comparison_lane");
  const items = lane?.kind === "comparison_lane" ? lane.items.slice(0, 100) : Array.from({ length: 100 }, (_, i) => String(i));
  const cursor = Math.min(99, Math.floor(progress * 99));
  return <div style={{ ...stageStyle, gridTemplateColumns: "2.2fr .8fr", gap: "4%" }}>
    <div style={{ ...panelStyle, display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 7, padding: "3%" }}>
      {items.map((item, index) => <div key={`${item}-${index}`} style={{
        display: "grid", placeItems: "center", borderRadius: 7, border: `2px solid ${index === cursor ? "var(--video-accent)" : "var(--video-border)"}`,
        background: index <= cursor ? "color-mix(in srgb, var(--video-secondary) 24%, var(--video-surface))" : "var(--video-surface-strong)",
        color: index === cursor ? "var(--video-accent)" : "var(--video-muted)", fontSize: 15, fontWeight: 800,
      }}>#{item}</div>)}
    </div>
    <div style={{ ...panelStyle, display: "grid", alignContent: "center", justifyItems: "center", gap: 20 }}>
      <span style={{ color: "var(--video-muted)", fontSize: 25 }}>已检查</span>
      <strong style={{ color: "var(--video-accent)", fontSize: 70 }}><NumberCount from={countBeat[0]} to={countBeat[1]} start={0} end={100} /></strong>
      <span style={{ fontSize: 28, fontWeight: 800 }}>必须从 #0 开始？</span>
    </div>
  </div>;
};

export const DirectMappingDemoRenderer: React.FC<SceneRendererProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const key = actor(scene, "key") ?? actor(scene, "data_token");
  const formula = actor(scene, "formula");
  const bucket = actor(scene, "bucket_row");
  const move = range(scene, "move");
  const typing = range(scene, "type");
  const highlight = range(scene, "highlight");
  const keyOpacity = interpolate(frame, [move[1], typing[1]], [1, .12], clamp);
  return <div style={{ ...stageStyle, gridTemplateColumns: "1fr 1.4fr 1.7fr", gap: "4%" }}>
    <div style={{ opacity: keyOpacity }}><MoveTo from={move[0]} to={move[1]} xPercent={58}><Token accent>{key ? labelFor(key) : "Key"}</Token></MoveTo></div>
    <div style={{ ...panelStyle, display: "grid", placeItems: "center", gap: 20 }}>
      <span style={{ color: "var(--video-muted)", fontSize: 23 }}>Hash Function</span>
      <strong style={{ fontSize: 43, color: "var(--video-accent)" }}><TypeText from={typing[0]} to={typing[1]} text={formula?.kind === "formula" ? formula.expression : "key % size"} /></strong>
      <span style={{ fontSize: 27 }}>{formula?.kind === "formula" ? formula.steps.join("  →  ") : "index"}</span>
    </div>
    <Highlight from={highlight[0]} to={highlight[1]}><div style={{ ...panelStyle }}><BucketStrip bucket={bucket} active={bucket?.kind === "bucket_row" ? bucket.focusIndices[0] : undefined} compact /></div></Highlight>
  </div>;
};

export const ProcessFlowRenderer: React.FC<SceneRendererProps> = ({ scene }) => <div style={{ ...stageStyle, gridAutoFlow: "column", gridAutoColumns: "1fr", gap: "3%" }}>
  {scene.actors.slice(0, 5).map((item, index) => {
    const [from, to] = actorRange(scene, item.id, index);
    return <React.Fragment key={item.id}>
      <Slide from={from} to={to} direction="up"><Token accent={index === scene.actors.length - 1}>{labelFor(item)}</Token></Slide>
      {index < Math.min(4, scene.actors.length - 1) ? <DrawArrow from={from} to={to} /> : null}
    </React.Fragment>;
  })}
</div>;

export const StepByStepRenderer: React.FC<SceneRendererProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const ranges = scene.actors.map((item, index) => actorRange(scene, item.id, index));
  const step = Math.max(0, ranges.reduce((latest, [from], index) => frame >= from ? index : latest, 0));
  return <div style={{ ...stageStyle, gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "3%" }}>
    {scene.actors.slice(0, 6).map((item, index) => {
      const [from, to] = ranges[index];
      return <Slide key={item.id} from={from} to={to} direction="up"><div style={{ ...panelStyle, opacity: index <= step ? 1 : .28, transform: `scale(${index === step ? 1.04 : 1})`, display: "grid", alignContent: "center", gap: 18 }}>
        <span style={{ color: "var(--video-accent)", fontSize: 22, fontWeight: 900 }}>STEP {index + 1}</span><strong style={{ fontSize: 32 }}>{labelFor(item)}</strong>
      </div></Slide>;
    })}
  </div>;
};

export const CompareRaceRenderer: React.FC<SceneRendererProps> = ({ scene }) => {
  const leftProgress = useActionProgress(scene, "count", 0);
  const rightProgress = useActionProgress(scene, "count", 1);
  const lanes = scene.actors.filter((item) => item.kind === "comparison_lane");
  const counters = scene.actors.filter((item) => item.kind === "counter");
  const lane = (item: SceneActor | undefined, progress: number, counter: SceneActor | undefined, accent: boolean) => <div style={{ ...panelStyle, display: "grid", gap: 24, alignContent: "center" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><strong style={{ fontSize: 34 }}>{item ? labelFor(item) : "Lookup"}</strong><strong style={{ color: accent ? "var(--video-accent)" : "var(--video-secondary)", fontSize: 46 }}>{counter?.kind === "counter" ? Math.round(counter.start + (counter.end - counter.start) * progress) : Math.round(progress * 100)}{counter?.kind === "counter" ? counter.suffix : ""}</strong></div>
    <div style={{ height: 22, borderRadius: 999, overflow: "hidden", background: "var(--video-surface-strong)" }}><div style={{ width: `${progress * 100}%`, height: "100%", background: accent ? "var(--video-accent)" : "var(--video-secondary)" }} /></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 5 }}>{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ height: 12, borderRadius: 2, background: i / 36 <= progress ? (accent ? "var(--video-accent)" : "var(--video-secondary)") : "var(--video-border)" }} />)}</div>
  </div>;
  return <div style={{ ...stageStyle, gridTemplateColumns: "1fr 1fr", gap: "4%" }}>{lane(lanes[0], leftProgress, counters[0], false)}{lane(lanes[1], rightProgress, counters[1], true)}</div>;
};

export const CollisionDemoRenderer: React.FC<SceneRendererProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const keys = scene.actors.filter((item) => item.kind === "key");
  const bucket = actor(scene, "bucket_row");
  const chain = actor(scene, "callout");
  const first = useActionProgress(scene, "move", 0);
  const second = useActionProgress(scene, "move", 1);
  const collision = range(scene, "collision");
  const reveal = range(scene, "reveal");
  const keyOpacity = interpolate(frame, [collision[1], reveal[1]], [1, .12], clamp);
  return <div style={{ ...stageStyle, gridTemplateRows: "1fr auto 1fr", justifyItems: "center", gap: "4%" }}>
    <div style={{ display: "flex", width: "78%", justifyContent: "space-between" }}>
      {keys.slice(0, 2).map((item, index) => <div key={item.id} style={{ opacity: keyOpacity, transform: `translate(${(index === 0 ? 1 : -1) * (index === 0 ? first : second) * 125}%, ${(index === 0 ? first : second) * 105}%)` }}><Token accent>{labelFor(item)}</Token></div>)}
    </div>
    <CollisionImpact at={collision[0]}><div style={{ width: "58vw", maxWidth: 900 }}><BucketStrip bucket={bucket} active={bucket?.kind === "bucket_row" ? bucket.focusIndices[0] : undefined} /></div></CollisionImpact>
    <Reveal from={reveal[0]} to={reveal[1]}><div style={{ ...panelStyle, minWidth: 360, color: "var(--video-accent)", fontSize: 36, fontWeight: 900, textAlign: "center", whiteSpace: "nowrap" }}>{chain ? labelFor(chain) : "冲突 ≠ 覆盖"}</div></Reveal>
  </div>;
};

export const MisconceptionCorrectionRenderer: React.FC<SceneRendererProps> = ({ scene }) => {
  const reveal = range(scene, "state_transition");
  const texts = scene.actors.map(labelFor);
  return <div style={{ ...stageStyle, gridTemplateColumns: "1fr auto 1fr", gap: "4%" }}>
    <div style={{ ...panelStyle, borderColor: "#d86b6b", display: "grid", gap: 18 }}><span style={{ color: "#d86b6b", fontWeight: 900 }}>误区</span><strong style={{ fontSize: 36 }}>{texts[0] ?? "只记结论"}</strong></div>
    <DrawArrow from={reveal[0]} to={reveal[1]} label="纠正" />
    <Reveal from={reveal[0]} to={reveal[1]}><div style={{ ...panelStyle, borderColor: "var(--video-secondary)", display: "grid", gap: 18 }}><span style={{ color: "var(--video-secondary)", fontWeight: 900 }}>正确机制</span><strong style={{ fontSize: 36 }}>{texts[1] ?? scene.teachingPurpose}</strong></div></Reveal>
  </div>;
};

export const CodeExecutionRenderer: React.FC<SceneRendererProps> = ({ scene }) => {
  const progress = useActionProgress(scene, "code_highlight");
  const variables = actor(scene, "variable_panel");
  return <div style={{ ...stageStyle, gridTemplateColumns: "1.55fr .85fr", gap: "4%" }}>
    <CodeLines item={actor(scene, "code_panel")} progress={progress} />
    <div style={{ ...panelStyle, display: "grid", alignContent: "center", gap: 18 }}><span style={{ color: "var(--video-muted)", fontSize: 22 }}>VARIABLES</span>{variables?.kind === "variable_panel" ? Object.entries(variables.variables).map(([key, value]) => <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}><b>{key}</b><strong style={{ color: "var(--video-accent)" }}>{value}</strong></div>) : <strong style={{ fontSize: 34 }}>state → result</strong>}</div>
  </div>;
};

export const DataStructureOperationRenderer: React.FC<SceneRendererProps> = ({ scene }) => {
  const progress = useActionProgress(scene, "state_transition");
  const collection = scene.actors.find((item) => ["array", "list", "stack", "queue", "tree", "graph"].includes(item.kind));
  const items = collection && "items" in collection ? collection.items : scene.actors.map(labelFor);
  return <div style={{ ...stageStyle, justifyItems: "center", gap: "5%" }}><div style={{ ...panelStyle, display: "flex", width: "82%", justifyContent: "center", alignItems: "center", gap: 14 }}>
    {items.slice(0, 10).map((item, index) => <div key={`${item}-${index}`} style={{ transform: `translateY(${index === items.length - 1 ? (1 - progress) * -80 : 0}px)`, opacity: index === items.length - 1 ? progress : 1 }}><Token accent={index === items.length - 1}>{item}</Token></div>)}
  </div><strong style={{ color: "var(--video-accent)", fontSize: 38 }}>{collection?.label ?? scene.teachingPurpose}</strong></div>;
};

export const AlgorithmTraceRenderer: React.FC<SceneRendererProps> = ({ scene }) => {
  const progress = useActionProgress(scene, "code_highlight");
  const actors = scene.actors.filter((item) => item.kind !== "code_panel");
  return <div style={{ ...stageStyle, gridTemplateColumns: "1.25fr 1fr", gap: "4%" }}><CodeLines item={actor(scene, "code_panel")} progress={progress} /><div style={{ display: "grid", gap: 16 }}>{actors.slice(0, 5).map((item, index) => <div key={item.id} style={{ ...panelStyle, padding: "5%", opacity: progress * actors.length >= index ? 1 : .3, borderColor: progress * actors.length >= index ? "var(--video-accent)" : "var(--video-border)", fontSize: 28, fontWeight: 800 }}>{index + 1}. {labelFor(item)}</div>)}</div></div>;
};

export const ConceptRelationshipRenderer: React.FC<SceneRendererProps> = ({ scene }) => <div style={{ ...stageStyle, gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "4%", justifyItems: "center" }}>
  {scene.actors.slice(0, 6).map((item, index) => {
    const [from, to] = actorRange(scene, item.id, index);
    return <React.Fragment key={item.id}><Scale from={from} to={to}><Token accent={index === 1}>{labelFor(item)}</Token></Scale>{index < 2 ? <DrawArrow from={from} to={to} /> : null}</React.Fragment>;
  })}
</div>;

export const BeforeAfterRenderer: React.FC<SceneRendererProps> = ({ scene }) => {
  const transition = range(scene, "state_transition");
  const mid = Math.ceil(scene.actors.length / 2);
  const groups = [scene.actors.slice(0, mid), scene.actors.slice(mid)];
  return <div style={{ ...stageStyle, gridTemplateColumns: "1fr 1fr", gap: "4%" }}>{groups.map((group, index) => <div key={index} style={{ ...panelStyle, display: "grid", alignContent: "center", gap: 20, opacity: index === 0 ? 1 : undefined }}><span style={{ color: index ? "var(--video-accent)" : "var(--video-muted)", fontSize: 24, fontWeight: 900 }}>{index ? "AFTER" : "BEFORE"}</span>{index ? <Reveal from={transition[0]} to={transition[1]}>{group.map((item) => <Token key={item.id} accent>{labelFor(item)}</Token>)}</Reveal> : group.map((item) => <Token key={item.id}>{labelFor(item)}</Token>)}</div>)}</div>;
};

export const TimelineRenderer: React.FC<SceneRendererProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  return <div style={{ ...stageStyle, gridTemplateRows: "auto auto", gap: "7%" }}><div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, scene.actors.length)},1fr)`, gap: 12 }}>{scene.actors.map((item, index) => {
    const [from, to] = actorRange(scene, item.id, index);
    return <Fade key={item.id} from={from} to={to}><div style={{ ...panelStyle, padding: "9%", borderColor: frame >= from ? "var(--video-accent)" : "var(--video-border)", fontSize: 27, fontWeight: 800 }}>{index + 1}. {labelFor(item)}</div></Fade>;
  })}</div><div style={{ height: 6, borderRadius: 999, background: "var(--video-border)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, frame / scene.durationFrames * 100)}%`, height: "100%", background: "var(--video-accent)" }} /></div></div>;
};

export const ZoomFocusRenderer: React.FC<SceneRendererProps> = ({ scene }) => {
  const camera = range(scene, "camera");
  const highlight = range(scene, "highlight");
  const move = range(scene, "move");
  const bucket = actor(scene, "bucket_row");
  const key = actor(scene, "key");
  const focus = bucket?.kind === "bucket_row" ? bucket.focusIndices.find((value) => value === 36) ?? bucket.focusIndices[0] : undefined;
  return <CameraFocus from={camera[0]} to={camera[1]}><div style={{ ...stageStyle, gridTemplateRows: "1fr auto", gap: "5%", justifyItems: "center" }}><Highlight from={highlight[0]} to={highlight[1]}><div style={{ ...panelStyle, width: "78vw", maxWidth: 1100 }}><BucketStrip bucket={bucket} active={focus} /></div></Highlight><MoveTo from={move[0]} to={move[1]} yPercent={-115}><Token accent>{key ? labelFor(key) : "Key"}</Token></MoveTo></div></CameraFocus>;
};

export const SummaryRecallRenderer: React.FC<SceneRendererProps> = ({ scene }) => <div style={{ ...stageStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: "2%" }}>
  {scene.actors.slice(0, 6).map((item, index) => { const beat = scene.beats[index] ?? scene.beats[scene.beats.length - 1]; const from = beat?.startFrame ?? index * 10; const to = beat?.endFrame ?? from + 18; return <React.Fragment key={item.id}><div style={{ flex: "1 1 0", minWidth: 0 }}><Reveal from={from} to={to}><Token accent={index === scene.actors.length - 1}>{labelFor(item)}</Token></Reveal></div>{index < scene.actors.length - 1 ? <div style={{ flex: "0 1 10%" }}><DrawArrow from={from + 4} to={to} /></div> : null}</React.Fragment>; })}
</div>;
