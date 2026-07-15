export const sceneTypes = [
  "problem_hook", "direct_mapping_demo", "process_flow", "step_by_step", "compare_race",
  "collision_demo", "misconception_correction", "code_execution", "data_structure_operation",
  "algorithm_trace", "concept_relationship", "before_after", "timeline", "zoom_focus", "summary_recall",
];

const callout = (id, text, slot = "center") => ({ id, kind: "callout", slot, text, tone: "neutral" });
const baseBeats = (actorId) => [
  { id: "appear", action: "appear", targets: [actorId], startFrame: 2, endFrame: 10 },
  { id: "reveal", action: "reveal", targets: [actorId], startFrame: 9, endFrame: 34, emphasis: "重点" },
];

const sceneActors = {
  problem_hook: [
    { id: "lane", kind: "comparison_lane", slot: "stage", title: "逐项扫描", items: Array.from({ length: 100 }, (_, index) => String(index)) },
    { id: "count", kind: "counter", slot: "right", label: "已检查", start: 0, end: 100, suffix: " 个" },
  ],
  direct_mapping_demo: [
    { id: "key", kind: "key", slot: "left", label: "Key", value: "12836" },
    { id: "formula", kind: "formula", slot: "center", label: "Hash Function", expression: "12836 % 100", steps: ["12836", "% 100", "= 36"] },
    { id: "buckets", kind: "bucket_row", slot: "right", label: "Buckets", bucketCount: 100, focusIndices: [36] },
  ],
  process_flow: [callout("input", "Input", "left"), callout("rule", "Rule"), callout("output", "Output", "right")],
  step_by_step: [callout("step1", "读取输入"), callout("step2", "执行规则"), callout("step3", "更新状态")],
  compare_race: [
    { id: "linear", kind: "comparison_lane", slot: "left_lane", title: "Linear Search", items: Array.from({ length: 36 }, (_, index) => String(index)) },
    { id: "hash", kind: "comparison_lane", slot: "right_lane", title: "Hash Lookup", items: ["Key", "Hash", "Bucket"] },
    { id: "linear_count", kind: "counter", slot: "left", start: 0, end: 37, suffix: " 次" },
    { id: "hash_count", kind: "counter", slot: "right", start: 0, end: 1, suffix: " 次" },
  ],
  collision_demo: [
    { id: "key1", kind: "key", slot: "left", value: "16750" },
    { id: "key2", kind: "key", slot: "right", value: "20950" },
    { id: "bucket50", kind: "bucket_row", slot: "center", bucketCount: 100, focusIndices: [50] },
    { id: "chain", kind: "callout", slot: "bottom", text: "16750 → 20950", tone: "result" },
  ],
  misconception_correction: [callout("wrong", "冲突就是覆盖", "left"), callout("right", "冲突在桶内继续处理", "right")],
  code_execution: [
    { id: "code", kind: "code_panel", slot: "left", language: "python", codeLines: ["index = key % 100", "bucket = table[index]"] },
    { id: "vars", kind: "variable_panel", slot: "right", variables: { key: "12836", index: "36" } },
  ],
  data_structure_operation: [{ id: "array", kind: "array", slot: "stage", label: "append(36)", items: ["12", "24", "31", "36"] }],
  algorithm_trace: [
    { id: "trace_code", kind: "code_panel", slot: "left", language: "python", codeLines: ["for key in keys:", "  index = hash(key)", "  visit(index)"] },
    callout("trace1", "key = 12836", "right"), callout("trace2", "index = 36", "right"),
  ],
  concept_relationship: [callout("object", "对象", "left"), callout("rule2", "规则", "center"), callout("result", "结果", "right")],
  before_after: [callout("before1", "逐项查找", "left"), callout("before2", "范围很大", "left"), callout("after1", "直接定位", "right"), callout("after2", "局部处理", "right")],
  timeline: [callout("time1", "输入"), callout("time2", "计算"), callout("time3", "定位"), callout("time4", "处理")],
  zoom_focus: [
    { id: "zoom_buckets", kind: "bucket_row", slot: "stage", bucketCount: 100, focusIndices: [34, 35, 36, 37] },
    { id: "zoom_key", kind: "key", slot: "top", value: "12836" },
  ],
  summary_recall: [callout("recall1", "Key"), callout("recall2", "Hash"), callout("recall3", "Bucket"), callout("recall4", "Local handling")],
};

