import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { lesson, renderManifest } from "../fixtures/all-scene-types.mjs";

const outputDirectory = path.resolve("../output/renderer-scene-smoke");
await fs.mkdir(outputDirectory, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.tsx") });
const inputProps = { lesson, renderManifest };
const composition = await selectComposition({ serveUrl, id: "VideoLesson", inputProps });

for (const scene of renderManifest.scenes) {
  const frame = scene.startFrame + Math.floor(scene.durationFrames * 0.82);
  await renderStill({
    composition,
    serveUrl,
    inputProps,
    frame,
    imageFormat: "png",
    output: path.join(outputDirectory, `${scene.sceneType}.png`),
  });
}

console.log(JSON.stringify({ sceneCount: renderManifest.scenes.length, outputDirectory }));
