# Codex Workflow

1. Read `docs/context-index.md`.
2. Read the matching `docs/modules/*.md`.
3. Check exact paths, fields, enum values, request bodies, and response data in `docs/interface-contract.md`.
4. Update frontend types before API wrappers.
5. Update backend schemas before route logic.
6. Keep route handlers thin; put business logic in services.
7. Use mock data only with contract fields and contract enum values.
8. Run contract tests after route or type changes.

If a needed definition is absent:

```text
CONTRACT_MISSING: 缺少 xxx 定义
```
