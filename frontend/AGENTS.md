# Frontend AGENTS.md

## Required Reading

- Read `../docs/context-index.md` before coding.
- Read the matching `../docs/modules/*.md` for the current module.
- Confirm exact field names and enum values in `../docs/interface-contract.md`.

## Rules

- Frontend names use camelCase.
- Components and pages must not call `fetch` or `axios` directly.
- All requests must go through `src/api/client.ts` and `src/api/modules/*`.
- Module API files only wrap endpoints and return typed calls.
- Do not add undefined routes, fields, variables, or enum values.
- Missing definitions must be reported as `CONTRACT_MISSING: 缺少 xxx 定义`.
