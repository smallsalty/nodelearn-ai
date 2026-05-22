# Backend AGENTS.md

## Required Reading

- Read `../docs/context-index.md` before coding.
- Read the matching `../docs/modules/*.md` for the current module.
- Check exact paths, fields, enum values, and database fields in `../docs/interface-contract.md`.

## Rules

- All interfaces must return the unified `ApiResponse<T>` envelope.
- All request and response schemas must come from `app/schemas`.
- `app/api/v1` is only responsible for route binding and request/response orchestration.
- `app/services` contains business logic and integration boundaries.
- Backend Python variables and database fields use snake_case.
- Do not add undefined routes, fields, or enum values.
- Missing definitions must be reported as `CONTRACT_MISSING: 缺少 xxx 定义`.
