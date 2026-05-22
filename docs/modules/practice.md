# Practice Module

Source: `docs/interface-contract.md` section 14.

## Types

- `PracticeQuestion`
- `PracticeGenerateRequest`
- `PracticeSubmitRequest`
- `PracticeRecord`

## Routes

- `POST /api/v1/practices/generate`
- `GET /api/v1/practices/questions`
- `GET /api/v1/practices/questions/{questionId}`
- `POST /api/v1/practices/submit`
- `GET /api/v1/users/{userId}/practice-records`
- `GET /api/v1/users/{userId}/wrong-questions`
- `DELETE /api/v1/users/{userId}/wrong-questions/{questionId}`

## Frontend

- Page: `frontend/src/pages/PracticePage.vue`
- API: `frontend/src/api/modules/practice.ts`
- Types: `frontend/src/types/practice.ts`
- State variable: `selectedQuestionId`

## Backend

- Route file: `backend/app/api/v1/practice.py`
- Schema file: `backend/app/schemas/practice.py`
- Service file: `backend/app/services/practice_service.py`
- Agent file: `backend/app/agents/practice_agent.py`

## Forbidden

- Do not add `QuestionType` or `DifficultyLevel` values.
- Do not rename answer fields: `userAnswer`, `correctAnswer`, `isCorrect`.
