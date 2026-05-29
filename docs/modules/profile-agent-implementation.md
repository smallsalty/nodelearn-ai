# Profile Agent Implementation Notes

Source of truth: `docs/interface-contract.md` section 5. This document explains the current profile-agent implementation and follow-up integration points. It does not define new contracts.

## 1. Current Capability

The profile module supports a first-stage conversational student profile flow:

- Read an existing student profile with `GET /api/v1/profiles/{userId}`.
- Extract profile fields from a natural-language message with `POST /api/v1/profiles/extract`.
- Save a confirmed profile patch with `PUT /api/v1/profiles/{userId}`.
- Update profile state from learning behavior with `POST /api/v1/profiles/update-by-behavior`.
- Update profile state from practice results with `POST /api/v1/profiles/update-by-practice`.

The implementation is currently contract-first and mock-friendly. It uses a lightweight rule extractor to simulate the profile agent. DeepSeek is only reserved behind `LLMService`; no real model call is made yet.

## 2. Profile Shape

Frontend and HTTP JSON use camelCase. Backend Python code uses snake_case and returns camelCase through schema aliases.

The current profile dimensions are exactly the fields in `StudentProfile`:

| Dimension | Field |
|---|---|
| Profile identity | `id` |
| User relation | `userId` |
| Major | `major` |
| Grade | `grade` |
| Current course | `currentCourseId` |
| Learning goal | `learningGoal` |
| Foundation level | `knowledgeBaseLevel` |
| Learning progress | `learningProgress` |
| Weak knowledge nodes | `weakNodeIds` |
| Cognitive style | `cognitiveStyle` |
| Practice preference | `practicePreference` |
| Resource preference | `resourcePreference` |
| Common mistakes | `commonMistakes` |
| Available study time | `availableStudyTime` |
| Profile summary | `profileSummary` |
| Confidence score | `confidenceScore` |
| Update source | `lastUpdatedBy` |
| Created time | `createdAt` |
| Updated time | `updatedAt` |

Allowed enum values must come from the contract:

- `knowledgeBaseLevel`: `easy`, `medium`, `hard`, `challenge`
- `cognitiveStyle`: `text`, `diagram`, `example`, `code`, `mixed`
- `practicePreference`: `choice`, `coding`, `case`, `mixed`
- `lastUpdatedBy`: `dialogue`, `behavior`, `practice`, `manual`
- `resourcePreference`: contract `ResourceType` values only

Do not add fields such as learning motivation, emotion, attention level, device preference, or learning rhythm unless `docs/interface-contract.md` is updated first.

## 3. Runtime Flow

Conversational extraction flow:

1. Frontend sends `ProfileExtractRequest` to `POST /api/v1/profiles/extract`.
2. `backend/app/api/v1/profile.py` passes the request to `ProfileService`.
3. `ProfileService` calls `ProfileAgent.extract_fields`.
4. `ProfileAgent` builds a DeepSeek-ready prompt boundary, then currently falls back to rule-based extraction.
5. Extracted fields are filtered against `StudentProfile` and contract enum values.
6. `ProfileService` merges the extracted fields with the current profile, calculates `missingFields`, `confidenceScore`, and `followUpQuestions`.
7. The frontend may show the extracted draft and ask the user to confirm.
8. Confirmed data is saved through `PUT /api/v1/profiles/{userId}`.

The current rule extractor recognizes common demo expressions such as:

- `数据结构` -> `currentCourseId: "course_ds_001"`
- `准备数据结构期末考试` -> `learningGoal`
- `数组已学完，链表学习中` -> `learningProgress`
- `链表` / `递归` with weak-language cues -> `weakNodeIds`
- `图解` / `代码案例` -> `cognitiveStyle` and `resourcePreference`
- `链表指针断链` / `递归终止条件错误` -> `commonMistakes`
- `每天晚上30分钟` -> `availableStudyTime`

This is an early mock implementation, not final semantic understanding.

## 4. File Responsibilities

Backend:

- `backend/app/api/v1/profile.py`: route binding and `ApiResponse<T>` wrapping only.
- `backend/app/schemas/profile.py`: contract schemas; keep fields aligned with `StudentProfile`.
- `backend/app/services/profile_service.py`: profile merge, mock persistence, missing-field calculation, follow-up question planning, behavior/practice updates.
- `backend/app/agents/profile_agent.py`: profile extraction, prompt boundary, field whitelist, enum validation.
- `backend/app/services/llm_service.py`: reserved unified LLM provider boundary for DeepSeek and future providers.

