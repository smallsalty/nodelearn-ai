import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoLessonScene, VideoNarrationBeat, VideoTheme, VisualElement, VisualPlan } from "../types";
import { VIDEO_THEMES, themeCssVariables } from "../themes";
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

const SceneVisual: React.FC<{ visualPlan: VisualPlan }> = ({ visualPlan }) => {
  const elements = visualPlan.elements;
  if (visualPlan.layout === "comparison") {
    const splitAt = Math.ceil(elements.length / 2);
    return <ComparisonPanel left={elements.slice(0, splitAt).map(renderElement)} right={elements.slice(splitAt).map(renderElement)} />;
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
  if (visualPlan.layout === "timeline") return <>{elements.slice(0, 2).map(renderElement)}</>;
  const direction = visualPlan.layout === "pipeline" || visualPlan.layout === "left_right" ? "row" : "column";
  return <div style={{ display: "flex", flexDirection: direction, alignItems: "center", justifyContent: "center", gap: 36, width: "100%" }}>{elements.slice(0, 2).map(renderElement)}</div>;
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
  const reveal = spring({ frame, fps, config: { damping: 24, stiffness: 92, mass: 0.8 } });
  const settle = interpolate(frame, [0, Math.min(24, beatDurationInFrames)], [18, 0], { extrapolateRight: "clamp" });
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
      <main style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 22, height: subtitleEnabled ? 826 : 900, opacity: reveal, transform: `translateY(${settle}px)` }}>
        <div style={{ color: tokens.muted, fontSize: 25, fontWeight: 700, letterSpacing: 3 }}>{scene.title}</div>
        <h1 style={{ margin: 0, maxWidth: 1420, color: tokens.primary, fontSize: 70, lineHeight: 1.12, letterSpacing: -1.5 }}>{beat.screenText[0]}</h1>
        <section style={{ display: "flex", minHeight: 0, alignItems: "center", justifyContent: "center" }}>
          <SceneVisual visualPlan={beat.visualPlan} />
        </section>
      </main>
      {subtitleEnabled ? (
        <div style={{ position: "absolute", right: 180, bottom: 38, left: 180, display: "grid", placeItems: "center" }}>
          <div style={{ maxWidth: 1420, padding: "14px 24px", background: tokens.surface, border: `1px solid ${tokens.border}`, color: tokens.text, fontSize: 31, lineHeight: 1.45, textAlign: "center", boxShadow: "0 12px 36px rgba(0,0,0,.12)" }}>
            {beat.narration}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
