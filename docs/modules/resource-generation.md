# Resource Generation Module

Source: `docs/interface-contract.md` sections 8, 11, and 12.

## Types

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

## Routes

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

## Frontend

- Pages: `ResourcePage.vue`, `KnowledgeBaseAdminPage.vue`
- API: `frontend/src/api/modules/resource.ts`
- Types: `frontend/src/types/resource.ts`
- State variable: `selectedResourceId`

## Backend

- Route file: `backend/app/api/v1/resources.py`
- Schema file: `backend/app/schemas/resource.py`
- Service file: `backend/app/services/resource_service.py`
- Agent file: `backend/app/agents/resource_agent.py`

## Forbidden

- Do not add `ResourceType`, `TaskStatus`, or `AuditStatus` values.
- Generated resources must retain `userId`, `courseId`, `nodeId`, and `auditStatus`.
