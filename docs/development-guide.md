# NodeLearn AI 开发指南

本文档说明后续开发每个部分时的流程、需要读取的文件、应该修改的文件，以及前后端调用边界。它不是接口契约；所有接口路径、字段名、枚举值、数据库字段仍以 `docs/interface-contract.md` 为最高优先级。

## 1. 开发前必读规则

每次开发前按顺序阅读：

1. `docs/context-index.md`
2. 当前模块对应的 `docs/modules/*.md`
3. 涉及接口、字段、枚举、数据库字段时，再查 `docs/interface-contract.md`
4. 涉及前端请求时，读 `frontend/src/api/AGENTS.md`
5. 涉及后端路由或结构定义时，读 `backend/AGENTS.md`

强制约束：

- 不新增 `docs/interface-contract.md` 未定义的接口路径。
- 不新增枚举值。
- 不修改字段名。
- 前端统一 camelCase。
- 后端和数据库统一 snake_case。
- HTTP 返回统一 `ApiResponse<T>`。
- 前端页面和组件不能直接写 `fetch` 或 `axios`，必须调用 `src/api/modules/*`。
- 如果契约缺少必要定义，停止开发并输出：`CONTRACT_MISSING: 缺少 xxx 定义`。

## 2. 通用开发顺序

所有模块按同一顺序推进：

1. 契约确认：先在 `docs/modules/*.md` 找模块边界，再到 `docs/interface-contract.md` 核对字段、枚举、请求体、返回体。
2. 类型和结构定义：先更新前端 `frontend/src/types/*` 和后端 `backend/app/schemas/*`，保持字段来自契约。
3. API 封装和路由：前端只改 `frontend/src/api/modules/*`；后端只在 `backend/app/api/v1/*` 暴露契约路径。
4. 业务逻辑：写入 `backend/app/services/*`，路由层只做参数接收和响应包装。
5. 智能体逻辑：需要 agent 时放在 `backend/app/agents/*`，不要在 route 或 page 中直接写 agent 编排。
6. 页面接入：页面只调用 API module，不直接访问后端 URL。
7. 测试：运行契约测试，并按模块补充契约一致性检查。

## 3. 前端开发流程

前端目录职责：

| 位置 | 作用 | 开发规则 |
|---|---|---|
| `frontend/src/types/contracts.ts` | 全局响应、分页、枚举 | 只放全局契约类型和枚举 |
| `frontend/src/types/*.ts` | 模块类型 | 字段必须 camelCase，来源必须是契约 |
| `frontend/src/api/client.ts` | 统一 HTTP client | 只在这里引入 axios 和处理拦截 |
| `frontend/src/api/modules/*.ts` | 模块接口函数 | 只封装契约接口，不写组件逻辑 |
| `frontend/src/pages/*.vue` | 页面入口 | 只做页面组合和调用 API module |
| `frontend/src/features/*/MODULE.md` | 前端模块边界 | 开发前阅读，更新边界说明时保持简短 |
| `frontend/src/components` | 通用组件 | 不直接请求后端 |
| `frontend/src/stores` | 状态管理预留 | 状态字段必须来自契约或模块文档 |

前端开发步骤：

1. 读取对应 `docs/modules/*.md`。
2. 如果需要新增或调整数据结构，先核对 `docs/interface-contract.md`，再改 `frontend/src/types/*`。
3. 在 `frontend/src/api/modules/*` 添加或调整函数；路径只能来自契约。
4. 页面或组件调用 API module。
5. 检查页面中没有 `fetch(` 或 `axios`。
6. 运行 `npm install` 后执行 `npm run build`。

## 4. 后端开发流程

后端目录职责：

