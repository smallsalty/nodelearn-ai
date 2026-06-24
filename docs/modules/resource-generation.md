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
- `SceneType`
- `VisualLayout`
- `VisualAnimationType`
- `VisualElement`
- `VisualPlan`
- `AnimationStep`
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
- Required generation stages are `script -> storyboard -> quality_audit -> tts -> render -> audit -> persist -> done`; failures use `error`.
- `AnimationScriptContent.scenes[]` must include `teachingPurpose`, `concreteObjects`, `animationSteps`, `stateChanges`, `screenText`, `misconceptionFix`, `componentHints`, and `auditChecklist`.
- The first version uses Remotion frame-driven data-structure teaching components and local teaching presets as primary visuals. External stock media is not a default source.

## 前端

- 页面：`ResourcePage.vue`、`KnowledgeBaseAdminPage.vue`
- API：`frontend/src/api/modules/resource.ts`、`frontend/src/api/modules/multimodal.ts`
- 类型：`frontend/src/types/resource.ts`、`frontend/src/types/multimodal.ts`
- 组件：`MultimodalTaskProgress.vue`、`DigitalHumanChatPanel.vue`
- 状态变量：`selectedResourceId`

## 后端

- 路由文件：`backend/app/api/v1/resources.py`
- 结构定义文件：`backend/app/schemas/resource.py`
- 服务文件：`backend/app/services/resource_service.py`
- 多模态服务：`backend/app/services/multimodal_service.py`
- 讯飞 provider：`backend/app/services/providers/iflytek/*`
- 智能体文件：`backend/app/agents/resource_agent.py`
- 视频技能文件：`backend/app/agents/multimodal_skills.py`
- 视频渲染器：`video-renderer/`

## 知识点讲解视频

- 当 `resourceTypes` 包含 `video_script` 或 `animation_script` 时，统一执行真实视频生成流程。
- `GeneratedResource.content` 保存 `AnimationScriptContent` JSON 字符串。
- `GeneratedResource.fileUrl` 保存审核通过后的 MP4 地址。
- 两种视频资源类型必须同时保存，并共享最终 MP4。
- 新生成资源统一使用 `style=clean_motion_graphics` 和 `sceneType + visualPlan`，不再生成 `stack_animation` 或 `text_slide`。
- 分镜固定覆盖问题开场、定义、类比、机制、对比、流程、例子和总结；画面只展示关键词、短句和标签。
- Remotion 使用 `UniversalExplainerVideoRenderer` 根据布局和元素类型渲染动画，不在导出画面中显示整段旁白。
- TTS 使用豆包 V3 HTTP Chunked，由后端聚合为真实 MP3。
- MP4 使用 Remotion 导出；Remotion 通过后端静态服务 HTTP 地址读取音频，并在发布前通过 `ffprobe` 验证 MP4 同时包含音频流和视频流。
- 豆包 `TTS_VOICE_NAME` 必须与 `TTS_RESOURCE_ID` 匹配；`seed-tts-2.0` 可使用已验证的 `zh_female_vv_uranus_bigtts`。
- 音频、视频和依赖失败必须明确标记 `failed`。
- 历史旧视频 JSON 不再兼容，需要重新生成。

## 真实材料和导图

- 真实资源生成未传入材料时，自动检索 Hello Algo PostgreSQL 来源资源。
- 指定节点时，优先取该节点的阅读材料，再补充同节点代码案例；无节点材料时才使用全文和课程级兜底。
- `mind_map` 内容统一使用 Mermaid `mindmap` 源码；规范化会移除 Markdown 围栏和可选图标指令，并转义会与 Mermaid 形状语法冲突的非根节点标点。
- 开发验收页同时展示真实 MP4 和 `VideoLessonPlayer` 分镜、字幕、音频控制。

## 多模态资源增强

- 新增资源类型：`knowledge_video`、`digital_human_video`、`digital_human_dialogue`、`audio_explanation`、`subtitle`、`storyboard`。
- 稳定知识点视频链路：`load_context -> generate_teaching_plan -> generate_script -> generate_storyboard -> validate_script -> synthesize_audio -> render_video -> audit_resource -> persist_resource -> emit_progress`。
- 数字人讲解复用脚本/分镜链路，再通过讯飞数字人 provider 创建讲解任务；无真实讯飞配置时使用 mock provider，返回结构与真实 provider adapter 保持一致。
- 数字人对话复用 RAG、学生画像和最小 audit 流程，保存 session/message，并可返回 mock audio/video URL。
- 生成资源必须保留 `userId`、`courseId`、`nodeId`、`agentType`、`taskId`、`status`、`auditStatus`、`createdAt`、`updatedAt`。
