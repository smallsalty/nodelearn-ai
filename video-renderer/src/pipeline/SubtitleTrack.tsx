import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { SubtitleCue } from "../types";

const highlightedText = (text: string, terms: string[]) => {
  const activeTerms = terms.filter(Boolean).sort((left, right) => right.length - left.length);
  if (!activeTerms.length) return text;
  const escaped = activeTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "g");
  return text.split(pattern).map((part, index) => activeTerms.includes(part)
    ? <strong key={`${part}-${index}`} style={{ color: "var(--video-accent)", fontWeight: 900 }}>{part}</strong>
    : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>);
};

export const SubtitleTrack: React.FC<{ cues: SubtitleCue[] }> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cue = cues.find((item) => item.startFrame <= frame && frame < item.endFrame);
  if (!cue) return null;
  const lines = cue.text.length <= 18 ? [cue.text] : [cue.text.slice(0, 18), cue.text.slice(18, 36)];
  return <div style={{
    position: "absolute",
    left: "8%",
    right: "8%",
    bottom: "5%",
    display: "grid",
    justifyItems: "center",
    zIndex: 30,
    pointerEvents: "none",
  }}>
    <div style={{
      maxWidth: "88%",
      color: "#fffdf5",
      fontSize: Math.max(26, Math.min(width * 0.026, height * 0.044)),
      fontWeight: 750,
      lineHeight: 1.42,
      letterSpacing: "0.02em",
      textAlign: "center",
      textShadow: "0 2px 4px rgba(0,0,0,.98), 0 0 9px rgba(0,0,0,.92), 2px 2px 0 rgba(0,0,0,.78), -2px -2px 0 rgba(0,0,0,.78)",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
    }}>
      {lines.map((line, index) => <div key={`${line}-${index}`}>{highlightedText(line, cue.highlightTerms)}</div>)}
    </div>
  </div>;
};
