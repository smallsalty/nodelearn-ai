# Knowledge Graph Module

Source: `docs/interface-contract.md` section 7.

## Types

- `GraphNode`
- `GraphEdge`
- `KnowledgeGraph`
- `GraphViewState`

## Routes

- `GET /api/v1/courses/{courseId}/graph`
- `GET /api/v1/users/{userId}/courses/{courseId}/graph`
- `PUT /api/v1/users/{userId}/nodes/{nodeId}/mastery`

## Frontend Reserved Functions

- `selectNode(nodeId: string): void`
- `zoomIn(): void`
- `zoomOut(): void`
- `resetGraphView(): void`
- `jumpToNode(nodeId: string): void`
- `openNodeDetail(nodeId: string): void`

## Frontend

- Page: `frontend/src/pages/KnowledgeGraphPage.vue`
- API: `frontend/src/api/modules/graph.ts`
- Types: `frontend/src/types/graph.ts`
- State variable: `selectedNodeId`

## Backend

- Route file: `backend/app/api/v1/graph.py`
- Schema file: `backend/app/schemas/graph.py`
- Service file: `backend/app/services/graph_service.py`
- Agent file: `backend/app/agents/knowledge_graph_agent.py`

## Forbidden

- Do not add mastery status values.
- Do not change graph edge `source` or `target` names.
