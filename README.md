# NodeLearn AI

基于 `docs/interface-contract.md` 实现的多智能体个性化学习系统。

当前演示链路支持 DeepSeek `deepseek-v4-pro`、PostgreSQL Hello Algo 来源材料、本地文本 RAG、对话式画像抽取、学习路径规划、资源生成、多模态生成、安全审计和生成资源持久化。向量库、图数据库和 Redis 仍为预留能力。

知识点讲解视频使用真实链路：RAG -> DeepSeek 脚本与分镜 -> 豆包 V3 HTTP Chunked TTS -> Remotion MP4 -> `/api/v1/audit/check` -> `generated_resource`。显式请求 `video_script` 或 `animation_script` 时不会生成假音频或占位 MP4。

视频画面使用通用 `clean_motion_graphics` 解释模板，不再依赖栈、队列等算法专用动画。分镜按问题开场、定义、类比、机制、对比、流程、例子和总结组织，Remotion 渲染关键词、图标、箭头、概念卡片、流程图、网格高亮和总结卡片。整段旁白只用于真实 TTS，不会堆叠到导出画面中。

## 技术栈

- 前端：Vue 3、TypeScript、Vite、Element Plus
- 后端：FastAPI、Python、Pydantic
- 基础设施：PostgreSQL 16、统一 LLM Service；预留 Redis、Chroma/FAISS 和 Neo4j

## 启动前端

```bash
cd frontend
npm install
npm run dev
```

## 启动后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 真实数据库与 DeepSeek

1. 复制 `backend/.env.example` 为 `backend/.env`，填写 `LLM_API_KEY`。
2. 本地后端连接 Docker PostgreSQL 时，保持 `DATABASE_URL=postgresql+psycopg://nodelearn:nodelearn@localhost:5432/nodelearn`。
3. 初始化并导入本地 Hello Algo：

```bash
docker compose -f docker/docker-compose.yml up -d postgres
cd backend
python -m app.importers.hello_algo --init-db --skip-git
uvicorn app.main:app --reload
```

`ENABLE_MOCK=false` 使用真实数据库和 DeepSeek；`ENABLE_MOCK=true` 回到模拟模式。

Docker Compose 中后端容器会自动使用主机名 `postgres` 连接数据库；宿主机直接启动 FastAPI 时继续使用 `localhost`。

## 知识点讲解视频

### 豆包 TTS 配置

在 `backend/.env` 中填写新版控制台 API Key 和音色。后端通过 `X-Api-Key` 调用豆包 V3 HTTP Chunked 接口，并将服务端返回的音频块聚合为真实 MP3：

```env
TTS_PROVIDER=doubao_v3_http_chunked
TTS_BASE_URL=https://openspeech.bytedance.com/api/v3/tts/unidirectional
TTS_API_KEY=
TTS_RESOURCE_ID=seed-tts-2.0
TTS_VOICE_NAME=
TTS_AUDIO_FORMAT=mp3
TTS_SAMPLE_RATE=24000
TTS_TIMEOUT_SECONDS=120
```

缺少 `TTS_API_KEY`、`TTS_VOICE_NAME` 或 `ffprobe` 时，视频资源会明确标记为 `failed`，不会返回假 `fileUrl`。

### Remotion 和媒体依赖

宿主机首次运行需要安装渲染器依赖：

```bash
cd video-renderer
npm install
```

Windows 可使用 `winget install Gyan.FFmpeg` 安装 `ffmpeg` 和 `ffprobe`。安装后确认：

```bash
ffmpeg -version
ffprobe -version
```

Remotion 需要 Chromium 或 Edge。Windows 使用 Edge 时可在 `backend/.env` 设置：

```env
VIDEO_RENDER_PROVIDER=remotion
VIDEO_RENDER_PROJECT_PATH=../video-renderer
VIDEO_RENDER_BROWSER_EXECUTABLE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
VIDEO_RENDER_TIMEOUT_SECONDS=600
FFMPEG_BINARY=ffmpeg
FFPROBE_BINARY=ffprobe
```

Docker 后端镜像会安装 Node.js、Remotion 依赖、Chromium、`ffmpeg` 和 `ffprobe`，并将宿主机 `storage/` 挂载到容器 `/app/storage`。

### 生成和存储

前端资源页会复用 `POST /api/v1/resources/generate`，请求：

```json
{
  "userId": "user_demo_001",
  "courseId": "course_ds_001",
  "nodeId": "node_stack_001",
  "resourceTypes": ["video_script", "animation_script"]
}
```

该接口同步等待脚本、分镜、逐场景 TTS、MP4 渲染和审计完成。音频和 MP4 保存在 `FILE_STORAGE_PATH/generated_resources/{taskId}/`，由 FastAPI `/storage` 静态路径公开。默认从 `backend/` 启动时对应 `backend/storage/generated_resources/{taskId}/`；Docker 会映射到仓库根目录 `storage/generated_resources/{taskId}/`。两份 `GeneratedResource` 的 `content` 都保存结构化 JSON 字符串，审核通过后共享最终 MP4 `fileUrl`。

历史 `stack_animation` 和 `text_slide` 视频 JSON 不再兼容，需要重新生成。

显式执行真实 DeepSeek 烟测：

```bash
cd backend
python -m app.smoke.real_agent_flow
```

该命令会产生少量 DeepSeek API 费用，并验证模型列表、Hello Algo 导入数量、画像抽取、RAG 问答、逐智能体调用、自然语言完整工作流和 PostgreSQL 持久化。普通测试强制使用 mock，不会产生 API 费用：

```bash
python -m pytest backend/app/tests -q
cd frontend
npm run build
cd ../video-renderer
npx tsc --noEmit
```

显式执行付费真实视频测试前，先启动 `ENABLE_MOCK=false` 的后端，再在另一个终端运行：

```bash
set RUN_REAL_VIDEO_TESTS=true
python -m pytest backend/app/tests/services/test_real_video_generation.py -q
```

PowerShell 使用 `$env:RUN_REAL_VIDEO_TESTS="true"`。该测试会真实调用 DeepSeek、豆包 TTS 和 Remotion，并用 `ffprobe` 校验 MP4 同时包含音频流和视频流。

开发环境前端可访问 `/dev/agent-flow-test`，通过自然语言输入触发真实 RAG 问答和 `resource_generate` 完整工作流。

## 契约规则

开发前先阅读 `docs/context-index.md`。涉及模块开发时，还必须阅读对应的 `docs/modules/*.md`。不得新增契约未定义的路由、枚举值、变量或字段。如果契约缺少必要定义，输出：

```text
CONTRACT_MISSING: 缺少 xxx 定义
```
