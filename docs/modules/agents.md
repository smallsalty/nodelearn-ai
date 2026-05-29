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

## 禁止事项

- 不新增 `AgentType` 值。
- 不新增 `workflowType`、`eventType` 或对话角色值。
