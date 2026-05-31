# NodeLearn AI

基于 `docs/interface-contract.md` 实现的多智能体个性化学习系统。

当前演示链路支持 DeepSeek `deepseek-v4-pro`、PostgreSQL Hello Algo 来源材料、本地文本 RAG、对话式画像抽取、学习路径规划、资源生成、多模态生成、安全审计和生成资源持久化。向量库、图数据库和 Redis 仍为预留能力。

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
```

开发环境前端可访问 `/dev/agent-flow-test`，通过自然语言输入触发真实 RAG 问答和 `resource_generate` 完整工作流。

## 契约规则

开发前先阅读 `docs/context-index.md`。涉及模块开发时，还必须阅读对应的 `docs/modules/*.md`。不得新增契约未定义的路由、枚举值、变量或字段。如果契约缺少必要定义，输出：

```text
CONTRACT_MISSING: 缺少 xxx 定义
```
