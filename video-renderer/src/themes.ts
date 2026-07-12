import type { CSSProperties } from "react";
import type { VideoTheme } from "./types";

export interface VideoThemeTokens {
  background: string;
  surface: string;
  surfaceStrong: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  muted: string;
  border: string;
  grid: string;
  fontFamily: string;
}

export const VIDEO_THEMES: Record<VideoTheme, VideoThemeTokens> = {
  warm_academic: {
    background: "#f7f3e8",
    surface: "rgba(255,255,255,0.92)",
    surfaceStrong: "#ebe5d4",
    primary: "#18231d",
    secondary: "#55705f",
    accent: "#d7a900",
    text: "#18231d",
    muted: "#52625a",
    border: "rgba(24,35,29,0.24)",
    grid: "rgba(24,35,29,0.055)",
    fontFamily: "'Microsoft YaHei UI','PingFang SC',Arial,sans-serif",
  },
  chalk_classroom: {
    background: "#173c32",
    surface: "rgba(24,72,59,0.94)",
    surfaceStrong: "#215243",
    primary: "#f7f1dc",
    secondary: "#9ed0b2",
    accent: "#f2cf63",
    text: "#fffaf0",
    muted: "#c5d8cc",
    border: "rgba(247,241,220,0.34)",
    grid: "rgba(247,241,220,0.055)",
    fontFamily: "'Microsoft YaHei UI','KaiTi',serif",
  },
  technical_blueprint: {
    background: "#082942",
    surface: "rgba(12,57,87,0.94)",
    surfaceStrong: "#123e5e",
    primary: "#e9fbff",
    secondary: "#71d3df",
    accent: "#f2c94c",
    text: "#f3fdff",
    muted: "#acd2da",
    border: "rgba(113,211,223,0.34)",
    grid: "rgba(113,211,223,0.09)",
    fontFamily: "'Microsoft YaHei UI','Segoe UI',Arial,sans-serif",
  },
};

export const themeCssVariables = (theme: VideoTheme): CSSProperties => {
  const tokens = VIDEO_THEMES[theme];
  return {
    "--video-background": tokens.background,
    "--video-surface": tokens.surface,
    "--video-surface-strong": tokens.surfaceStrong,
    "--video-primary": tokens.primary,
    "--video-secondary": tokens.secondary,
    "--video-accent": tokens.accent,
    "--video-text": tokens.text,
    "--video-muted": tokens.muted,
    "--video-border": tokens.border,
    "--video-grid": tokens.grid,
  } as CSSProperties;
};
