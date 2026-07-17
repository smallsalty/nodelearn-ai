# 笔记与浮窗模块

来源：`docs/interface-contract.md` 第 15 节。

## 类型

- `Note`
- `NoteCreateRequest`
- `FloatingMenuState`

## 路由

- `POST /api/v1/notes`
- `GET /api/v1/notes`
- `GET /api/v1/notes/{noteId}`
- `PUT /api/v1/notes/{noteId}`
- `DELETE /api/v1/notes/{noteId}`
- `POST /api/v1/notes/{noteId}/pin`
- `POST /api/v1/notes/{noteId}/relations`
- `GET /api/v1/users/{userId}/notes`
- `GET /api/v1/nodes/{nodeId}/notes`
- `GET /api/v1/chat/sessions?userId={userId}`
- `GET /api/v1/chat/sessions/{sessionId}/messages`
- `POST /api/v1/chat/send`

## 前端保留函数

- `openFloatingMenu(): void`
- `closeFloatingMenu(): void`
- `toggleFloatingMenu(): void`
- `switchFloatingTab(tab: FloatingMenuState["activeTab"]): void`
- `updateFloatingPosition(x: number, y: number): void`

## 前端

- API：`frontend/src/api/modules/note.ts`
- 类型：`frontend/src/types/note.ts`
- 模块说明：`frontend/src/features/floating-menu/MODULE.md`
- 状态变量：`selectedNoteId`
- 学习侧栏“问答”使用与问答助手页面相同的普通问答会话和 PostgreSQL 消息历史；浮窗打开或切换到问答标签时读取最近会话，回答完成后刷新历史，页面可查看全部记录。

## 后端

- 路由文件：`backend/app/api/v1/notes.py`
- 结构定义文件：`backend/app/schemas/note.py`
- 服务文件：`backend/app/services/note_service.py`

## 约束事项

- 如需求需要新增 `activeTab` 或 `relationType` 值，必须先同步 `docs/interface-contract.md`，再更新 schema、类型、服务、页面和测试。
