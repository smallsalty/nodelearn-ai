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
- 练习测评只保留在侧栏“学习入口”中，不再在学习工具或其他分组重复显示；`/practice` 路由与既有兼容重定向保持不变。
- 页面统一展示 `single_choice`、`short_answer` 和真实 Judge0 编程题；总生成按钮按该顺序调用既有练习与编程接口。
- 某个题型生成失败时保留已成功结果并继续后续题型，允许按题型重试。

## 后端

- 路由文件：`backend/app/api/v1/practice.py`
- 结构定义文件：`backend/app/schemas/practice.py`
- 服务文件：`backend/app/services/practice_service.py`
- 智能体文件：`backend/app/agents/practice_agent.py`

## 真实生成

- mock 模式保留确定性模板，不产生付费调用。
- 真实模式异步调用 DeepSeek JSON 生成；未传入检索材料时，自动从 Hello Algo PostgreSQL 来源资源检索当前知识点材料。
- 普通练习固定生成 `single_choice`、`short_answer`；真实代码运行题由独立编程题模块处理。
- 真实 JSON 必须严格满足题目数量、题型、难度和完整字段要求；非法 JSON、数量不足或字段缺失必须明确失败。

## 约束事项

- 如需求需要新增 `QuestionType` 或 `DifficultyLevel` 值，必须先同步 `docs/interface-contract.md`，再更新 schema、类型、服务、页面和测试。
- 不重命名答案字段：`userAnswer`、`correctAnswer`、`isCorrect`。
- 题目不属于 `generated_resource`；文章、导图、案例等资源与 `practice_question`、`practice_record`、`wrong_question_record` 分表保存。
