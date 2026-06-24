# 后端 AGENTS.md

## 必读文件

- 编码前阅读 `../docs/context-index.md`。
- 当前模块开发必须阅读对应的 `../docs/modules/*.md`。
- 涉及接口路径、字段、枚举值和数据库字段时，必须核对 `../docs/interface-contract.md`。

## 规则

- 所有接口必须返回统一的 `ApiResponse<T>` 包装结构。
- 所有请求和响应结构定义必须来自 `app/schemas`。
- `app/api/v1` 只负责路由绑定、请求接收和响应编排。
- `app/services` 放置业务逻辑和外部集成边界。
- 后端 Python 变量和数据库字段使用 snake_case。
- 功能需要新增路由、字段、枚举、环境变量、数据库表或 DTO 时允许直接新增。
- 新增内容必须同步更新 `../docs/interface-contract.md`、后端 schema/model/router/service、前端类型和 API、测试用例、项目状态。
- 外部 provider 必须集中在 `app/services` 边界内，不允许在 route 或业务流程中散写密钥或 HTTP 调用。
- 不允许硬编码 API Key、Secret、Token、AppId。
- 生成内容、数字人口播文本和对话回答必须经过 audit/safety 或事实校验流程。
