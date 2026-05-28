# 学习路径模块

来源：`docs/interface-contract.md` 第 13 节。

## 类型

- `LearningPath`
- `LearningTask`
- `LearningPathGenerateRequest`
- `LearningTaskStatusUpdateRequest`

## 路由

- `POST /api/v1/learning-paths/generate`
- `GET /api/v1/users/{userId}/learning-paths`
- `GET /api/v1/learning-paths/{pathId}`
- `PUT /api/v1/learning-paths/{pathId}`
- `GET /api/v1/learning-paths/{pathId}/tasks`
- `PUT /api/v1/learning-tasks/{taskId}/status`

## 前端

- 页面：`frontend/src/pages/LearningPathPage.vue`
- API：`frontend/src/api/modules/learningPath.ts`
- 类型：`frontend/src/types/learningPath.ts`
- 状态变量：`currentLearningPath`

## 后端

- 路由文件：`backend/app/api/v1/learning_path.py`
- 结构定义文件：`backend/app/schemas/learning_path.py`
- 服务文件：`backend/app/services/learning_path_service.py`
- 智能体文件：`backend/app/agents/planner_agent.py`

## 禁止事项

- 不新增学习任务 `taskType` 值。
- 不新增 `TaskStatus` 之外的任务状态值。
