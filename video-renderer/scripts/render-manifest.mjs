import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const argument = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`missing required argument: ${name}`);
  return path.resolve(process.argv[index + 1]);
};

const manifest = JSON.parse(await fs.readFile(argument("--manifest"), "utf8"));
const output = argument("--output");
const lesson = {
  schemaVersion: "2.0",
  title: manifest.title,
  style: "clean_motion_graphics",
  theme: manifest.theme,
  durationSeconds: manifest.totalFrames / manifest.fps,
  aspectRatio: manifest.aspectRatio,
  scenes: [],
  output: { videoUrl: "", audioUrls: manifest.scenes.map((scene) => scene.audioUrl) },
};
const inputProps = { lesson, renderManifest: manifest };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.tsx") });
const composition = await selectComposition({ serveUrl, id: "VideoLesson", inputProps });
const crf = { standard: 23, high: 18, ultra: 14 }[manifest.qualityPreset] ?? 18;
await renderMedia({ composition, serveUrl, codec: "h264", audioCodec: "aac", crf, outputLocation: output, inputProps });
console.log(JSON.stringify({ output, totalFrames: manifest.totalFrames }));