Frontend:

- `frontend/src/types/profile.ts`: TypeScript contract types.
- `frontend/src/api/modules/profile.ts`: endpoint wrappers only.
- `frontend/src/pages/ProfilePage.vue`: demo profile conversation UI; must call `profileApi`, never direct `fetch` or `axios`.

Tests:

- `backend/app/tests/contract/test_response_schema.py`: response envelope and profile contract-shape checks.
- `backend/app/tests/contract/test_enum_values.py`: enum value checks.

## 5. Storage Plan

Current storage is in-memory mock data inside `ProfileService`. When connecting a real database, keep the contract table split:

- `user_profile`: stable profile fields such as `major`, `grade`, `current_course_id`, `learning_goal`, `knowledge_base_level`, `learning_progress`, `profile_summary`, `confidence_score`.
- `user_preference`: preference fields such as `cognitive_style`, `practice_preference`, `resource_preference`, `available_study_time`.
- `user_learning_state`: dynamic fields such as `weak_node_ids`, `common_mistakes`, `last_updated_by`.

Recommended database integration path:

1. Add repository/model layer using only contract table and field names.
2. Keep route signatures unchanged.
3. Replace `ProfileService._profiles` with repository calls.
4. Preserve snake_case internally and camelCase API output through existing Pydantic aliases.
5. Store array-like fields consistently according to the chosen database strategy, for example JSON columns for `weak_node_ids`, `resource_preference`, and `common_mistakes`.
6. Continue returning `StudentProfile` through `success_response`.

Do not let route handlers directly query the database.

## 6. DeepSeek Integration Plan

DeepSeek should be connected only through `backend/app/services/llm_service.py`.

Environment variables:

```env
LLM_PROVIDER=deepseek
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL_NAME=
```

Integration rules:

- Do not call DeepSeek directly from routes, frontend pages, or agents outside `LLMService`.
- The model prompt must ask for JSON with only `StudentProfile` fields.
- Always run model output through `ProfileAgent.filter_contract_fields`.
- Drop unknown fields and invalid enum values.
- If the model cannot infer a field confidently, leave it absent and let `missingFields` drive follow-up questions.
- Keep external-call logging aligned with the existing `model_call_log` contract when real calls are introduced.

## 7. Course Matching Plan

The current mock extractor maps `数据结构` to `course_ds_001`. This is acceptable for first-stage demo testing.

Future course matching should:

- Query existing course data through the course service or repository.
- Match user text to known course names/codes.
- Set `currentCourseId` only when there is a confident match.
- Leave `currentCourseId` empty and ask a follow-up question when no course matches.
- Never invent a course id that is not present in the course data.

## 8. Testing Checklist

Manual API checks:

- `GET /api/v1/profiles/user_demo_001` returns a complete demo `StudentProfile`.
- `POST /api/v1/profiles/extract` returns `extractedFields`, `missingFields`, `confidenceScore`, and `followUpQuestions`.
- `POST /api/v1/profiles/update-by-behavior` sets `lastUpdatedBy` to `behavior`.
- `POST /api/v1/profiles/update-by-practice` sets `lastUpdatedBy` to `practice` and can update `weakNodeIds` / `commonMistakes`.

Recommended edge cases:

- Different wording for the same profile facts.
- Sparse input that should produce follow-up questions.
- Invalid preferences or enum-like text that must not leak into the response.
- Different `userId` values to ensure profiles do not overwrite each other.
- Repeated practice failures to ensure weak nodes and common mistakes deduplicate.

Run contract tests after profile changes:

```bash
python -m pytest backend/app/tests/contract -q
```

Run frontend build after page changes:

```bash
cd frontend
npm run build
```

## 9. Known Limitations

- The current extractor is rule-based and demo-oriented.
- DeepSeek is not called yet.
- Mock storage is process-local and resets when the backend restarts.
- Course matching is currently limited to the demo course id `course_ds_001`.
- The frontend `/profile` page may need server history-fallback configuration when served by nginx or Docker.
