# NodeLearn AI 项目状态

最后更新：2026-07-19

本文件是 Codex 工作的长期项目状态记录。每次任务开始前必须阅读本文件；如果任务改变了项目进度、阻塞项或下一步，任务结束前必须同步更新本文件。

本文件中的“已完成 / 进行中 / 未开始 / 阻塞”只用于项目进度记录，不是接口枚举值，不得复制到前端、后端、数据库或 API 契约中。

## 项目目标

围绕高校专业课程建设一个多智能体个性化学习系统。系统根据学生的专业、基础、目标、薄弱点、偏好、学习行为和练习结果建模，并生成、推荐个性化多模态学习资源。

首期聚焦一门主课程：数据结构。该课程更适合展示知识点依赖、学习路径规划和知识图谱可视化，适合作为软件杯项目演示主线。

## 来源摘要

`C:/Users/wusih/Desktop/软件杯/软件杯开题.docx` 中的项目方案定义了以下核心能力：

- 课程知识库：将课程文档拆成章节、知识节点、资源、练习、常见错因、前置关系和后继关系。
- 对话式学生画像：从自然语言对话中抽取画像字段，并根据行为和练习记录动态更新。
- 多智能体协同：包含画像、规划、资源、练习、多模态、推荐、安全、知识图谱、笔记和报告智能体。
- 个性化资源生成：生成讲解文档、思维导图、练习题、阅读材料、代码案例、视频或动画脚本、项目任务和总结笔记。
- 学习路径规划：结合图谱依赖、学生画像、掌握状态、错题历史和学习时间预算。
- 资源推荐与推送：根据当前节点、薄弱点、学习目标、掌握水平、资源偏好和可用时间推荐资源。
- 智能辅导答疑：结合课程上下文、学生画像、RAG 检索结果和错题历史回答问题。
- 学习评估与报告：评估完成率、正确率、薄弱节点、掌握分数、进步趋势和改进建议。
- 浮窗笔记模块：支持记笔记、题目标记、错题复习、节点或资源关联和快捷问答。
- 前端页面：登录/首页、问答助手、画像、学习路径、资源、知识图谱、报告、练习、学习侧栏和知识库管理。

## 当前进度

### 已完成

- 2026-07-19 完成课程正文图片与练习节点名称修复：Hello Algo 导入正文的内部图片改用 `FILE_STORAGE_URL_PREFIX` 生成同源 `/storage/` 地址，避免 HTTPS 页面拦截旧 HTTP IP 图片；统一练习页复用课程节点接口建立名称映射，页头、普通题标签和错题列表只显示中文知识点名称，无效节点显示中文状态并禁用生成，路由、筛选和请求仍保留内部 `nodeId`。
- 2026-07-19 本地回归结果：Hello Algo 定向测试 `7 passed`，后端完整测试 `204 passed, 2 skipped`，前端生产构建通过，页面和组件无直接 `fetch` / `axios`，`git diff --check` 无内容错误；腾讯云数据库备份、固定提交重导入、双域名图片与真实浏览器验收待同一部署流程完成后补记。

- 2026-07-18 完成腾讯云生产部署：新增仅公开 `80` 的服务器 Compose，前端 Nginx 同源代理 `/api/` 与 `/storage/`，后端、NodeLearn PostgreSQL、Judge0 server/worker 及其 PostgreSQL/Redis 仅使用 Docker 内网；代码通过 `ssh-manager` 从 `codex/测试` 分支稀疏 Git 克隆到 `/root/nodelearn-ai`，真实后端环境文件以 `600` 权限单独上传并生成服务器专用 `JWT_SECRET`。
- 2026-07-18 完成部署构建适配：后端 Debian、Python 和前端/渲染器 npm 依赖改用区域镜像并保留重试；服务器持久挂载 `data_sources`，Hello Algo 数据源对齐提交 `4935d2d3877a6205008d89def8d2ba43f7e06275` 后导入真实 PostgreSQL，结果为 20 章、85 个节点、68 条关系和 318 个来源资源；导入器支持容器缺少 Git 二进制时使用显式校验过的提交号。
- 2026-07-18 部署验收结果：本地前端构建通过，后端契约测试 `33 passed`，Hello Algo 定向测试 `6 passed`，服务器 Compose 校验通过；公网 `http://110.40.155.206/` 与 `/api/v1/system/health` 均返回 `200`，真实存储图片经 `/storage/` 返回 `200 image/png`，Judge0 Python 样例返回 `Accepted` 和 `42`；宿主机仅监听 `22/80`。旧 AuditPilot 容器、卷和目录已删除，数据库与上传文件备份保留于 `/root/backups/auditpilot-20260718T141210Z`。
- 2026-07-18 完成腾讯云双域名 HTTPS 部署：服务器 Compose 新增固定版本 `caddy:2.11.4-alpine`，Caddy 接管公网 `80/443` 并将请求转发到仅在 Docker 内网暴露的前端 Nginx；`smalllightsalty.top` 与 `www.smalllightsalty.top` 均使用自动 HTTPS 且不互相跳转，公网 IP 的 HTTP 访问跳转至根域名。Caddy 显式限制为 HTTP/1.1 与 HTTP/2，证书和配置分别持久化在 `caddy_data`、`caddy_config` 卷；后端资源公网基址更新为 `https://smalllightsalty.top/storage`。
- 2026-07-18 双域名 HTTPS 验收结果：Compose 静态校验、Caddyfile 真实镜像校验和前端 Nginx `nginx -t` 均通过；Let's Encrypt 分别为根域名与 `www` 域名成功签发有效证书，服务器本机访问两个域名的 HTTP 均返回 `308` 并跳转到自身 HTTPS，公网 HTTPS 首页与 `/api/v1/system/health` 均返回 `200`，真实存储图片在两个域名下均返回 `200 image/png`。宿主机最终仅监听 `22/80/443`，443 已可公网访问，因此无需修改腾讯云防火墙规则；但上海公网 HTTP 被腾讯云边界返回 `302` 并跳转至 DNSPod `webblock`，确认存在未备案或未在腾讯云接入备案拦截，域名长期稳定开放仍需完成 ICP 备案/接入备案。本地 Docker Desktop 未运行，容器级配置校验改在腾讯云一次性容器中完成。

- 2026-07-17 完成问答助手、共享历史、画像中文化与个性化学习路径真实改造：界面将“对话学习”统一改为“问答助手”，删除问答页知识节点和引用步骤面板，改为“开始问答 / 问答历史”；问答助手与学习侧栏复用同一个 PostgreSQL 会话，显式复用时校验会话归属。`ENABLE_MOCK=false`、`LLM_PROVIDER=deepseek`、`LLM_MODEL_NAME=deepseek-v4-pro` 下完成两轮真实问答，会话 `session_chat_71868202e9c1` 含 4 条唯一消息，两条回答各保存 3 条课程引用，后端重启后仍可读取；真实学习路径 `path_236b5e908d5d` 生成 6 个中文任务，覆盖栈、递归、哈希表及必要薄弱点/前置节点，全部写入逐日 20:00 建议完成时间，每个任务展示 3 种学习工具及可直接复制的中文提示词。学生画像不再直接显示内部节点编号和英文枚举。后端完整测试 `201 passed, 2 skipped, 1 warning`、前端生产构建、Python 编译、直接请求静态检查和 `git diff --check` 通过；独立 Playwright 洁净会话控制台 0 error/0 warning、业务请求全部 200，375px 无横向溢出。问答与问答历史为 `PASS_REAL`，学习路径生成为 `PASS_REAL`，路径存储仍为 `PASS_PLACEHOLDER`；报告见 `docs/qa-learning-path-real-verification-2026-07-17.md`，证据见 `output/playwright/qa-learning-path-real-2026-07-17/`。

- 2026-07-17 完成 Docker DNS 冷重启恢复与实时数字人最终复验：保持 Clash 和 Windows 系统代理，优雅停止 Docker Desktop 后执行 `wsl --shutdown`，重启 11 秒后 Docker Desktop 为 `running` 且 Engine API 可用；使用原 Compose 直接 `up -d`，未删除卷、未覆盖 DNS、未修改项目代码。backend 容器对两个讯飞域名连续解析达到 `40/40`，真实接口服务模型冒烟返回非空回答，定向测试 `26 passed in 1.41s`。Playwright CLI 在 `enableMock=false` 下完成“5.1 栈”两轮真实问答，两轮均为 `ApiResponse` success 且各带 3 条课程引用，复用同一 `sessionId`、`videoUrl`、`startedAt` 与单个 FFmpeg；HLS manifest/分片均为 200，5 秒心跳推进，浏览器 1280×720 有声播放持续前进，`ffprobe` 确认 H.264/AAC。历史为 4 条唯一消息，两次 stop 均为 `cancelled`，最终 FFmpeg 为 0；控制台 0 error/0 warning、无意外 4xx/5xx、无历史生成资源请求，trace 敏感信息扫描为 0。最终结果为 `PASS_REAL`，证据位于 `output/playwright/digital-human-live-recovery-2026-07-17/`。

- 2026-07-17 首次数字人真实链接与交互重验记录：`enableMock=false` 且数字人对话/在线虚拟人健康配置为 `ok`，定向测试 `26 passed in 3.51s`；第一轮真实对话当时被 backend 容器 DNS 的 `[Errno -3] Temporary failure in name resolution` 阻塞，按门禁未重试、未发送第二轮、未回退 mock、未启动虚拟人或 FFmpeg，结果记为 `BLOCKED`。该首次失败记录与证据继续保留在 `docs/digital-human-live-verification-2026-07-17.md` 和 `output/playwright/digital-human-live-2026-07-17/`，后续冷重启恢复结果见上一条。

