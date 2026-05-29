# 架构说明

NodeLearn AI 分为 Vue 前端、FastAPI 后端和预留基础设施适配层。

## 前端

- Vue 3 + TypeScript + Vite + Element Plus.
- 页面位于 `frontend/src/pages`。
- API 调用只能位于 `frontend/src/api/client.ts` 和 `frontend/src/api/modules/*`。
- 契约类型位于 `frontend/src/types`。
- 前端模块边界说明位于 `frontend/src/features/*/MODULE.md`。

## 后端

- FastAPI 入口：`backend/app/main.py`。
- 契约响应工具：`backend/app/core/response.py`。
- 路由：`backend/app/api/v1/*`。
- 结构定义：`backend/app/schemas/*`。
- 服务：`backend/app/services/*`。
- 智能体占位：`backend/app/agents/*`。

## 预留适配层

- 数据库：PostgreSQL/MySQL 占位位于 `backend/app/db`。
- 缓存：Redis 配置位于 `backend/.env.example`。
- 向量库：Chroma/FAISS 占位配置。
- 图数据库：Neo4j 占位配置。
- LLM：统一封装位于 `backend/app/services/llm_service.py`。

当前骨架不实现真实外部 API Key 调用。
