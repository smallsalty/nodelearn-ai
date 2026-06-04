import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { VideoLessonScene, VisualElement } from "../types";
import { ArrowFlow, ComparisonPanel, ConceptCard, GridHighlight, IconBubble, ImageElement, MotionText, SummaryCards, TimelineSteps, palette } from "./MotionGraphicsComponents";

const renderElement = (element: VisualElement, index: number) => {
  if (element.type === "text" || element.type === "keyword") {
    return <MotionText key={index} content={element.content} animation={element.animation} index={index} keyword={element.type === "keyword"} />;
  }
  if (element.type === "card") return <ConceptCard key={index} content={element.content} animation={element.animation} index={index} />;
  if (element.type === "icon") return <IconBubble key={index} name={element.name} animation={element.animation} index={index} />;
  if (element.type === "arrow") return <ArrowFlow key={index} label={element.label} animation={element.animation} index={index} />;
  if (element.type === "circle") return <MotionText key={index} content={element.label} animation={element.animation} index={index} keyword />;
  if (element.type === "grid") return <GridHighlight key={index} label={element.label} items={element.items} highlightIndex={element.highlightIndex} animation={element.animation} />;
  if (element.type === "timeline") return <TimelineSteps key={index} items={element.items} animation={element.animation} />;
  if (element.type === "image") return <ImageElement key={index} imageUrl={element.imageUrl} alt={element.alt} animation={element.animation} index={index} />;
  if (element.type === "formula") return <MotionText key={index} content={element.content} animation={element.animation} index={index} keyword />;
  return <ConceptCard key={index} content={element.content} animation={element.animation} index={index} />;
};

const SceneVisual: React.FC<{ scene: VideoLessonScene }> = ({ scene }) => {
  const elements = scene.visualPlan.elements;
  if (scene.visualPlan.layout === "comparison") {
    const splitAt = Math.ceil(elements.length / 2);
    return <ComparisonPanel left={elements.slice(0, splitAt).map(renderElement)} right={elements.slice(splitAt).map(renderElement)} />;
  }
  if (scene.visualPlan.layout === "grid_focus") {
    const gridElements = elements.filter((element) => element.type === "grid");
    const supportElements = elements.filter((element) => element.type !== "grid");
    return (
      <div style={{ display: "grid", gridTemplateColumns: gridElements.length ? "minmax(460px, 1.2fr) minmax(320px, 0.8fr)" : "1fr", alignItems: "center", gap: 56, width: "100%" }}>
        <div style={{ display: "grid", placeItems: "center", transform: "scale(1.18)" }}>
          {(gridElements.length ? gridElements : elements).map(renderElement)}
        </div>
        {gridElements.length ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            {supportElements.map(renderElement)}
          </div>
        ) : null}
      </div>
    );
  }
  if (scene.visualPlan.layout === "summary_cards") {
    return <SummaryCards elements={elements.filter((element): element is Extract<VisualElement, { type: "card" }> => element.type === "card")} />;
  }
  if (scene.visualPlan.layout === "timeline") {
    return <>{elements.map(renderElement)}</>;
  }
  const direction = scene.visualPlan.layout === "pipeline" || scene.visualPlan.layout === "left_right" ? "row" : "column";
  return <div style={{ display: "flex", flexDirection: direction, alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 28, width: "100%" }}>{elements.map(renderElement)}</div>;
};

export const UniversalExplainerVideoRenderer: React.FC<{
  lessonTitle: string;
  scene: VideoLessonScene;
  sceneIndex: number;
  sceneCount: number;
  sceneDurationInFrames: number;
}> = ({ lessonTitle, scene, sceneIndex, sceneCount, sceneDurationInFrames }) => {
  const frame = useCurrentFrame();
  const cameraScale = interpolate(frame, [0, sceneDurationInFrames], [1, 1.035], { extrapolateRight: "clamp" });
  const progress = Math.min(100, ((sceneIndex + frame / sceneDurationInFrames) / Math.max(1, sceneCount)) * 100);
  return (
    <AbsoluteFill style={{ overflow: "hidden", padding: "62px 78px 48px", boxSizing: "border-box", background: palette.background, color: palette.text, fontFamily: "Arial, 'Microsoft YaHei', sans-serif" }}>
      <div style={{ position: "absolute", width: 660, height: 660, left: -160 + Math.sin(frame / 50) * 24, top: -220, borderRadius: "50%", background: "radial-gradient(circle, rgba(51,214,197,0.16), transparent 68%)" }} />
      <div style={{ position: "absolute", width: 760, height: 760, right: -260 + Math.cos(frame / 60) * 20, bottom: -320, borderRadius: "50%", background: "radial-gradient(circle, rgba(94,161,255,0.18), transparent 70%)" }} />

      <header style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: palette.cyan, fontSize: 20, letterSpacing: 4 }}>NODELEARN AI / EXPLAINER</div>
          <div style={{ marginTop: 12, color: palette.muted, fontSize: 24 }}>{lessonTitle}</div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", color: palette.muted, fontSize: 22 }}>
          <span style={{ padding: "8px 16px", border: `1px solid ${palette.border}`, borderRadius: 999 }}>{scene.sceneType}</span>
          <span>{sceneIndex + 1} / {sceneCount}</span>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateRows: "auto 1fr", gap: 28, minHeight: 0, height: 820, transform: `scale(${cameraScale})`, transformOrigin: "center" }}>
        <h1 style={{ margin: "30px 0 0", color: palette.amber, fontSize: 52, lineHeight: 1.2 }}>{scene.title}</h1>
        <section style={{ display: "flex", minHeight: 0, width: "100%", alignItems: "center", justifyContent: "center" }}>
          <SceneVisual scene={scene} />
        </section>
      </main>

      <footer style={{ position: "absolute", zIndex: 2, right: 78, bottom: 44, left: 78 }}>
        <div style={{ height: 7, overflow: "hidden", borderRadius: 999, background: "rgba(94,161,255,0.2)" }}>
          <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${palette.cyan}, ${palette.blue})` }} />
        </div>
      </footer>
    </AbsoluteFill>
  );
};