- 2026-07-17 完成知识点下拉栏固定排序与选中项置顶：顶部章节/知识点选择器与资源工具页知识点选择器统一按章节 `orderIndex`、章内节点 `orderIndex` 稳定排列，资源页并行读取章节与节点；下拉面板展开后只调整滚动位置，使当前选中项成为第一条可见选项，不重排选项或键盘导航顺序。列表末尾选项使用仅在弹层展开期间生效的滚动余量，关闭后自动清理；无选中项时从课程目录首项展开。前端生产构建和 Docker 前端重建通过，Playwright 验证顶部章节总览、顶部末尾节点、资源页中间/末尾节点均准确置顶，85 个资源页节点保持 `0.1` 至 `16.3` 的原始顺序，清空后滚动位置回到顶部。

- 2026-07-16 完成资源工具详情收敛与资源隔离：资源中心、思维导图和数字人解答共用页删除历史资源大卡片网格与工具页“推荐资源”Tab，改用当前节点资源接口并在前端按当前课程、知识点、工具类型、成功状态和审核通过状态二次过滤；资源中心仅展示讲解文档/拓展阅读，思维导图仅展示导图，旧视频深链接仅展示对应视频，数字人解答完全不请求或渲染资源详情。合格历史资源按时间倒序进入详情标题栏的键盘可操作下拉框，默认最新项，节点/工具切换会先清空旧详情并以请求序号防止过期响应覆盖；同步修复 `nodeId` 深链接首次进入时的全局节点状态。首页、悬浮侧栏和后端推荐能力保持不变。前端生产构建、Docker 前端重建、页面/组件无直接 `fetch`/`axios` 检查与 `git diff --check` 通过；Playwright 使用真实“栈”历史资源验证类型隔离、最新项、键盘切换、数字人零资源请求、375/768/1024/1440px 无横向溢出，控制台 0 error/0 warning。

- 2026-07-16 完成知识节点入口收拢与图谱总览重置：课程管理不再展开章节/知识节点树，只保留知识库管理和单一“知识节点”入口；新增仅前端内存使用的 `graphOverviewRequestId` 导航信号，使该入口从其他页面或当前图谱页重复激活时都能清空章节/节点选择、筛选、展开、缩放和平移并恢复 20 章/19 条顺序边总览。图谱章节和节点点击只更新详情，不直接打开正文；节点详情提供“查看正文 / 课后测试 / 生成思维导图”，课后测试携带当前 `nodeId` 进入单选 Tab。前端生产构建、Docker 重建、页面/组件无直接 `fetch`/`axios` 检查与 `git diff --check` 通过，健康接口返回 HTTP 200；Playwright 验证真实画布章节点击、数组节点三条跳转、同页重复重置、移动抽屉及 375/768/1024/1440px 无横向溢出，控制台 0 error/0 warning。

- 2026-07-16 完成学习工作台导航重组与资源入口拆分：侧栏固定为“课程信息 / 学习入口 / 学习工具 / 个性化管理 / 课程管理”五组，Hello 算法课程卡负责选择课程并进入首页，顶部课程选择器保持纯上下文切换；练习测评只保留在学习入口，知识节点树并入课程管理，点击真实节点先进入知识图谱并唯一高亮，再由图谱“查看正文”进入对应节点锚点。资源中心只开放讲解文档和拓展材料阅读的新生成入口，思维导图与数字人解答使用互斥 `action` 状态，数字人解答只保留实时问答；旧视频深链接、后端能力和全部历史资源记录继续兼容。同步修复显式节点正文定位与 ScrollSpy 的锚点竞争。前端生产构建、Docker 前端重建、页面/组件无直接 `fetch`/`axios` 检查与 `git diff --check` 通过；Playwright 验证五组顺序、单一强选中、资源模式反复切换无残留、节点图谱优先链路、折叠 Popover 与移动抽屉，375/768/1024/1440px 无横向溢出，控制台 0 error/0 warning。

- 2026-07-16 修复课程阅读模式桌面展开态的滚动回归：根 Grid 行改为受视口约束的 `minmax(0, 1fr)`，学习工作台内部轨道同步允许收缩并独立滚动，避免 85 个知识节点把应用壳撑高；“0.3 小结”、课程来源和底部翻页栏可完整到达，课程目录、正文和学习工作台恢复互不影响的滚动边界。前端生产构建、页面/组件无直接 `fetch`/`axios` 检查、`git diff --check` 与 Docker 前后端重建通过；Playwright 在 1440×900 验证工作台滚轮、正文滚轮和目录互不联动，0.3 与底部翻页栏完整可见，并确认 375/768/1024/1200/1440px 无横向溢出、控制台 0 error/0 warning。

- 2026-07-16 完成固定双侧栏与章节分页阅读：课程正文接口仍一次返回完整课程，前端每次只渲染当前章节总览及其小节，顶部和底部提供上下章导航；课程阅读模式将学习工作台、课程目录和正文拆为独立滚动区，保留章节/节点 hash、浏览器历史、ScrollSpy 与全局选中态同步。1200px 以上完整双侧栏常驻，768–1199px 使用 88px 工作台图标栏和 220px 固定目录，低于 768px 使用左侧抽屉。前端生产构建、`git diff --check`、页面/组件无直接 `fetch`/`axios` 检查与 Docker 重建通过，后端完整测试 `197 passed, 2 skipped`；Playwright 验证 20 章连续翻页仅请求正文接口 1 次、DOM 始终仅 1 章、深链接和无效 hash 状态正确，375/768/1024/1440px 无横向溢出且控制台 0 error/0 warning。

- 2026-07-16 完成课程全文阅读链路：新增 `GET /api/v1/courses/{courseId}/content` 与 `/courses/:courseId/content`，学习入口可一次展示 20 个章节总览和 85 个小节正文；桌面端使用吸附目录，小屏使用目录抽屉，固定章节/节点锚点、ScrollSpy、顶部节点同步及旧节点正文 URL 重定向均已落地。`MarkdownContent` 在既有 `markdown-it + DOMPurify` 安全边界内支持 KaTeX、图片懒加载和仅含 C++/Python/Java 的键盘可操作代码 Tabs。
- 2026-07-16 完成 Hello Algo 导入与生产数据迁移：以 `mkdocs.yml` 导航为唯一顺序，20 个 `index.md` 总览写入 `chapter.content` 并物理删除重名节点；规范化编号、提示块、表格编号、公式、图片和 133 个代码占位，展示正文与带 Source/Commit/License/Path 的原始阅读材料分离。执行前备份为 `output/db-backups/nodelearn-before-course-content-20260716-134120.dump`，迁移后生产库为 20 章、85 节点、68 条章内关系、0 个总览节点和 22 个章节资源；重复导入保持幂等。
- 2026-07-16 本次回归结果：后端完整测试 `197 passed, 2 skipped`，前端生产构建、页面/组件无直接 `fetch`/`axios` 检查与 Docker 重建通过；真实接口返回 20 章/85 小节且不存在课程返回 404，506 个正文静态图片逐一请求均为成功。Playwright 验证登录深链接精确定位、165 组代码 Tabs 全局语言同步、1901 个 KaTeX 节点、375/768/1024/1440px 无横向溢出，浏览器控制台 0 error/0 warning。
- 2026-07-16 完成章节总览导航、顺序图谱与精确选中态：每章总览作为 `Chapter.content` 的合成入口进入侧栏、顶部选择器和图谱快速跳转，不恢复重名知识节点；新增 `selectedChapterId` 与正文 ScrollSpy/图谱/工作台同步。章节概览按 `orderIndex` 使用蛇形固定网格和展示用顺序虚线，真实依赖保持实线；侧栏移除同路由 `router-link-active` 强选中，改为唯一节点 ID 精确高亮。回归确认生产库仍为 20 章、85 节点、68 条关系，图谱概览生成 19 条连续章节顺序边；前端生产构建、`git diff --check`、页面/组件无直接 `fetch`/`axios` 检查及 Docker 重建通过，后端完整测试 `197 passed, 2 skipped`。Playwright 验证章节总览与小节点始终仅一个强选中、图谱章节展开和“查看章节总览”锚点、顶部 20 个分组/105 个选项的键盘操作，375/768/1024/1440px 均无横向溢出且控制台 0 error/0 warning。