| 位置 | 作用 | 开发规则 |
|---|---|---|
| `backend/app/main.py` | FastAPI 入口和 router 注册 | 只注册已有模块 router |
| `backend/app/core/response.py` | `ApiResponse<T>` 统一响应 | 所有 route 返回必须经过统一响应结构 |
| `backend/app/core/config.py` | 环境变量配置 | 只读 `.env` / `.env.example` 定义 |
| `backend/app/schemas/common.py` | 全局结构定义、分页、枚举 | 枚举值必须和契约一致 |
| `backend/app/schemas/*.py` | 模块结构定义 | Python 字段 snake_case，对外 JSON 通过 alias 保持契约字段 |
| `backend/app/api/v1/*.py` | 路由层 | 只负责路径、参数、调用 service、包装响应 |
| `backend/app/services/*.py` | 业务逻辑 | 写业务流程、存储适配、外部集成边界 |
| `backend/app/agents/*.py` | 智能体预留 | 使用契约中的 `AgentType`，不新增 agent 类型 |
| `backend/app/db/*` | 数据库预留 | PostgreSQL/MySQL session 和 base 占位 |

后端开发步骤：

1. 读取 `backend/AGENTS.md` 和模块文档。
2. 在 `backend/app/schemas/*` 确认请求和响应结构。
3. 在 `backend/app/api/v1/*` 实现契约中已有路径。
4. route 中使用 `success_response` 返回 `ApiResponse<T>`。
5. 真实业务写入 `backend/app/services/*`；mock 数据字段也必须来自契约。
6. 智能体输出资源前必须接入 safety/audit 边界。
7. 运行 `python -m pytest backend/app/tests/contract -q`。

## 5. 基础设施接入流程

这些部分当前只预留结构，不实现真实连接。开发时不要自行新增契约外字段或接口。

| 部分 | 读取文件 | 调用/修改位置 | 规则 |
|---|---|---|---|
| 数据库 PostgreSQL/MySQL | `docs/database-schema.md`, `docs/interface-contract.md` | `backend/app/db/*`, 后续 `backend/app/models` | 表名和字段来自契约，字段 snake_case |
| Redis | `backend/.env.example`, `backend/app/core/config.py` | service 层内部使用 | 不在 route 中直接写缓存逻辑 |
| Chroma/FAISS | `docs/modules/resource-generation.md` | `backend/app/services/resource_service.py` | 只作为 RAG/vector store 适配边界 |
| Neo4j | `docs/modules/knowledge-graph.md` | `backend/app/services/graph_service.py` | 图谱接口仍走 `backend/app/api/v1/graph.py` |
| LLM Service | `docs/modules/agents.md`, `docs/modules/resource-generation.md` | `backend/app/services/llm_service.py` | 不硬编码 API Key，不绕过 safety/audit |
| Docker | `docker/docker-compose.yml`, `docker/Dockerfile.*` | docker 目录 | 保留 frontend/backend/postgres/redis/neo4j/chroma 结构 |

## 6. 模块开发映射表

