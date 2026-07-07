# 知识图谱模块

来源：`docs/interface-contract.md` 第 7 节。

## 类型

- `GraphNode`
- `GraphEdge`
- `KnowledgeGraph`
- `GraphViewState`

## 路由

- `GET /api/v1/courses/{courseId}/graph`
- `GET /api/v1/users/{userId}/courses/{courseId}/graph`
- `PUT /api/v1/users/{userId}/nodes/{nodeId}/mastery`

## 前端保留函数

- `selectNode(nodeId: string): void`
- `zoomIn(): void`
- `zoomOut(): void`
- `resetGraphView(): void`
- `jumpToNode(nodeId: string): void`
- `openNodeDetail(nodeId: string): void`

## 前端

- 页面：`frontend/src/pages/KnowledgeGraphPage.vue`
- API：`frontend/src/api/modules/graph.ts`
- 类型：`frontend/src/types/graph.ts`
- 状态变量：`selectedNodeId`

## 后端

- 路由文件：`backend/app/api/v1/graph.py`
- 结构定义文件：`backend/app/schemas/graph.py`
- 服务文件：`backend/app/services/graph_service.py`
- 智能体文件：`backend/app/agents/knowledge_graph_agent.py`

## 约束事项

- 如需求需要新增掌握状态值，必须先同步 `docs/interface-contract.md`，再更新 schema、类型、服务、页面和测试。
- 不修改图边的 `source` 或 `target` 名称。
