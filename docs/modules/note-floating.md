# 笔记与浮窗模块

来源：`docs/interface-contract.md` 第 15 节。

## 类型

- `Note`
- `NoteCreateRequest`
- `NoteUpdateRequest`
- `NoteQuery`
- `NoteRelationType`
- `FloatingMenuState`

## 路由

- `POST /api/v1/notes`
- `GET /api/v1/notes?userId={userId}`
- `GET /api/v1/notes/{noteId}`
- `PUT /api/v1/notes/{noteId}`
- `DELETE /api/v1/notes/{noteId}`
- `POST /api/v1/notes/{noteId}/pin`
- `POST /api/v1/notes/{noteId}/relations`
- `GET /api/v1/users/{userId}/notes`
- `GET /api/v1/nodes/{nodeId}/notes?userId={userId}`
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
- 页面：`frontend/src/pages/NotePage.vue`，路由 `/notes`
- 模块说明：`frontend/src/features/floating-menu/MODULE.md`
- 状态变量：`selectedNoteId`、`notesRevision`
- 学习侧栏“问答”使用与问答助手页面相同的普通问答会话和 PostgreSQL 消息历史；浮窗打开或切换到问答标签时读取最近会话，回答完成后刷新历史，页面可查看全部记录。

## 后端

- 路由文件：`backend/app/api/v1/notes.py`
- 结构定义文件：`backend/app/schemas/note.py`
- 服务文件：`backend/app/services/note_service.py`
- Repository：`backend/app/repositories/note_repository.py`
- 模型：`note`、`note_tag`、`note_relation`

## 持久化与同步

- `ENABLE_MOCK=false` 时三张笔记表写入 PostgreSQL，后端重启后必须可恢复。
- `ENABLE_MOCK=true` 使用进程内隔离数据，供普通契约和页面测试使用。
- 学习笔记页与浮窗共用 notes API；写操作成功后增加 `notesRevision` 并各自重新读取服务端数据。
- 笔记正文为用户输入的 Markdown，预览复用前端现有 `MarkdownContent` 安全渲染，不调用模型或生成智能体。

## 约束事项

- 如需求需要新增 `activeTab` 或 `relationType` 值，必须先同步 `docs/interface-contract.md`，再更新 schema、类型、服务、页面和测试。
