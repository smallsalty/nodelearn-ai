# Profile Module

Source: `docs/interface-contract.md` section 5.

## Types

- `StudentProfile`
- `ProfileExtractRequest`
- `ProfileExtractResult`
- `ProfileUpdateByBehaviorRequest`
- `ProfileUpdateByPracticeRequest`

## Routes

- `GET /api/v1/profiles/{userId}`
- `PUT /api/v1/profiles/{userId}`
- `POST /api/v1/profiles/extract`
- `POST /api/v1/profiles/update-by-behavior`
- `POST /api/v1/profiles/update-by-practice`

## Frontend

- Page: `frontend/src/pages/ProfilePage.vue`
- API: `frontend/src/api/modules/profile.ts`
- Types: `frontend/src/types/profile.ts`
- State variable: `currentProfile`

## Backend

- Route file: `backend/app/api/v1/profile.py`
- Schema file: `backend/app/schemas/profile.py`
- Service file: `backend/app/services/profile_service.py`
- Agent file: `backend/app/agents/profile_agent.py`

## Forbidden

- Do not add `lastUpdatedBy` values beyond `"dialogue" | "behavior" | "practice" | "manual"`.
- Do not add profile fields outside the contract.