- 2026-07-15 修复主 Docker 环境后端启动失败：先生成并验证完整 PostgreSQL 逻辑备份，再经带记录与引用数量断言的单事务清理 2 个独立 `real_verify_*` 验收课程、1 个验收章节、2 个无正文来源的空节点和 1 条自关联；未修改 Hello Algo 或其他学习数据，未放宽迁移规则，也未生成占位正文。
- 2026-07-15 主数据卷 `knowledge_node.content` 迁移成功回填 105 行并设置为 `TEXT NOT NULL`，重复执行回填 0 行；105 个 Hello Algo 节点均有正文且与最新阅读材料一致。Docker backend/frontend/postgres 已运行，健康接口返回 HTTP 200 且数据库状态为 `ok`；Playwright 验证登录、105 节点、知识图谱及“数组”工作台联动请求均成功，控制台 0 error/0 warning。
- 2026-07-15 完成固定式知识图谱与节点学习联动：ECharts 改为 `layout="none"`、节点不可拖动、章节固定网格与章节内稳定拓扑分层，保留画布平移/缩放和 ResizeObserver；工作台、顶部栏与图谱统一同步 `appState.selectedNodeId`，选中节点后自动展开章节并高亮，节点提供正文、统一练习和思维导图三个键盘可操作入口。
- 2026-07-15 新增必填非空 `KnowledgeNode.content` / `knowledge_node.content TEXT NOT NULL`、安全回填迁移和独立正文页；Hello Algo 导入将带 Source、Commit、License、Path 的完整 Markdown 同步写入节点与阅读材料。隔离 PostgreSQL 实测导入 20 章、105 节点、85 关系、459 资源，模拟旧结构后首次迁移回填 105 行、重复执行回填 0 行，105 个节点正文与最新阅读材料全部一致、来源信息完整且最终列为非空。
- 2026-07-15 合并练习入口为单选、简答、真实 Judge0 编程题和错题本四个 Tabs；总生成按三类顺序执行，单步失败不影响后续步骤并支持单独重试；`/programming` 保留携带 `nodeId` 的兼容重定向，资源页思维导图跳转会自动预选节点、通用模式和 `mind_map`，不自动触发生成。
- 2026-07-15 本次回归结果：后端完整测试 `194 passed, 2 skipped`，Python `compileall`、前端生产构建、页面/组件无直接 `fetch`/`axios` 检查和 `git diff --check` 通过。Playwright 使用真实 105 节点库验证工作台选中“数组”后图谱同步、完整 Markdown 正文、键盘 Enter 跳转、思维导图预选、三步生成成功/部分失败继续/单步重试、图谱缩放与平移产生预期画布变化、375/768/1024/1440px 无横向溢出；浏览器正常链路控制台 0 error/0 warning。
- 2026-07-15 完成算法题真实代码执行与案例判题专项验收：固定“两数求和”题通过真实 Judge0 1.13.1 执行 C++、C、Python，11 项 API 矩阵覆盖 AC、WA、PE、CE、RE、TLE、隐藏案例失败、不存在题目和超长源码，结果 11/11 符合预期；公开 WA/PE 的实际输出与失败索引正确，隐藏输入、期望输出和索引未泄露。
- 2026-07-15 在 `ENABLE_MOCK=false` 下对真实数组节点执行一次 DeepSeek 出题，生成“循环左移数组”；正确 Python 解法通过公开样例本地核对、真实 Judge0 API 和浏览器提交，均为 AC。Playwright CLI 验证固定题 AC/CE、编译信息、mock=false 真题 AC 和刷新恢复，浏览器业务请求全部 200、控制台 0 error，仅有 3 条 Element Plus radio 弃用 warning；证据位于 `output/playwright/programming-judge0-2026-07-15/`。
- 2026-07-15 算法题专项回归结果：编程服务/API/Judge0 契约 `8 passed`，后端完整测试 `189 passed, 2 skipped`，前端生产构建和 `git diff --check` 通过。完整报告位于 `docs/programming-judge0-verification-2026-07-15.md`；本次未修改公开接口、类型、数据库结构或业务实现。

- 2026-07-14 完成真实前后端联调与全模块验收：Docker Nginx 前端和 FastAPI 均以 mock=false 运行，连接 PostgreSQL、Redis、Neo4j、Chroma、Judge0 及现有外部 provider；契约与 FastAPI 精确对应 108 个唯一 HTTP 方法/路径，无重复、无遗漏。首次全接口扫描为 `48 PASS_REAL / 50 PASS_PLACEHOLDER / 7 BLOCKED / 3 FAIL`，修复课程关系验收数据、编程题难度枚举和生成题读取后定向复测，最终为 `51 / 50 / 7 / 0`。
- 2026-07-14 完成全模块真实能力代表链：DeepSeek 画像 JSON、RAG 问答、资源/思维导图、练习、无视频工作流和编程题生成通过；Judge0 1.13.1 完成 AC/WA/编译错误且不返回隐藏用例；讯飞实时数字人完成两轮驱动、HLS 播放、心跳、幂等 stop 和零 FFmpeg 残留；独立数字人讲解保持阻塞且未回退 mock。
- 2026-07-14 显式运行豆包 TTS 与 Remotion 真实视频回归，结果 `1 passed in 300.17s`；任务 `resource_task_9afaa026cbf5` 的双资源均为 `success/passed` 并共享 H.264/AAC、1920×1080、30fps、63.658667 秒 MP4。新增受控 TTS 时长归一化后，视频针对性测试 19 项通过。
- 2026-07-14 修复知识图谱 ECharts 配置、练习答案键/多选提交、编程题生成超时/刷新恢复/AC 显示和页面 Tab 激活；增加 Nginx History API fallback、108 路由唯一性及未覆盖模块/SSE/Judge0 测试。最终后端完整测试 `189 passed, 2 skipped, 1 warning`，Python compileall、前端生产构建、Remotion 类型检查、15 场景 smoke、API 层静态检查和 `git diff --check` 均通过。
- 2026-07-14 使用 Playwright CLI 完成 11 个页面、全局浮窗和 10 页面 × 4 视口响应式验收；40 个响应式检查均无横向溢出，浏览器无 page error。完整报告、原始/修正后接口矩阵、trace、网络、控制台和截图位于 `docs/real-flow-verification-2026-07-14.md` 与 `output/playwright/real-flow-2026-07-14/`。

- 2026-07-13 完成 AI 个性化知识点教学视频十二阶段重构：新增严格内部 Context/Strategy/Narrative/Scene DSL/Timeline/Media Probe 模型，接入完整教学相关画像、同节点真实练习与错因、RAG 和前置节点；公共 HTTP、资源、画像和 `AnimationScriptContent v2` 契约保持不变。
- 2026-07-13 新增后端/Remotion 双层 Scene Registry 和 15 个独立 renderer、确定性帧动画 primitives、逐场景豆包 TTS、phrase 字幕、动态 aspect/quality Composition、完整 H.264/AAC/尺寸/30fps/时长校验；旧 `UniversalExplainerVideoRenderer` 继续兼容历史资源。
- 2026-07-13 哈希强制验收改为六场景 `problem_hook/direct_mapping_demo/zoom_focus/compare_race/collision_demo/summary_recall`，覆盖 12836 `% 100 = 36`、#36 定位、平均情况下接近 O(1)、16750/20950 在 #50 的链地址冲突与四步回忆；目标时长只参与规划，不再补静止画面。
- 2026-07-13 付费真实链通过：真实 Hello Algo 节点 `node_docs_chapter_hashing_hash_map_md_f99bbe2ebac4`、DeepSeek、豆包逐场景 TTS、Remotion 和双重 audit 生成任务 `resource_task_81437f4da76d`，资源 `resource_video_script_7b0433a24d53` / `resource_animation_script_0d10f53f553d` 为 `success/passed`；最终 MP4 63.296 秒、1897 帧、1920×1080、30fps、H.264/AAC、5,802,112 bytes，关键帧与完整 probe 位于 `output/real-video-verification/` 和 `output/video-debug/`。
- 2026-07-13 视频重构回归结果：后端完整测试 `169 passed, 2 skipped`、契约测试 `25 passed`、fixture 音轨真实 MP4 E2E `1 passed`、15 模板 `renderStill` smoke、renderer TypeScript、Python compileall、十二阶段进度组件独立 SFC 解析、前端页面/组件直接 `fetch/axios` 静态检查和 `git diff --check` 均通过；付费真实测试 `1 passed in 139.83s`。前端完整构建仍仅被未修改的 `KnowledgeGraphPage.vue:136` 既有 `TS1005: ')' expected` 阻塞。
- 2026-07-13 完成知识科普视频版式与信息密度升级：v2 Visual Director 将 beat 正文从固定单句扩展为 1-3 条短句且总计不超过 40 字，并按 hook、定义、类比、机制、对比、过程、案例和总结选择中心聚焦、左右分栏、横向映射、主视觉侧栏、双栏对照、时间线、案例板和总结卡片；三套主题 token、事实来源和审核链路保持不变。
- 2026-07-13 Remotion 导出与前端 JSON 预览已同步多短句层级和差异化构图，数据结构组件的持续呼吸高亮改为入场后稳定停留，哈希表复杂度正确高亮平均 `O(1)`，冲突链显示真实 key/桶标签并统一中文教学标签。
- 2026-07-13 视频密度升级验证：视频/契约针对性测试 `31 passed`，后端完整测试 `155 passed, 1 skipped`，Python `compileall`、`video-renderer` `npx tsc --noEmit`、`VideoLessonPlayer.vue` 独立 SFC 解析与 `git diff --check` 通过；使用已有本地音频渲染 24.043 秒、1920×1080、H.264/AAC 的八版式 fixture 并完成六位置抽帧检查，样片、输入和联系表保存在 `output/video-layout-*`。前端完整构建被未修改的 `KnowledgeGraphPage.vue:136` 既有 `TS1005` 语法错误阻塞。
- 2026-07-12 完成“哈希表为什么能快速查找”真实科普视频验收：基于节点 `node_docs_chapter_hashing_hash_map_md_f99bbe2ebac4` 和 3 个 Hello Algo 来源，使用真实 DeepSeek、豆包 `zh_female_vv_uranus_bigtts` 与 Remotion 生成任务 `multimodal_video_task_c112e78067a0`、资源 `resource_knowledge_video_2ed8d2df1a93`；资源为 `success/passed`、v2 暖白学院主题、8 scene/22 beat/22 段音频，所有 factual beat 来源均可解析。
- 2026-07-12 真实视频媒体与视觉验收通过：最终 MP4 为 1920×1080、30fps、H.264/AAC、120.512 秒、11,954,889 bytes，目标时长误差约 0.43%；hook、机制、对比、示例和总结抽帧确认字幕可读、无常驻进度条/场景号，并修正 `key 12836 → bucket #36`、数组/链表/哈希表复杂度和 `bucket #50` 冲突链标签。验收文件保存在 `backend/storage/generated_resources/multimodal_video_task_c112e78067a0/`。
- 2026-07-12 为真实视频链路补齐 hook 拆分边界、单 beat 屏幕文字收敛、豆包传输异常单次重试、非 hook beat 目标时长对齐和哈希 Visual Director 事实标签测试；最终后端完整测试 `153 passed, 1 skipped`，针对性视频测试 `36 passed`，`video-renderer` `npx tsc --noEmit` 通过。
- 2026-07-12 完成知识科普视频 v2 质量升级：新增 `VideoTheme` 三主题与 `schemaVersion="2.0"` beat 契约，口播、TTS、字幕和 Remotion Sequence 统一按 beat 驱动；新生成内容保留事实 claims、来源 sourceIds、短屏幕文本和确定性视觉计划。
- 2026-07-12 将 `AnimationSpecSkill` 改为确定性 Visual Director：LLM 只负责教学事实、口播和高层视觉意图，Visual Director 为数组、哈希表、链表、栈、队列和树组件补齐严格字段，解除 DeepSeek storyboard 缺少 `items/inputKey/outputIndex/activeIndex` 导致的 schema 阻塞。
- 2026-07-12 知识点视频新接口与旧 `video_script/animation_script` 统一复用真实 TTS、Remotion、媒体审计和安全审核链路；移除固定 `/mock/knowledge-video.mp4` 成功结果，mock 模式不再发布假媒体。数字人讲解复用 v2 教学规划、事实引用和口播审核，实时数字人对话协议未修改。
- 2026-07-12 Remotion 导出升级为暖白学院、黑板讲解和技术蓝图三套 token 主题，移除常驻页眉、页脚、场景编号、进度条、蓝紫光晕和持续呼吸动画；前端资源页只保留正式知识点视频入口，并继续兼容查看历史 v1 视频资源。
- 2026-07-12 科普视频升级回归结果：后端完整测试 `149 passed, 1 skipped`，Python `compileall`、前端生产构建和 `video-renderer` TypeScript 检查通过；页面/组件未发现直接 `fetch(` 或 `axios`，`git diff --check` 通过。付费真实 DeepSeek、豆包 TTS 与 Remotion 视频测试未自动执行，继续由 `RUN_REAL_VIDEO_TESTS=true` 显式开启。

