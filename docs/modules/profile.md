# 学生画像模块

来源：`docs/interface-contract.md` 第 5 节。

## 类型

- `StudentProfile`
- `ProfileExtractRequest`
- `ProfileExtractResult`
- `ProfileUpdateByBehaviorRequest`
- `ProfileUpdateByPracticeRequest`

## 路由

- `GET /api/v1/profiles/{userId}`
- `PUT /api/v1/profiles/{userId}`
- `POST /api/v1/profiles/extract`
- `POST /api/v1/profiles/update-by-behavior`
- `POST /api/v1/profiles/update-by-practice`

## 前端

- 页面：`frontend/src/pages/ProfilePage.vue`
- API：`frontend/src/api/modules/profile.ts`
- 类型：`frontend/src/types/profile.ts`
- 状态变量：`currentProfile`

## 后端

- 路由文件：`backend/app/api/v1/profile.py`
- 结构定义文件：`backend/app/schemas/profile.py`
- 服务文件：`backend/app/services/profile_service.py`
- 智能体文件：`backend/app/agents/profile_agent.py`

## 约束事项

- 如需求需要新增 `lastUpdatedBy` 值或画像字段，必须先同步 `docs/interface-contract.md`，再更新 schema、类型、服务、页面和测试。
- 不使用契约外画像字段。
