# API Rules

Source: `docs/interface-contract.md` sections 2, 22, 26, 29.

## Base Path

All backend HTTP routes use:

```text
/api/v1
```

## Response Envelope

All normal HTTP responses must return:

```ts
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  traceId: string;
  timestamp: string;
}
```

## Naming

- Frontend TypeScript and Vue use camelCase.
- Backend Python and database fields use snake_case.
- Backend schemas may expose contract aliases for JSON fields.

## Frontend Calls

- Components and pages must not call `fetch` or `axios` directly.
- All HTTP calls go through `frontend/src/api/client.ts`.
- `frontend/src/api/modules/*` contains only endpoint wrapper functions.

## No Invention

- Do not add endpoint paths not listed in `docs/interface-contract.md`.
- Do not add enum values.
- Do not add request or response fields.
- If something is missing, output `CONTRACT_MISSING: 缺少 xxx 定义`.
