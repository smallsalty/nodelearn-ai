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

## 不得发明契约外内容

- 不新增 `docs/interface-contract.md` 未列出的接口路径。
- 不新增枚举值。
- 不新增请求或响应字段。
- 缺少定义时输出 `CONTRACT_MISSING: 缺少 xxx 定义`。
