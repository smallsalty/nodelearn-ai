# Context Index

Every Codex task starts here. Read only the files needed for the target module after this index.

## Always Read

- `docs/interface-contract.md`: highest-priority contract source.
- `AGENTS.md`: repository-wide rules.
- `docs/api-rules.md`: request and response rules.
- `docs/development-guide.md`: development workflow and file ownership guide.

## By Task

| Task | Read |
|---|---|
| Frontend API wrapper | `frontend/src/api/AGENTS.md`, `docs/api-rules.md`, matching `docs/modules/*.md` |
| Backend route | `backend/AGENTS.md`, `docs/api-rules.md`, matching `docs/modules/*.md` |
| Schema or type work | `docs/interface-contract.md`, `docs/database-schema.md`, matching module doc |
| Module implementation | `docs/development-guide.md`, matching `docs/modules/*.md` |
| Profile | `docs/modules/profile.md` |
| Course, chapter, node | `docs/modules/course-node.md` |
| Knowledge graph | `docs/modules/knowledge-graph.md` |
| Agents or chat | `docs/modules/agents.md` |
| Resources, RAG, recommendations | `docs/modules/resource-generation.md` |
| Learning path | `docs/modules/learning-path.md` |
| Practice and wrong questions | `docs/modules/practice.md` |
| Notes and floating menu | `docs/modules/note-floating.md` |
| Reports, records, evaluation | `docs/modules/report.md` |

## Missing Contract Rule

If the module needs a path, field, enum value, page, or state variable that does not appear in `docs/interface-contract.md`, stop and output:

```text
CONTRACT_MISSING: 缺少 xxx 定义
```