| 模块 | 必读文档 | 前端类型 | 前端 API | 前端页面/模块说明 | 后端结构定义 | 后端路由 | 后端 service/agent | 测试入口 |
|---|---|---|---|---|---|---|---|---|
| auth/users | `docs/api-rules.md`, `docs/interface-contract.md` | `frontend/src/types/auth.ts` | `frontend/src/api/modules/auth.ts` | `frontend/src/pages/LoginPage.vue`, `HomePage.vue` | `backend/app/schemas/auth.py` | `backend/app/api/v1/auth.py` | 认证逻辑先保持 route mock，后续再加 service | `test_api_routes.py`, `test_response_schema.py` |
| profile | `docs/modules/profile.md` | `frontend/src/types/profile.ts` | `frontend/src/api/modules/profile.ts` | `frontend/src/pages/ProfilePage.vue`, `frontend/src/features/profile/MODULE.md` | `backend/app/schemas/profile.py` | `backend/app/api/v1/profile.py` | `backend/app/services/profile_service.py`, `backend/app/agents/profile_agent.py` | 全部 contract tests |
| course-node | `docs/modules/course-node.md` | `frontend/src/types/course.ts` | `frontend/src/api/modules/course.ts` | `HomePage.vue`, `KnowledgeBaseAdminPage.vue` | `backend/app/schemas/course.py` | `backend/app/api/v1/course.py` | `backend/app/services/course_service.py` | `test_api_routes.py`, `test_db_fields.py` |
| knowledge-graph | `docs/modules/knowledge-graph.md` | `frontend/src/types/graph.ts` | `frontend/src/api/modules/graph.ts` | `KnowledgeGraphPage.vue`, `frontend/src/features/knowledge-graph/MODULE.md` | `backend/app/schemas/graph.py` | `backend/app/api/v1/graph.py` | `backend/app/services/graph_service.py`, `backend/app/agents/knowledge_graph_agent.py` | `test_api_routes.py`, `test_enum_values.py` |
| agents/chat | `docs/modules/agents.md` | `frontend/src/types/agent.ts` | `frontend/src/api/modules/agent.ts` | `ChatPage.vue` | `backend/app/schemas/agent.py` | `backend/app/api/v1/agents.py` | `backend/app/agents/*`, `backend/app/services/llm_service.py` | `test_api_routes.py`, `test_enum_values.py` |
| resource-generation/RAG/recommendation | `docs/modules/resource-generation.md` | `frontend/src/types/resource.ts` | `frontend/src/api/modules/resource.ts` | `ResourcePage.vue`, `KnowledgeBaseAdminPage.vue`, `frontend/src/features/resource-generation/MODULE.md` | `backend/app/schemas/resource.py` | `backend/app/api/v1/resources.py` | `backend/app/services/resource_service.py`, `resource_agent.py`, `recommendation_agent.py`, `safety_agent.py` | 全部 contract tests |
| learning-path | `docs/modules/learning-path.md` | `frontend/src/types/learningPath.ts` | `frontend/src/api/modules/learningPath.ts` | `LearningPathPage.vue`, `frontend/src/features/learning-path/MODULE.md` | `backend/app/schemas/learning_path.py` | `backend/app/api/v1/learning_path.py` | `backend/app/services/learning_path_service.py`, `planner_agent.py` | `test_api_routes.py`, `test_enum_values.py` |
| practice | `docs/modules/practice.md` | `frontend/src/types/practice.ts` | `frontend/src/api/modules/practice.ts` | `PracticePage.vue`, `frontend/src/features/practice/MODULE.md` | `backend/app/schemas/practice.py` | `backend/app/api/v1/practice.py` | `backend/app/services/practice_service.py`, `practice_agent.py` | `test_api_routes.py`, `test_enum_values.py` |
| note-floating | `docs/modules/note-floating.md` | `frontend/src/types/note.ts` | `frontend/src/api/modules/note.ts` | `frontend/src/features/floating-menu/MODULE.md` | `backend/app/schemas/note.py` | `backend/app/api/v1/notes.py` | `backend/app/services/note_service.py` | `test_api_routes.py`, `test_response_schema.py` |
| report/records/audit/system | `docs/modules/report.md`, `docs/api-rules.md` | `frontend/src/types/report.ts`, `contracts.ts` | `frontend/src/api/modules/report.ts` | `ReportPage.vue`, `frontend/src/features/report/MODULE.md` | `backend/app/schemas/report.py`, `common.py` | `backend/app/api/v1/reports.py`, `system.py` | `backend/app/services/report_service.py`, `report_agent.py`, `safety_agent.py` | 全部 contract tests |

## 7. 测试和验收流程

后端契约测试：

```bash
python -m pytest backend/app/tests/contract -q
```

前端构建检查：

```bash
cd frontend
npm install
npm run build
```

路由契约检查目标：

- FastAPI 实际 `/api/v1` 路由数量和路径必须匹配 `docs/interface-contract.md`。
- 所有普通 HTTP route 返回必须包含 `code`、`message`、`data`、`traceId`、`timestamp`。

前端请求检查目标：

- `frontend/src/pages` 和 `frontend/src/components` 中不能出现直接 `fetch(` 或 `axios`。
- 只有 `frontend/src/api/client.ts` 可以直接依赖 axios。

## 8. 修改文档的规则

- `docs/interface-contract.md` 是最高优先级契约，不因实现方便而修改。
- `docs/modules/*.md` 只保留模块开发边界和关键文件引用，不复制完整接口定义。
- `docs/development-guide.md` 说明流程和文件调用关系，不定义新接口。
- 若发现文档与契约冲突，以 `docs/interface-contract.md` 为准，并修正文档。
