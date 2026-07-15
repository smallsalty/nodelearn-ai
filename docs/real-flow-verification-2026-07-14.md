# 真实前后端联调与全模块完整性验收（2026-07-14）

## 验收结论

本次验收在 `VITE_ENABLE_MOCK=false`、`ENABLE_MOCK=false` 下完成。浏览器请求真实 Docker Nginx 前端和 FastAPI，后端连接 PostgreSQL、Redis、Neo4j、Chroma、Judge0，并对已配置的 DeepSeek、豆包和讯飞 provider 执行代表性真实链路。

最终契约门禁为 **108 个 HTTP 方法/路径、108 个唯一方法/路径、0 个重复、0 个遗漏**。全接口最终分类如下：

| 分类 | 数量 | 说明 |
|---|---:|---|
| `PASS_REAL` | 51 | 使用真实数据库、真实模型、真实 Judge0、真实媒体或真实运行状态完成 |
| `PASS_PLACEHOLDER` | 50 | 契约、页面和错误处理可用，但业务仍是内存、固定值或当前阶段占位实现 |
| `BLOCKED` | 7 | 契约明确返回 501/404/500，或缺少独立 provider 能力；没有回退 mock |
| `FAIL` | 0 | 首次扫描的 3 项失败均已修复并定向复测通过 |

原始扫描保留在 `output/playwright/real-flow-2026-07-14/http-contract-matrix.json`，当时结果为 48/50/7/3。修正后的聚合和三项复测证据保存在 `output/playwright/real-flow-2026-07-14/http-contract-matrix-final-summary.json`，未覆盖原始失败证据。

## 运行环境与基础数据

- Docker 服务：PostgreSQL、Redis、Neo4j、Chroma、Judge0 server/worker/db/redis、FastAPI、Nginx 前端。
- `/api/v1/system/config`：`enableMock=false`，流式响应和安全审核开关开启。
- 数据库连通性：`SELECT 1 = 1`。
- 验收时数据量：3 门课程、21 个章节、107 个知识节点、86 条关系、545 条资源，Hello Algo 数据非空。
- 验收数据使用唯一前缀创建；结束前该前缀的课程、章节、节点和关系列均为 0。已有生成资源和用户文件未删除。
- Nginx History API fallback 已验证：直接访问或刷新 `/chat`、`/programming`、`/admin/knowledge-base`、`/reports` 均返回前端应用和 HTTP 200。

## 108 接口模块矩阵

| 模块 | 代表输入与输出 | 真实依赖与持久化证据 | 浏览器证据 | 结果 |
|---|---|---|---|---|
| 鉴权与用户 | 登录、注册、退出、当前用户、用户列表/详情/更新/删除 | 当前为固定 demo 身份和内存/占位管理；`ApiResponse<T>` 正常 | 登录后可进入全部页面 | `PASS_PLACEHOLDER` |
| 课程、章节、节点、关系 | 唯一前缀执行新增、读取、更新、删除和非法 ID；图谱返回真实节点/边 | PostgreSQL CRUD；修复复测覆盖同课程 source/target 外键约束并完成清理 | 首页、顶部课程/节点切换和图谱均读取真实数据 | `PASS_REAL` |
| 文件与知识库 | 搜索 Hello Algo 成功；上传、删除、构建、embedding 返回明确错误 | 知识库搜索读取已导入资源；文件存储、在线构建和 embedding 未配置 | 搜索结果可用；构建失败有明确提示 | `PASS_REAL` / `BLOCKED` |
| 学生画像 | DeepSeek 抽取最小画像 JSON，确认后展示画像 | 抽取走真实 DeepSeek；画像仓储仍为内存实现，重启后不保证持久化 | `/profile` 完成抽取和确认 | `PASS_REAL` / `PASS_PLACEHOLDER` |
| 聊天、RAG 与智能体 | RAG 问答返回引用；`qa`、画像、规划、资源、练习工作流可调用 | 问答和代表工作流走真实 DeepSeek、数据库材料和 audit；聊天 session 管理仍为内存占位 | `/chat` 问答显示回答与引用；开发验收页 `qa_agent` 成功 | `PASS_REAL` / `PASS_PLACEHOLDER` |
| 资源、推荐与思维导图 | 生成普通资源和 JSON 思维导图，读取任务和资源列表 | DeepSeek 生成后写入 PostgreSQL，保留任务、用户、课程、节点、状态和 audit 信息 | `/resources` 可查看、展开、搜索、聚焦和重置思维导图 | `PASS_REAL` |
| 学习路径与任务 | 路径生成、列表、详情和任务状态更新 | 当前服务明确返回 mock/in-memory 数据，没有冒充真实图搜索或画像融合 | `/learning-path` 页面和任务交互可用，并显示当前占位数据 | `PASS_PLACEHOLDER` |
| 练习与错题 | 真实生成代表练习；提交单选/多选和查看错题 | 生成走真实 DeepSeek；提交评分、错题和掌握度更新仍以当前规则/内存实现为主 | `/practice` 修复答案键提取和多选控件后提交正确 | `PASS_REAL` / `PASS_PLACEHOLDER` |
| 编程题与判题 | DeepSeek 生成汉诺塔题；同题执行 AC、WA、编译错误 | 生成题可持久化/刷新恢复；Judge0 1.13.1 真实执行，HTTP 不返回隐藏用例 | `/programming` 最终显示 AC，失败样例空值不再误显示为第 1 个样例失败 | `PASS_REAL` |
| 笔记与浮窗 | 新增、列表、更新、删除、错题复习入口和浮窗保存 | 当前为内存/固定实现，未扩建生产笔记持久化 | 浮窗问答真实可用；保存笔记 UI 成功 | `PASS_REAL` / `PASS_PLACEHOLDER` |
| 学习记录、评估与报告 | 记录、评估、报告列表/详情/生成/导出均符合契约 | 当前是固定或内存占位，不宣称真实统计和 PDF 生产能力 | `/reports` 明确展示占位报告并可操作 | `PASS_PLACEHOLDER` |
| Audit 与日志 | audit check、用户 audit 状态和模型调用日志返回统一结构 | 生成链路执行现有最小安全/audit 规则；独立接口和日志管理仍是当前阶段占位 | 生成结果显示 audit 状态，无绕过审核 | `PASS_PLACEHOLDER` |
| 系统 | config、health 和其他系统入口 | FastAPI 真实返回运行配置；数据库、Redis、向量库、图数据库、LLM 和数字人健康检查可见 | 首页及各页运行于 mock=false | `PASS_REAL` |
| 多模态 | 普通多模态、真实知识点视频、实时数字人聊天、任务事件 | DeepSeek、豆包 TTS、Remotion、讯飞实时流和 PostgreSQL 资源记录；独立数字人讲解 provider 不可用 | 资源页可查看媒体；实时数字人链路已验证播放与停止 | `PASS_REAL` / `BLOCKED` |

