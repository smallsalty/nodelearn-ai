# 资源生成模块

来源：`docs/interface-contract.md` 第 8、11、12 节。

## 类型

- `UploadedFile`
- `KnowledgeBuildTask`
- `KnowledgeBuildRequest`
- `KnowledgeSearchRequest`
- `RetrievedDocument`
- `GeneratedResource`
- `ResourceGenerateRequest`
- `ResourceGenerateResult`
- `ResourceStreamEvent`
- `MultimodalVideoGenerateRequest`
- `MultimodalTaskResult`
- `MultimodalTaskEvent`
- `DigitalHumanExplainRequest`
- `DigitalHumanChatRequest`
- `DigitalHumanChatResult`
- `DigitalHumanLiveSessionResult`
- `DigitalHumanCallbackRequest`
- `VideoAspect`
- `VideoQualityPreset`
- `VideoGenerationStage`
- `VideoMaterialSource`
- `VideoGenerateOptions`
- `ResourceRecommendation`
- `ResourcePushRecord`
- `RecommendationRequest`
- `VideoStyle`
- `VideoTheme`
- `SceneType`
- `VisualLayout`
- `VisualAnimationType`
- `VisualElement`
- `VisualPlan`
- `AnimationStep`
- `VideoSourceReference`
- `VideoNarrationBeat`
- `VideoLessonScene`
- `AnimationScriptContent`

## 路由

- `POST /api/v1/files/upload`
- `GET /api/v1/files/{fileId}`
- `DELETE /api/v1/files/{fileId}`
- `POST /api/v1/knowledge-base/build`
- `GET /api/v1/knowledge-base/build-tasks/{taskId}`
- `POST /api/v1/knowledge-base/search`
- `POST /api/v1/knowledge-base/embed`
- `POST /api/v1/resources/generate`
- `GET /api/v1/resources/generation-tasks/{taskId}`
- `GET /api/v1/resources/{resourceId}`
- `GET /api/v1/users/{userId}/resources`
- `GET /api/v1/nodes/{nodeId}/generated-resources`
- `DELETE /api/v1/resources/{resourceId}`
- `GET /api/v1/resources/generate/stream?taskId={taskId}`
- `POST /api/v1/multimodal/videos/generate`
- `GET /api/v1/multimodal/videos/tasks/{taskId}`
- `GET /api/v1/multimodal/videos/tasks/{taskId}/events`
- `GET /api/v1/multimodal/videos/stream?taskId={taskId}`
- `POST /api/v1/multimodal/digital-human/explain`
- `POST /api/v1/multimodal/digital-human/chat`
- `GET /api/v1/multimodal/digital-human/sessions/{sessionId}/messages`
- `GET /api/v1/multimodal/digital-human/sessions/{sessionId}/live`
- `POST /api/v1/multimodal/digital-human/sessions/{sessionId}/stop`
- `POST /api/v1/multimodal/digital-human/callback`
- `POST /api/v1/recommendations/resources`
- `GET /api/v1/users/{userId}/recommendations`
- `POST /api/v1/recommendations/{recommendationId}/viewed`
- `GET /api/v1/users/{userId}/push-records`

## Video generation quality upgrade

- `videoOptions` is limited to the existing resource generation route. It does not introduce a standalone video product API or a separate video resource model.
- `knowledge_video` and `digital_human_video` use the multimodal task API and may be bridged from `POST /api/v1/resources/generate` for compatibility.
- Default video options are `aspectRatio="16:9"`, `qualityPreset="high"`, and `materialSource="generated_motion_assets"`.
- Video generation progress is exposed through `ResourceGenerateResult.progress/currentStage/errorMessage` and `ResourceStreamEvent.stage`.
- 公共阶段仍为 `script -> storyboard -> quality_audit -> tts -> render -> audit -> persist -> done`；内部按十二阶段执行并投影到这些既有枚举，失败使用 `error`。
- `AnimationScriptContent.scenes[]` must include `teachingPurpose`, `concreteObjects`, `animationSteps`, `stateChanges`, `screenText`, `misconceptionFix`, `componentHints`, and `auditChecklist`.
- The first version uses Remotion frame-driven data-structure teaching components and local teaching presets as primary visuals. External stock media is not a default source.
- 新生成视频写入 `schemaVersion="2.0"`；一个内部 scene 投影为一个公开 scene/beat，逐场景音频 URL 写入公开 beat；历史 v1/v2 继续走兼容 renderer。
- 主题固定为 `warm_academic`、`chalk_classroom`、`technical_blueprint`，默认暖白学院风；导出画面不包含常驻页眉、页脚、场景编号或进度条。
- 新链路 LLM 只生成严格内部策略、Narrative 和 Scene DSL；不得输出组件名、HTML、JSX、CSS 或绝对坐标。`AnimationSpecSkill` 只保留历史兼容用途。
- Visual Director 按 `hook/definition/analogy/mechanism/comparison/process/example/summary` 选择中心聚焦、左右分栏、横向映射、主视觉侧栏、双栏对照、时间线、案例板和总结卡片；相邻 beat 可在 `grid_focus/left_right` 间切换视觉重心，但继续共用主题 token。
- v2 beat 的 `screenText` 使用 1-3 条短句，总计不超过 40 个中文字；主结论之外可补充条件和结果，非 hook/summary beat 必须保留至少一个非文本教学演示元素。
- 每个 factual beat 必须引用 RAG 文档或知识节点来源，质量/安全预审未通过不得启动 TTS；最终 MP4 仍需媒体与资源审核。
- `POST /api/v1/multimodal/videos/generate` 复用真实 Remotion 核心，mock 模式明确失败且不得返回固定 `/mock/knowledge-video.mp4`。

