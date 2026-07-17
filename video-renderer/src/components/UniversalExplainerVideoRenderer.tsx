import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoLessonScene, VideoNarrationBeat, VideoTheme, VisualElement, VisualPlan } from "../types";
import { VIDEO_THEMES, themeCssVariables } from "../themes";
import type { VideoThemeTokens } from "../themes";
import { ArrowFlow, ComparisonPanel, ConceptCard, GridHighlight, IconBubble, ImageElement, MotionText, SummaryCards, TimelineSteps } from "./MotionGraphicsComponents";
import {
  ArrayCells,
  CodeTracePanel,
  CollisionChain,
  ComplexityChart,
  HashFunctionPanel,
  HashTableBuckets,
  LinkedListNodes,
  MemoryBox,
  PointerArrow,
  QueueLine,
  StackBlocks,
  TreeNodeGraph,
} from "./data-structures/DataStructureComponents";

const renderElement = (element: VisualElement, index: number) => {
  if (element.type === "text" || element.type === "keyword") return <MotionText key={index} content={element.content} animation={element.animation} index={index} keyword={element.type === "keyword"} />;
  if (element.type === "card") return <ConceptCard key={index} content={element.content} animation={element.animation} index={index} />;
  if (element.type === "icon") return <IconBubble key={index} name={element.name} animation={element.animation} index={index} />;
  if (element.type === "arrow") return <ArrowFlow key={index} label={element.label} animation={element.animation} index={index} />;
  if (element.type === "circle") return <MotionText key={index} content={element.label} animation={element.animation} index={index} keyword />;
  if (element.type === "grid") return <GridHighlight key={index} label={element.label} items={element.items} highlightIndex={element.highlightIndex} animation={element.animation} />;
  if (element.type === "timeline") return <TimelineSteps key={index} items={element.items} animation={element.animation} />;
  if (element.type === "image") return <ImageElement key={index} imageUrl={element.imageUrl} alt={element.alt} animation={element.animation} index={index} />;
  if (element.type === "formula") return <MotionText key={index} content={element.content} animation={element.animation} index={index} keyword />;
  if (element.type === "code") return <ConceptCard key={index} content={element.content} animation={element.animation} index={index} />;
  if (element.type === "hash_table_buckets") return <HashTableBuckets key={index} element={element} index={index} />;
  if (element.type === "hash_function_panel") return <HashFunctionPanel key={index} element={element} index={index} />;
  if (element.type === "collision_chain") return <CollisionChain key={index} element={element} index={index} />;
  if (element.type === "array_cells") return <ArrayCells key={index} element={element} index={index} />;
  if (element.type === "linked_list_nodes") return <LinkedListNodes key={index} element={element} index={index} />;
  if (element.type === "stack_blocks") return <StackBlocks key={index} element={element} index={index} />;
  if (element.type === "queue_line") return <QueueLine key={index} element={element} index={index} />;
  if (element.type === "tree_node_graph") return <TreeNodeGraph key={index} element={element} index={index} />;
  if (element.type === "code_trace_panel") return <CodeTracePanel key={index} element={element} index={index} />;
  if (element.type === "pointer_arrow") return <PointerArrow key={index} element={element} index={index} />;
  if (element.type === "memory_box") return <MemoryBox key={index} element={element} index={index} />;
  if (element.type === "complexity_chart") return <ComplexityChart key={index} element={element} index={index} />;
  return null;
};

const domainTypes = new Set<VisualElement["type"]>(["hash_table_buckets", "hash_function_panel", "collision_chain", "array_cells", "linked_list_nodes", "stack_blocks", "queue_line", "tree_node_graph", "code_trace_panel", "pointer_arrow", "memory_box", "complexity_chart"]);

type SceneTemplate = "hook" | "definition" | "focus" | "pipeline" | "comparison" | "process" | "example" | "summary";

const sceneLabels: Record<VideoLessonScene["sceneType"], string> = {
  hook: "提出问题",
  definition: "定义",
  analogy: "类比",
  mechanism: "工作机制",
  comparison: "对比",
  process: "过程",
  example: "案例",
  summary: "总结",
};

const sceneTemplate = (scene: VideoLessonScene, layout: VisualPlan["layout"]): SceneTemplate => {
  if (scene.sceneType === "hook") return "hook";
  if (scene.sceneType === "summary") return "summary";
  if (scene.sceneType === "definition") return "definition";
  if (scene.sceneType === "comparison" || layout === "comparison") return "comparison";
  if (scene.sceneType === "process" || layout === "timeline") return "process";
  if (scene.sceneType === "analogy" || layout === "pipeline") return "pipeline";
  if (scene.sceneType === "example") return "example";
  return "focus";
};

