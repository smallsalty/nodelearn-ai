# 资源生成模块

来源：`docs/interface-contract.md` 第 8、11、12 节。

## 类型

- `UploadedFile`
- `KnowledgeBuildTask`
- `KnowledgeBuildRequest`
- `KnowledgeSearchRequest`
- `RetrievedDocument`
- `GeneratedResource`
- `ResourceGenerateRequest`
- `ResourceGenerateResult`
- `ResourceStreamEvent`
- `ResourceRecommendation`
- `ResourcePushRecord`
- `RecommendationRequest`

## 路由

- `POST /api/v1/files/upload`
- `GET /api/v1/files/{fileId}`
- `DELETE /api/v1/files/{fileId}`
- `POST /api/v1/knowledge-base/build`
- `GET /api/v1/knowledge-base/build-tasks/{taskId}`
- `POST /api/v1/knowledge-base/search`
- `POST /api/v1/knowledge-base/embed`
- `POST /api/v1/resources/generate`
- `GET /api/v1/resources/generation-tasks/{taskId}`
- `GET /api/v1/resources/{resourceId}`
- `GET /api/v1/users/{userId}/resources`
- `GET /api/v1/nodes/{nodeId}/generated-resources`
- `DELETE /api/v1/resources/{resourceId}`
- `GET /api/v1/resources/generate/stream?taskId={taskId}`
- `POST /api/v1/recommendations/resources`
- `GET /api/v1/users/{userId}/recommendations`
- `POST /api/v1/recommendations/{recommendationId}/viewed`
- `GET /api/v1/users/{userId}/push-records`

## 前端

- 页面：`ResourcePage.vue`、`KnowledgeBaseAdminPage.vue`
- API：`frontend/src/api/modules/resource.ts`
- 类型：`frontend/src/types/resource.ts`
- 状态变量：`selectedResourceId`

## 后端

- 路由文件：`backend/app/api/v1/resources.py`
- 结构定义文件：`backend/app/schemas/resource.py`
- 服务文件：`backend/app/services/resource_service.py`
- 智能体文件：`backend/app/agents/resource_agent.py`

## 禁止事项

- 不新增 `ResourceType`、`TaskStatus` 或 `AuditStatus` 值。
- 生成资源必须保留 `userId`、`courseId`、`nodeId` 和 `auditStatus`。