- 2026-07-12 将在线虚拟人授权音色切换为 `x4_lingxiaoxuan_oral`，本地配置、示例配置、接口契约和协议测试保持一致；start 与每次 `text_driver` 均使用该 voice，公共 chat/live/stop HTTP 契约与前端类型未改变。
- 2026-07-12 独立新协议 start/stop smoke 真实成功：使用 avatar `201165002` 和 voice `x4_lingxiaoxuan_oral` 获得非空直播流后在 `finally` stop；该门禁没有调用模型、启动 FFmpeg 或发送 `text_driver`，旧 voice 的 `11200: vcn authentication failed` 阻塞已解除。
- 2026-07-12 完成两轮真实数字人播放验收：隔离 PostgreSQL 5432、后端 8011、前端 5176 均以 mock=false 运行；两轮接口服务模型回答均带课程 RAG 引用，同一业务 session 只创建一次 WebSocket/HLS/FFmpeg 并执行两次 `text_driver`，5 秒心跳已推进 live `updatedAt`，HLS 持续产生分片，`ffprobe` 确认 H.264/AAC，浏览器无静音自动播放成功并保存截图。
- 2026-07-12 主动结束会话后状态为 `cancelled`，重复 stop 保持幂等，WebSocket 与 FFmpeg 已释放；浏览器、8011、5176、PostgreSQL 隔离容器均已停止且无残留。最终验证为授权音色针对性测试 `37 passed`、完整后端测试 `146 passed, 1 skipped`、Python `compileall` 和前端生产构建通过，脱敏验收记录位于 `output/playwright/digital-human-live-verification-2026-07-11.md`。
- 2026-07-12 完成在线虚拟人驱动新协议迁移：新增 `IFLYTEK_DIGITAL_HUMAN_URL=wss://avatar.cn-huadong-1.xf-yun.com/v1/interact`，移除实时聊天链路的旧 `vms2d_*` REST 调用；每个业务直播会话持有一条 WebSocket，并在同一连接执行 `start / text_driver / ping / stop`，文本使用明文、`interactive_mode=0`，RTMP/HLS 和公共 HTTP 契约保持不变。
- 2026-07-12 完成新协议会话加固：应用层心跳调整为 5 秒，增加 WebSocket 异常退出主动失败、连续心跳失败、2000 字符口播前置校验、幂等 stop、应用 shutdown 和 FFmpeg/HLS 统一清理；数字人聊天运行时不再生成 mock provider session。
- 2026-07-12 新协议验证结果：协议/直播/API 针对性测试 `41 passed`，后端完整测试 `146 passed, 1 skipped`，前端构建通过；独立接口服务大模型 smoke 真实成功。随后新协议 start 已通过 WebSocket/HMAC/avatar 校验，但返回 `11200: vcn authentication failed`，按门禁未启动 FFmpeg、未发送 text_driver、未运行完整两轮链路。
- 2026-07-12 将本地与示例配置的数字人形象切换为接口服务已授权的 `201165002（昭昭-4.0）`，补充独立 start/stop smoke 和安全日志测试；smoke 明确不调用大模型、ctrl 或 ffmpeg，只有 start 返回 provider session 后才在 `finally` stop。
- 2026-07-12 真实隔离 start smoke 仍返回 `HTTP 500: input avatarId is invalid`，因此按门禁未运行完整链路。控制台只读核对确认本地凭据 APPID 前缀、service ID、已发布接口服务和截图页面一致，`201165002` 确实已授权；根因定位为当前 provider 错用了旧 AI 虚拟人 REST `vms2d_start`，而该接口服务的在线驱动官方入口是 `wss://avatar.cn-huadong-1.xf-yun.com/v1/interact` WebSocket `ctrl=start` 协议。
- 2026-07-12 回归验证：avatar/start/logging 针对性测试 `31 passed`；后端完整测试 `143 passed, 1 skipped`；前端 `npm run build` 通过；公共 HTTP API 与前端类型未因形象切换发生变化。
- 2026-07-11 完成讯飞实时数字人对话链路实现与加固：虚拟人接口服务自带的大模型对话使用 WebSocket HMAC 签名并聚合流式响应，AI 虚拟人实现 `vms2d_start / vms2d_ctrl / vms2d_ping / vms2d_stop`，回答经现有 audit/safety 后才驱动；同一 `sessionId` 复用模型 `header.session` 与直播会话，心跳、空闲超时、主动停止和应用关闭均释放 provider 与 ffmpeg。
- 2026-07-11 完成 RTMP 到低延迟 HLS 会话管理：1 秒分片、最近 5 分钟滚动窗口、停止后 10 分钟延迟清理、H.264 copy 优先与单次低延迟转码回退、20 秒就绪超时、ffmpeg 异常退出主动回收；原始 provider session、完整 sid 和 RTMP 地址不返回浏览器。
- 2026-07-11 完成前端单一数字人直播舞台：`DigitalHumanChatResult.liveSession` 返回直播状态，`hls.js` 播放 HLS，展示带声音播放提示、连接/失败状态、引用材料和结束按钮；组件卸载、页面离开及 `pagehide` 经 API client keepalive 停止会话。
- 2026-07-11 回归验证：后端完整测试 `142 passed, 1 skipped`；前端 `npm run build` 通过；页面和组件无直接 `fetch(` 或 `axios`；`git diff --check` 通过，仅有既有 Windows 行尾提示。
- 2026-07-11 执行一次受控真实讯飞验收：隔离 PostgreSQL、8011 后端和 5176 前端均以 mock=false 运行，健康检查配置状态正常；第一条真实 Spark Lite 请求返回 `11200 AppIdNoAuthError`，按约定未重试、未回退其他模型，虚拟人 start 和 ffmpeg 尚未发生；Playwright 控制台错误为 0，脱敏报告和截图保存于 `output/playwright/`，隔离端口及进程已清理。
- 2026-07-11 移除数字人链路的独立 Spark Lite provider，改为虚拟人平台接口服务大模型协议：`wss://apigateway.xfyousheng.com/nlp/v1/interact_nlp`、`header.ctrl=text_interact`、`header.scene_id=IFLYTEK_DIGITAL_HUMAN_SERVICE_ID`，同一业务会话复用返回的 `header.session`；缺配置、业务错误和空响应均直接失败，不回退 Spark Lite、DeepSeek 或 mock。
- 2026-07-11 受控真实复验：独立接口服务大模型 smoke 已返回非空文本，证明同一 APPID/APIKey/APISecret 与接口服务 ID 的鉴权和对话能力有效；随后完整链路在 audit 通过后才调用 `vms2d_start`，讯飞返回 `input avatarId is invalid`，未启动 ffmpeg、未产生 HLS、未继续第二轮或心跳，8011 后端与残留进程已清理。