const ContextBadge: React.FC<{ scene: VideoLessonScene; tokens: VideoThemeTokens }> = ({ scene, tokens }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "fit-content",
      padding: "8px 16px",
      border: `1px solid ${tokens.border}`,
      borderRadius: 999,
      background: tokens.surface,
      color: tokens.secondary,
      fontSize: 24,
      fontWeight: 700,
    }}
  >
    {sceneLabels[scene.sceneType]}
  </div>
);

const KeyTextBlock: React.FC<{
  texts: string[];
  tokens: VideoThemeTokens;
  template: SceneTemplate;
  align?: "left" | "center";
}> = ({ texts, tokens, template, align = "left" }) => {
  const [primary, ...supporting] = texts;
  const centered = align === "center";
  const primarySize = template === "hook" ? 84 : template === "summary" ? 70 : 66;
  return (
    <div style={{ display: "grid", gap: 24, justifyItems: centered ? "center" : "start", textAlign: align, minWidth: 0 }}>
      <h1
        style={{
          margin: 0,
          maxWidth: template === "hook" ? 1420 : 820,
          color: tokens.primary,
          fontSize: primarySize,
          fontWeight: 800,
          lineHeight: 1.12,
          letterSpacing: 0,
        }}
      >
        {primary}
      </h1>
      {supporting.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: centered ? "center" : "flex-start", gap: 14 }}>
          {supporting.map((text, index) => (
            <div
              key={`${text}-${index}`}
              style={{
                padding: "12px 18px",
                borderLeft: `5px solid ${index === 0 ? tokens.accent : tokens.secondary}`,
                borderRadius: 10,
                background: tokens.surface,
                color: tokens.text,
                fontSize: 31,
                fontWeight: 650,
                lineHeight: 1.35,
              }}
            >
              {text}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const SceneVisual: React.FC<{ visualPlan: VisualPlan; compact?: boolean }> = ({ visualPlan, compact = false }) => {
  const elements = visualPlan.elements;
  if (visualPlan.layout === "comparison") {
    if (elements.length < 2) {
      return <div style={{ display: "grid", placeItems: "center", width: "100%" }}>{elements.map(renderElement)}</div>;
    }
    const splitAt = Math.ceil(elements.length / 2);
    return <ComparisonPanel left={elements.slice(0, splitAt).map(renderElement)} right={elements.slice(splitAt).map(renderElement)} />;
  }
  if (visualPlan.layout === "timeline") {
    const timelines = elements.filter((element) => element.type === "timeline");
    const anchors = elements.filter((element) => element.type !== "timeline");
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: timelines.length && anchors.length ? "minmax(520px,.95fr) minmax(560px,1.05fr)" : "1fr",
          alignItems: "center",
          gap: 48,
          width: "100%",
        }}
      >
        {timelines.length ? <div style={{ display: "grid", placeItems: "center" }}>{timelines.slice(0, 1).map(renderElement)}</div> : null}
        <div style={{ display: "grid", placeItems: "center" }}>{(anchors.length ? anchors : elements).slice(0, compact ? 1 : 2).map(renderElement)}</div>
      </div>
    );
  }
  if (visualPlan.layout === "grid_focus") {
    const anchors = elements.filter((element) => element.type === "grid" || domainTypes.has(element.type));
    const supporting = elements.filter((element) => element.type !== "grid" && !domainTypes.has(element.type));
    return (
      <div style={{ display: "grid", gridTemplateColumns: anchors.length && supporting.length ? "minmax(640px,1.25fr) minmax(300px,.75fr)" : "1fr", alignItems: "center", gap: 64, width: "100%" }}>
        <div style={{ display: "grid", placeItems: "center" }}>{(anchors.length ? anchors : elements).slice(0, 1).map(renderElement)}</div>
        {supporting.length ? <div style={{ display: "grid", placeItems: "center" }}>{supporting.slice(0, 1).map(renderElement)}</div> : null}
      </div>
    );
  }
  if (visualPlan.layout === "summary_cards") return <SummaryCards elements={elements.filter((element): element is Extract<VisualElement, { type: "card" }> => element.type === "card")} />;
  const direction = visualPlan.layout === "pipeline" || visualPlan.layout === "left_right" ? "row" : "column";
  return <div style={{ display: "flex", flexDirection: direction, alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 36, width: "100%" }}>{elements.slice(0, compact ? 1 : 2).map(renderElement)}</div>;
};

export const UniversalExplainerVideoRenderer: React.FC<{
  scene: VideoLessonScene;
  beat: VideoNarrationBeat;
  theme: VideoTheme;
  subtitleEnabled: boolean;
  beatDurationInFrames: number;
}> = ({ scene, beat, theme, subtitleEnabled, beatDurationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tokens = VIDEO_THEMES[theme];
  const template = sceneTemplate(scene, beat.visualPlan.layout);
  const screenText = (beat.screenText.length ? beat.screenText : [scene.title]).filter(Boolean).slice(0, 3);
  const reveal = spring({ frame, fps, config: { damping: 24, stiffness: 92, mass: 0.8 } });
  const settle = interpolate(frame, [0, Math.min(24, beatDurationInFrames)], [18, 0], { extrapolateRight: "clamp" });

  const label = <ContextBadge scene={scene} tokens={tokens} />;
  const textBlock = <KeyTextBlock texts={screenText} tokens={tokens} template={template} align={template === "hook" ? "center" : "left"} />;
  const visual = <SceneVisual visualPlan={beat.visualPlan} compact={template === "definition" || template === "example"} />;

  const content = (() => {
    if (template === "hook") {
      return (
        <div style={{ display: "grid", alignContent: "center", justifyItems: "center", gap: 42, height: "100%" }}>
          {label}
          {textBlock}
          <div style={{ display: "grid", placeItems: "center", minHeight: 230 }}>{visual}</div>
        </div>
      );
    }
    if (template === "definition" || template === "example") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: template === "definition" ? "minmax(560px,.9fr) minmax(720px,1.1fr)" : "minmax(620px,1fr) minmax(660px,1fr)", alignItems: "center", gap: 72, height: "100%" }}>
          <div style={{ display: "grid", alignContent: "center", gap: 30 }}>{label}{textBlock}</div>
          <div style={{ display: "grid", placeItems: "center", minWidth: 0 }}>{visual}</div>
        </div>
      );
    }
    if (template === "focus") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(780px,1.2fr) minmax(500px,.8fr)", alignItems: "center", gap: 68, height: "100%" }}>
          <div style={{ display: "grid", placeItems: "center", minWidth: 0 }}>{visual}</div>
          <div style={{ display: "grid", alignContent: "center", gap: 30 }}>{label}{textBlock}</div>
        </div>
      );
    }
    if (template === "summary") {
      return (
        <div style={{ display: "grid", gridTemplateRows: "auto 1fr", alignItems: "center", gap: 42, height: "100%" }}>
          <div style={{ display: "grid", gap: 24 }}>{label}{textBlock}</div>
          <div style={{ display: "grid", placeItems: "center" }}>{visual}</div>
        </div>
      );
    }
    return (
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr", alignItems: "center", gap: 34, height: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", alignItems: "start", gap: 28 }}>{label}{textBlock}</div>
        <div style={{ display: "grid", placeItems: "center", minWidth: 0 }}>{visual}</div>
      </div>
    );
  })();

  return (
    <AbsoluteFill
      style={{
        ...themeCssVariables(theme),
        boxSizing: "border-box",
        overflow: "hidden",
        padding: "78px 96px 86px",
        backgroundColor: tokens.background,
        backgroundImage: `linear-gradient(${tokens.grid} 1px, transparent 1px),linear-gradient(90deg,${tokens.grid} 1px,transparent 1px)`,
        backgroundSize: theme === "warm_academic" ? "64px 64px" : "48px 48px",
        color: tokens.text,
        fontFamily: tokens.fontFamily,
      }}
    >
      <main style={{ height: subtitleEnabled ? 826 : 900, opacity: reveal, transform: `translateY(${settle}px)` }}>
        {content}
      </main>
      {subtitleEnabled ? (
        <div style={{ position: "absolute", right: 180, bottom: 38, left: 180, display: "grid", placeItems: "center" }}>
          <div style={{ display: "-webkit-box", maxWidth: 1420, maxHeight: 104, overflow: "hidden", padding: "14px 24px", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, background: tokens.surface, border: `1px solid ${tokens.border}`, color: tokens.text, fontSize: 31, lineHeight: 1.45, textAlign: "center", boxShadow: "0 12px 36px rgba(0,0,0,.12)" }}>
            {beat.narration}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
