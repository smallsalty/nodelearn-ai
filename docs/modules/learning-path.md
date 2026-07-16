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
- 学习路径只在侧栏“个性化管理”中出现，不再在“学习入口”或其他分组重复显示。

## 后端

- 路由文件：`backend/app/api/v1/learning_path.py`
- 结构定义文件：`backend/app/schemas/learning_path.py`
- 服务文件：`backend/app/services/learning_path_service.py`
- 智能体文件：`backend/app/agents/planner_agent.py`

## 约束事项

- 如需求需要新增学习任务 `taskType` 或 `TaskStatus` 值，必须先同步 `docs/interface-contract.md`，再更新 schema、类型、服务、页面和测试。
