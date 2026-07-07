# 真实数据库全流程验收报告（2026-06-24）

## 结论

本次验收连接了真实 PostgreSQL，并使用 `ENABLE_MOCK=false` 的后端。真实数据库、DeepSeek 模型可用性、RAG 问答、画像抽取、单体智能体、普通资源、练习题、前端核心页面和浏览器登录流程均通过。

完整视频生成链路当前不可判定为真实可用。本次 `video_script` / `animation_script` 真实生成在 storyboard 结构校验阶段失败，未产出新的 MP4，因此全流程最终结论为：**核心学习链路可用，真实视频生成链路未通过**。

讯飞数字人真实 provider 按用户选择跳过，本次未调用 `/api/v1/multimodal/digital-human/*`，不作为失败项。

## 环境配置摘要

| 项目 | 输入/配置 | 输出/结果 |
|---|---|---|
| PostgreSQL | `docker compose -f docker\docker-compose.yml up -d postgres` | `docker-postgres-1` 运行中，`5432` 映射到本机 |
| 后端 | `http://127.0.0.1:8000/api/v1`，`ENABLE_MOCK=false` | `/system/health` 返回 `status=ok` |
| 前端 | `http://localhost:5173`，`VITE_ENABLE_MOCK=false` | Vite 页面可访问 |
| 数据库连接 | `postgresql+psycopg://nodelearn:***@localhost:5432/nodelearn` | 真实 `SELECT 1` 通过 |
| LLM | `LLM_MODEL_NAME=deepseek-v4-pro`，API Key 已配置但未记录 | `/models` 包含 `deepseek-v4-pro` |
| TTS/视频 | 豆包 TTS Key 已配置，`ffmpeg/ffprobe` 可用 | 当前新视频任务失败，未进入 MP4 产物校验 |
| 讯飞数字人 | 讯飞 key 未配置，且本次按用户选择跳过 | health 中 `iflytek* = mock` |
| 浏览器工具 | Browser plugin 不可用 | 使用 Playwright CLI 回退验收 |

## 数据库输入输出

| 检查项 | 输入 | 输出 |
|---|---|---|
| Hello Algo 课程数据 | 查询真实 PostgreSQL 课程表、节点表、关系表和 `system` 来源资源 | `chapters=20`，`nodes=105`，`relations=85`，`systemSourceResources=459` |
| 生成资源总数 | 查询 `generated_resource` | 验收结束后 `generatedResourcesTotal=530` |
| 多模态任务表 | 查询 `multimodal_generation_task` / `multimodal_task_event` | 本次未调用新版多模态任务接口，计数均为 `0` |

## 后端 API 验收

| API/流程 | 输入摘要 | 输出摘要 | 真实依赖 | 结论 |
|---|---|---|---|---|
| `GET /system/health` | 无 | `database=ok`，`llmService=ok`，`iflytek*=mock` | PostgreSQL、配置检查 | 通过 |
| DeepSeek `/models` | `LLM_MODEL_NAME=deepseek-v4-pro` | 模型列表包含 `deepseek-v4-pro` | DeepSeek | 通过 |
| `POST /profiles/extract` | `user_live_smoke_001` 与学习画像文本 | 抽取 `grade`、`major`、`profileSummary` | DeepSeek | 通过 |
| `POST /chat/send` | 栈问题，`useRag=true`，`useProfile=true` | 返回回答，`retrievedDocuments=3` | PostgreSQL RAG、DeepSeek | 通过 |
| `POST /agents/run` | `profile_agent`、`planner_agent`、`qa_agent`、`resource_agent`、`practice_agent`、`multimodal_agent`、`safety_agent` | 7 个单体智能体均 `status=success` | PostgreSQL、DeepSeek、审计服务 | 通过 |
| `POST /agents/workflows/run` | `workflowType=resource_generate`，包含讲解文档、3 道题、思维导图、视频脚本和动画脚本 | 工作流 `status=failed`；前置步骤成功，`multimodal_agent` 输出的视频资源失败 | PostgreSQL、DeepSeek、视频链路 | 未通过 |
| `POST /resources/generate` | `user_real_verify_20260624`，哈希表节点，`resourceTypes=["video_script","animation_script"]` | 后台任务 `resource_task_c0f904bbb57e` 最终 `status=failed` | PostgreSQL、DeepSeek、视频结构校验 | 未通过 |
| `GET /resources/generation-tasks/resource_task_c0f904bbb57e` | 轮询视频任务 | `progress=100`，`stage=error`，无 `fileUrl` | 资源任务仓储 | 未通过 |

视频任务失败的直接错误：

```text
19 validation errors for AnimationScriptContent
scenes.0.visualPlan.elements.1.array_cells.items: Field required
scenes.1.visualPlan.elements.1.hash_function_panel.inputKey: Field required
scenes.1.visualPlan.elements.1.hash_function_panel.expression: Field required
scenes.1.visualPlan.elements.1.hash_function_panel.outputIndex: Field required
scenes.1.visualPlan.elements.4.hash_table_buckets.activeIndex: Field required
...
scenes.5.visualPlan.elements.1.hash_table_buckets.buckets: List should have at least 1 item
```

