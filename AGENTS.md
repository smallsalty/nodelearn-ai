# AGENTS.md

## 必读文件

- 每次编码前必须先阅读 `docs/context-index.md`。
- 每次推进项目任务前必须阅读 `docs/project-status.md`，并在任务改变项目进度、阻塞项或下一步时同步更新该文件。
- 当前模块开发必须阅读对应的 `docs/modules/*.md`。
- 涉及接口、字段、枚举、数据库字段时，以 `docs/interface-contract.md` 为最高优先级。

## 契约规则

- 如果功能需要新增接口路径、变量、字段、枚举值、环境变量、数据库表或类型，允许直接新增。
- 新增内容必须同步更新 `docs/interface-contract.md`、后端 schema/model/router/service、前端 types/api client/page、测试用例和开发日志。
- 前端统一使用 camelCase。
- 后端和数据库统一使用 snake_case。
- HTTP 返回必须统一使用 `ApiResponse<T>`。
- 前端组件不得直接写 `fetch` 或 `axios`，必须经过 `frontend/src/api/client.ts` 和 `frontend/src/api/modules/*`。
- 生成类资源必须保留 `userId`、`courseId`、`nodeId`、`agentType`、`taskId`、`status`、`auditStatus`、`createdAt`、`updatedAt` 等可追踪信息。
- 不允许硬编码任何 API Key、Secret、Token、AppId。
- 生成的学习内容、视频脚本、数字人口播文本和对话回答必须经过安全校验或事实校验流程，不得为了开发方便绕过 audit/safety 逻辑。

## 开发边界

- 当前阶段只实现架构、接口、类型、空实现和上下文文档。
- 模拟数据字段必须同步登记到 `docs/interface-contract.md`。
- 大模型、向量库、图数据库和缓存默认只预留接口；确需新增真实调用时必须通过统一 provider/service 边界接入，并同步契约、配置和测试。

## 项目状态同步

- `docs/project-status.md` 只记录项目进度、待办、阻塞项和测试状态，不定义接口、字段或枚举。
- 每次完成会改变项目状态的开发任务后，必须更新 `docs/project-status.md` 的“最后更新”、当前进度、待办或测试结果。

## 开发日志

### 2026-06-23 多模态资源增强规则更新

- 删除旧限制：缺少契约定义时不再停止开发，改为先补契约再同步实现。
- 新增规则：允许为功能直接新增接口、字段、枚举、环境变量、数据库表和类型，但必须同步契约、后端、前端、测试和项目状态。
- 本次目标：新增稳定知识点视频、数字人讲解、数字人对话和讯飞 provider 封装；当前状态为开发中。

### 2026-06-24 前端视觉重构

- 前端统一采用 Minimalism & Swiss Style 的 Clean Academic Dashboard 方向，设计 tokens 集中在 `frontend/src/styles/tokens.css`。
- 应用壳调整为左侧导航、顶部课程/节点切换、中央工作区和右侧上下文面板；小屏幕上下文面板使用抽屉/移动导航。
- 页面和组件继续禁止直接 `fetch` 或 `axios`，所有数据读取仍通过 `frontend/src/api/modules/*`。