### 设计内阻塞的 7 个接口

1. 文件上传：501，真实文件存储未配置。
2. 文件详情：对不存在的验收 ID 返回 404。
3. 文件删除：501，真实文件存储未配置。
4. 知识库构建：501，当前要求使用 Hello Algo 导入命令。
5. 知识库构建任务：对不存在的验收任务返回 404。
6. Embedding：501，当前阶段 provider 未配置。
7. 数字人讲解：500，当前 provider 是实时流能力，接口明确指向数字人聊天 live session；未回退 mock。

## 真实外部能力验收

### DeepSeek

- 各执行一次最小画像 JSON、RAG 问答、普通资源/思维导图、真实练习、无视频多智能体工作流和编程题生成。
- 问答包含课程引用；资源和题目写入数据库并保留状态、审核和任务追踪信息。
- 日志和本文只记录是否成功与业务任务标识，不记录 API Key、Secret、Token 或完整上游响应。

结论：`PASS_REAL`。

### Judge0

- Judge0 版本 1.13.1，同一道题分别验证 AC、WA 和编译错误。
- 隐藏测试用例没有出现在 HTTP 响应中。
- 修复前端将 `failedSampleIndex: null` 当作 0 的显示问题；最终浏览器结果为 AC。

结论：`PASS_REAL`。

### 豆包 TTS 与 Remotion

- 显式真实测试：`1 passed in 300.17s`。
- 任务：`resource_task_9afaa026cbf5`；双资源：`resource_video_script_c4cd0048070b`、`resource_animation_script_b93e34bc89bf`。
- 两个资源均为 `success/passed`，共享同一 MP4。
- 媒体探测：H.264/AAC、1920×1080、30fps、63.658667 秒、5,714,603 bytes。
- 新增 TTS 轻微超时的受控 `atempo` 归一化，最大倍率 1.25，并保留 2% 时间裕量；未用静止画面掩盖时长问题。

结论：`PASS_REAL`。生成媒体保留在 `storage/generated_resources/resource_task_9afaa026cbf5/lesson.mp4`。

### 讯飞实时数字人

- 会话 `digital_human_session_3fbab0983d92` 完成两轮文本驱动，同一业务会话复用实时连接。
- HLS 实际可访问并播放，心跳推进状态；stop 连续调用保持幂等。
- 结束后 WebSocket、HLS/FFmpeg 运行进程均已释放，检查结果为 0 个残留 FFmpeg。
- 没有记录 provider session、签名 URL、原始 RTMP 或完整响应。
- 独立“数字人讲解”没有对应 provider 配置，保持 `BLOCKED`；讯飞 TTS 健康项为 error，没有回退 mock。

实时数字人聊天结论：`PASS_REAL`；独立数字人讲解：`BLOCKED`。

## 浏览器逐页验收

浏览器使用 Playwright CLI，未引入 `@playwright/test`。完整 trace、网络日志、控制台日志和截图位于 `output/playwright/real-flow-2026-07-14/`。

