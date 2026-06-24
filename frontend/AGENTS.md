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
- 功能需要新增路由、字段、变量、枚举值或页面状态时允许直接新增。
- 新增内容必须同步更新 `../docs/interface-contract.md`、前端类型、API module、页面或组件、测试用例和开发日志。
- 资源生成、数字人讲解和数字人对话页面必须展示 loading、failed、retry 和可读错误原因。
- 不允许在前端硬编码 API Key、Secret、Token、AppId 或 provider 私有字段。
