import React from "react";
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VisualAnimationType, VisualElement } from "../types";

export const palette = {
  background: "#071426",
  surface: "rgba(16, 35, 63, 0.88)",
  surfaceStrong: "#173352",
  cyan: "#33d6c5",
  blue: "#5ea1ff",
  amber: "#ffc857",
  lavender: "#a78bfa",
  text: "#f7fbff",
  muted: "#a9bdd7",
  border: "rgba(94, 161, 255, 0.28)",
};

const entranceStyle = (animation: VisualAnimationType, index = 0): React.CSSProperties => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = index * 6;
  const progress = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 105, mass: 0.7 } });
  const fade = interpolate(frame - delay, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const floatOffset = Math.sin((frame - delay) / 15) * 10;
  const transforms: Record<VisualAnimationType, string> = {
    fade_in: `translateY(${(1 - progress) * 18}px)`,
    pop_in: `scale(${0.68 + progress * 0.32})`,
    slide_in_left: `translateX(${(1 - progress) * -150}px)`,
    slide_in_right: `translateX(${(1 - progress) * 150}px)`,
    float: `translateY(${floatOffset}px) scale(${0.92 + progress * 0.08})`,
    draw: `scaleX(${progress})`,
    highlight: `scale(${0.92 + progress * 0.08})`,
    zoom_in: `scale(${0.58 + progress * 0.42})`,
    stagger_in: `translateY(${(1 - progress) * 58}px)`,
  };
  return { opacity: fade, transform: transforms[animation], transformOrigin: "center" };
};

export const MotionText: React.FC<{ content: string; animation: VisualAnimationType; index?: number; keyword?: boolean }> = ({
  content,
  animation,
  index = 0,
  keyword = false,
}) => (
  <div
    style={{
      ...entranceStyle(animation, index),
      padding: keyword ? "16px 28px" : "10px 18px",
      border: keyword ? `1px solid ${palette.cyan}` : "none",
      borderRadius: 999,
      background: keyword ? "rgba(51, 214, 197, 0.12)" : "transparent",
      color: keyword ? palette.cyan : palette.text,
      fontSize: keyword ? 42 : 38,
      fontWeight: keyword ? 700 : 600,
      letterSpacing: keyword ? 2 : 0,
      textAlign: "center",
    }}
  >
    {content}
  </div>
);

export const ConceptCard: React.FC<{ content: string; animation: VisualAnimationType; index?: number }> = ({
  content,
  animation,
  index = 0,
}) => (
  <div
    style={{
      ...entranceStyle(animation, index),
      minWidth: 190,
      maxWidth: 360,
      padding: "28px 30px",
      border: `1px solid ${palette.border}`,
      borderRadius: 24,
      background: palette.surface,
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.24)",
      color: palette.text,
      fontSize: 30,
      fontWeight: 650,
      lineHeight: 1.35,
      textAlign: "center",
    }}
  >
    {content}
  </div>
);

const iconPaths: Record<string, React.ReactNode> = {
  search: <><circle cx="20" cy="20" r="10" /><path d="m28 28 10 10" /></>,
  folder: <><path d="M7 13h13l4 5h17v20H7z" /><path d="M7 18h34" /></>,
  hash: <><path d="M17 7 13 41M31 7l-4 34M8 18h32M6 30h32" /></>,
  route: <><circle cx="10" cy="11" r="4" /><circle cx="38" cy="36" r="4" /><path d="M14 11h10c8 0 8 11 0 11h-2c-8 0-8 14 0 14h12" /></>,
};

export const IconBubble: React.FC<{ name: string; animation: VisualAnimationType; index?: number }> = ({
  name,
  animation,
  index = 0,
}) => (
  <div
    style={{
      ...entranceStyle(animation, index),
      display: "grid",
      placeItems: "center",
      width: 142,
      height: 142,
      border: `2px solid ${palette.cyan}`,
      borderRadius: "50%",
      background: "rgba(51, 214, 197, 0.1)",
      boxShadow: "0 0 70px rgba(51, 214, 197, 0.2)",
    }}
  >
    <svg width="76" height="76" viewBox="0 0 48 48" fill="none" stroke={palette.cyan} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name] ?? iconPaths.route}
    </svg>
  </div>
);

