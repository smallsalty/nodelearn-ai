# 前端 AGENTS.md

## 必读文件

- 编码前阅读 `../docs/context-index.md`。
- 当前模块开发必须阅读对应的 `../docs/modules/*.md`。
- 字段名和枚举值必须以 `../docs/interface-contract.md` 为准。

## 规则

- 前端命名使用 camelCase。
- 组件和页面不得直接调用 `fetch` 或 `axios`。
- 所有请求必须经过 `src/api/client.ts` 和 `src/api/modules/*`。
- 模块 API 文件只封装接口并返回类型化调用。
- 不允许新增未定义的路由、字段、变量或枚举值。
- 缺少定义时必须输出 `CONTRACT_MISSING: 缺少 xxx 定义`。