该错误说明 DeepSeek 生成的 storyboard 没有满足后端 `AnimationScriptContent` / `VisualElement` 严格结构，链路在 TTS 和 Remotion 之前失败。

## 前端浏览器验收

使用 Playwright CLI 访问 `http://localhost:5173`，先清理本地 token 后执行登录，再访问核心路由。截图保存在本机临时目录：`C:/Users/wusih/AppData/Local/Temp/nodelearn-real-flow-20260624/`。

| 页面/流程 | 输入 | 输出 | API 结果 | 结论 |
|---|---|---|---|---|
| 登录 | `demo_student` / `demo_password` | `/auth/login` 返回 200，跳转 `/home`，显示 `demo_student` | 15 个页面初始化 API 均 200 | 通过 |
| 首页 `/home` | 直接访问 | 页面非空，无框架错误，无横向溢出 | 10 个 API 调用，失败 0 | 通过 |
| 对话 `/chat` | 输入“请用两句话解释栈为什么后进先出。”并点击发送 | `POST /chat/send` 返回 200，页面保持可用 | 7 个 API 调用，失败 0 | 通过 |
| 资源 `/resources` | 直接访问，不触发视频/数字人生成 | 页面非空，可读取资源列表 | 7 个 API 调用，失败 0 | 通过 |
| 知识图谱 `/knowledge-graph` | 直接访问 | 页面非空 | 5 个 API 调用，失败 0 | 通过 |
| 练习 `/practice` | 直接访问 | 页面非空 | 5 个 API 调用，失败 0 | 通过 |
| 报告 `/reports` | 直接访问 | 页面非空 | 5 个 API 调用，失败 0 | 通过 |
| 开发验收页 `/dev/agent-flow-test` | 点击“真实 RAG 问答” | `POST /chat/send` 返回 200 | 4 个 API 调用，失败 0 | 通过 |
| 移动首页 `375x812` | 访问 `/home` | 页面非空，无横向溢出 | 10 个 API 调用，失败 0 | 通过 |

浏览器控制台结果：

- `pageErrorCount=0`
- `apiFailureCount=0`
- `consoleIssueCount=4`，均为 Element Plus `el-radio label act as value is deprecated` 警告，未阻塞页面流程。

## 文档安全检查

对本报告执行敏感信息扫描，未发现真实密钥、token、鉴权头或常见密钥格式内容。报告只记录 provider 是否配置，不记录任何真实凭证值。

## 生成资源记录

| resourceId | userId | type | status | auditStatus | modelName | fileUrl |
|---|---|---|---|---|---|---|
| `resource_video_script_a8b65bae8a44` | `user_real_verify_20260624` | `video_script` | `failed` | `unchecked` | `deepseek-v4-pro` | 无 |
| `resource_animation_script_46d345882b1a` | `user_real_verify_20260624` | `animation_script` | `failed` | `unchecked` | `deepseek-v4-pro` | 无 |
| `resource_video_script_95b03f7ae869` | `user_live_smoke_001` | `video_script` | `failed` | `unchecked` | `deepseek-v4-pro` | 无 |
| `resource_animation_script_5dbfe4a64ea5` | `user_live_smoke_001` | `animation_script` | `failed` | `unchecked` | `deepseek-v4-pro` | 无 |
| `resource_mind_map_c43f91a9d818` | `user_live_smoke_001` | `mind_map` | `success` | `passed` | `deepseek-v4-pro` | 无 |
| `resource_lecture_doc_b5d42927fde6` | `user_live_smoke_001` | `lecture_doc` | `success` | `passed` | `deepseek-v4-pro` | 无 |

历史视频文件 `backend/storage/generated_resources/resource_task_30549de1c6ec/lesson.mp4` 仍存在，`ffprobe` 输出包含：

```text
h264|video
aac|audio
```

该历史文件只能说明历史产物可读，不能替代本次新生成视频任务的失败结果。

## 复现命令

```powershell
cd D:\firstmoney\nodelearn-ai
docker compose -f docker\docker-compose.yml up -d postgres
```

```powershell
cd D:\firstmoney\nodelearn-ai\backend
$env:DATABASE_URL="postgresql+psycopg://nodelearn:nodelearn@localhost:5432/nodelearn"
$env:ENABLE_MOCK="false"
.\.venv\Scripts\python.exe -m app.smoke.real_agent_flow
```

```powershell
cd D:\firstmoney\nodelearn-ai\frontend
npm run build
```

## 最终判断

- 真实数据库链路：可用。
- DeepSeek RAG 与普通智能体链路：可用。
- 前端真实后端联调：可用。
- 真实视频生成链路：不可用，当前阻塞在 storyboard 到 `AnimationScriptContent` 的结构校验。
- 数字人真实 provider：本次按用户选择跳过，未验收。

建议下一步修复视频链路的 schema 对齐：约束 `StoryboardSkill` 输出或在 `AnimationSpecSkill` 中为 `array_cells`、`hash_function_panel`、`hash_table_buckets`、`grid`、`complexity_chart`、`code_trace_panel` 等视觉元素补齐必填字段，再重新运行本报告中的真实视频任务。
