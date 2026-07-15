# 课程节点模块

来源：`docs/interface-contract.md` 第 6 节。

## 类型

- `Course`
- `CourseCreateRequest`
- `CourseUpdateRequest`
- `Chapter`
- `ChapterCreateRequest`
- `KnowledgeNode`
- `KnowledgeNodeCreateRequest`
- `KnowledgeRelation`

## 路由

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

## 前端

- 页面：`HomePage.vue`、`KnowledgeBaseAdminPage.vue`
- API：`frontend/src/api/modules/course.ts`
- 类型：`frontend/src/types/course.ts`
- 状态变量：`currentCourse`、`currentNode`
- `KnowledgeNode.content` 是必填 Markdown 正文，`description` 仅作为摘要；节点创建、导入和迁移不得产生空正文。

## 后端

- 路由文件：`backend/app/api/v1/course.py`
- 结构定义文件：`backend/app/schemas/course.py`
- 服务文件：`backend/app/services/course_service.py`

## 约束事项

- 如需求需要新增 `CourseStatus`、`NodeType`、`DifficultyLevel`、`MasteryStatus` 或关系类型值，必须先同步 `docs/interface-contract.md`，再更新 schema、类型、服务、页面和测试。
- 不重命名 `orderIndex`、`learningValue` 或节点 id 数组字段。
- Hello Algo 节点正文与同节点 `reading_material` 共享带来源、Commit、License 和 Path 的完整 Markdown。
