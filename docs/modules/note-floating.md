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

## 后端

- 路由文件：`backend/app/api/v1/notes.py`
- 结构定义文件：`backend/app/schemas/note.py`
- 服务文件：`backend/app/services/note_service.py`

## 禁止事项

- 不新增 `activeTab` 值。
- 不新增 `relationType` 值。