## 前端

- 页面：`ResourcePage.vue`、`KnowledgeBaseAdminPage.vue`
- API：`frontend/src/api/modules/resource.ts`、`frontend/src/api/modules/multimodal.ts`
- 类型：`frontend/src/types/resource.ts`、`frontend/src/types/multimodal.ts`
- 组件：`MultimodalTaskProgress.vue`、`DigitalHumanChatPanel.vue`
- 状态变量：`selectedResourceId`
- 资源页不再提供 `practice_question` 生成卡片，练习统一由练习页负责；该枚举继续保留以兼容既有契约。
- 主导航将资源能力拆为四个互斥入口：`/resources` 只允许新生成讲解文档和拓展材料阅读；`action=mind_map` 预选唯一 `mind_map` 类型；`action=knowledge_video` 作为正式“视频讲解”学习工具预选唯一 `knowledge_video` 类型；`action=digital_human_chat` 只显示实时数字人问答。
- 路由 `action` 变化时必须重置生成模式、资源类型与本次任务状态，防止组件复用后残留上一个入口的表单；四个入口按 `path + action` 精确匹配且只能有一个主导航强选中。
- 资源工具页使用 `GET /nodes/{nodeId}/generated-resources` 读取当前知识点资源，并在前端再次按当前课程、节点、工具类型、`status=success` 和 `auditStatus=passed` 严格过滤；资源中心只显示 `lecture_doc/reading_material`，思维导图只显示 `mind_map`，视频讲解只显示 `knowledge_video`。
- 工具页不再显示历史资源卡片网格或“推荐资源”页签；合格历史资源按 `createdAt` 倒序进入详情标题栏的紧凑选择器，默认打开最新一条。`nodeId + resourceId + action=knowledge_video` 深链会优先打开指定视频，生成完成后优先打开本次新资源。
- 节点、`action` 或 `resourceId` 变化时立即清空旧资源与详情，并使用请求序号丢弃过期响应；`action=digital_human_chat` 完全跳过资源请求和详情渲染，只保留实时数字人对话。
- 课程正文、知识图谱和知识节点正文兼容页在思维导图入口旁同时提供视频讲解入口，并先同步全局课程节点状态。
- 思维导图和视频讲解页面都不会自动触发付费生成，仍由用户确认后点击生成。
- 成功且审核通过、具有文件地址的 `knowledge_video` 会幂等写入现有 `ResourceRecommendation` 和推送记录；推荐读取会补齐历史合格视频并按 `resourceId` 去重，失败、未审核或缺少文件地址的视频不会进入推荐。
- 首页和学习浮窗按 `createdAt` 倒序显示推荐；点击后调用既有已查看接口，并通过共享路由解析器进入视频讲解、思维导图或普通资源详情。推荐读取不会因为缺少视频而启动视频生成。
- 旧 `digital_human_video` 深链接与后端生成能力继续兼容，但不出现在主导航或面向用户的模式选择中。
- `GeneratedResource.chapterId` 可空；Hello Algo 章节阅读材料以及从旧总览节点迁移的章节讲解文档、思维导图使用章节关联并清空 `nodeId`，既有知识节点生成链路不变。

## 后端

- 路由文件：`backend/app/api/v1/resources.py`
- 结构定义文件：`backend/app/schemas/resource.py`
- 服务文件：`backend/app/services/resource_service.py`
- 多模态服务：`backend/app/services/multimodal_service.py`
- 讯飞 provider：`backend/app/services/providers/iflytek/*`
- 智能体文件：`backend/app/agents/resource_agent.py`
- 视频技能文件：`backend/app/agents/multimodal_skills.py`
- 视频流水线：`backend/app/services/video_pipeline/*`
- 视频渲染器：`video-renderer/`
- 架构与扩展指南：`docs/video-generation-architecture.md`

## 知识点讲解视频

