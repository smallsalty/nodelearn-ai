# AGENTS.md

## Required Reading

- 每次编码前必须先阅读 `docs/context-index.md`。
- 当前模块开发必须阅读对应的 `docs/modules/*.md`。
- 涉及接口、字段、枚举、数据库字段时，以 `docs/interface-contract.md` 为最高优先级。

## Contract Rules

- 不允许新增 `docs/interface-contract.md` 未定义的接口路径、变量、字段、枚举值。
- 缺少定义时必须输出：`CONTRACT_MISSING: 缺少 xxx 定义`。
- 前端统一使用 camelCase。
- 后端和数据库统一使用 snake_case。
- HTTP 返回必须统一使用 `ApiResponse<T>`。
- 前端组件不得直接写 `fetch` 或 `axios`，必须经过 `frontend/src/api/client.ts` 和 `frontend/src/api/modules/*`。

## Development Boundary

- 当前阶段只实现架构、接口、类型、空实现和上下文文档。
- mock 数据字段必须来自 `docs/interface-contract.md`。
- 大模型、向量库、图数据库和缓存只预留接口，不实现真实调用。
