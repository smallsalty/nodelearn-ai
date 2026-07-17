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
- 页面加载课程节点后，以中文名称展示路径重点，不显示内部 `nodeId` 或英文 `taskType`；系统配置会明确标记“真实智能规划”或“演示规则规划”。
- 每个任务展示 `dueAt` 建议完成时间，并提供三种匹配任务类型的学习工具、中文用途说明、可直接复制的中文提示词和工具入口。

## 后端

- 路由文件：`backend/app/api/v1/learning_path.py`
- 结构定义文件：`backend/app/schemas/learning_path.py`
- 服务文件：`backend/app/services/learning_path_service.py`
- 智能体文件：`backend/app/agents/planner_agent.py`
- `ENABLE_MOCK=false` 时由统一 `LLMService` 调用 DeepSeek 生成路径内容；候选节点、前置依赖和 taskType 仍由服务层校验，生成内容通过 audit/safety 后才保存。
- `LearningPathGenerateRequest.additionalRequirements` 用于接收用户对时间拆分、工具推荐、任务粒度和展示语言的补充要求。
- 候选任务合并画像薄弱节点、`targetGoal` 中明确提到的中文知识点和必要前置节点；模型只决定中文表达和候选顺序，不能写入候选范围之外的节点。
- 前端为真实规划请求使用 3 分钟生成超时；其他 API 继续使用客户端默认超时。
- 当前 `LearningPathRepository` 仍为进程内存实现：真实生成能力标记为 `PASS_REAL`，存储能力继续标记为 `PASS_PLACEHOLDER`。

## 约束事项

- 如需求需要新增学习任务 `taskType` 或 `TaskStatus` 值，必须先同步 `docs/interface-contract.md`，再更新 schema、类型、服务、页面和测试。
