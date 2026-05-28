# NodeLearn AI

基于 `docs/interface-contract.md` 生成的多智能体个性化学习系统骨架。

当前仓库处于架构和接口契约骨架阶段，重点是稳定目录结构、接口名称、类型、schema、mock 路由占位、Docker 占位和后续模块开发所需的上下文文档。

## 技术栈

- 前端：Vue 3、TypeScript、Vite、Element Plus
- 后端：FastAPI、Python、Pydantic
- 预留基础设施：PostgreSQL/MySQL、Redis、Chroma/FAISS、Neo4j、统一 LLM Service

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

## 契约规则

开发前先阅读 `docs/context-index.md`。涉及模块开发时，还必须阅读对应的 `docs/modules/*.md`。不得新增契约未定义的路由、枚举值、变量或字段。如果契约缺少必要定义，输出：

```text
CONTRACT_MISSING: 缺少 xxx 定义
```
