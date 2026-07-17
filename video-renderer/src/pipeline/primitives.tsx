import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const useProgress = (from: number, to: number, springDriven = false) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (springDriven) {
    return spring({ frame: frame - from, fps, durationInFrames: Math.max(1, to - from), config: { damping: 18, stiffness: 110, mass: 0.8 } });
  }
  return interpolate(frame, [from, Math.max(from + 1, to)], [0, 1], clamp);
};

export const Fade: React.FC<React.PropsWithChildren<{ from: number; to: number }>> = ({ from, to, children }) => {
  const progress = useProgress(from, to);
  return <div style={{ opacity: progress }}>{children}</div>;
};

export const Slide: React.FC<React.PropsWithChildren<{ from: number; to: number; direction?: "left" | "right" | "up" | "down" }>> = ({ from, to, direction = "left", children }) => {
  const progress = useProgress(from, to, true);
  const vectors = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] } as const;
  const [x, y] = vectors[direction];
  return <div style={{ opacity: progress, transform: `translate(${x * (1 - progress) * 12}%, ${y * (1 - progress) * 12}%)` }}>{children}</div>;
};

export const MoveTo: React.FC<React.PropsWithChildren<{ from: number; to: number; xPercent?: number; yPercent?: number }>> = ({ from, to, xPercent = 0, yPercent = 0, children }) => {
  const progress = useProgress(from, to, true);
  return <div style={{ transform: `translate(${xPercent * progress}%, ${yPercent * progress}%)` }}>{children}</div>;
};

export const Scale: React.FC<React.PropsWithChildren<{ from: number; to: number; start?: number; end?: number }>> = ({ from, to, start = 0.72, end = 1, children }) => {
  const progress = useProgress(from, to, true);
  return <div style={{ transform: `scale(${start + (end - start) * progress})` }}>{children}</div>;
};

export const GrowLine: React.FC<{ from: number; to: number; vertical?: boolean }> = ({ from, to, vertical = false }) => {
  const progress = useProgress(from, to);
  return <div style={{ width: vertical ? 4 : `${progress * 100}%`, height: vertical ? `${progress * 100}%` : 4, borderRadius: 999, background: "var(--video-accent)" }} />;
};

export const DrawArrow: React.FC<{ from: number; to: number; label?: string }> = ({ from, to, label }) => {
  const progress = useProgress(from, to);
  return <div style={{ display: "grid", gap: 8, minWidth: "12%", color: "var(--video-secondary)", justifyItems: "center" }}>
    {label ? <span style={{ fontSize: 22, fontWeight: 700, opacity: progress }}>{label}</span> : null}
    <svg width="100%" height="34" viewBox="0 0 180 34" preserveAspectRatio="none">
      <path d="M4 17h154" pathLength="1" stroke="currentColor" strokeWidth="5" strokeDasharray="1" strokeDashoffset={1 - progress} strokeLinecap="round" />
      <path d="m148 6 22 11-22 11" fill="none" stroke="currentColor" strokeWidth="5" opacity={progress} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>;
};

export const Highlight: React.FC<React.PropsWithChildren<{ from: number; to: number }>> = ({ from, to, children }) => {
  const progress = useProgress(from, to);
  return <div style={{ borderRadius: 18, boxShadow: `0 0 ${42 * progress}px color-mix(in srgb, var(--video-accent) ${50 * progress}%, transparent)`, outline: `${Math.max(1, 3 * progress)}px solid color-mix(in srgb, var(--video-accent) ${80 * progress}%, transparent)` }}>{children}</div>;
};

export const NumberCount: React.FC<{ from: number; to: number; start: number; end: number; suffix?: string }> = ({ from, to, start, end, suffix = "" }) => {
  const progress = useProgress(from, to);
  return <span>{Math.round(start + (end - start) * progress)}{suffix}</span>;
};

export const TypeText: React.FC<{ from: number; to: number; text: string }> = ({ from, to, text }) => {
  const progress = useProgress(from, to);
  return <>{text.slice(0, Math.ceil(text.length * progress))}<span style={{ opacity: progress < 1 ? 1 : 0 }}>▌</span></>;
};

export const Reveal: React.FC<React.PropsWithChildren<{ from: number; to: number }>> = ({ from, to, children }) => {
  const progress = useProgress(from, to);
  return <div style={{ opacity: progress, clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}>{children}</div>;
};

export const FollowPath: React.FC<React.PropsWithChildren<{ from: number; to: number }>> = ({ from, to, children }) => {
  const progress = useProgress(from, to);
  return <div style={{ transform: `translateX(${progress * 84}%)` }}>{children}</div>;
};

export const CameraPan: React.FC<React.PropsWithChildren<{ from: number; to: number; xPercent?: number; yPercent?: number }>> = ({ from, to, xPercent = 0, yPercent = 0, children }) => {
  const progress = useProgress(from, to);
  return <div style={{ width: "100%", height: "100%", transform: `translate(${xPercent * progress}%, ${yPercent * progress}%)` }}>{children}</div>;
};

export const CameraZoom: React.FC<React.PropsWithChildren<{ from: number; to: number; scale?: number }>> = ({ from, to, scale = 1.35, children }) => {
  const progress = useProgress(from, to, true);
  return <div style={{ width: "100%", height: "100%", transform: `scale(${1 + (scale - 1) * progress})` }}>{children}</div>;
};

export const CameraFocus: React.FC<React.PropsWithChildren<{ from: number; to: number }>> = ({ from, to, children }) => <CameraZoom from={from} to={to} scale={1.18}>{children}</CameraZoom>;
export const CameraReset: React.FC<React.PropsWithChildren<{ from: number; to: number; scale?: number }>> = ({ from, to, scale = 1.2, children }) => {
  const progress = useProgress(from, to);
  return <div style={{ transform: `scale(${scale - (scale - 1) * progress})` }}>{children}</div>;
};

export const ShakeOnce: React.FC<React.PropsWithChildren<{ at: number }>> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const offset = interpolate(frame, [at, at + 2, at + 4, at + 6, at + 9], [0, -10, 9, -5, 0], clamp);
  return <div style={{ transform: `translateX(${offset}px)` }}>{children}</div>;
};

export const CollisionImpact: React.FC<React.PropsWithChildren<{ at: number }>> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [at, at + 2, at + 7], [1, 1.12, 1], clamp);
  return <ShakeOnce at={at}><div style={{ transform: `scale(${scale})` }}>{children}</div></ShakeOnce>;
};
