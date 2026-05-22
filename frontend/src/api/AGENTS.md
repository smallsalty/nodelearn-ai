# Frontend API Rules

- 所有请求必须经过 `client.ts`。
- `api/modules` 下只封装接口函数。
- 不允许组件或页面直接请求后端。
- 不允许在组件中写 `fetch` 或 `axios`。
- API 路径必须来自 `docs/interface-contract.md`。
- 返回类型必须使用 `ApiResponse<T>`。
