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
- `selectChapter(chapterId: string): void`
- `zoomIn(): void`
- `zoomOut(): void`
- `resetGraphView(): void`
- `jumpToTarget(value: string): void`
- `openNodeContent(): void`
- `openChapterContent(): void`

## 前端

- 页面：`frontend/src/pages/KnowledgeGraphPage.vue`
- API：`frontend/src/api/modules/graph.ts`
- 类型：`frontend/src/types/graph.ts`
- 状态变量：`selectedChapterId`、`selectedNodeId`、`graphOverviewRequestId`
- 图谱默认按 `Chapter` 聚合，仅展示章节级大节点；点击大节点后展示该章节内的 `KnowledgeNode`。
- 图谱使用确定性固定坐标，节点不可拖动，画布允许平移缩放；顶部节点选择器或正文返回图谱时自动展开所属章节并高亮。
- 课程管理使用单一“知识节点”入口，不在侧栏展开章节树；该入口每次激活都清空章节/节点选择、筛选、展开、缩放和平移状态，恢复完整章节总览，同页重复点击同样生效。
- 图谱中的章节和知识节点点击只更新全局选中态与下方详情，不直接进入正文；知识节点详情通过“查看正文”“课后测试”“生成思维导图”显式跳转，其中课后测试使用当前节点的 `/practice?nodeId=...&tab=single_choice`。
- 章节大节点包含全部 `Chapter`，即使章节没有子节点也保留；章节详情提供“查看章节总览”。
- 章节概览按 `orderIndex` 使用固定蛇形网格，并用带箭头的弱化虚线连接相邻章节；顺序边只属于前端展示，不写入 `knowledge_relation`。真实跨章节依赖继续使用实线，同方向重复时真实依赖优先。
- 点击章节大节点继续展开章内节点并同步 `selectedChapterId`；章内章节到首层节点使用弱化包含边，真实节点依赖使用实线。
- 节点“查看正文”与章节入口统一跳转 `/courses/{courseId}/content` 的固定锚点；练习和思维导图仍沿用当前全局节点，无需二次选择。

## 后端

- 路由文件：`backend/app/api/v1/graph.py`
- 结构定义文件：`backend/app/schemas/graph.py`
- 服务文件：`backend/app/services/graph_service.py`
- 智能体文件：`backend/app/agents/knowledge_graph_agent.py`

## 约束事项

- 如需求需要新增掌握状态值，必须先同步 `docs/interface-contract.md`，再更新 schema、类型、服务、页面和测试。
- 不修改图边的 `source` 或 `target` 名称。
