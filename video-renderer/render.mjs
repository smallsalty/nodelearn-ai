import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

function readArgument(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(`missing required argument: ${name}`);
  }
  return process.argv[index + 1];
}

const inputPath = path.resolve(readArgument("--input"));
const outputPath = path.resolve(readArgument("--output"));
const browserExecutableIndex = process.argv.indexOf("--browser-executable");
const browserExecutable =
  browserExecutableIndex === -1 ? undefined : path.resolve(process.argv[browserExecutableIndex + 1]);

const renderInput = JSON.parse(await fs.readFile(inputPath, "utf8"));
const lesson = renderInput.lesson ?? renderInput;
const renderManifest = renderInput.renderManifest;
const qualityPreset = renderInput.qualityPreset ?? "high";
const qualitySettings = {
  standard: { crf: 23 },
  high: { crf: 18 },
  ultra: { crf: 14 },
}[qualityPreset] ?? { crf: 18 };
const inputProps = { lesson, renderManifest };
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.tsx"),
});
const composition = await selectComposition({
  serveUrl,
  id: "VideoLesson",
  inputProps,
  browserExecutable,
});

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  audioCodec: "aac",
  crf: qualitySettings.crf,
  outputLocation: outputPath,
  inputProps,
  browserExecutable,
});

console.log(JSON.stringify({ outputPath }));