- 仓库级规则已写入 `AGENTS.md`。
- 上下文路由已写入 `docs/context-index.md`。
- 接口契约已写入 `docs/interface-contract.md`，并且仍是接口路径、字段、枚举、数据库表和变量名的最高优先级来源。
- 模块边界文档已写入 `docs/modules/*.md`。
- 开发流程文档已写入 `docs/development-guide.md` 和 `docs/api-rules.md`。
- 前端骨架已包含 Vue 3、TypeScript、Vite、Element Plus、路由、契约类型和 API 模块。
- 后端骨架已包含 FastAPI、Pydantic 结构定义、统一 `ApiResponse<T>` 响应工具、模块路由、服务占位和智能体占位。
- 后端主要契约模块已有路由覆盖，并提供模拟响应。
- 课程、章节、节点、关系、图谱、资源、文件和 Hello Algo 导入流程已有部分数据库与服务占位。
- 数据库、Redis、向量库、图数据库、LLM、文件存储、Docker 和模拟模式已有预留配置。
- 2026-05-28 完成文档中文化后运行 `python -m pytest backend/app/tests/contract -q`，结果为 `5 passed`。
- 2026-05-28 已完成项目文档中文化任务，仓库自有 Markdown 文档的说明性文字已改为中文，技术标识符按契约保留。
- 2026-05-28 完成后端多智能体基础框架，包含 `BaseAgent`、6 个基础智能体、`AgentService` 分发、mock `LLMService`、最小 `SafetyAgent`/`AuditService` 规则、工作流占位和 `/api/v1/agents/*` 路由接入。
- 2026-05-28 新增智能体 API 与服务测试后运行 `python -m pytest backend/app/tests -q`，结果为 `12 passed`。
- 2026-05-28 完成 `profile_agent` 画像分析智能体，基于 `StudentProfile` 输出画像分析、规划提示、资源提示和练习提示；画像 API 已改为通过 in-memory `ProfileRepository` 返回统一 demo profile。
- 2026-05-28 新增画像智能体与画像 API 测试后运行 `python -m pytest backend/app/tests -q`，结果为 `19 passed`。
- 2026-05-28 完成 `planner_agent` 课程规划智能体，基于画像、薄弱点、知识节点依赖、掌握度和时间预算生成规则式 `LearningPath` 与 `LearningTask[]`；学习路径 API 已接入 in-memory `LearningPathRepository`。
- 2026-05-28 新增课程规划智能体与学习路径 API 测试后运行 `python -m pytest backend/app/tests -q`，结果为 `25 passed`。
- 2026-05-28 完成 `resource_agent` 资源分配智能体，基于画像、画像分析、知识节点掌握度和学习目标生成规则式资源组合；资源 API、推荐 API 和 `/api/v1/audit/check` 已接入 in-memory `ResourceRepository` 与最小审计规则。
- 2026-05-28 新增资源智能体、资源 API 和推荐 API 测试后运行 `python -m pytest backend/app/tests -q`，结果为 `37 passed`。
- 2026-05-28 完成 `practice_agent` 题目评测智能体，支持规则式题目生成、客观题批改、主观题 mock 评分、代码题基础 mock 评测、错题记录、画像反馈和节点掌握度 mock 更新。
- 2026-05-28 新增练习智能体与练习 API 测试后运行 `python -m pytest backend/app/tests -q`，结果为 `45 passed`。
- 2026-05-28 完成 `multimodal_agent` 多模态内容智能体，支持 Mermaid 思维导图、视频脚本、动画脚本、代码实操、复习卡片和讲解文档的规则式生成，并复用资源仓储与最小审计流程。
- 2026-05-28 新增多模态智能体与多模态资源 API 测试后运行 `python -m pytest backend/app/tests -q`，结果为 `54 passed`。
- 2026-05-28 完成最小可演示多智能体工作流串联，`profile_build`、`path_plan`、`resource_generate`、`practice_review`、`qa` 和 `report_generate` 均通过现有 `workflowType` 接入 `/api/v1/agents/workflows/run`，并写入 `AgentRunResult[]` 与 `AgentTaskEvent[]`。
- 2026-05-28 新增多智能体工作流 runner 与 API 测试后运行 `python -m pytest backend/app/tests -q`，结果为 `63 passed`。
- 2026-05-29 完成前端智能体链路测试面板，新增仅开发环境可访问的 `/dev/agent-flow-test`，支持 5 个智能体单测、`resource_generate` 工作流测试、练习提交测试、`ApiResponse<T>` 结构校验和 API module 层 `VITE_ENABLE_MOCK` mock 模式。
- 2026-05-29 前端测试面板实现后运行 `npm run build`，结果为通过；当前前端未定义独立 `type-check`、`lint`、`test` 脚本。
- 2026-05-29 完成真实 PostgreSQL Hello Algo 数据接入计划的代码准备：`backend/.env.example` 改为真实运行模板，Hello Algo 导入使用 `course_ds_001`，学习路径/图谱/资源/练习链路在 `ENABLE_MOCK=false` 时优先读取数据库，不再静默回退 mock。
- 2026-05-29 完成 DeepSeek OpenAI-compatible Chat Completions 接入：`LLMService` 通过 `LLM_PROVIDER`、`LLM_BASE_URL`、`LLM_API_KEY` 和 `LLM_MODEL_NAME` 统一调用真实模型，`/chat/send`、资源生成和主观题评分经该边界接入；本次按用户要求未运行测试。
- 2026-06-01 补齐异步 `LLMService.generate_text()`、`generate_json()` 和 `model_name`，真实模式调用 DeepSeek `/chat/completions`，JSON 抽取启用 `response_format={"type":"json_object"}`；普通测试通过 `backend/app/tests/conftest.py` 强制 mock。
- 2026-06-01 统一 `ProfileService`、`ProfileAgent` 与工作流使用的共享 `ProfileRepository`，恢复 `ProfileAgent.run()`，并让 `/api/v1/profiles/extract` 使用 DeepSeek JSON 模式抽取后同步更新内存画像。
- 2026-06-01 完成 Hello Algo 稳定节点解析，支持 demo 节点 ID、节点名称和导入后真实节点 ID；本地文本 RAG 只检索 `user_id=system` 的 Hello Algo 来源资源，关键词无匹配时回退当前节点，再回退课程来源材料。
- 2026-06-01 将 `/api/v1/chat/send` 改为服务层真实 RAG 问答；`resource_generate` 工作流按 `profile_agent -> planner_agent -> Hello Algo DB retrieval -> resource_agent -> multimodal_agent -> safety_agent` 串联，并将生成资源持久化到 PostgreSQL。
- 2026-06-01 更新 `/api/v1/system/health` 数据库探测为真实 `SELECT 1`；Docker Compose 后端容器使用 `postgres` 主机名连接 PostgreSQL 16 服务。
- 2026-06-01 更新开发测试面板，新增自然语言输入、真实 RAG 问答按钮、自然语言完整工作流按钮以及检索材料展示。
- 2026-06-01 启动 PostgreSQL 并幂等导入 Hello Algo，回查为 `20` 个章节、`105` 个节点、`85` 条关系和 `459` 个 `system` 来源资源。
- 2026-06-01 运行 `python -m pytest backend/app/tests -q`，结果为 `70 passed`；运行 `npm run build`，结果为通过。
- 2026-06-01 显式运行付费烟测 `python -m app.smoke.real_agent_flow`，确认 `/models` 包含 `deepseek-v4-pro`，真实 RAG 返回 3 条材料，逐智能体和 5 步完整工作流均成功，生成资源已持久化且 `modelName=deepseek-v4-pro`、`auditStatus=passed`。
- 2026-06-02 补齐知识点讲解视频契约，登记 `AnimationScriptContent`、`VideoLessonScene`、`stack_animation`、`text_slide` 和豆包 TTS、Remotion、文件存储、内部审计环境变量。
- 2026-06-02 完成真实知识点讲解视频同步链路：显式请求 `video_script` 或 `animation_script` 时，执行 RAG、DeepSeek 脚本和分镜、豆包 V3 HTTP Chunked TTS、真实 MP3 校验、Remotion H.264/AAC MP4、`/api/v1/audit/check` 和 `generated_resource` 更新；失败时不发布假 `fileUrl`。
- 2026-06-02 新增 `VideoLessonPlayer` 和资源页演示闭环，支持分镜标题、字幕、代码高亮、音频、上一步、下一步、自动播放、进度条、栈动画、通用文本动态舞台和 MP4 播放入口。
- 2026-06-02 新增视频失败测试、契约测试和显式付费真实流程测试；运行 `python -m pytest backend/app/tests -q`，结果为 `77 passed, 1 skipped`；运行前端 `npm run build` 和 `video-renderer` 的 `npx tsc --noEmit`，结果均为通过。
- 2026-06-02 按授权补齐契约 `qa_agent`，新增独立 `QaAgent` 并复用 `ChatService` 的 Hello Algo PostgreSQL 检索和 DeepSeek 回答；`workflowType="qa"` 已修正为只调用 `qa_agent`。
- 2026-06-02 将完整资源工作流固定为 `profile_agent -> planner_agent -> Hello Algo retrieval -> qa_agent -> resource_agent -> practice_agent -> multimodal_agent -> safety_agent`，最终输出组合 `answer`、`questions`、`generatedResources`、`retrievedDocuments` 和 `safetyAudit`。
- 2026-06-02 完成真实练习题生成：`practice_agent` 异步调用 DeepSeek JSON，自动使用 Hello Algo 材料并严格校验题型、数量、难度和字段；完整链生成单选、简答、代码题各 1 道。
- 2026-06-02 修正真实资源检索优先级：指定知识点时优先读取对应 Hello Algo 阅读材料和代码案例，避免自然语言泛词命中课程级兜底内容。
- 2026-06-02 修正真实视频链：本机豆包 `seed-tts-2.0` 使用已验证音色 `zh_female_vv_uranus_bigtts`；Remotion 改为通过 HTTP 静态地址读取 MP3；DeepSeek 偶发空内容在统一 LLM 边界重试 1 次。
- 2026-06-02 扩展 `/dev/agent-flow-test`：覆盖 7 个单体智能体、真实 RAG、完整工作流、3 道完整题、Mermaid 导图、共享 MP4，以及 `VideoLessonPlayer` 分镜、字幕和音频控制；补充开发 CORS、长链路超时和旧 Chromium Mermaid polyfill。
- 2026-06-02 启动 PostgreSQL 回查 Hello Algo 为 `20` 个章节、`105` 个节点、`85` 条关系和 `459` 个来源资源；运行 `python -m app.smoke.real_agent_flow`，确认 `/models` 含 `deepseek-v4-pro`、7 个智能体单体成功、真实 RAG 成功、完整链返回 3 道题、1 份导图、共享 MP4 双资源且持久化审核通过。
- 2026-06-02 显式运行付费视频测试 `$env:RUN_REAL_VIDEO_TESTS='true'; python -m pytest app/tests/services/test_real_video_generation.py -q`，结果为 `1 passed`；验证音频下载、真实 MP4 和外部 `ffprobe` 音视频双流。
- 2026-06-02 Browser 插件未提供，使用 Playwright MCP 回退验证开发页桌面与 `390px` 移动视图；真实 RAG、完整工作流、共享 MP4、分镜播放器和 Mermaid SVG 均通过，控制台零错误且移动端无页面横向溢出。
- 2026-06-02 最终运行 `python -m pytest backend/app/tests -q`，结果为 `86 passed, 1 skipped`；运行前端 `npm run build`、`video-renderer` 的 `npx tsc --noEmit`、`python -m compileall -q app` 和 `git diff --check`，结果均为通过。
- 2026-06-02 将视频内容契约升级为通用 `clean_motion_graphics`：新增 `SceneType`、`VisualLayout`、`VisualAnimationType`、严格 `VisualElement` 联合类型和 `VisualPlan`，并停止兼容历史 `stack_animation`、`text_slide` JSON。
- 2026-06-02 将 `StoryboardSkill` 和 `AnimationSpecSkill` 改为通用解释型分镜，固定覆盖问题开场、定义、类比、机制、对比、流程、例子和总结；显式视频请求在 mock 模式明确失败，不再返回假媒体。
- 2026-06-02 新增 Remotion `UniversalExplainerVideoRenderer` 与 motion graphics 组件库，导出画面只展示关键词、短句、图标、箭头、流程和总结卡片，不再显示整段旁白。
- 2026-06-02 更新 `VideoLessonPlayer`、移除前端开发模块假视频成功数据，并运行普通测试 `python -m pytest backend/app/tests -q`，结果为 `92 passed, 1 skipped`；前端构建和 Remotion TypeScript 检查通过。
- 2026-06-02 显式运行付费哈希表视频测试 `$env:RUN_REAL_VIDEO_TESTS='true'; python -m pytest app/tests/services/test_real_video_generation.py -q -s`，节点为 `node_docs_chapter_hashing_hash_map_md_f99bbe2ebac4`，结果为 `1 passed in 236.38s`；验证 8 类通用分镜、真实豆包 TTS、共享 MP4、审计通过和 `ffprobe` H.264/AAC 双流。
- 2026-06-02 抽帧验收发现并修正 `comparison` 布局只接收 `card` 的问题；重新执行真实 Remotion/ffmpeg 导出，并逐场景比较前后帧，`hook`、`definition`、`analogy`、`mechanism`、`comparison`、`process`、`example` 和 `summary` 均存在画面变化。
- 2026-06-02 通用视频升级最终回归：运行 `python -m compileall -q app; python -m pytest app/tests -q`，结果为 `92 passed, 1 skipped`；运行前端 `npm run build`、`video-renderer` 的 `npx tsc --noEmit` 和 `git diff --check`，结果均为通过。
- 2026-06-03 完成 Vue 3 + Vite + Element Plus 完整演示版前端：登录、首页、对话、画像、学习路径、资源、知识图谱、练习、报告、知识库管理和浮窗均接入契约 API 模块；新增浅色学习平台设计系统、应用壳、移动底部导航、路由守卫、通用状态组件、Markdown 安全渲染和真实后端错误提示。
- 2026-06-03 前端验证结果：运行 `npm run build` 通过；静态检查 `frontend/src/pages` 与 `frontend/src/components` 未发现直接 `fetch(` 或 `axios`；Browser 插件不可用，使用 Playwright + 系统 Edge 回退完成登录、9 个核心路由、390px 移动视口、浮窗按钮和 ECharts 知识图谱验收，控制台错误为 0。
- 2026-06-03 后端联调结果：默认前端仍连接 `http://localhost:8000/api/v1` 且 `VITE_ENABLE_MOCK=false`；本机 Docker Desktop 未运行，真实数据库链路无法验证，临时使用 `ENABLE_MOCK=true` 的 HTTP 后端完成浏览器流程。`/system/health`、登录、用户、图谱、对话、资源、路径、练习、报告和笔记接口响应 `code=200`，但 `/courses` 与 `/courses/{courseId}/nodes` 在当前后端进程下会超时。
- 2026-06-04 补强通用知识点 motion graphics 视频生成器：`VideoRenderSkill` 在 Remotion 依赖检查和渲染前显式校验 `AnimationScriptContent`、非空 8 场景、HTTP(S) scene 音频和 `output.audioUrls` 一致性；`UniversalExplainerVideoRenderer` 新增 `grid_focus` 主视觉布局，motion graphics 组件增加帧驱动重点强调。
- 2026-06-04 补充视频契约、服务和真实流程测试断言，覆盖旧 `text_slide` 拒绝、缺少元素动画、definition keyword 边界、完整 8 场景、渲染前预检、真实输出 `videoUrl/fileUrl/audioUrls` 一致性和逐场景非静态抽帧；运行 `python -m pytest app/tests/contract/test_video_contract.py app/tests/services/test_video_generation.py -q`，结果为 `20 passed`；运行 `video-renderer` 的 `npx tsc --noEmit` 和前端 `npm run build`，结果均通过；付费真实视频测试按当前环境配置跳过。
- 2026-06-04 显式运行真实多模态视频智能体生成“哈希表”讲解视频：启动 Docker PostgreSQL，导入 Hello Algo 数据后调用 `POST /api/v1/resources/generate`，节点为 `node_docs_chapter_hashing_hash_map_md_f99bbe2ebac4`，任务 `resource_task_927160d4c1f7` 返回 `success`；两份资源 `resource_video_script_f3ae7e16b738` 和 `resource_animation_script_ce23c8852622` 均为 `status=success`、`auditStatus=passed`，共享 `http://localhost:8000/storage/generated_resources/resource_task_927160d4c1f7/lesson.mp4`；`ffprobe` 验证 H.264/AAC 音视频双流，逐场景抽帧确认 8 个场景均非静态画面。
- 2026-06-05 按 MoneyPrinterTurbo 的阶段化任务、provider 抽象、失败处理和多版本思路完成 NodeLearn AI 视频生成质量改造：扩展 `VideoGenerateOptions`、`VideoGenerationStage`、数据结构 `VisualElement`、`AnimationStep` 和 `AnimationScriptContent` 内部 JSON；新增 `QualityAuditSkill`、视频任务进度事件、后台视频生成任务、Remotion 数据结构教学组件库、`qualityPreset` 渲染参数和前端进度/失败原因展示；当时仍复用 `/api/v1/resources/generate`、`/api/v1/resources/generation-tasks/{taskId}` 和 `/api/v1/resources/generate/stream?taskId={taskId}`，未额外建立独立短视频接口或资源枚举。
- 2026-06-05 回归验证：运行 `python -m pytest app/tests -q`，结果为 `103 passed, 1 skipped`；运行 `video-renderer` 的 `npx tsc --noEmit` 通过；运行前端 `npm run build` 通过；运行 `git diff --check` 通过。付费真实视频测试仍由 `RUN_REAL_VIDEO_TESTS=true` 显式开启。
- 2026-06-23 完成多模态资源增强：解除 AGENTS 和开发文档中阻止新增接口/字段/枚举的旧限制，新增 `knowledge_video`、`digital_human_video`、`digital_human_dialogue` 等资源类型和数字人/视频相关 AgentType；新增 `/api/v1/multimodal/videos/*`、`/api/v1/multimodal/digital-human/*` 接口，接入讯飞 Spark/TTS/数字人 provider adapter 与 mock provider，补充健康检查 `iflytekSpark/iflytekTts/iflytekDigitalHuman`。
- 2026-06-23 前端资源页新增“知识点教学视频 / 数字人讲解 / 数字人对话”模式，新增 `MultimodalTaskProgress` 和 `DigitalHumanChatPanel`，知识图谱节点详情可携带 `nodeId` 跳转资源页生成视频、数字人讲解或对话。
- 2026-06-23 回归验证：运行 `python -m pytest backend/app/tests -q`，结果为 `109 passed, 1 skipped`；运行 `cd frontend && npm run build` 通过；运行 `cd video-renderer && npx tsc --noEmit` 通过；静态检查 `frontend/src/pages` 与 `frontend/src/components` 未发现直接 `fetch(` 或 `axios`；运行 `git diff --check` 通过。
- 2026-06-24 完成前端视觉重构：新增 `frontend/src/styles/tokens.css`，统一 Minimalism & Swiss Style / Clean Academic Dashboard 设计 tokens；应用壳改为左侧导航、顶部课程/节点切换、中央工作区和右侧上下文面板，小屏幕使用移动导航和上下文抽屉。
- 2026-06-24 重排首页、对话学习、学生画像、学习路径、资源生成、知识图谱、练习测评、学习报告、知识库管理、登录页、浮窗、数字人对话和视频讲解播放器；去除大面积渐变、玻璃拟态、科幻暗色视频舞台、循环装饰动画和“AI 助手”式文案。
- 2026-06-24 前端验证结果：运行 `cd frontend && npm run build` 通过；静态检查 `frontend/src/pages` 与 `frontend/src/components` 未发现直接 `fetch(` 或 `axios`；运行 `git diff --check` 通过；Playwright 验证 375px、768px、1024px、1440px 首页无横向溢出，`/chat`、`/resources`、`/knowledge-graph`、`/reports` 在移动和桌面无横向溢出且控制台错误为 0。
- 2026-06-24 完成真实数据库全流程验收报告 `docs/real-flow-verification-2026-06-24.md`：真实 PostgreSQL、DeepSeek 模型、RAG 问答、画像抽取、7 个单体智能体、普通资源生成、前端登录和核心页面联调均通过；`npm run build` 通过；Playwright CLI 验证核心页面 API 失败数为 0，控制台仅存在 Element Plus `el-radio` 废弃警告；讯飞数字人真实 provider 按用户选择跳过。
- 2026-07-11 调整知识图谱前端展示层：默认按课程章节聚合为大节点，点击大节点后才显示该章节的知识节点；图谱接口、节点字段和关系字段保持不变。
- 2026-07-11 新增编程题页面、Judge0 远程判题接口与 C++/C/Python 代码模板；普通练习页面默认仅生成选择题和简答题。
- 2026-07-11 编程题判题改为 Docker Compose 自建 Judge0 CE，使用官方 server/worker 镜像及独立 PostgreSQL、Redis，不再依赖付费云端判题 API。
- 2026-07-11 分离资源与题目边界：资源生成不再创建或返回 `practice_question` 资源，普通题目使用独立 `practice_question`、`practice_record`、`wrong_question_record` ORM 表模型。
- 2026-06-24 真实视频生成链路本次未通过：`python -m app.smoke.real_agent_flow` 在完整 `resource_generate` 工作流的视频资源阶段失败；直接调用 `POST /api/v1/resources/generate` 生成 `video_script` 和 `animation_script` 时，任务 `resource_task_c0f904bbb57e` 在 `AnimationScriptContent` 结构校验阶段失败，缺少 `array_cells.items`、`hash_function_panel.inputKey/expression/outputIndex`、`hash_table_buckets.activeIndex` 等必填字段，未产出新的 MP4。
- 2026-07-08 完成前端浅绿色学习平台 UI 重构：`frontend/src/styles/tokens.css` 统一改为浅绿、白色和浅灰绿主题；应用壳改为可折叠左侧项目栏、顶部轻量状态栏、宽主内容区和按需 `DetailDrawer`，固定右侧栏已删除。
- 2026-07-08 重排首页、对话、画像、学习路径、资源生成、知识图谱、练习、报告和知识库管理页面；原右侧栏承载的课程/节点上下文、画像摘要、薄弱节点、快捷入口、推荐资源和学习进度入口迁移到顶部摘要卡、页面卡片、Tabs 或详情抽屉，未新增接口、字段或数据结构。
- 2026-07-08 前端验证结果：运行 `cd frontend && npm run build` 通过；静态检查 `rg "fetch\\(|axios" frontend/src/pages frontend/src/components` 无匹配；检查固定右侧栏和旧三栏样式引用无残留；Browser 插件不可用，使用 Playwright CLI 回退验证 `/home`、`/chat`、`/profile`、`/learning-path`、`/resources`、`/knowledge-graph`、`/practice`、`/reports`、`/admin/knowledge-base`，375px 与桌面视口无横向溢出，右侧固定栏数量为 0，控制台无新增错误。
- 2026-07-08 完成黄白学院风工作台优化：主题升级为白色应用壳、浅灰工作区、黄色主交互、浅绿状态色和深墨重点卡片；左侧学习工作台取消桌面 hover 自动展开，改为点击式真实收缩，收起时主内容区从 `1082px` 拉伸到 `1294px`，展开后恢复。
- 2026-07-08 黄白学院风验证结果：运行 `cd frontend && npm run build` 通过；静态检查页面/组件无直接 `fetch(` 或 `axios`；旧右栏、旧三栏和 `is-peeking` 残留检查无匹配；Browser 插件不可用，使用 Playwright CLI 验证 `/home`、`/resources`、`/knowledge-graph`、`/practice`、`/reports`，1440px、1024px、768px、375px 无横向溢出，右侧固定栏数量为 0，控制台无新增错误。
- 2026-07-08 完成工作台层级与满屏布局优化：应用壳外层留白收紧到小边距，`.app-layout` 接近满屏铺开，顶部栏、内容区和卡片间距同步收紧；左侧工作台展开态区分一级入口与二级目录，二级目录增加缩进并使用黄色强选中，所属一级只保留浅黄弱提示。
- 2026-07-08 收起态侧栏优化为只显示一级入口图标，当前二级所属一级通过小点/短线保留状态；hover、focus 或点击一级入口会通过 Element Plus Popover 弹出二级目录，知识节点入口在有节点数据时按大节点/子节点逐级展开，当前后端返回空节点时显示空状态。
- 2026-07-08 工作台层级验证结果：运行 `cd frontend && npm run build` 通过；静态检查 `rg "fetch\\(|axios" frontend/src/pages frontend/src/components` 无匹配；旧结构残留检查 `rg "is-peeking|ContextPanel|AcademicSidebar|side-stack|two-column-page|chat-workspace" frontend/src` 无匹配；Browser 插件不可用，使用 Playwright CLI 回退验证 `/home`、`/chat`、`/knowledge-graph` 以及 1440px、1024px、768px、375px 视口，展开态二级缩进约 `18px`、父级弱选中与二级强选中同时成立，收起态仅显示一级入口并可弹出二级目录，无横向溢出，右侧固定栏数量为 0，控制台无新增错误。
- 2026-07-08 完成 Knowledge MindMap JSON 重构：继续复用 `POST /api/v1/resources/generate`、`ResourceType="mind_map"` 和 `GeneratedResource.content` 字符串字段，后端为 `mind_map` 拆出 DeepSeek JSON 模式生成分支，新增 `MindMapValidator`、章节/节点范围上下文组装和一次校验错误重试；重试仍失败时保存失败资源并保留错误与原始输出，仍经过 audit 边界；前端新增 `MindMapViewer` 和内部 `KnowledgeMindMap` 类型，资源页与 `/dev/agent-flow-test` 改为 JSON 导图渲染，旧 Mermaid 内容显示“思维导图数据异常”并保留原始内容入口；本次未新增接口路径、公开枚举、数据库字段或公开响应字段。
- 2026-07-08 Knowledge MindMap JSON 验证结果：运行 `python -m pytest backend/app/tests/contract -q` 通过，结果为 `23 passed`；运行 `python -m pytest backend/app/tests -q` 通过，结果为 `119 passed, 1 skipped`；运行 `cd frontend && npm run build` 通过；静态检查 `rg "fetch\\(|axios" frontend/src/pages frontend/src/components` 无匹配；使用 Playwright + 系统 Chrome 验证 `/resources` 新生成 JSON 导图的展开、收起、重置、搜索、聚焦当前节点和旧 Mermaid 异常原始内容入口，并验证 375px、768px、1024px、1440px 视口 `scrollWidth` 与 `clientWidth` 一致、无横向溢出、控制台无新增错误。
- 2026-07-08 完成实联数据库 MindMap 生成与截图验证：启动 Docker PostgreSQL 并确认真实 Hello Algo 数据已存在，数据量为 1 门课程、105 个知识节点、85 条知识关系；使用隔离后端 `8011` 和隔离前端 `5176`，后端 `ENABLE_MOCK=false` 且 `/api/v1/system/config` 返回 `enableMock=false`，课程、节点和资源生成均走真实 PostgreSQL 链路。
- 2026-07-08 真实 DeepSeek 生成验证结果：选择数据结构课程节点 `node_docs_chapter_array_and_linkedlist_array_md_ddee4c9f1f0c`（数组）调用 `POST /api/v1/resources/generate` 生成 `mind_map`；第一次真实输出暴露 `importance` 数字字符串和宽泛“其他”标题校验问题，已将内部 `MindMapValidator` 收敛为数字字符串归一化和禁用标题精确匹配；第二次生成任务 `resource_task_77142f29324b` 成功，资源 `resource_mind_map_8db3b22ab054` 持久化为 `status=success`、`auditStatus=passed`、`scope=chapter`，包含 7 个一级分支、38 个节点和 6 条关系，`content` 可解析为 `KnowledgeMindMap` JSON。
- 2026-07-08 实联截图与回归验证结果：Playwright 打开 `/resources` 登录 demo 账号、选中新生成的“数组思维导图”、执行“全部展开”后截图保存为 `artifacts/mind-map-real-db-2026-07-08.png`；桌面视口 `1440x1000` 下无横向溢出、控制台无新增错误；隔离后端和前端进程已停止，`8011/5176` 无监听残留；运行 `python -m pytest backend/app/tests/contract -q` 通过，结果为 `23 passed`；运行 `python -m pytest backend/app/tests -q` 通过，结果为 `121 passed, 1 skipped`；运行 `cd frontend && npm run build` 通过；静态检查 `rg "fetch\\(|axios" frontend/src/pages frontend/src/components` 无匹配。
- 2026-07-09 完成 MindMapViewer 中心辐射式 XMind 布局调整：仅修改前端导图展示形态，未修改后端接口、`ResourceType`、`AgentType`、`GeneratedResource` 字段或 `KnowledgeMindMap` JSON 结构；桌面端改为组件内部坐标布局、SVG 曲线连线和绝对定位节点，中心主题固定在画布视觉中心，一级分支左右均衡分布，默认只展示中心主题与一级分支；点击分支逐级展开子节点，点击节点显示旁侧 description 浮层，聚焦模式只保留父级路径、当前节点和直接子节点；375px 移动端退化为纵向树。
- 2026-07-09 MindMapViewer 布局验证结果：运行 `cd frontend && npm run build` 通过；静态检查 `rg "fetch\\(|axios" frontend/src/pages frontend/src/components` 无匹配；`git diff --check` 仅输出既有 Windows 行尾提示；使用 Playwright MCP 在 `/resources` 验证默认折叠、中心主题居中、一级分支左右分布、单分支展开、节点说明浮层、聚焦当前节点，以及 1440px、1024px、768px、375px 视口无横向溢出；当前 MCP 工具未提供文本输入能力，搜索交互通过保留原有 `searchKeyword -> revealNode -> selectFirstMatch` 代码路径和构建检查覆盖。
- 2026-07-10 完成实联数据库 MindMap 生成与截图验证：启动 Docker PostgreSQL 并确认真实 Hello Algo 数据已存在，数据量为 1 门课程、20 个章节、105 个知识节点、85 条知识关系和 532 条既有生成资源；使用隔离后端 `8011` 和隔离前端 `5176`，后端 `ENABLE_MOCK=false` 且 `/api/v1/system/config` 返回 `enableMock=false`，不影响既有 `8000/5173`。
- 2026-07-10 真实 DeepSeek 生成验证结果：选择真实节点 `node_docs_chapter_array_and_linkedlist_array_md_ddee4c9f1f0c`（数组）调用既有 `POST /api/v1/resources/generate` 生成 `mind_map`，任务 `resource_task_1cb5784dfa09` 成功，资源 `resource_mind_map_691f38e554ae` 持久化为 `status=success`、`auditStatus=passed`、`modelName=deepseek-v4-pro`、`scope=chapter`，包含 8 个一级分支、45 个树节点和 7 条关系，`content` 可解析为 `KnowledgeMindMap` JSON。
- 2026-07-10 实联截图与前端验证结果：运行 `cd frontend && npm run build` 通过；静态检查 `rg "fetch\\(|axios" frontend/src/pages frontend/src/components` 无匹配；Playwright MCP 登录 demo 账号并打开 `/resources`，选中新生成的“数组思维导图”，验证默认折叠态仅显示 8 个一级分支且二级/三级节点为 0，展开“数组定义”后显示 4 个二级节点，中心主题“数组”位于画布中心，一级分支左右 4/4 分布；1440px、1024px、768px、375px 视口无横向溢出，控制台错误为 0，截图保存为 `artifacts/mind-map-real-db-2026-07-10.png`；隔离后端和前端进程已停止，`8011/5176` 无监听残留。

