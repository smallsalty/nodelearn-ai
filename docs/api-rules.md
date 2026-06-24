# API 规则

来源：`docs/interface-contract.md` 第 2、22、26、29 节。

## 基础路径

所有后端 HTTP 路由使用：

```text
/api/v1
```

## 响应包装

所有普通 HTTP 响应必须返回：

```ts
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  traceId: string;
  timestamp: string;
}
```

## 命名规则

- 前端 TypeScript 和 Vue 使用 camelCase。
- 后端 Python 和数据库字段使用 snake_case。
- 后端结构定义可以通过 alias 暴露契约要求的 JSON 字段名。

## 前端调用

- 组件和页面不得直接调用 `fetch` 或 `axios`。
- 所有 HTTP 调用都经过 `frontend/src/api/client.ts`。
- `frontend/src/api/modules/*` 只放接口封装函数。

## 新增契约内容

- 功能需要新增接口路径、枚举值、请求字段、响应字段、环境变量或数据库字段时，允许直接新增。
- 新增内容必须先同步写入 `docs/interface-contract.md`，再同步后端 schema/router/service、前端 types/api/page 和测试。
- 模拟数据也必须使用已写入 `docs/interface-contract.md` 的字段。
- 所有新增 HTTP 接口继续使用 `/api/v1` 前缀和 `ApiResponse<T>` 包装。
