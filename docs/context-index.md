# 上下文索引

每次 Codex 任务都从这里开始。阅读本索引后，只继续阅读目标模块需要的文件。

## 必读文件

- `docs/interface-contract.md`：最高优先级契约来源。
- `docs/project-status.md`：当前项目进度、待办、阻塞项和状态更新规则。
- `AGENTS.md`：仓库级开发规则。
- `docs/api-rules.md`：请求和响应规则。
- `docs/development-guide.md`：开发流程和文件职责指南。

## 按任务阅读

| 任务 | 阅读 |
|---|---|
| 前端 API 封装 | `frontend/src/api/AGENTS.md`、`docs/api-rules.md`、对应 `docs/modules/*.md` |
| 后端路由 | `backend/AGENTS.md`、`docs/api-rules.md`、对应 `docs/modules/*.md` |
| 结构定义或类型 | `docs/interface-contract.md`、`docs/database-schema.md`、对应模块文档 |
| 模块实现 | `docs/development-guide.md`、对应 `docs/modules/*.md` |
| 学生画像 | `docs/modules/profile.md` |
| 课程、章节、节点 | `docs/modules/course-node.md` |
| 知识图谱 | `docs/modules/knowledge-graph.md` |
| 智能体或对话 | `docs/modules/agents.md` |
| 资源、RAG、推荐 | `docs/modules/resource-generation.md` |
| 学习路径 | `docs/modules/learning-path.md` |
| 练习和错题 | `docs/modules/practice.md` |
| 笔记和浮窗 | `docs/modules/note-floating.md` |
| 报告、记录、评估 | `docs/modules/report.md` |

## 缺少契约规则

如果模块需要的路径、字段、枚举值、页面或状态变量没有出现在 `docs/interface-contract.md` 中，停止并输出：

```text
CONTRACT_MISSING: 缺少 xxx 定义
```

## 项目状态规则

如果任务改变了项目实现状态、进度、阻塞项或下一步，完成前必须更新 `docs/project-status.md`。该文件中的状态标签只用于文档记录，不得作为契约枚举值使用。