### 进行中

- 继续将验收中标记为 `PASS_PLACEHOLDER` 的画像、学习路径、笔记、学习记录和报告模块推进为真实持久化业务。
- 项目状态和 Codex 同步文档维护。

### 未开始

- 向量库、图数据库、Redis 和缓存真实调用。
- 超出最小规则的真实 safety/audit 校验。
- 学习路径规划的完整图搜索逻辑。
- 资源推荐排序的真实行为数据融合。
- 结合图谱和错题上下文的增强智能答疑。
- 超出当前真实题目生成与 Judge0 客观执行范围的主观批改、错因分析和反馈。
- 超出模拟行为的学习记录、评估指标、报告生成、图表数据和 PDF 导出。
- 笔记持久化和完整笔记/错题复习业务流程。
- 通用版本化迁移管理、自动回滚编排和真实持久化发布流水线。

### 阻塞

- `smalllightsalty.top` 与 `www.smalllightsalty.top` 已完成 Caddy HTTPS、证书和应用链路部署，但腾讯云上海地域 Lighthouse 对公网 HTTP 返回未备案 `webblock`；需根据域名当前备案状态在腾讯云完成首次 ICP 备案或接入备案，审核通过前不能将双域名稳定公网开放视为最终验收通过。
- 新增 API 路径、字段、枚举值、数据库字段、页面状态变量或模拟字段时，必须同步更新 `docs/interface-contract.md`、后端、前端、测试和项目状态；不再因缺少既有契约定义而停止开发。

