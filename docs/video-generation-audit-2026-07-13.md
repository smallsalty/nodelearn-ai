# AI 个性化知识点教学视频架构审计

审计日期：2026-07-13。审计基线为本次重构前的真实实现；当时视频针对性后端测试为 `31 passed`，`video-renderer` TypeScript 检查通过。

| 编号 | 审计项 | 重构前结论 | 本次处理 |
|---|---|---|---|
| A | 完整链路 | 节点/画像摘要/RAG → 两次 LLM JSON → Visual Director → 质量与安全预审 → 逐 beat 豆包 TTS → ffprobe → Remotion → 简单轨道检查 → 最终审核/持久化 | 拆为固定十二阶段内部流水线，失败不发布 URL |
| B | LLM 输出边界 | LLM 输出脚本 scene 与 storyboard `visualIntent`，不直接输出 JSX/CSS | 收敛为严格 Scene DSL JSON；拒绝组件名、HTML、JSX、CSS、绝对坐标和注入文本 |
| C | 页面生成 | 已不直接生成页面，但 Visual Director 会把大量场景编译成重复信息板 | 由 15 个职责单一的 Scene Renderer 负责构图与状态 |
| D | Remotion | 单一 `VideoLesson` Composition；beat Sequence 全部进入一个条件分支 renderer | 新任务读取内部 render manifest 和 Registry；旧 v1/v2 JSON 继续进入 `UniversalExplainerVideoRenderer` |
| E | TTS 粒度 | 逐 beat 生成音频 | 改为一个内部 scene 一段 `scene_XX.mp3` |
| F | 音频时长 | ffprobe 读取 `format.duration` | 保留真实 ffprobe，并将每段时长写入开发调试产物 |
| G | 动画同步 | beat 时长受音频影响，但动作仍依赖固定帧；目标时长会补静止时间 | `ceil((audioDuration + 0.35) × fps)` 决定 scene 帧数，ratio 转具体帧；删除目标时长静态填充 |
| H | 场景模板 | 无独立 Registry；通用 renderer 内按布局与元素分支 | 后端模板解析 Registry + Remotion 15 类型 Registry |
| I | 个性化 | 完整画像未进入脚本/storyboard Prompt，只有摘要参与部分上层目标 | 上下文接入完整画像中的教学相关字段、同节点真实练习/错因、薄弱点、RAG 与前置节点；不发送身份字段 |
| J | Fallback | 质量失败可重写一次；无严格 repair 和确定性 storyboard fallback | 策略/Narrative 失败使用确定性版本；通用 storyboard 只 repair 一次，仍失败使用五段 fallback；哈希使用固定六场景 |
| K | MP4 验证 | 自动代码只确认音频流和视频流存在 | 完整验证文件非空、H.264、AAC、尺寸、30fps、双轨和时间轴误差 |
| L | 字幕 | 每个 beat 整段旁白全程显示，无 phrase timing 或重点词同步 | 按标点、长度、停顿权重切 phrase cue；安全区描边、最多约两行并支持当前重点词高亮 |

## 兼容边界

- 公共 HTTP 路径、`GeneratedResource`、`ResourceGenerateRequest`、`ResourceType`、`StudentProfile` 与 `AnimationScriptContent schemaVersion="2.0"` 未改变。
- `narrative_role` 投影为公开 `sceneType`；一个内部 scene 投影为一个公开 scene 和一个公开 beat。
- Scene DSL、resolved timeline、render manifest 和 media probe 都是后端/renderer 内部类型，不写入公共契约。
- 公共 `targetDurationSeconds` 只保留规划意图，最终媒体时长完全由真实逐场景音频决定。
