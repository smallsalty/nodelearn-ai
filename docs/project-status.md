# NodeLearn AI 项目状态

最后更新：2026-06-03

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
- 前端页面：登录/首页、对话、画像、学习路径、资源、知识图谱、报告、练习、浮窗菜单和知识库管理。

## 当前进度

### 已完成

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

### 进行中

- 继续扩展真实演示链路之外的业务模块。
- 项目状态和 Codex 同步文档维护。

### 未开始

- 向量库、图数据库、Redis 和缓存真实调用。
- 超出最小规则的真实 safety/audit 校验。
- 学习路径规划的完整图搜索逻辑。
- 资源推荐排序的真实行为数据融合。
- 结合图谱和错题上下文的增强智能答疑。
- 超出当前真实题目生成范围的批改、错因分析、代码运行沙箱和反馈。
- 超出模拟行为的学习记录、评估指标、报告生成、图表数据和 PDF 导出。
- 浮窗笔记界面和笔记/错题复习流程。
- 生产迁移和真实持久化发布流程。

### 阻塞

- 任何新 API 路径、字段、枚举值、数据库字段、页面状态变量或模拟字段没有在 `docs/interface-contract.md` 中定义时，必须停止并输出：

```text
CONTRACT_MISSING: 缺少 xxx 定义
```

- 当前开发阶段已允许通过统一 `LLMService` 接入真实 DeepSeek；向量库、图数据库、Redis 或缓存仍只保留接口和占位。
- 宿主机真实视频链路已安装 `ffmpeg` 和 `ffprobe`；`backend/.env` 仍需保持豆包 `TTS_API_KEY` 与兼容 `TTS_RESOURCE_ID` 的 `TTS_VOICE_NAME`。`seed-tts-2.0` 已验证可使用 `zh_female_vv_uranus_bigtts`；普通测试继续跳过付费真实视频测试。
- 当前工作区已有未提交和未跟踪改动。后续实现必须保留无关的用户改动或生成改动，未经明确要求不得回退。
- 本机 Docker Desktop 当前未运行，`ENABLE_MOCK=false` 的后端健康检查会因数据库连接不可用而失败；`ENABLE_MOCK=true` 下 `/courses` 与 `/courses/{courseId}/nodes` 仍会先尝试真实数据源并超时，前端已显示超时错误但不伪造成功。

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