- 当前开发阶段已允许通过统一 `LLMService` 接入真实 DeepSeek；向量库、图数据库、Redis 或缓存仍只保留接口和占位。
- 宿主机真实视频链路已安装 `ffmpeg` 和 `ffprobe`；`backend/.env` 仍需保持豆包 `TTS_API_KEY` 与兼容 `TTS_RESOURCE_ID` 的 `TTS_VOICE_NAME`。`seed-tts-2.0` 已验证可使用 `zh_female_vv_uranus_bigtts`；普通测试继续跳过付费真实视频测试。
- 真实视频的 storyboard schema 对齐阻塞已由 v2 Visual Director 解除；暖白学院主题已完成真实 DeepSeek、豆包 TTS 与 Remotion 付费回归。黑板讲解和技术蓝图主题仍只完成 renderer fixture/类型与常规测试，后续凭证或主题实现变化时再显式运行付费回归。
- 当前工作区已有未提交和未跟踪改动。后续实现必须保留无关的用户改动或生成改动，未经明确要求不得回退。
- 文件上传/删除存储、在线知识库构建和 embedding provider 仍未配置，真实模式按契约返回明确 501/404；独立数字人讲解没有对应 provider，真实模式返回明确错误，不允许回退 mock。
- 普通问答 `chat_session` / `chat_message` 已在真实模式接入 PostgreSQL，并于 2026-07-17 验证后端重启后可恢复；画像、学习路径、笔记、学习记录、评估和报告仍包含内存或固定占位实现，相关存储能力不得作为生产持久化能力宣传。
- 编程题与提交记录当前仍保存在后端进程内存中；同一进程内刷新可以恢复，但后端重启会丢失。2026-07-15 已确认真实 DeepSeek 出题和 Judge0 执行为 `PASS_REAL`，存储能力仍为 `PASS_PLACEHOLDER`。

