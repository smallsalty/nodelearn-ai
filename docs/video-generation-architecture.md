# 个性化知识点教学视频内部架构

本文件描述内部实现和扩展方法。公共字段仍以 `docs/interface-contract.md` 为最高优先级。

## 十二阶段

1. `context_building`：组合课程、当前节点、前置节点、完整画像中的教学字段、薄弱点、同节点练习与真实错因、RAG、目标和自定义要求。
2. `teaching_strategy`：先做确定性画像映射，再允许 LLM 在严格 `TeachingStrategy` 中细化。
3. `narrative_planning`：规划 hook/problem/intuition/mechanism/example/misconception/summary。
4. `storyboard_generation`：LLM 只输出 Scene DSL JSON；哈希验收主题直接使用确定性六场景。
5. `storyboard_validation`：Pydantic `extra="forbid"`，校验 ID、引用、ratio、动作、注入、文本和教学事件。
6. `scene_template_resolution`：Registry 解析 renderer、命名槽位、连续对象和转场。
7. `tts_generation`：每个 scene 生成一段 `scene_XX.mp3`。
8. `audio_duration_analysis`：ffprobe 读取每个音频文件的真实时长。
9. `animation_timing_resolution`：按 `ceil((audioDuration + 0.35) × 30)` 计算 scene 帧数，动作 ratio 转为帧。
10. `remotion_rendering`：render manifest 驱动 Scene Renderer Registry。
11. `video_validation`：验证 H.264/AAC、尺寸、30fps、双轨和时间轴误差，并执行最终安全审核。
12. `persistence`：审核全部通过后复制 MP4 到静态发布目录并返回 URL。

公共 `VideoGenerationStage` 没有增加枚举：内部阶段分别映射到既有 `script/storyboard/quality_audit/tts/render/audit/persist`。多模态任务的 `currentStep` 使用上面的十二个内部步骤名展示进度。

## 上下文与个性化

Prompt 裁剪顺序为：当前节点 → 真实错因/薄弱点 → 认知风格 → 目标 → RAG → 前置知识。`prompt_payload()` 不包含 `userId`、专业、年级等无关身份信息，也不会为缺失的学习记录造值。

- `diagram`：过程、关系和镜头聚焦优先。
- `example`：从完整案例进入。
- `code`：必须包含 code execution/algorithm trace 偏好，深度为实现级。
- `text`：强化结构化定义，同时保留动态过程。
- `easy`：减少术语，节奏放慢。
- `hard/challenge`：增加边界、复杂度和工程实现。
- 只有同节点真实错误记录包含 `mistake_reason` 时，才允许 `misconception_correction`。

## Scene DSL

内部模型位于 `backend/app/services/video_pipeline/`。核心对象为 `VideoGenerationContext`、`TeachingStrategy`、`VideoNarrative`、`VideoStoryboard`、`StoryboardScene`、判别式 `Actor`、`Beat`、`ValidatedStoryboard`、`ResolvedScenePlan`、`SceneAudio`、`SubtitleCue`、`ResolvedTimeline` 和 `MediaProbeResult`。

Actor 白名单包括 key/data token、bucket row、formula、arrow、code/variable panel、array/list/stack/queue/tree/graph、counter、callout、comparison lane。布局只能使用命名槽位。动作白名单为 appear、move、grow/draw、highlight、count、type/reveal、follow path、camera、collision、state transition 和 code highlight。

Storyboard 的 actor/beat/scene ID 必须唯一；target 和 arrow 引用必须存在；`0 <= start_ratio < end_ratio <= 1`；每个场景至少包含一个教学性视觉事件。含标签、组件名、HTML、JSX、CSS、Markdown 代码块、绝对定位表达式或 Prompt 注入语句的输出直接拒绝。

## Scene Renderer Registry

新任务可使用：`problem_hook`、`direct_mapping_demo`、`process_flow`、`step_by_step`、`compare_race`、`collision_demo`、`misconception_correction`、`code_execution`、`data_structure_operation`、`algorithm_trace`、`concept_relationship`、`before_after`、`timeline`、`zoom_focus`、`summary_recall`。

Remotion primitives 位于 `video-renderer/src/pipeline/primitives.tsx`。它们只读取当前帧和 resolved timing，禁止 CSS transition、无限漂浮/旋转/pulse。Composition 从 manifest 读取 fps、宽高和总帧数；`16:9/9:16/1:1` 分别按质量预设解析，默认 high 为 1920×1080。

增加模板时：

1. 在 Python `SceneType` 与 `SceneTemplateRegistry.SCENE_TYPES` 增加内部值。
2. 在 TypeScript `InternalSceneType` 增加相同 camel/snake 字面值。
3. 实现独立 renderer，并登记到 `SCENE_RENDERER_REGISTRY`。
4. 更新 `video-renderer/fixtures/all-scene-types.mjs`。
5. 增加 DSL 校验、模板解析和 `renderStill` smoke 覆盖。
6. 不修改公共 `SceneType`，通过 `narrative_role` 投影兼容 v2。

## 字幕、转场和媒体

字幕按标点和最多约 36 字的 phrase 切分，再按字符数与停顿权重分配到真实音频帧。画面每次只显示一个最多约两行的 cue，位于 5% 底部安全区，使用描边/阴影而不是白色字幕卡。

转场限定为 match cut、object continuity、camera/focus、fade-through-background 和 directional slide。match/object continuity 缺少同场景连续 actor 时，后端确定性降级为 `fade_through_background`。

MP4 必须非空，视频为 H.264、音频为 AAC，尺寸和 aspect/quality 匹配，平均帧率 30fps，并同时包含音视频轨。容器时长与 resolved timeline 的误差不得超过 `max(0.75 秒, 1%)`。

## 调试、fallback 与运行命令

开发环境把 `context.json`、strategy、narrative、raw/validated storyboard、scene plans、scene durations、timeline、manifest、media probe 和 error 写入非静态目录 `output/video-debug/{taskId}`。生产环境不保留 Prompt 或内部上下文，只发布最终媒体。

- Strategy/Narrative LLM 失败：确定性版本。
- 通用 Storyboard JSON 校验失败：带错误 repair 一次；再失败使用五段 fallback。
- 哈希主题：固定六场景 acceptance storyboard。
- safety、TTS、FFmpeg、Remotion 或 media validation 失败：资源 `failed` 且 `fileUrl=null`。

常用验证：

```powershell
cd backend
python -m pytest app/tests/services/test_video_pipeline.py app/tests/services/test_video_generation.py app/tests/contract/test_video_contract.py -q
$env:RUN_VIDEO_RENDER_E2E='1'; python -m pytest app/tests/e2e/test_hash_video_e2e.py -q -s
$env:RUN_REAL_VIDEO_TESTS='true'; python -m pytest app/tests/services/test_real_video_generation.py -q -s

cd ../video-renderer
npm run typecheck
npm run smoke:scenes
```
