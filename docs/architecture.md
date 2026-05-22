# Architecture

NodeLearn AI is split into a Vue frontend, a FastAPI backend, and reserved infrastructure adapters.

## Frontend

- Vue 3 + TypeScript + Vite + Element Plus.
- Pages live in `frontend/src/pages`.
- API calls live only in `frontend/src/api/client.ts` and `frontend/src/api/modules/*`.
- Contract types live in `frontend/src/types`.
- Feature context notes live in `frontend/src/features/*/MODULE.md`.

## Backend

- FastAPI entrypoint: `backend/app/main.py`.
- Contract response helper: `backend/app/core/response.py`.
- Routes: `backend/app/api/v1/*`.
- Schemas: `backend/app/schemas/*`.
- Services: `backend/app/services/*`.
- Agent stubs: `backend/app/agents/*`.

## Reserved Adapters

- Database: PostgreSQL/MySQL placeholders in `backend/app/db`.
- Cache: Redis configuration in `backend/.env.example`.
- Vector store: Chroma/FAISS placeholders in config.
- Graph DB: Neo4j placeholders in config.
- LLM: unified `backend/app/services/llm_service.py`.

No real external API key call is implemented in this scaffold.
