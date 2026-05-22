# Note And Floating Menu Module

Source: `docs/interface-contract.md` section 15.

## Types

- `Note`
- `NoteCreateRequest`
- `FloatingMenuState`

## Routes

- `POST /api/v1/notes`
- `GET /api/v1/notes`
- `GET /api/v1/notes/{noteId}`
- `PUT /api/v1/notes/{noteId}`
- `DELETE /api/v1/notes/{noteId}`
- `POST /api/v1/notes/{noteId}/pin`
- `POST /api/v1/notes/{noteId}/relations`
- `GET /api/v1/users/{userId}/notes`
- `GET /api/v1/nodes/{nodeId}/notes`

## Frontend Reserved Functions

- `openFloatingMenu(): void`
- `closeFloatingMenu(): void`
- `toggleFloatingMenu(): void`
- `switchFloatingTab(tab: FloatingMenuState["activeTab"]): void`
- `updateFloatingPosition(x: number, y: number): void`

## Frontend

- API: `frontend/src/api/modules/note.ts`
- Types: `frontend/src/types/note.ts`
- Feature: `frontend/src/features/floating-menu/MODULE.md`
- State variable: `selectedNoteId`

## Backend

- Route file: `backend/app/api/v1/notes.py`
- Schema file: `backend/app/schemas/note.py`
- Service file: `backend/app/services/note_service.py`

## Forbidden

- Do not add `activeTab` values.
- Do not add `relationType` values.