## 功能待办

### 第一优先级

- 保持上下文文档、契约文档、模块文档、前端类型、后端结构定义和模拟路由一致。
- 所有后端 HTTP 响应保持 `ApiResponse<T>`。
- 前端组件和页面不得直接写 `fetch` 或 `axios`；所有调用必须经过 `frontend/src/api/client.ts` 和 `frontend/src/api/modules/*`。
- 使用契约定义字段完成数据结构课程、章节、节点、关系、图谱、文件和资源占位流程。
- 每次修改路由、结构定义、类型或项目状态后保持契约测试通过。

### 第二优先级

- 将前端 TODO 页面升级为可演示视图，并调用现有 API 模块。
- 使用模拟或空实现推进画像、对话、资源生成、学习路径、练习、报告和笔记流程，保持契约一致。
- 增加前端 API 模块、路由路径、响应包装、枚举值和数据库字段的契约测试。
- 豆包凭证或媒体依赖变更后，显式运行 `RUN_REAL_VIDEO_TESTS=true` 的付费真实视频流程回归测试。

### 第三优先级

- 契约表面稳定后，为 `services` 增加真实业务逻辑。
- 仅在开发边界允许后接入 RAG/向量库、图数据库、Redis、统一 LLM Service、safety audit、生成资源可用状态和报告导出。
- 本地契约行为稳定后，再增加生产迁移、部署检查和运行监控。

## Codex 更新规则

- 每次任务开始时，阅读 `docs/context-index.md`、本文件和任务需要的模块文档。
- 如果任务改变实现状态，必须在同一工作会话中更新本文件的“当前进度”“功能待办”或“阻塞”。
- 任务完成时更新“最后更新”，并在运行测试后记录测试结果。
- 不得用本文件定义新契约。所有接口、字段、枚举值、数据库名、路由和前端状态变量仍以 `docs/interface-contract.md` 为准。
- 如果任务只阅读或解释代码、不改变项目状态，则无需更新状态，除非用户明确要求。
