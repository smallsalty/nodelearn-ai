import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { themeCssVariables, VIDEO_THEMES } from "../themes";
import type { RenderManifestScene, VideoTheme } from "../types";
import { SubtitleTrack } from "./SubtitleTrack";

export const SceneShell: React.FC<React.PropsWithChildren<{
  scene: RenderManifestScene;
  theme: VideoTheme;
  subtitleEnabled: boolean;
}>> = ({ scene, theme, subtitleEnabled, children }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tokens = VIDEO_THEMES[theme];
  const titleOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const transitionStart = Math.max(0, scene.durationFrames - 12);
  const transition = interpolate(frame, [transitionStart, scene.durationFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const transitionTransform = scene.transitionOut.type === "directional_slide"
    ? `translate(${scene.transitionOut.direction === "left" ? -transition * 8 : scene.transitionOut.direction === "right" ? transition * 8 : 0}%, ${scene.transitionOut.direction === "up" ? -transition * 8 : scene.transitionOut.direction === "down" ? transition * 8 : 0}%)`
    : scene.transitionOut.type === "camera_focus" ? `scale(${1 + transition * .06})` : "none";
  const transitionOpacity = scene.transitionOut.type === "fade_through_background" ? 1 - transition : 1;
  const horizontal = width >= height;
  return <AbsoluteFill style={{
    ...themeCssVariables(theme),
    overflow: "hidden",
    backgroundColor: tokens.background,
    color: tokens.text,
    fontFamily: tokens.fontFamily,
  }}>
    <AbsoluteFill style={{
      opacity: 0.7,
      backgroundImage: `linear-gradient(${tokens.grid} 1px, transparent 1px), linear-gradient(90deg, ${tokens.grid} 1px, transparent 1px)`,
      backgroundSize: `${Math.max(34, width * 0.032)}px ${Math.max(34, width * 0.032)}px`,
      maskImage: "linear-gradient(to bottom, black, transparent 90%)",
    }} />
    <div style={{
      position: "relative",
      display: "grid",
      gridTemplateRows: "auto minmax(0, 1fr)",
      width: "100%",
      height: "100%",
      padding: horizontal ? "4.2% 5.4% 9%" : "6% 6% 14%",
      boxSizing: "border-box",
      gap: horizontal ? height * 0.035 : height * 0.022,
      opacity: transitionOpacity,
      transform: transitionTransform,
    }}>
      <header style={{ opacity: titleOpacity, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24 }}>
        <div>
          <div style={{ color: tokens.secondary, fontSize: Math.max(17, width * 0.012), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.16em" }}>{scene.sceneType.replace(/_/g, " · ")}</div>
          <h1 style={{ margin: "0.22em 0 0", fontSize: Math.max(34, Math.min(width * 0.035, height * 0.07)), lineHeight: 1.08, letterSpacing: "-0.03em" }}>{scene.title}</h1>
        </div>
        <div style={{ maxWidth: "34%", color: tokens.muted, fontSize: Math.max(18, width * 0.013), lineHeight: 1.5, textAlign: "right" }}>{scene.teachingPurpose}</div>
      </header>
      <main style={{ minHeight: 0, display: "grid", alignItems: "center" }}>{children}</main>
    </div>
    {subtitleEnabled ? <SubtitleTrack cues={scene.subtitles} /> : null}
  </AbsoluteFill>;
};