- 当 `resourceTypes` 包含 `video_script` 或 `animation_script` 时，统一执行真实视频生成流程。
- `GeneratedResource.content` 保存 `AnimationScriptContent` JSON 字符串。
- `GeneratedResource.fileUrl` 保存审核通过后的 MP4 地址。
- 两种视频资源类型必须同时保存，并共享最终 MP4。
- 新生成资源统一使用 `style=clean_motion_graphics` 和 `sceneType + visualPlan`，不再生成 `stack_animation` 或 `text_slide`。
- 公开 v2 必须按顺序包含 hook、definition、mechanism、example、summary；内部另用 `scene_type` 从 15 个模板中选择。哈希 storyboard 会根据目标时长在六个核心场景上确定性增加最多四个教学场景；120 秒目标使用十场景版本，补充桶内核对、复杂度条件、装载/扩容和冲突链追踪。
- 新任务由 `SceneRendererRegistry` 和内部 render manifest 渲染；`UniversalExplainerVideoRenderer` 只处理历史资源。
- TTS 使用豆包 V3 HTTP Chunked，每个内部 scene 生成一段真实 MP3；最终时长由 `audioDuration + 0.35s` 决定，不用静止画面补齐目标时长。estimated timeline 和真实音频 timeline 都必须落在目标时长 ±15% 内，否则在渲染/发布前失败。
- MP4 发布前完整验证非空、H.264、AAC、宽高、30fps、音视频轨和 resolved timeline 时长误差。
- 豆包 `TTS_VOICE_NAME` 必须与 `TTS_RESOURCE_ID` 匹配；`seed-tts-2.0` 可使用已验证的 `zh_female_vv_uranus_bigtts`。
- 音频、视频和依赖失败必须明确标记 `failed`。
- 目标节点材料不足以支撑用户明确要求的哈希冲突、链式地址、负载因子或扩容时，检索会补充同课程真实“哈希冲突”材料；事实 beat 仍必须引用投影到 v2 `sources` 的来源。
- 历史视频 JSON 和前端 JSON 预览继续兼容；真实新动画只读取内部 manifest。

## 真实材料和导图

- 真实资源生成未传入材料时，自动检索 Hello Algo PostgreSQL 来源资源。
- 指定节点时，优先取该节点的阅读材料，再补充同节点代码案例；无节点材料时才使用全文和课程级兜底。
- `mind_map` 内容统一保存为 `GeneratedResource.content` 中的 `KnowledgeMindMap` JSON 字符串，不生成 Markdown、Mermaid、前端坐标或 `.xmind` 文件。
- 后端使用 `MindMapValidator` 校验导图 JSON 的必填字段、分支数量、节点数量、标题质量、叶子节点说明和跨分支关系引用；校验失败会触发 1 次 DeepSeek JSON 重试，仍失败则资源保存为 `failed`。
- 前端使用 `MindMapViewer` 渲染 `mind_map`，支持逐级展开、全部展开/收起、重置、搜索、聚焦当前节点和异常原始内容查看。
- 开发验收页同时展示真实 MP4 和 `VideoLessonPlayer` 分镜、字幕、音频控制。

## 多模态资源增强

- 新增资源类型：`knowledge_video`、`digital_human_video`、`digital_human_dialogue`、`audio_explanation`、`subtitle`、`storyboard`。
- 稳定知识点视频内部链路：`context_building -> teaching_strategy -> narrative_planning -> storyboard_generation -> storyboard_validation -> scene_template_resolution -> tts_generation -> audio_duration_analysis -> animation_timing_resolution -> remotion_rendering -> video_validation -> persistence`。
- 数字人讲解复用脚本/分镜链路，再通过讯飞数字人 provider 创建讲解任务；无真实讯飞配置时使用 mock provider，返回结构与真实 provider adapter 保持一致。
- 数字人对话复用 RAG、学生画像和最小 audit 流程，保存 session/message；回答由虚拟人接口服务自带的大模型对话能力生成，缺少真实配置或调用失败时直接失败，不返回 mock 回答。
- 只有大模型返回非空文本且 audit/safety 通过后，才允许启动或复用在线虚拟人会话并发送文本驱动。
- 真实数字人对话使用讯飞 AI 虚拟人实时流：后端将 RTMP 转为低延迟 HLS，前端只播放本地 `videoUrl`，不得获得 provider session 或原始 RTMP 地址。
- 接口服务在线驱动使用 `wss://avatar.cn-huadong-1.xf-yun.com/v1/interact` WebSocket；start 获取 RTMP 后由 FFmpeg 转 HLS，首个 HLS 播放列表就绪后，审核后的回答才通过同一连接以明文 `text_driver` 顺序追加，避免供应商流尚未就绪时返回内部错误。
- 同一对话复用一个直播会话；后端每 5 秒心跳，空闲 5 分钟自动停止，HLS 滚动保留最近 5 分钟并在停止 10 分钟后清理。
- 生成资源必须保留 `userId`、`courseId`、`nodeId`、`agentType`、`taskId`、`status`、`auditStatus`、`createdAt`、`updatedAt`。
