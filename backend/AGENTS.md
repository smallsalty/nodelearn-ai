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
- 不允许新增未定义的路由、字段或枚举值。
- 缺少定义时必须输出 `CONTRACT_MISSING: 缺少 xxx 定义`。
