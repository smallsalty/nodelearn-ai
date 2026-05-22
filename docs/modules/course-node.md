# Course Node Module

Source: `docs/interface-contract.md` section 6.

## Types

- `Course`
- `CourseCreateRequest`
- `CourseUpdateRequest`
- `Chapter`
- `ChapterCreateRequest`
- `KnowledgeNode`
- `KnowledgeNodeCreateRequest`
- `KnowledgeRelation`

## Routes

- `GET /api/v1/courses`
- `POST /api/v1/courses`
- `GET /api/v1/courses/{courseId}`
- `PUT /api/v1/courses/{courseId}`
- `DELETE /api/v1/courses/{courseId}`
- `GET /api/v1/courses/{courseId}/chapters`
- `POST /api/v1/courses/{courseId}/chapters`
- `GET /api/v1/courses/{courseId}/nodes`
- `POST /api/v1/courses/{courseId}/nodes`
- `GET /api/v1/nodes/{nodeId}`
- `PUT /api/v1/nodes/{nodeId}`
- `DELETE /api/v1/nodes/{nodeId}`
- `GET /api/v1/courses/{courseId}/relations`
- `POST /api/v1/courses/{courseId}/relations`

## Frontend

- Pages: `HomePage.vue`, `KnowledgeBaseAdminPage.vue`
- API: `frontend/src/api/modules/course.ts`
- Types: `frontend/src/types/course.ts`
- State variables: `currentCourse`, `currentNode`

## Backend

- Route file: `backend/app/api/v1/course.py`
- Schema file: `backend/app/schemas/course.py`
- Service file: `backend/app/services/course_service.py`

## Forbidden

- Do not add `CourseStatus`, `NodeType`, `DifficultyLevel`, `MasteryStatus`, or relation type values.
- Do not rename `orderIndex`, `learningValue`, or node id array fields.
