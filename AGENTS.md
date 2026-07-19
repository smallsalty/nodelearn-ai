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

### 2026-07-08 前端浅绿色学习平台布局重构

- 前端主题改为浅绿色、白色和浅灰绿的学习平台风格，颜色、圆角、阴影、间距和 Element Plus 主题变量集中在 `frontend/src/styles/tokens.css`。
- 应用壳删除固定右侧栏，不再使用左中右三栏硬结构；右侧上下文内容迁移到顶部摘要、主内容卡片、页面 Tabs 和 `DetailDrawer`。
- 左侧导航改为可折叠 / 可展开项目栏，使用分组菜单和知识节点树；折叠态只显示图标，移动端使用遮罩抽屉。
- 本次只调整前端 UI、布局和样式，不新增后端接口路径、不修改 `docs/interface-contract.md` 中的字段或契约结构。
- 未完成项：无已知 UI 阻塞；真实业务链路和接口能力仍以既有项目状态与契约文档为准。

### 2026-07-08 前端黄白学院风工作台优化

- 前端视觉在现有布局上升级为黄白学院风：白色应用壳、浅灰工作区、黄色主交互、浅绿状态色和深墨重点卡片，主题变量仍集中在 `frontend/src/styles/tokens.css`。
- 左侧学习工作台收起逻辑改为点击式真实收缩：收起时左栏宽度变窄、主内容区拉伸；展开时主内容区随 grid 收缩，不再使用桌面 hover 自动展开。
- 本次继续只修改前端 UI、布局和样式，不新增接口、不修改路由、不修改 `docs/interface-contract.md`。

### 2026-07-08 工作台层级与满屏布局优化

- 应用壳进一步减少外层留白，改为接近满屏的黄白工作台布局；顶部栏、内容区、卡片和页面 gap 收紧，知识图谱等主内容获得更宽可用区域。
- 左侧工作台明确为一级入口与二级目录结构：展开时一级目录使用浅黄弱选中提示，二级目录使用黄色胶囊强选中并增加缩进，避免一级与二级重复高亮。
- 收起态只显示一级入口图标，并通过小点/短线保留当前二级所属一级的视觉提示；鼠标 hover、键盘 focus 或点击一级入口时使用 Element Plus Popover 弹出二级目录进行选择。
- 本次仍只修改前端 UI、布局和交互，不新增接口、不修改路由、不修改 `docs/interface-contract.md`；未完成项：当前后端返回知识节点为空时，知识节点 Popover 会显示空状态，待真实节点数据返回后自动展示大节点与子节点。

### 2026-07-19 PostgreSQL 持久化学习笔记

- 新增 `/notes` 整理回顾页和“学习工具 / 学习笔记”入口，学习浮窗与正式页面共用笔记 API，并通过 `notesRevision` 在写操作后重新读取服务端数据。
- `ENABLE_MOCK=false` 使用规范化 `note`、`note_tag`、`note_relation` 三表和幂等迁移；迁移已纳入本地初始化与后端 Docker 启动链，后端重启恢复验收通过。
- 笔记正文继续复用既有 Markdown 安全渲染边界；前端请求均通过 `frontend/src/api/modules/note.ts`，契约、后端 schema/model/router/service/repository、前端类型/页面、测试和项目状态已同步。
