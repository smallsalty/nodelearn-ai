# 练习模块

来源：`docs/interface-contract.md` 第 14 节。

## 类型

- `PracticeQuestion`
- `PracticeGenerateRequest`
- `PracticeSubmitRequest`
- `PracticeRecord`

## 路由

- `POST /api/v1/practices/generate`
- `GET /api/v1/practices/questions`
- `GET /api/v1/practices/questions/{questionId}`
- `POST /api/v1/practices/submit`
- `GET /api/v1/users/{userId}/practice-records`
- `GET /api/v1/users/{userId}/wrong-questions`
- `DELETE /api/v1/users/{userId}/wrong-questions/{questionId}`

## 前端

- 页面：`frontend/src/pages/PracticePage.vue`
- API：`frontend/src/api/modules/practice.ts`
- 类型：`frontend/src/types/practice.ts`
- 状态变量：`selectedQuestionId`

## 后端

- 路由文件：`backend/app/api/v1/practice.py`
- 结构定义文件：`backend/app/schemas/practice.py`
- 服务文件：`backend/app/services/practice_service.py`
- 智能体文件：`backend/app/agents/practice_agent.py`

## 真实生成

- mock 模式保留确定性模板，不产生付费调用。
- 真实模式异步调用 DeepSeek JSON 生成；未传入检索材料时，自动从 Hello Algo PostgreSQL 来源资源检索当前知识点材料。
- `practice_agent` 在完整资源工作流中固定生成 `single_choice`、`short_answer`、`coding` 各 1 道题。
- 真实 JSON 必须严格满足题目数量、题型、难度和完整字段要求；非法 JSON、数量不足或字段缺失必须明确失败。

## 禁止事项

- 不新增 `QuestionType` 或 `DifficultyLevel` 值。
- 不重命名答案字段：`userAnswer`、`correctAnswer`、`isCorrect`。
