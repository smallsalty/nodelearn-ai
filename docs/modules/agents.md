# 智能体与对话模块

来源：`docs/interface-contract.md` 第 9 和 10 节。

## 类型

- `ChatSession`
- `ChatMessage`
- `ChatRequest`
- `ChatResult`
- `ChatStreamEvent`
- 数字人对话扩展字段：`audioUrl`、`videoUrl`、`providerTaskId`、`usedDocuments`
- `AgentContext`
- `AgentRunRequest`
- `AgentRunResult`
- `MultiAgentWorkflowRequest`
- `MultiAgentWorkflowResult`
- `AgentTaskEvent`

## 路由

- `POST /api/v1/chat/sessions`
- `GET /api/v1/chat/sessions`
- `GET /api/v1/chat/sessions/{sessionId}`
- `GET /api/v1/chat/sessions/{sessionId}/messages`
- `POST /api/v1/chat/send`
- `GET /api/v1/chat/stream?sessionId={sessionId}`
- `POST /api/v1/multimodal/digital-human/chat`
- `GET /api/v1/multimodal/digital-human/sessions/{sessionId}/messages`
- `POST /api/v1/agents/run`
- `POST /api/v1/agents/workflows/run`
- `GET /api/v1/agents/tasks/{taskId}`
- `GET /api/v1/agents/tasks/{taskId}/events`

## 前端

- 页面：`frontend/src/pages/ChatPage.vue`
- API：`frontend/src/api/modules/agent.ts`
- 类型：`frontend/src/types/agent.ts`
- 状态变量：`streamContent`

## 后端

- 路由文件：`backend/app/api/v1/agents.py`
- 结构定义文件：`backend/app/schemas/agent.py`
- 智能体占位：`backend/app/agents/*`

## qa_agent 自然语言问答

- `qa_agent` 复用统一 `ChatService`，结合学生画像、Hello Algo PostgreSQL 检索材料和 DeepSeek 回答自然语言问题。
- `workflowType="qa"` 只运行 `qa_agent`。
- `workflowType="resource_generate"` 在 Hello Algo 检索后运行 `qa_agent`，并将问答结果交给最终输出。
- 完整资源工作流固定为：`profile_agent -> planner_agent -> Hello Algo retrieval -> qa_agent -> resource_agent -> practice_agent -> multimodal_agent -> safety_agent`。
- 最终输出复用现有契约字段组合：`answer`、`questions`、`generatedResources`、`retrievedDocuments`、`safetyAudit`。

## 开发验收页

- `/dev/agent-flow-test` 仅在开发环境提供。
- 页面覆盖 `profile_agent`、`planner_agent`、`qa_agent`、`resource_agent`、`practice_agent`、`multimodal_agent`、`safety_agent` 单体按钮，以及真实 RAG 和完整工作流按钮。
- `multimodal_agent` 单体按钮只生成思维导图，完整工作流负责验证思维导图、视频脚本和动画脚本，避免重复执行付费视频渲染。

## multimodal_agent 视频技能

- `VideoScriptSkill`
- `StoryboardSkill`
- `AnimationSpecSkill`
- `QualityAuditSkill`
- `TtsSkill`
- `VideoRenderSkill`
- `SafetyAuditSkill`

视频技能默认复用现有 `multimodal_agent`。本次多模态增强同时登记 `digital_human_agent`、`video_generation_agent`、`script_agent`、`storyboard_agent` 和 `narration_agent`，用于任务日志和 provider 调用归因。最终资源输出必须通过已有 `POST /api/v1/audit/check`。

`StoryboardSkill` 输出通用解释型 `clean_motion_graphics` 分镜，固定使用 `hook`、`definition`、`analogy`、`mechanism`、`comparison`、`process`、`example` 和 `summary` 场景节奏。`AnimationSpecSkill` 严格校验 `visualPlan`，不允许回退为算法专用动画或整段文字卡片。

`QualityAuditSkill` 在 TTS 和 Remotion 之前运行，检查具体对象、状态变化、屏幕文字、组件提示、动画步骤和数据结构领域组件；质量审计失败时最多触发 1 次分镜重写，仍失败则资源保持 `failed` 且不发布 `fileUrl`。

## 多模态数字人

- `ChatSession.sessionType` 支持 `digital_human`。
- 数字人对话围绕 `userId/courseId/nodeId/sessionId/message` 工作，必须结合学生画像、RAG 结果和 audit/safety。
- 数字人媒体输出通过 provider adapter 返回 `audioUrl`、`videoUrl`、`providerTaskId`，前端不得写死讯飞字段。
- 允许根据功能新增 `AgentType`、`workflowType` 或事件值，但必须同步契约、schema、前端类型和测试。
