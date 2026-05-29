# 前端

## 项目概览

NodeLearn AI 前端使用 Vue 3、TypeScript、Vite 和 Element Plus。当前阶段保留页面骨架、路由、类型和 API 封装，后续页面只能通过 `src/api/modules/*` 调用后端。

## 目录结构

- `src/pages`：页面入口。
- `src/types`：契约类型。
- `src/api/client.ts`：统一 HTTP client。
- `src/api/modules`：模块接口封装。
- `src/features`：前端模块边界说明。

## 开发说明

- 开发前阅读 `../docs/context-index.md` 和对应模块文档。
- 字段、枚举值、接口路径必须来自 `../docs/interface-contract.md`。
- 组件和页面不得直接写 `fetch` 或 `axios`。
