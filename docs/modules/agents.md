# Agents And Chat Module

Source: `docs/interface-contract.md` sections 9 and 10.

## Types

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

## Routes

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

## Frontend

- Page: `frontend/src/pages/ChatPage.vue`
- API: `frontend/src/api/modules/agent.ts`
- Types: `frontend/src/types/agent.ts`
- State variable: `streamContent`

## Backend

- Route file: `backend/app/api/v1/agents.py`
- Schema file: `backend/app/schemas/agent.py`
- Agent stubs: `backend/app/agents/*`

## Forbidden

- Do not add `AgentType` values.
- Do not add `workflowType`, `eventType`, or chat role values.
