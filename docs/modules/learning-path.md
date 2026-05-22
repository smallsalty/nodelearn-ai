# Learning Path Module

Source: `docs/interface-contract.md` section 13.

## Types

- `LearningPath`
- `LearningTask`
- `LearningPathGenerateRequest`
- `LearningTaskStatusUpdateRequest`

## Routes

- `POST /api/v1/learning-paths/generate`
- `GET /api/v1/users/{userId}/learning-paths`
- `GET /api/v1/learning-paths/{pathId}`
- `PUT /api/v1/learning-paths/{pathId}`
- `GET /api/v1/learning-paths/{pathId}/tasks`
- `PUT /api/v1/learning-tasks/{taskId}/status`

## Frontend

- Page: `frontend/src/pages/LearningPathPage.vue`
- API: `frontend/src/api/modules/learningPath.ts`
- Types: `frontend/src/types/learningPath.ts`
- State variable: `currentLearningPath`

## Backend

- Route file: `backend/app/api/v1/learning_path.py`
- Schema file: `backend/app/schemas/learning_path.py`
- Service file: `backend/app/services/learning_path_service.py`
- Agent file: `backend/app/agents/planner_agent.py`

## Forbidden

- Do not add learning task `taskType` values.
- Do not add task status values beyond `TaskStatus`.