export const ArrowFlow: React.FC<{ label: string; animation: VisualAnimationType; index?: number }> = ({
  label,
  animation,
  index = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - index * 6, fps, config: { damping: 20, stiffness: 90 } });
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 10, minWidth: 160, color: palette.cyan }}>
      <span style={{ fontSize: 22, opacity: progress }}>{label}</span>
      <svg width="160" height="34" viewBox="0 0 160 34" fill="none">
        <path d="M4 17h138" stroke={palette.cyan} strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} />
        <path d="m134 6 18 11-18 11" stroke={palette.cyan} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity={progress} />
      </svg>
    </div>
  );
};

export const GridHighlight: React.FC<{ label: string; items?: string[]; highlightIndex: number; animation: VisualAnimationType }> = ({
  label,
  items = ["0", "1", "2", "3", "4", "5", "6", "7", "8"],
  highlightIndex,
  animation,
}) => {
  const frame = useCurrentFrame();
  const pulse = 0.72 + Math.sin(frame / 8) * 0.16;
  return (
    <div style={{ ...entranceStyle(animation), display: "grid", gap: 18, justifyItems: "center" }}>
      <strong style={{ color: palette.amber, fontSize: 28 }}>{label}</strong>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 92px)", gap: 12 }}>
        {items.slice(0, 9).map((item, index) => (
          <div key={`${item}-${index}`} style={{ display: "grid", placeItems: "center", height: 74, borderRadius: 14, border: `1px solid ${index === highlightIndex ? palette.amber : palette.border}`, background: index === highlightIndex ? `rgba(255, 200, 87, ${pulse})` : palette.surfaceStrong, color: index === highlightIndex ? palette.background : palette.text, fontSize: 24, fontWeight: 700 }}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

export const TimelineSteps: React.FC<{ items: string[]; animation: VisualAnimationType }> = ({ items, animation }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%", justifyContent: "center" }}>
    {items.map((item, index) => (
      <React.Fragment key={`${item}-${index}`}>
        <ConceptCard content={`${index + 1}. ${item}`} animation={animation} index={index} />
        {index < items.length - 1 ? <ArrowFlow label="" animation="draw" index={index + 1} /> : null}
      </React.Fragment>
    ))}
  </div>
);

export const ComparisonPanel: React.FC<{ left: React.ReactNode; right: React.ReactNode }> = ({ left, right }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 52, width: "100%" }}>
    <div style={{ display: "grid", gap: 20, justifyItems: "center", alignContent: "center", padding: 28, border: `1px solid ${palette.border}`, borderRadius: 24, background: palette.surface }}>
      <span style={{ color: palette.muted, fontSize: 24 }}>BASELINE</span>
      {left}
    </div>
    <div style={{ display: "grid", gap: 20, justifyItems: "center", alignContent: "center", padding: 28, border: `1px solid ${palette.cyan}`, borderRadius: 24, background: "rgba(51, 214, 197, 0.1)" }}>
      <span style={{ color: palette.cyan, fontSize: 24 }}>FOCUS</span>
      {right}
    </div>
  </div>
);

export const SummaryCards: React.FC<{ elements: Extract<VisualElement, { type: "card" }>[] }> = ({ elements }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, width: "100%" }}>
    {elements.slice(0, 3).map((element, index) => (
      <ConceptCard key={`${element.content}-${index}`} content={element.content} animation="stagger_in" index={index} />
    ))}
  </div>
);

export const ImageElement: React.FC<{ imageUrl: string; alt: string; animation: VisualAnimationType; index?: number }> = ({
  imageUrl,
  alt,
  animation,
  index = 0,
}) => (
  <div style={{ ...entranceStyle(animation, index), overflow: "hidden", width: 360, height: 230, borderRadius: 24, border: `1px solid ${palette.border}` }}>
    <Img src={imageUrl} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </div>
);
