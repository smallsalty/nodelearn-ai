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
- `ResourceRecommendation`
- `ResourcePushRecord`
- `RecommendationRequest`
- `VideoVisualType`
- `StackOperationType`
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
- `POST /api/v1/recommendations/resources`
- `GET /api/v1/users/{userId}/recommendations`
- `POST /api/v1/recommendations/{recommendationId}/viewed`
- `GET /api/v1/users/{userId}/push-records`

## 前端

- 页面：`ResourcePage.vue`、`KnowledgeBaseAdminPage.vue`
- API：`frontend/src/api/modules/resource.ts`
- 类型：`frontend/src/types/resource.ts`
- 状态变量：`selectedResourceId`

## 后端

- 路由文件：`backend/app/api/v1/resources.py`
- 结构定义文件：`backend/app/schemas/resource.py`
- 服务文件：`backend/app/services/resource_service.py`
- 智能体文件：`backend/app/agents/resource_agent.py`
- 视频技能文件：`backend/app/agents/multimodal_skills.py`
- 视频渲染器：`video-renderer/`

## 知识点讲解视频

- 当 `resourceTypes` 包含 `video_script` 或 `animation_script` 时，统一执行真实视频生成流程。
- `GeneratedResource.content` 保存 `AnimationScriptContent` JSON 字符串。
- `GeneratedResource.fileUrl` 保存审核通过后的 MP4 地址。
- 两种视频资源类型必须同时保存，并共享最终 MP4。
- TTS 使用豆包 V3 HTTP Chunked，由后端聚合为真实 MP3。
- MP4 使用 Remotion 导出；Remotion 通过后端静态服务 HTTP 地址读取音频，并在发布前通过 `ffprobe` 验证 MP4 同时包含音频流和视频流。
- 豆包 `TTS_VOICE_NAME` 必须与 `TTS_RESOURCE_ID` 匹配；`seed-tts-2.0` 可使用已验证的 `zh_female_vv_uranus_bigtts`。
- 音频、视频和依赖失败必须明确标记 `failed`。

## 真实材料和导图

- 真实资源生成未传入材料时，自动检索 Hello Algo PostgreSQL 来源资源。
- 指定节点时，优先取该节点的阅读材料，再补充同节点代码案例；无节点材料时才使用全文和课程级兜底。
- `mind_map` 内容统一使用 Mermaid `mindmap` 源码；规范化会移除 Markdown 围栏和可选图标指令，并转义会与 Mermaid 形状语法冲突的非根节点标点。
- 开发验收页同时展示真实 MP4 和 `VideoLessonPlayer` 分镜、字幕、音频控制。

## 禁止事项

- 不新增 `ResourceType`、`TaskStatus` 或 `AuditStatus` 值。
- 生成资源必须保留 `userId`、`courseId`、`nodeId` 和 `auditStatus`。
