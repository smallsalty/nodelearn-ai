# NodeLearn AI

Multi-Agent Personalized Learning System scaffold generated from `docs/interface-contract.md`.

This repository is currently an architecture and contract skeleton. The focus is stable folders, API names, types, schemas, mock route stubs, Docker placeholders, and context documents for later module work.

## Stack

- Frontend: Vue 3, TypeScript, Vite, Element Plus
- Backend: FastAPI, Python, Pydantic
- Reserved infrastructure: PostgreSQL/MySQL, Redis, Chroma/FAISS, Neo4j, unified LLM service

## Start Frontend

```bash
cd frontend
npm install
npm run dev
```

## Start Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Contract Rules

Read `docs/context-index.md` before development. For module work, also read the matching `docs/modules/*.md` file. Do not add undefined routes, enum values, variables, or fields. If a required definition is absent from the contract, output:

```text
CONTRACT_MISSING: 缺少 xxx 定义
```