const sceneBeats = (type, actors) => {
  if (type === "problem_hook") return [
    { id: "scan", action: "follow_path", targets: ["lane"], startFrame: 5, endFrame: 36 },
    { id: "count", action: "count", targets: ["count"], startFrame: 5, endFrame: 36 },
  ];
  if (type === "direct_mapping_demo") return [
    { id: "move", action: "move", targets: ["key"], startFrame: 2, endFrame: 16 },
    { id: "type", action: "type", targets: ["formula"], startFrame: 12, endFrame: 28 },
    { id: "highlight", action: "highlight", targets: ["buckets"], startFrame: 25, endFrame: 42 },
  ];
  if (type === "compare_race") return [
    { id: "left_count", action: "count", targets: ["linear_count"], startFrame: 4, endFrame: 39 },
    { id: "right_count", action: "count", targets: ["hash_count"], startFrame: 4, endFrame: 16 },
  ];
  if (type === "collision_demo") return [
    { id: "move1", action: "move", targets: ["key1"], startFrame: 2, endFrame: 18 },
    { id: "move2", action: "move", targets: ["key2"], startFrame: 8, endFrame: 23 },
    { id: "collision", action: "collision", targets: ["key1", "key2"], startFrame: 22, endFrame: 28 },
    { id: "chain", action: "reveal", targets: ["chain"], startFrame: 27, endFrame: 42 },
  ];
  if (type === "code_execution" || type === "algorithm_trace") return [{ id: "code", action: "code_highlight", targets: [actors[0].id], startFrame: 3, endFrame: 40 }];
  if (type === "zoom_focus") return [
    { id: "camera", action: "camera", targets: ["zoom_buckets"], startFrame: 2, endFrame: 18 },
    { id: "highlight", action: "highlight", targets: ["zoom_buckets"], startFrame: 14, endFrame: 30 },
    { id: "move", action: "move", targets: ["zoom_key"], startFrame: 25, endFrame: 42 },
  ];
  if (["misconception_correction", "data_structure_operation", "before_after"].includes(type)) return [{ id: "state", action: "state_transition", targets: actors.map((item) => item.id), startFrame: 8, endFrame: 36 }];
  return actors.flatMap((item, index) => baseBeats(item.id).map((beat) => ({ ...beat, id: `${beat.id}_${index}`, startFrame: beat.startFrame + index * 5, endFrame: Math.min(43, beat.endFrame + index * 5) })));
};

export const renderManifest = {
  schemaVersion: "1.0",
  courseId: "fixture_course",
  nodeId: "fixture_node",
  title: "All Scene Types",
  theme: "warm_academic",
  aspectRatio: "16:9",
  qualityPreset: "standard",
  subtitleEnabled: true,
  fps: 30,
  width: 1280,
  height: 720,
  totalFrames: sceneTypes.length * 45,
  scenes: sceneTypes.map((type, index) => {
    const actors = sceneActors[type];
    return {
      id: `scene_${String(index + 1).padStart(2, "0")}`,
      narrativeRole: index === 0 ? "hook" : index === sceneTypes.length - 1 ? "summary" : "mechanism",
      sceneType: type,
      title: type.replaceAll("_", " "),
      teachingPurpose: `Smoke test ${type}`,
      narration: `这是 ${type} 模板的渲染测试。`,
      screenText: [type],
      actors,
      beats: sceneBeats(type, actors),
      subtitles: [{ id: `subtitle_${index}`, text: `${type} 模板渲染测试`, startFrame: 0, endFrame: 44, highlightTerms: [] }],
      audioUrl: "",
      startFrame: index * 45,
      durationFrames: 45,
      namedSlots: {},
      transitionOut: { type: "fade_through_background" },
    };
  }),
};

export const lesson = {
  schemaVersion: "2.0",
  title: "All Scene Types",
  style: "clean_motion_graphics",
  theme: "warm_academic",
  durationSeconds: renderManifest.totalFrames / renderManifest.fps,
  aspectRatio: "16:9",
  scenes: [],
  output: { videoUrl: "", audioUrls: [] },
};