| 页面 | 主要交互 | 结果 |
|---|---|---|
| `/home` | 课程、节点和摘要加载 | `PASS_REAL` / `PASS_PLACEHOLDER` |
| `/chat` | 真实 RAG 问答和引用展示 | `PASS_REAL` |
| `/profile` | 真实画像抽取与确认；持久化仍为内存 | `PASS_REAL` / `PASS_PLACEHOLDER` |
| `/learning-path` | 路径生成和任务更新 | `PASS_PLACEHOLDER` |
| `/resources` | 资源读取、思维导图展开/搜索/聚焦/重置 | `PASS_REAL` |
| `/knowledge-graph` | 章节概览、章节展开、掌握度筛选、选中、缩放/重置 | `PASS_REAL` |
| `/practice` | 题目选择和提交；生成链真实、评分链占位 | `PASS_REAL` / `PASS_PLACEHOLDER` |
| `/programming` | 生成题目、提交代码并获得 Judge0 AC、刷新恢复 | `PASS_REAL` |
| `/reports` | 报告列表和操作，页面明确展示占位数据 | `PASS_PLACEHOLDER` |
| `/admin/knowledge-base` | Hello Algo 搜索成功；构建/上传/embedding 错误明确 | `PASS_REAL` / `BLOCKED` |
| `/dev/agent-flow-test` | Vite DEV 模式下执行真实 `qa_agent` | `PASS_REAL` |
| 全局浮窗 | 真实快捷问答、保存笔记 | `PASS_REAL` / `PASS_PLACEHOLDER` |

响应式矩阵覆盖 10 个生产页面 × 4 个视口（1440×900、1024×768、768×900、375×812），共 40 项；全部 `overflowX=false`，主内容非空，关键按钮可见。浏览器无 page error、无未分类的意外 4xx/5xx；知识库设计内阻塞和主动中止的慢生成请求均在证据中保留。

关键证据包括：

- `browser-trace.trace`：完整浏览器 trace。
- `browser-network.network`：真实网络记录。
- `browser-console-1.log`、`browser-console-2.log`、`browser-console-3.log`：控制台记录。
- `programming-ac-fixed-final-1440.png`：真实 Judge0 AC。
- `knowledge-graph-expanded-1440.png`：图谱展开交互。
- `knowledge-base-build-blocked-1440.png`：设计内阻塞的前端错误展示。
- `responsive-home-375.png`、`responsive-graph-768.png`、`responsive-resources-1024.png`：响应式代表截图。

## 静态回归与构建门禁

| 检查 | 结果 |
|---|---|
| 后端完整测试 | `189 passed, 2 skipped, 1 warning in 2.92s` |
| 契约唯一性 | 108 个方法/路径，唯一 108，重复 0，遗漏 0 |
| Python `compileall` | 通过 |
| 前端生产构建 | 通过 |
| Remotion `tsc --noEmit` | 通过 |
| Remotion 15 场景 smoke | 通过 |
| 页面/组件直接 `fetch` / `axios` | 无匹配；keepalive 仅由 API client 处理 |
| 普通 HTTP `ApiResponse<T>` 与 SSE | 普通响应统一包装；SSE 媒体类型和事件字段契约测试通过 |
| Nginx History API fallback | 直接访问 4 个代表深层路由均为 HTTP 200 |
| `git diff --check` | 通过，仅显示既有 Windows CRLF 提示 |

## 本次修复

- 修复知识图谱 ECharts 重复/损坏配置，恢复构建和全部交互。
- 删除报告路由中重复注册的 `/api/v1/audit/check`，新增精确 108 路由唯一性测试。
- 增加 Docker Nginx History API fallback，并优化后端媒体运行环境和 Judge0 cgroup v2 配置。
- 在契约登记现有 `/programming` 页面。
- 扩充 auth、course、graph、chat、notes、records/reports、audit/system、programming、SSE、Judge0 和视频链测试。
- 修复课程关系验收数据必须属于同一课程的问题。
- 修复编程题难度枚举校验、前端生成超时、刷新后题目恢复和 AC 失败样例误显示。
- 修复练习页把完整选项文本当答案提交的问题，并补齐多选交互。
- 修复多个页面 Tabs 的当前激活项。

## 清理结果与遗留范围

- Playwright 浏览器、trace 和 Vite DEV 验收服务已停止。
- 实时数字人会话已 stop，FFmpeg 无残留。
- 唯一验收前缀数据已清理；已有生成资源和用户文件保留。
- Docker 验收容器在报告写入后统一停止，数据卷不删除。
- 仍需后续生产实现：画像/学习路径/笔记/学习记录/报告等持久化业务，文件存储，在线知识库构建与 embedding，以及独立数字人讲解 provider。上述能力均保持 `PASS_PLACEHOLDER` 或 `BLOCKED`，没有冒充真实能力。
