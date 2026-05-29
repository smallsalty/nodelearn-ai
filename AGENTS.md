# AGENTS.md

## 必读文件

- 每次编码前必须先阅读 `docs/context-index.md`。
- 每次推进项目任务前必须阅读 `docs/project-status.md`，并在任务改变项目进度、阻塞项或下一步时同步更新该文件。
- 当前模块开发必须阅读对应的 `docs/modules/*.md`。
- 涉及接口、字段、枚举、数据库字段时，以 `docs/interface-contract.md` 为最高优先级。

## 契约规则

- 不允许新增 `docs/interface-contract.md` 未定义的接口路径、变量、字段、枚举值。
- 缺少定义时必须输出：`CONTRACT_MISSING: 缺少 xxx 定义`。
- 前端统一使用 camelCase。
- 后端和数据库统一使用 snake_case。
- HTTP 返回必须统一使用 `ApiResponse<T>`。
- 前端组件不得直接写 `fetch` 或 `axios`，必须经过 `frontend/src/api/client.ts` 和 `frontend/src/api/modules/*`。

## 开发边界

- 当前阶段只实现架构、接口、类型、空实现和上下文文档。
- 模拟数据字段必须来自 `docs/interface-contract.md`。
- 大模型、向量库、图数据库和缓存只预留接口，不实现真实调用。

## 项目状态同步

- `docs/project-status.md` 只记录项目进度、待办、阻塞项和测试状态，不定义接口、字段或枚举。
- 每次完成会改变项目状态的开发任务后，必须更新 `docs/project-status.md` 的“最后更新”、当前进度、待办或测试结果。
