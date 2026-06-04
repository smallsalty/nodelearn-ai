# 智能体与对话模块

来源：`docs/interface-contract.md` 第 9 和 10 节。

## 类型

- `ChatSession`
- `ChatMessage`
- `ChatRequest`
- `ChatResult`
- `ChatStreamEvent`
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
- `TtsSkill`
- `VideoRenderSkill`
- `SafetyAuditSkill`

视频技能复用现有 `multimodal_agent`，不为视频技能新增 `AgentType`。最终资源输出必须通过已有 `POST /api/v1/audit/check`。

`StoryboardSkill` 输出通用解释型 `clean_motion_graphics` 分镜，固定使用 `hook`、`definition`、`analogy`、`mechanism`、`comparison`、`process`、`example` 和 `summary` 场景节奏。`AnimationSpecSkill` 严格校验 `visualPlan`，不允许回退为算法专用动画或整段文字卡片。

## 禁止事项

- 不新增 `AgentType` 值。
- 不新增 `workflowType`、`eventType` 或对话角色值。
