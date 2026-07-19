# 前端浮窗边界

- 阅读 `docs/modules/note-floating.md`。
- 使用 `src/types/note.ts`。
- 使用 `src/api/modules/note.ts`。
- 只使用契约中的 `FloatingMenuState.activeTab` 值。
- 未更新契约前，不新增浮窗标签页。
- “问答”标签复用问答助手的会话与消息接口，展示最近问答并可跳转完整历史。
- “笔记”标签与 `/notes` 学习笔记页共用 PostgreSQL notes API；写操作通过 `notesRevision` 通知两个入口重新读取服务端数据。
