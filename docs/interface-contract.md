# NodeLearn AI 项目接口说明

> 文件用途：本文件用于约束 NodeLearn AI 多智能体个性化学习系统的前后端接口、核心变量、枚举值、数据表字段和 Codex 开发规则。
> 使用范围：前端页面、后端接口、数据库建表、智能体模块、RAG 知识库、知识图谱、学习报告、笔记浮窗、测试用例。  
> 重要原则：接口先行。所有代码实现必须先对齐本文件，再进行编码。

---

## 0. 如何使用本 Markdown 文件

### 0.1 文件放置位置

建议将本文件放在项目根目录：

```text
NodeLearn-AI/
├─ docs/
│  └─ interface-contract.md
├─ backend/
├─ frontend/
├─ docker-compose.yml
└─ README.md
```

将本文件重命名为：

```text
docs/interface-contract.md
```

---

### 0.2 给 Codex 使用的方法

每次让 Codex 写代码前，先在提示词里加入：

```text
请先阅读 docs/interface-contract.md。
你必须先让接口路径、字段名、枚举值、请求结构、返回结构、数据库表名和变量名与该文件对齐。
如果功能需要新增接口、字段、枚举值、环境变量、数据库表或类型，允许直接新增，但必须先同步更新 docs/interface-contract.md，再修改后端、前端、测试和开发日志。
```

---

### 0.3 推荐开发顺序

```text
第 1 步：创建 docs/interface-contract.md
第 2 步：根据本文件建立后端结构定义 / DTO
第 3 步：根据本文件建立数据库表结构
第 4 步：根据本文件建立后端 API 路由空实现
第 5 步：根据本文件建立前端 types.ts
第 6 步：根据本文件建立前端 api client
第 7 步：页面只调用 api client，不直接写 fetch 或 axios
第 8 步：逐个补充真实业务逻辑
第 9 步：增加契约测试，防止接口偏移
```

---

### 0.4 本文件的强制约束

```text
1. 前端字段统一使用 camelCase。
2. 后端 Python 变量和数据库字段统一使用 snake_case。
3. HTTP API 路径统一使用 /api/v1 前缀。
4. 所有 HTTP 返回必须使用 ApiResponse<T>。
5. 前端组件不得直接请求后端，只能调用统一 API Client。
6. 未实现功能可以返回模拟数据，但接口路径和字段必须保持一致。
7. 功能需要新增枚举值、字段名、接口路径、环境变量或数据库表时，必须先同步登记到本文件。
8. 智能体输出资源前必须经过 safety_agent 或 audit 接口。
9. 所有生成内容必须能追踪 userId、courseId、nodeId、agentType。
10. 所有核心数据必须保留 createdAt / updatedAt。
```

---

# 1. 项目模块划分

系统接口按照以下模块分类：

```text
1. auth              用户登录与认证
2. users             用户信息
3. profiles          学生画像
4. courses           课程管理
5. chapters          章节管理
6. nodes             知识节点
7. graph             知识图谱
8. knowledge-base    知识库构建与检索
9. chat              对话学习与实时问答
10. agents           多智能体编排
11. resources        个性化资源生成
12. multimodal       稳定视频、数字人讲解与数字人对话
13. recommendations  个性化资源推送
14. learning-paths   学习路径规划
15. practices        练习题与测评
16. notes            笔记与错题整理
17. reports          学习报告
18. records          学习行为记录
19. audit            安全校验与防幻觉
20. files            文件上传与存储
21. system           系统健康检查
```

---

# 2. 全局接口规范

## 2.1 API 基础路径

```text
/api/v1
```

示例：

```text
GET /api/v1/courses
POST /api/v1/chat/send
POST /api/v1/resources/generate
```

---

## 2.2 全局返回结构 ApiResponse

所有接口统一返回：

```ts
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  traceId: string;
  timestamp: string;
}
```

成功示例：

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "traceId": "trace_20260519_001",
  "timestamp": "2026-05-19T10:00:00Z"
}
```

失败示例：

```json
{
  "code": 400,
  "message": "invalid request",
  "data": null,
  "traceId": "trace_20260519_002",
  "timestamp": "2026-05-19T10:00:00Z"
}
```

---

## 2.3 分页请求 PageRequest

```ts
interface PageRequest {
  page: number;
  pageSize: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
```

---

## 2.4 分页返回 PageResult

```ts
interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

---

## 2.5 全局基础字段 BaseEntity

```ts
interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  version?: number;
}
```

数据库字段：

```sql
id
created_at
updated_at
deleted_at
version
```

---

# 3. 全局枚举

## 3.1 UserRole

```ts
type UserRole = "student" | "teacher" | "admin";
```

## 3.2 UserStatus

```ts
type UserStatus = "active" | "disabled" | "pending";
```

## 3.3 CourseStatus

```ts
type CourseStatus = "draft" | "published" | "archived";
```

## 3.4 NodeType

```ts
type NodeType =
  | "concept"
  | "algorithm"
  | "syntax"
  | "question_type"
  | "experiment"
  | "project"
  | "summary";
```

## 3.5 DifficultyLevel

```ts
type DifficultyLevel = "easy" | "medium" | "hard" | "challenge";
```

## 3.6 MasteryStatus

```ts
type MasteryStatus =
  | "not_started"
  | "learning"
  | "weak"
  | "basic"
  | "mastered";
```

## 3.7 ResourceType

```ts
type ResourceType =
  | "lecture_doc"
  | "mind_map"
  | "practice_question"
  | "reading_material"
  | "code_case"
  | "video_script"
  | "animation_script"
  | "knowledge_video"
  | "digital_human_video"
  | "digital_human_dialogue"
  | "audio_explanation"
  | "subtitle"
  | "storyboard"
  | "project_task"
  | "summary_note";
```

## 3.8 AgentType

```ts
type AgentType =
  | "profile_agent"
  | "planner_agent"
  | "qa_agent"
  | "resource_agent"
  | "practice_agent"
  | "multimodal_agent"
  | "digital_human_agent"
  | "video_generation_agent"
  | "script_agent"
  | "storyboard_agent"
  | "narration_agent"
  | "recommendation_agent"
  | "safety_agent"
  | "knowledge_graph_agent"
  | "note_agent"
  | "report_agent";
```

## 3.9 TaskStatus

```ts
type TaskStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled";
```

## 3.10 QuestionType

```ts
type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "blank"
  | "short_answer"
  | "coding"
  | "case_analysis";
```

## 3.11 CognitiveStyle

```ts
type CognitiveStyle = "text" | "diagram" | "example" | "code" | "mixed";
```

## 3.12 PracticePreference

```ts
type PracticePreference = "choice" | "coding" | "case" | "mixed";
```

## 3.13 AuditStatus

```ts
type AuditStatus = "unchecked" | "passed" | "rejected" | "need_review";
```

## 3.14 BehaviorType

```ts
type BehaviorType =
  | "view_resource"
  | "finish_resource"
  | "answer_question"
  | "ask_question"
  | "create_note"
  | "review_wrong_question";
```

---

# 4. 认证与用户接口

## 4.1 User

```ts
interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
user
```

数据库字段：

```sql
id
username
email
phone
password_hash
role
status
avatar_url
last_login_at
created_at
updated_at
deleted_at
```

---

## 4.2 RegisterRequest

```ts
interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  role: UserRole;
}
```

## 4.3 LoginRequest

```ts
interface LoginRequest {
  username: string;
  password: string;
}
```

## 4.4 AuthToken

```ts
interface AuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}
```

## 4.5 UserUpdateRequest

```ts
interface UserUpdateRequest {
  username?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}
```

## 4.6 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | 用户注册 | `RegisterRequest` | `ApiResponse<User>` |
| POST | `/api/v1/auth/login` | 用户登录 | `LoginRequest` | `ApiResponse<AuthToken>` |
| POST | `/api/v1/auth/logout` | 用户退出 | 无 | `ApiResponse<boolean>` |
| POST | `/api/v1/auth/refresh-token` | 刷新 token | `{ refreshToken: string }` | `ApiResponse<AuthToken>` |
| GET | `/api/v1/users/me` | 获取当前用户 | 无 | `ApiResponse<User>` |
| PUT | `/api/v1/users/me` | 更新当前用户 | `UserUpdateRequest` | `ApiResponse<User>` |

---

# 5. 学生画像接口

## 5.1 StudentProfile

```ts
interface StudentProfile {
  id: string;
  userId: string;
  major?: string;
  grade?: string;
  currentCourseId?: string;
  learningGoal?: string;
  knowledgeBaseLevel?: DifficultyLevel;
  learningProgress?: string;
  weakNodeIds: string[];
  cognitiveStyle: CognitiveStyle;
  practicePreference: PracticePreference;
  resourcePreference: ResourceType[];
  commonMistakes: string[];
  availableStudyTime?: string;
  profileSummary?: string;
  confidenceScore: number;
  lastUpdatedBy: "dialogue" | "behavior" | "practice" | "manual";
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
user_profile
user_preference
user_learning_state
```

核心字段：

```sql
id
user_id
major
grade
current_course_id
learning_goal
knowledge_base_level
learning_progress
weak_node_ids
cognitive_style
practice_preference
resource_preference
common_mistakes
available_study_time
profile_summary
confidence_score
last_updated_by
created_at
updated_at
```

---

## 5.2 ProfileExtractRequest

```ts
interface ProfileExtractRequest {
  userId: string;
  message: string;
  historyMessages?: ChatMessage[];
}
```

## 5.3 ProfileExtractResult

```ts
interface ProfileExtractResult {
  extractedFields: Partial<StudentProfile>;
  missingFields: string[];
  confidenceScore: number;
  followUpQuestions: string[];
}
```

## 5.4 ProfileUpdateByBehaviorRequest

```ts
interface ProfileUpdateByBehaviorRequest {
  userId: string;
  courseId?: string;
  nodeId?: string;
  behaviorType: BehaviorType;
  behaviorData: Record<string, any>;
}
```

## 5.5 ProfileUpdateByPracticeRequest

```ts
interface ProfileUpdateByPracticeRequest {
  userId: string;
  courseId: string;
  questionId: string;
  nodeId?: string;
  isCorrect: boolean;
  mistakeReason?: string;
}
```

## 5.6 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| GET | `/api/v1/profiles/{userId}` | 获取学生画像 | 无 | `ApiResponse<StudentProfile>` |
| PUT | `/api/v1/profiles/{userId}` | 更新学生画像 | `Partial<StudentProfile>` | `ApiResponse<StudentProfile>` |
| POST | `/api/v1/profiles/extract` | 从对话抽取画像 | `ProfileExtractRequest` | `ApiResponse<ProfileExtractResult>` |
| POST | `/api/v1/profiles/update-by-behavior` | 根据行为更新画像 | `ProfileUpdateByBehaviorRequest` | `ApiResponse<StudentProfile>` |
| POST | `/api/v1/profiles/update-by-practice` | 根据练习结果更新画像 | `ProfileUpdateByPracticeRequest` | `ApiResponse<StudentProfile>` |

---

# 6. 课程、章节与知识节点接口

## 6.1 Course

```ts
interface Course {
  id: string;
  name: string;
  code?: string;
  description?: string;
  targetMajor?: string;
  status: CourseStatus;
  coverUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
course
```

字段：

```sql
id
name
code
description
target_major
status
cover_url
created_at
updated_at
deleted_at
```

---

## 6.2 CourseCreateRequest

```ts
interface CourseCreateRequest {
  name: string;
  code?: string;
  description?: string;
  targetMajor?: string;
  coverUrl?: string;
}
```

## 6.3 CourseUpdateRequest

```ts
interface CourseUpdateRequest {
  name?: string;
  code?: string;
  description?: string;
  targetMajor?: string;
  status?: CourseStatus;
  coverUrl?: string;
}
```

---

## 6.4 Chapter

```ts
interface Chapter {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
chapter
```

字段：

```sql
id
course_id
title
order_index
description
created_at
updated_at
deleted_at
```

---

## 6.5 ChapterCreateRequest

```ts
interface ChapterCreateRequest {
  courseId: string;
  title: string;
  orderIndex: number;
  description?: string;
}
```

---

## 6.6 KnowledgeNode

```ts
interface KnowledgeNode {
  id: string;
  courseId: string;
  chapterId?: string;
  name: string;
  nodeType: NodeType;
  description?: string;
  difficulty: DifficultyLevel;
  learningValue: number;
  prerequisiteNodeIds: string[];
  nextNodeIds: string[];
  resourceIds: string[];
  commonMistakes: string[];
  recommendedPracticeIds: string[];
  masteryStatus?: MasteryStatus;
  masteryScore?: number;
  x?: number;
  y?: number;
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
knowledge_node
```

字段：

```sql
id
course_id
chapter_id
name
node_type
description
difficulty
learning_value
prerequisite_node_ids
next_node_ids
resource_ids
common_mistakes
recommended_practice_ids
x
y
created_at
updated_at
deleted_at
```

---

## 6.7 KnowledgeNodeCreateRequest

```ts
interface KnowledgeNodeCreateRequest {
  courseId: string;
  chapterId?: string;
  name: string;
  nodeType: NodeType;
  description?: string;
  difficulty: DifficultyLevel;
  learningValue: number;
  prerequisiteNodeIds?: string[];
  nextNodeIds?: string[];
  commonMistakes?: string[];
  recommendedPracticeIds?: string[];
}
```

---

## 6.8 KnowledgeRelation

```ts
interface KnowledgeRelation {
  id: string;
  courseId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: "prerequisite" | "related" | "advanced" | "contains";
  weight: number;
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
knowledge_relation
```

字段：

```sql
id
course_id
source_node_id
target_node_id
relation_type
weight
created_at
updated_at
deleted_at
```

---

## 6.9 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| GET | `/api/v1/courses` | 获取课程列表 | `PageRequest` | `ApiResponse<PageResult<Course>>` |
| POST | `/api/v1/courses` | 创建课程 | `CourseCreateRequest` | `ApiResponse<Course>` |
| GET | `/api/v1/courses/{courseId}` | 获取课程详情 | 无 | `ApiResponse<Course>` |
| PUT | `/api/v1/courses/{courseId}` | 更新课程 | `CourseUpdateRequest` | `ApiResponse<Course>` |
| DELETE | `/api/v1/courses/{courseId}` | 删除课程 | 无 | `ApiResponse<boolean>` |
| GET | `/api/v1/courses/{courseId}/chapters` | 获取章节列表 | 无 | `ApiResponse<Chapter[]>` |
| POST | `/api/v1/courses/{courseId}/chapters` | 创建章节 | `ChapterCreateRequest` | `ApiResponse<Chapter>` |
| GET | `/api/v1/courses/{courseId}/nodes` | 获取知识节点列表 | 无 | `ApiResponse<KnowledgeNode[]>` |
| POST | `/api/v1/courses/{courseId}/nodes` | 创建知识节点 | `KnowledgeNodeCreateRequest` | `ApiResponse<KnowledgeNode>` |
| GET | `/api/v1/nodes/{nodeId}` | 获取知识节点详情 | 无 | `ApiResponse<KnowledgeNode>` |
| PUT | `/api/v1/nodes/{nodeId}` | 更新知识节点 | `Partial<KnowledgeNode>` | `ApiResponse<KnowledgeNode>` |
| DELETE | `/api/v1/nodes/{nodeId}` | 删除知识节点 | 无 | `ApiResponse<boolean>` |
| GET | `/api/v1/courses/{courseId}/relations` | 获取知识关系 | 无 | `ApiResponse<KnowledgeRelation[]>` |
| POST | `/api/v1/courses/{courseId}/relations` | 创建知识关系 | `KnowledgeRelation` | `ApiResponse<KnowledgeRelation>` |

---

# 7. 知识图谱接口

## 7.1 GraphNode

```ts
interface GraphNode {
  id: string;
  label: string;
  nodeType: NodeType;
  difficulty: DifficultyLevel;
  masteryStatus: MasteryStatus;
  masteryScore: number;
  x?: number;
  y?: number;
  size?: number;
  selected?: boolean;
  disabled?: boolean;
}
```

## 7.2 GraphEdge

```ts
interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationType: string;
  weight: number;
  label?: string;
}
```

## 7.3 KnowledgeGraph

```ts
interface KnowledgeGraph {
  courseId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
```

## 7.4 GraphViewState

```ts
interface GraphViewState {
  selectedNodeId?: string;
  zoom: number;
  centerX: number;
  centerY: number;
  showWeakOnly: boolean;
  showCompletedOnly: boolean;
}
```

## 7.5 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| GET | `/api/v1/courses/{courseId}/graph` | 获取课程知识图谱 | 无 | `ApiResponse<KnowledgeGraph>` |
| GET | `/api/v1/users/{userId}/courses/{courseId}/graph` | 获取带掌握度的个人图谱 | 无 | `ApiResponse<KnowledgeGraph>` |
| PUT | `/api/v1/users/{userId}/nodes/{nodeId}/mastery` | 更新节点掌握度 | `{ masteryScore: number; masteryStatus: MasteryStatus }` | `ApiResponse<GraphNode>` |

## 7.6 前端保留函数

```ts
function selectNode(nodeId: string): void;
function zoomIn(): void;
function zoomOut(): void;
function resetGraphView(): void;
function jumpToNode(nodeId: string): void;
function openNodeDetail(nodeId: string): void;
```

---

# 8. 知识库与 RAG 检索接口

## 8.1 UploadedFile

```ts
interface UploadedFile {
  id: string;
  userId: string;
  courseId?: string;
  filename: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  parseStatus: TaskStatus;
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
uploaded_file
```

字段：

```sql
id
user_id
course_id
filename
file_type
file_size
file_url
parse_status
created_at
updated_at
```

---

## 8.2 KnowledgeBuildTask

```ts
interface KnowledgeBuildTask {
  id: string;
  courseId: string;
  fileIds: string[];
  status: TaskStatus;
  progress: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 8.3 KnowledgeBuildRequest

```ts
interface KnowledgeBuildRequest {
  courseId: string;
  fileIds: string[];
  buildMode: "append" | "rebuild";
}
```

## 8.4 KnowledgeSearchRequest

```ts
interface KnowledgeSearchRequest {
  courseId: string;
  query: string;
  nodeId?: string;
  topK?: number;
}
```

## 8.5 RetrievedDocument

```ts
interface RetrievedDocument {
  id: string;
  sourceId: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}
```

## 8.6 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/files/upload` | 上传文件 | `FormData` | `ApiResponse<UploadedFile>` |
| GET | `/api/v1/files/{fileId}` | 获取文件信息 | 无 | `ApiResponse<UploadedFile>` |
| DELETE | `/api/v1/files/{fileId}` | 删除文件 | 无 | `ApiResponse<boolean>` |
| POST | `/api/v1/knowledge-base/build` | 构建知识库 | `KnowledgeBuildRequest` | `ApiResponse<KnowledgeBuildTask>` |
| GET | `/api/v1/knowledge-base/build-tasks/{taskId}` | 查询知识库构建任务 | 无 | `ApiResponse<KnowledgeBuildTask>` |
| POST | `/api/v1/knowledge-base/search` | RAG 检索 | `KnowledgeSearchRequest` | `ApiResponse<RetrievedDocument[]>` |
| POST | `/api/v1/knowledge-base/embed` | 文本向量化 | `{ text: string; courseId?: string }` | `ApiResponse<number[]>` |

---

# 9. 对话学习与实时问答接口

## 9.1 ChatSession

```ts
interface ChatSession {
  id: string;
  userId: string;
  courseId?: string;
  nodeId?: string;
  title: string;
  sessionType: "profile" | "qa" | "resource" | "practice" | "digital_human";
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
chat_session
```

字段：

```sql
id
user_id
course_id
node_id
title
session_type
created_at
updated_at
```

---

## 9.2 ChatMessage

```ts
interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: "user" | "assistant" | "system" | "agent";
  content: string;
  contentType: "text" | "markdown" | "json";
  agentType?: AgentType;
  audioUrl?: string;
  videoUrl?: string;
  providerTaskId?: string;
  usedDocuments?: RetrievedDocument[];
  createdAt: string;
}
```

数据库表：

```sql
chat_message
```

字段：

```sql
id
session_id
user_id
role
content
content_type
agent_type
audio_url
video_url
provider_task_id
used_documents
created_at
```

---

## 9.3 ChatRequest

```ts
interface ChatRequest {
  userId: string;
  sessionId?: string;
  courseId?: string;
  nodeId?: string;
  message: string;
  useRag: boolean;
  useProfile: boolean;
}
```

## 9.4 ChatResult

```ts
interface ChatResult {
  sessionId: string;
  messageId: string;
  answer: string;
  usedAgentTypes: AgentType[];
  retrievedDocuments?: RetrievedDocument[];
}
```

## 9.5 ChatStreamEvent

```ts
interface ChatStreamEvent {
  sessionId: string;
  eventType: "start" | "chunk" | "agent_step" | "done" | "error";
  contentChunk?: string;
  agentType?: AgentType;
  errorMessage?: string;
}
```

## 9.6 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/chat/sessions` | 创建对话会话 | `Partial<ChatSession>` | `ApiResponse<ChatSession>` |
| GET | `/api/v1/chat/sessions` | 获取对话会话列表 | `PageRequest` | `ApiResponse<PageResult<ChatSession>>` |
| GET | `/api/v1/chat/sessions/{sessionId}` | 获取会话详情 | 无 | `ApiResponse<ChatSession>` |
| GET | `/api/v1/chat/sessions/{sessionId}/messages` | 获取消息列表 | 无 | `ApiResponse<ChatMessage[]>` |
| POST | `/api/v1/chat/send` | 发送消息 | `ChatRequest` | `ApiResponse<ChatResult>` |
| GET | `/api/v1/chat/stream?sessionId={sessionId}` | 对话流式输出 | SSE | `ChatStreamEvent` |

---

# 10. 多智能体接口

## 10.1 AgentContext

```ts
interface AgentContext {
  profile?: StudentProfile;
  currentNode?: KnowledgeNode;
  learningPath?: LearningPath;
  recentRecords?: LearningRecord[];
  retrievedDocuments?: RetrievedDocument[];
}
```

## 10.2 AgentRunRequest

```ts
interface AgentRunRequest {
  userId: string;
  courseId?: string;
  nodeId?: string;
  agentType: AgentType;
  input: Record<string, any>;
  context?: AgentContext;
}
```

## 10.3 AgentRunResult

```ts
interface AgentRunResult {
  taskId: string;
  agentType: AgentType;
  status: TaskStatus;
  output: Record<string, any>;
  errorMessage?: string;
}
```

## 10.4 MultiAgentWorkflowRequest

```ts
interface MultiAgentWorkflowRequest {
  userId: string;
  courseId: string;
  nodeId?: string;
  workflowType:
    | "profile_build"
    | "path_plan"
    | "resource_generate"
    | "qa"
    | "practice_review"
    | "report_generate";
  input: Record<string, any>;
}
```

## 10.5 MultiAgentWorkflowResult

```ts
interface MultiAgentWorkflowResult {
  taskId: string;
  workflowType: string;
  status: TaskStatus;
  steps: AgentRunResult[];
  finalOutput: Record<string, any>;
}
```

## 10.6 AgentTaskEvent

```ts
interface AgentTaskEvent {
  taskId: string;
  agentType: AgentType;
  eventType: "start" | "thinking" | "tool_call" | "result" | "error" | "done";
  message?: string;
  payload?: Record<string, any>;
  createdAt: string;
}
```

## 10.7 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/agents/run` | 运行单个智能体 | `AgentRunRequest` | `ApiResponse<AgentRunResult>` |
| POST | `/api/v1/agents/workflows/run` | 运行多智能体流程 | `MultiAgentWorkflowRequest` | `ApiResponse<MultiAgentWorkflowResult>` |
| GET | `/api/v1/agents/tasks/{taskId}` | 查询智能体任务 | 无 | `ApiResponse<MultiAgentWorkflowResult>` |
| GET | `/api/v1/agents/tasks/{taskId}/events` | 查询智能体事件 | 无 | `ApiResponse<AgentTaskEvent[]>` |

---

# 11. 个性化资源生成接口

## 11.1 GeneratedResource

```ts
interface GeneratedResource {
  id: string;
  userId: string;
  courseId: string;
  nodeId?: string;
  title: string;
  resourceType: ResourceType;
  content: string;
  fileUrl?: string;
  prompt?: string;
  modelName?: string;
  status: TaskStatus;
  auditStatus: AuditStatus;
  createdAt: string;
  updatedAt: string;
}
```

### 11.1.1 知识点讲解视频结构化内容

当 `resourceType` 为 `video_script` 或 `animation_script` 时，`GeneratedResource.content` 保存以下结构的 JSON 字符串。两类资源共享同一个最终 MP4 地址；`GeneratedResource.fileUrl` 与 `AnimationScriptContent.output.videoUrl` 均指向该文件。

```ts
type VideoStyle = "clean_motion_graphics";
type VideoTheme = "warm_academic" | "chalk_classroom" | "technical_blueprint";
type VideoAspect = "16:9" | "9:16" | "1:1";
type VideoQualityPreset = "standard" | "high" | "ultra";
type VideoGenerationStage =
  | "queued"
  | "script"
  | "storyboard"
  | "quality_audit"
  | "tts"
  | "render"
  | "audit"
  | "persist"
  | "done"
  | "error";
type VideoMaterialSource = "none" | "local_assets" | "generated_motion_assets";

type SceneType =
  | "hook"
  | "definition"
  | "analogy"
  | "mechanism"
  | "comparison"
  | "process"
  | "example"
  | "summary";

type VisualLayout =
  | "center_focus"
  | "left_right"
  | "pipeline"
  | "comparison"
  | "timeline"
  | "grid_focus"
  | "summary_cards";

type VisualAnimationType =
  | "fade_in"
  | "pop_in"
  | "slide_in_left"
  | "slide_in_right"
  | "float"
  | "draw"
  | "highlight"
  | "zoom_in"
  | "stagger_in";

interface TextVisualElement {
  type: "text" | "keyword";
  content: string;
  animation: VisualAnimationType;
}

interface CardVisualElement {
  type: "card";
  content: string;
  animation: VisualAnimationType;
}

interface IconVisualElement {
  type: "icon";
  name: string;
  animation: VisualAnimationType;
}

interface ArrowVisualElement {
  type: "arrow";
  label: string;
  animation: VisualAnimationType;
}

interface CircleVisualElement {
  type: "circle";
  label: string;
  animation: VisualAnimationType;
}

interface GridVisualElement {
  type: "grid";
  label: string;
  items?: string[];
  highlightIndex: number;
  animation: VisualAnimationType;
}

interface TimelineVisualElement {
  type: "timeline";
  items: string[];
  animation: VisualAnimationType;
}

interface ImageVisualElement {
  type: "image";
  imageUrl: string;
  alt: string;
  animation: VisualAnimationType;
}

interface FormulaVisualElement {
  type: "formula";
  content: string;
  animation: VisualAnimationType;
}

interface CodeVisualElement {
  type: "code";
  content: string;
  animation: VisualAnimationType;
}

interface HashTableBucketsVisualElement {
  type: "hash_table_buckets";
  buckets: string[];
  activeIndex: number;
  keyLabel?: string;
  collisionIndices?: number[];
  animation: VisualAnimationType;
}

interface HashFunctionPanelVisualElement {
  type: "hash_function_panel";
  inputKey: string;
  expression: string;
  outputIndex: number;
  animation: VisualAnimationType;
}

interface CollisionChainVisualElement {
  type: "collision_chain";
  bucketIndex: number;
  nodes: string[];
  activeNodeIndex?: number;
  animation: VisualAnimationType;
}

interface ArrayCellsVisualElement {
  type: "array_cells";
  items: string[];
  activeIndices?: number[];
  pointerLabels?: Record<string, string>;
  animation: VisualAnimationType;
}

interface LinkedListNodesVisualElement {
  type: "linked_list_nodes";
  nodes: string[];
  activeIndex?: number;
  pointerLabel?: string;
  animation: VisualAnimationType;
}

interface StackBlocksVisualElement {
  type: "stack_blocks";
  items: string[];
  activeIndex?: number;
  operation: string;
  animation: VisualAnimationType;
}

interface QueueLineVisualElement {
  type: "queue_line";
  items: string[];
  headIndex?: number;
  tailIndex?: number;
  operation: string;
  animation: VisualAnimationType;
}

interface TreeNodeGraphVisualElement {
  type: "tree_node_graph";
  nodes: string[];
  edges?: string[][];
  activePath?: string[];
  animation: VisualAnimationType;
}

interface CodeTracePanelVisualElement {
  type: "code_trace_panel";
  codeLines: string[];
  activeLineIndex?: number;
  variables?: Record<string, string>;
  animation: VisualAnimationType;
}

interface PointerArrowVisualElement {
  type: "pointer_arrow";
  fromLabel: string;
  toLabel: string;
  label: string;
  animation: VisualAnimationType;
}

interface MemoryBoxVisualElement {
  type: "memory_box";
  address: string;
  value: string;
  active?: boolean;
  animation: VisualAnimationType;
}

interface ComplexityChartVisualElement {
  type: "complexity_chart";
  items: string[];
  activeIndex?: number;
  label: string;
  animation: VisualAnimationType;
}

type VisualElement =
  | TextVisualElement
  | CardVisualElement
  | IconVisualElement
  | ArrowVisualElement
  | CircleVisualElement
  | GridVisualElement
  | TimelineVisualElement
  | ImageVisualElement
  | FormulaVisualElement
  | CodeVisualElement
  | HashTableBucketsVisualElement
  | HashFunctionPanelVisualElement
  | CollisionChainVisualElement
  | ArrayCellsVisualElement
  | LinkedListNodesVisualElement
  | StackBlocksVisualElement
  | QueueLineVisualElement
  | TreeNodeGraphVisualElement
  | CodeTracePanelVisualElement
  | PointerArrowVisualElement
  | MemoryBoxVisualElement
  | ComplexityChartVisualElement;

interface VisualPlan {
  layout: VisualLayout;
  elements: VisualElement[];
}

interface VideoSourceReference {
  id: string;
  title: string;
  sourceId?: string;
}

interface VideoNarrationBeat {
  beatId: string;
  narration: string;
  durationSeconds: number;
  screenText: string[];
  claims: string[];
  sourceIds: string[];
  visualPlan: VisualPlan;
  audioUrl: string;
}

interface AnimationStep {
  startState: string;
  endState: string;
  visualAction: string;
  narrationSentence: string;
  durationSeconds?: number;
}

interface VideoLessonScene {
  sceneId: string;
  sceneType: SceneType;
  title: string;
  durationSeconds: number;
  teachingPurpose: string;
  misconceptionFix: string;
  componentHints?: string[];
  auditChecklist?: string[];
  beats: VideoNarrationBeat[];
}

interface VideoLessonOutput {
  videoUrl: string;
  audioUrls: string[];
}

interface AnimationScriptContent {
  schemaVersion: "2.0";
  title: string;
  style: VideoStyle;
  theme: VideoTheme;
  durationSeconds: number;
  targetDurationSeconds?: number;
  aspectRatio: VideoAspect;
  courseId?: string;
  nodeId?: string;
  learnerProfileSummary?: string;
  qualityScore?: number;
  subtitleEnabled: boolean;
  sources: VideoSourceReference[];
  scenes: VideoLessonScene[];
  output: VideoLessonOutput;
}
```

约束：

```text
1. 新生成内容固定写入 schemaVersion="2.0"；前端仅为历史查看兼容 v1，渲染器的新任务只接受 v2。
2. scene 必须按内容需要包含 hook、definition、mechanism、example、summary，且顺序固定；analogy、comparison、process 可选。
3. hook 总时长不得超过 8 秒；每个 beat 为 3-10 秒且只承载一个口播观点。
4. 每个事实 claims 必须引用 sources 中存在的 sourceIds；无来源事实不得进入 TTS 和渲染。
5. 每个 beat.screenText 为 1-3 条短句，画面正文总量不得超过 40 个中文字；字幕不计入正文限制。
6. 非 hook/summary beat 必须包含至少一个非文本教学演示元素；每个元素必须指定 animation。
7. image.imageUrl 只允许使用 HTTPS URL；不得使用假数据、无关图片、emoji 或占位媒体伪装成功。
8. 每个 beat.audioUrl 必须指向真实 TTS 音频；output.audioUrls 必须按 beat 顺序完全一致。
9. output.videoUrl 必须指向经 ffprobe 验证同时包含音频流和视频流的真实 MP4。
10. 脚本/分镜必须先通过质量与安全预审，最终资源再次通过 audit；只有 auditStatus=passed 时才能设置 status=success。
```

数据库表：

```sql
generated_resource
```

字段：

```sql
id
user_id
course_id
node_id
title
resource_type
content
file_url
prompt
model_name
status
audit_status
created_at
updated_at
```

---

## 11.2 ResourceGenerateRequest

```ts
interface ResourceGenerateRequest {
  userId: string;
  courseId: string;
  nodeId?: string;
  resourceTypes: ResourceType[];
  difficulty?: DifficultyLevel;
  learningGoal?: string;
  customRequirement?: string;
  videoOptions?: VideoGenerateOptions;
}
```

```ts
interface VideoGenerateOptions {
  aspectRatio?: VideoAspect;
  qualityPreset?: VideoQualityPreset;
  materialSource?: VideoMaterialSource;
  versionCount?: number;
  subtitleEnabled?: boolean;
  bgmEnabled?: boolean;
  bgmVolume?: number;
  theme?: VideoTheme;
}
```

## 11.3 ResourceGenerateResult

```ts
interface ResourceGenerateResult {
  taskId: string;
  resourceIds: string[];
  status: TaskStatus;
  progress?: number;
  currentStage?: VideoGenerationStage;
  errorMessage?: string;
}
```

## 11.4 ResourceStreamEvent

```ts
interface ResourceStreamEvent {
  taskId: string;
  eventType: "start" | "progress" | "chunk" | "done" | "error";
  progress: number;
  stage?: VideoGenerationStage;
  contentChunk?: string;
  errorMessage?: string;
}
```

## 11.5 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/resources/generate` | 生成学习资源 | `ResourceGenerateRequest` | `ApiResponse<ResourceGenerateResult>` |
| GET | `/api/v1/resources/generation-tasks/{taskId}` | 查询生成任务 | 无 | `ApiResponse<ResourceGenerateResult>` |
| GET | `/api/v1/resources/{resourceId}` | 获取资源详情 | 无 | `ApiResponse<GeneratedResource>` |
| GET | `/api/v1/users/{userId}/resources` | 获取用户资源 | `PageRequest` | `ApiResponse<PageResult<GeneratedResource>>` |
| GET | `/api/v1/nodes/{nodeId}/generated-resources` | 获取节点资源 | 无 | `ApiResponse<GeneratedResource[]>` |
| DELETE | `/api/v1/resources/{resourceId}` | 删除资源 | 无 | `ApiResponse<boolean>` |
| GET | `/api/v1/resources/generate/stream?taskId={taskId}` | 资源生成流式输出 | SSE | `ResourceStreamEvent` |

---

## 11.6 多模态资源增强接口

### 11.6.1 稳定知识点视频任务

```ts
interface MultimodalVideoGenerateRequest {
  userId: string;
  courseId: string;
  nodeId: string;
  title?: string;
  learningGoal?: string;
  difficulty?: DifficultyLevel;
  durationSeconds?: number;
  theme?: VideoTheme;
  style?: string;
  useDigitalHuman?: boolean;
  useRag: boolean;
  customRequirement?: string;
}

interface MultimodalTaskResult {
  taskId: string;
  status: TaskStatus;
  progress: number;
  currentStep?: string;
  resourceId?: string;
  fileUrl?: string;
  videoUrl?: string;
  script?: string;
  storyboard?: Record<string, any>[];
  subtitleText?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface MultimodalTaskEvent {
  taskId: string;
  eventType: "start" | "progress" | "step" | "done" | "error";
  stepName: string;
  progress: number;
  message: string;
  payload?: Record<string, any>;
  createdAt: string;
}

interface MultimodalStreamEvent {
  taskId: string;
  eventType: "start" | "progress" | "step" | "done" | "error";
  progress: number;
  stepName?: string;
  message?: string;
  errorMessage?: string;
}
```

### 11.6.2 数字人讲解

```ts
interface DigitalHumanExplainRequest {
  userId: string;
  courseId: string;
  nodeId: string;
  avatarId?: string;
  voiceId?: string;
  useRag: boolean;
  customRequirement?: string;
}

interface DigitalHumanExplainResult {
  taskId: string;
  status: TaskStatus;
  resourceId?: string;
  videoUrl?: string;
  script?: string;
  progress: number;
}
```

### 11.6.3 数字人对话

```ts
interface DigitalHumanChatRequest {
  userId: string;
  courseId?: string;
  nodeId?: string;
  sessionId?: string;
  message: string;
  avatarId?: string;
  voiceId?: string;
  useRag: boolean;
  useProfile: boolean;
}

interface DigitalHumanChatResult {
  sessionId: string;
  messageId: string;
  answer: string;
  audioUrl?: string;
  videoUrl?: string;
  providerTaskId?: string;
  usedDocuments?: RetrievedDocument[];
  status: TaskStatus;
  liveSession?: DigitalHumanLiveSessionResult;
}

interface DigitalHumanLiveSessionResult {
  sessionId: string;
  status: TaskStatus;
  videoUrl?: string;
  errorMessage?: string;
  startedAt: string;
  updatedAt: string;
}

interface DigitalHumanCallbackRequest {
  taskId: string;
  providerTaskId?: string;
  status: TaskStatus;
  fileUrl?: string;
  videoUrl?: string;
  errorMessage?: string;
  token?: string;
  payload?: Record<string, any>;
}
```

数据库表：

```sql
multimodal_generation_task
multimodal_task_event
```

字段：

```sql
multimodal_generation_task:
id
user_id
course_id
node_id
resource_id
task_type
provider
status
progress
current_step
input_payload
output_payload
error_message
created_at
updated_at

multimodal_task_event:
id
task_id
event_type
step_name
progress
message
payload
created_at
```

接口列表：

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/multimodal/videos/generate` | 生成稳定知识点教学视频 | `MultimodalVideoGenerateRequest` | `ApiResponse<MultimodalTaskResult>` |
| GET | `/api/v1/multimodal/videos/tasks/{taskId}` | 查询视频生成任务 | 无 | `ApiResponse<MultimodalTaskResult>` |
| GET | `/api/v1/multimodal/videos/tasks/{taskId}/events` | 查询视频任务事件 | 无 | `ApiResponse<MultimodalTaskEvent[]>` |
| GET | `/api/v1/multimodal/videos/stream?taskId={taskId}` | 视频任务流式进度 | SSE | `MultimodalStreamEvent` |
| POST | `/api/v1/multimodal/digital-human/explain` | 生成数字人讲解 | `DigitalHumanExplainRequest` | `ApiResponse<DigitalHumanExplainResult>` |
| POST | `/api/v1/multimodal/digital-human/chat` | 数字人对话 | `DigitalHumanChatRequest` | `ApiResponse<DigitalHumanChatResult>` |
| GET | `/api/v1/multimodal/digital-human/sessions/{sessionId}/messages` | 获取数字人对话历史 | 无 | `ApiResponse<ChatMessage[]>` |
| GET | `/api/v1/multimodal/digital-human/sessions/{sessionId}/live` | 获取数字人直播会话状态 | 无 | `ApiResponse<DigitalHumanLiveSessionResult>` |
| POST | `/api/v1/multimodal/digital-human/sessions/{sessionId}/stop` | 停止数字人直播会话 | 无 | `ApiResponse<DigitalHumanLiveSessionResult>` |
| POST | `/api/v1/multimodal/digital-human/callback` | 接收讯飞异步任务回调 | `DigitalHumanCallbackRequest` | `ApiResponse<MultimodalTaskResult>` |

兼容规则：

```text
1. `POST /api/v1/resources/generate` 收到 `knowledge_video` 或 `digital_human_video` 时，内部转交多模态 workflow。
2. 旧 `video_script` 和 `animation_script` 资源行为保持兼容。
3. 生成内容必须经过 audit/safety；未通过时不得将 GeneratedResource.status 标记为 success。
4. `DigitalHumanChatResult.status` 表示回答结果；`liveSession.status` 表示直播会话状态，顶层 `videoUrl` 为兼容字段。
5. provider session、原始 RTMP 地址、完整讯飞 sid 和签名 URL 仅允许保留在后端，不得返回浏览器。
6. 数字人对话固定先调用同一虚拟人接口服务授权的“大模型对话”能力，回答通过 audit/safety 后才允许启动或驱动在线虚拟人；模型失败或审核拒绝不得创建虚拟人会话。
7. 大模型对话使用虚拟人接口服务的 `wss://apigateway.xfyousheng.com/nlp/v1/interact_nlp`（控制台专属地址可通过环境变量覆盖）；`header.scene_id` 必须取 `IFLYTEK_DIGITAL_HUMAN_SERVICE_ID`，`header.ctrl="text_interact"`，多轮对话复用服务端返回的 `header.session`。不得回退 Spark Lite、DeepSeek 或 mock。
8. 在线虚拟人驱动使用 `IFLYTEK_DIGITAL_HUMAN_URL=wss://avatar.cn-huadong-1.xf-yun.com/v1/interact`，同一直播会话复用一条 WebSocket，并在该连接发送 `start / text_driver / ping / stop`；不得调用旧 `vms2d_*` REST 协议。
9. 在线驱动 start 使用 `scene_id`、已授权 avatar/voice 和 RTMP；文本驱动发送审核后明文且不超过 2000 字符；应用层心跳默认 5 秒。
10. 真实讯飞字段只允许出现在 provider adapter 和 provider DTO 中，业务 service 使用统一结构。
11. `theme` 优先于旧 `style`；旧值映射为 `clean_motion_graphics -> warm_academic`、`classroom_board -> chalk_classroom`、`case_demo -> technical_blueprint`，其他旧值返回 422。
12. `knowledge_video`、`video_script` 和 `animation_script` 复用同一真实 v2 生成核心；mock 模式不得发布固定视频 URL 或成功媒体状态。
13. `digital_human_video` 复用 v2 教学规划、事实引用、口播和安全校验，再将审核后的 beat 口播合并后提交数字人 provider；实时数字人对话协议不变。
```

# 12. 个性化资源推荐接口

## 12.1 ResourceRecommendation

```ts
interface ResourceRecommendation {
  id: string;
  userId: string;
  courseId: string;
  nodeId?: string;
  resourceId: string;
  resourceType: ResourceType;
  title: string;
  reason: string;
  score: number;
  createdAt: string;
}
```

## 12.2 ResourcePushRecord

```ts
interface ResourcePushRecord {
  id: string;
  userId: string;
  resourceId: string;
  nodeId?: string;
  reason: string;
  viewed: boolean;
  viewedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
resource_push_record
```

字段：

```sql
id
user_id
resource_id
node_id
reason
viewed
viewed_at
created_at
updated_at
```

---

## 12.3 RecommendationRequest

```ts
interface RecommendationRequest {
  userId: string;
  courseId: string;
  nodeId?: string;
  limit?: number;
}
```

## 12.4 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/recommendations/resources` | 生成资源推荐 | `RecommendationRequest` | `ApiResponse<ResourceRecommendation[]>` |
| GET | `/api/v1/users/{userId}/recommendations` | 获取用户推荐 | 无 | `ApiResponse<ResourceRecommendation[]>` |
| POST | `/api/v1/recommendations/{recommendationId}/viewed` | 标记推荐已查看 | 无 | `ApiResponse<boolean>` |
| GET | `/api/v1/users/{userId}/push-records` | 获取推送记录 | 无 | `ApiResponse<ResourcePushRecord[]>` |

---

# 13. 学习路径接口

## 13.1 LearningPath

```ts
interface LearningPath {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  description?: string;
  currentStage: string;
  targetGoal: string;
  pathNodeIds: string[];
  currentNodeId?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
learning_path
```

字段：

```sql
id
user_id
course_id
title
description
current_stage
target_goal
path_node_ids
current_node_id
status
created_at
updated_at
```

---

## 13.2 LearningTask

```ts
interface LearningTask {
  id: string;
  pathId: string;
  userId: string;
  courseId: string;
  nodeId: string;
  title: string;
  taskType: "learn" | "practice" | "review" | "project";
  resourceIds: string[];
  orderIndex: number;
  status: TaskStatus;
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
learning_task
```

字段：

```sql
id
path_id
user_id
course_id
node_id
title
task_type
resource_ids
order_index
status
due_at
completed_at
created_at
updated_at
```

---

## 13.3 LearningPathGenerateRequest

```ts
interface LearningPathGenerateRequest {
  userId: string;
  courseId: string;
  targetGoal?: string;
  timeBudget?: string;
  weakNodeIds?: string[];
}
```

## 13.4 LearningTaskStatusUpdateRequest

```ts
interface LearningTaskStatusUpdateRequest {
  status: TaskStatus;
  completedAt?: string;
}
```

## 13.5 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/learning-paths/generate` | 生成学习路径 | `LearningPathGenerateRequest` | `ApiResponse<LearningPath>` |
| GET | `/api/v1/users/{userId}/learning-paths` | 获取用户学习路径 | 无 | `ApiResponse<LearningPath[]>` |
| GET | `/api/v1/learning-paths/{pathId}` | 获取路径详情 | 无 | `ApiResponse<LearningPath>` |
| PUT | `/api/v1/learning-paths/{pathId}` | 更新学习路径 | `Partial<LearningPath>` | `ApiResponse<LearningPath>` |
| GET | `/api/v1/learning-paths/{pathId}/tasks` | 获取路径任务 | 无 | `ApiResponse<LearningTask[]>` |
| PUT | `/api/v1/learning-tasks/{taskId}/status` | 更新任务状态 | `LearningTaskStatusUpdateRequest` | `ApiResponse<LearningTask>` |

---

# 14. 练习题、测评与错题接口

## 14.1 PracticeQuestion

```ts
interface PracticeQuestion {
  id: string;
  courseId: string;
  nodeId?: string;
  questionType: QuestionType;
  title: string;
  content: string;
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: DifficultyLevel;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
practice_question
```

字段：

```sql
id
course_id
node_id
question_type
title
content
options
answer
explanation
difficulty
tags
created_at
updated_at
```

---

## 14.2 PracticeGenerateRequest

```ts
interface PracticeGenerateRequest {
  userId: string;
  courseId: string;
  nodeId?: string;
  questionTypes: QuestionType[];
  difficulty?: DifficultyLevel;
  count: number;
}
```

## 14.3 PracticeSubmitRequest

```ts
interface PracticeSubmitRequest {
  userId: string;
  questionId: string;
  userAnswer: string;
  durationSeconds?: number;
}
```

## 14.4 PracticeRecord

```ts
interface PracticeRecord {
  id: string;
  userId: string;
  questionId: string;
  nodeId?: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  score: number;
  mistakeReason?: string;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
practice_record
wrong_question_record
```

字段：

```sql
id
user_id
question_id
node_id
user_answer
correct_answer
is_correct
score
mistake_reason
duration_seconds
created_at
updated_at
```

---

## 14.5 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/practices/generate` | 生成练习题 | `PracticeGenerateRequest` | `ApiResponse<PracticeQuestion[]>` |
| GET | `/api/v1/practices/questions` | 获取题目列表 | `PageRequest` | `ApiResponse<PageResult<PracticeQuestion>>` |
| GET | `/api/v1/practices/questions/{questionId}` | 获取题目详情 | 无 | `ApiResponse<PracticeQuestion>` |
| POST | `/api/v1/practices/submit` | 提交答案 | `PracticeSubmitRequest` | `ApiResponse<PracticeRecord>` |
| GET | `/api/v1/users/{userId}/practice-records` | 获取练习记录 | 无 | `ApiResponse<PracticeRecord[]>` |
| GET | `/api/v1/users/{userId}/wrong-questions` | 获取错题本 | 无 | `ApiResponse<PracticeQuestion[]>` |
| DELETE | `/api/v1/users/{userId}/wrong-questions/{questionId}` | 移除错题 | 无 | `ApiResponse<boolean>` |

---

# 15. 笔记与浮窗菜单接口

## 15.1 Note

```ts
interface Note {
  id: string;
  userId: string;
  courseId?: string;
  nodeId?: string;
  questionId?: string;
  title: string;
  content: string;
  tags: string[];
  relationType?: "node" | "question" | "resource" | "path";
  relationId?: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
note
note_tag
note_relation
```

字段：

```sql
id
user_id
course_id
node_id
question_id
title
content
tags
relation_type
relation_id
pinned
created_at
updated_at
```

---

## 15.2 NoteCreateRequest

```ts
interface NoteCreateRequest {
  userId: string;
  courseId?: string;
  nodeId?: string;
  questionId?: string;
  title: string;
  content: string;
  tags?: string[];
  relationType?: "node" | "question" | "resource" | "path";
  relationId?: string;
}
```

## 15.3 FloatingMenuState

```ts
interface FloatingMenuState {
  visible: boolean;
  activeTab: "qa" | "note" | "wrong_book" | "resource";
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  collapsed: boolean;
}
```

## 15.4 浮窗前端保留函数

```ts
function openFloatingMenu(): void;
function closeFloatingMenu(): void;
function toggleFloatingMenu(): void;
function switchFloatingTab(tab: FloatingMenuState["activeTab"]): void;
function updateFloatingPosition(x: number, y: number): void;
```

## 15.5 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/notes` | 创建笔记 | `NoteCreateRequest` | `ApiResponse<Note>` |
| GET | `/api/v1/notes` | 获取笔记列表 | `PageRequest` | `ApiResponse<PageResult<Note>>` |
| GET | `/api/v1/notes/{noteId}` | 获取笔记详情 | 无 | `ApiResponse<Note>` |
| PUT | `/api/v1/notes/{noteId}` | 更新笔记 | `Partial<Note>` | `ApiResponse<Note>` |
| DELETE | `/api/v1/notes/{noteId}` | 删除笔记 | 无 | `ApiResponse<boolean>` |
| POST | `/api/v1/notes/{noteId}/pin` | 置顶笔记 | `{ pinned: boolean }` | `ApiResponse<Note>` |
| POST | `/api/v1/notes/{noteId}/relations` | 建立笔记关联 | `{ relationType: string; relationId: string }` | `ApiResponse<Note>` |
| GET | `/api/v1/users/{userId}/notes` | 获取用户笔记 | 无 | `ApiResponse<Note[]>` |
| GET | `/api/v1/nodes/{nodeId}/notes` | 获取节点笔记 | 无 | `ApiResponse<Note[]>` |

---

# 16. 学习记录与学习效果评估接口

## 16.1 LearningRecord

```ts
interface LearningRecord {
  id: string;
  userId: string;
  courseId: string;
  nodeId?: string;
  resourceId?: string;
  behaviorType: BehaviorType;
  durationSeconds?: number;
  extraData?: Record<string, any>;
  createdAt: string;
}
```

数据库表：

```sql
learning_record
user_behavior_log
```

字段：

```sql
id
user_id
course_id
node_id
resource_id
behavior_type
duration_seconds
extra_data
created_at
```

---

## 16.2 LearningRecordCreateRequest

```ts
interface LearningRecordCreateRequest {
  userId: string;
  courseId: string;
  nodeId?: string;
  resourceId?: string;
  behaviorType: BehaviorType;
  durationSeconds?: number;
  extraData?: Record<string, any>;
}
```

## 16.3 LearningEvaluation

```ts
interface LearningEvaluation {
  userId: string;
  courseId: string;
  completionRate: number;
  correctRate: number;
  weakNodeIds: string[];
  masteredNodeIds: string[];
  averageMasteryScore: number;
  progressTrend: number[];
  advice: string;
}
```

## 16.4 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/learning-records` | 创建学习记录 | `LearningRecordCreateRequest` | `ApiResponse<LearningRecord>` |
| GET | `/api/v1/users/{userId}/learning-records` | 获取学习记录 | 无 | `ApiResponse<LearningRecord[]>` |
| GET | `/api/v1/users/{userId}/courses/{courseId}/evaluation` | 获取学习评估 | 无 | `ApiResponse<LearningEvaluation>` |
| POST | `/api/v1/users/{userId}/courses/{courseId}/evaluation/refresh` | 刷新学习评估 | 无 | `ApiResponse<LearningEvaluation>` |

---

# 17. 学习报告接口

## 17.1 StudyReport

```ts
interface StudyReport {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  summary: string;
  completionRate: number;
  correctRate: number;
  weakNodeSummary: string;
  improvementAdvice: string;
  chartData?: Record<string, any>;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

数据库表：

```sql
study_report
```

字段：

```sql
id
user_id
course_id
title
summary
completion_rate
correct_rate
weak_node_summary
improvement_advice
chart_data
pdf_url
created_at
updated_at
```

---

## 17.2 StudyReportGenerateRequest

```ts
interface StudyReportGenerateRequest {
  userId: string;
  courseId: string;
  startDate?: string;
  endDate?: string;
  includeChart: boolean;
  exportPdf: boolean;
}
```

## 17.3 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/reports/generate` | 生成学习报告 | `StudyReportGenerateRequest` | `ApiResponse<StudyReport>` |
| GET | `/api/v1/users/{userId}/reports` | 获取用户报告 | 无 | `ApiResponse<StudyReport[]>` |
| GET | `/api/v1/reports/{reportId}` | 获取报告详情 | 无 | `ApiResponse<StudyReport>` |
| GET | `/api/v1/reports/{reportId}/export-pdf` | 导出 PDF | 无 | `ApiResponse<{ pdfUrl: string }>` |
| DELETE | `/api/v1/reports/{reportId}` | 删除报告 | 无 | `ApiResponse<boolean>` |

---

# 18. 安全校验、防幻觉与日志接口

## 18.1 AuditResult

```ts
interface AuditResult {
  id: string;
  targetType: "message" | "resource" | "answer" | "report";
  targetId: string;
  auditStatus: AuditStatus;
  riskLabels: string[];
  reason?: string;
  createdAt: string;
}
```

数据库表：

```sql
audit_log
```

字段：

```sql
id
target_type
target_id
audit_status
risk_labels
reason
created_at
```

---

## 18.2 AuditCheckRequest

```ts
interface AuditCheckRequest {
  targetType: "message" | "resource" | "answer" | "report";
  targetId: string;
  content: string;
  userId?: string;
  courseId?: string;
}
```

## 18.3 ModelCallLog

```ts
interface ModelCallLog {
  id: string;
  userId?: string;
  agentType?: AgentType;
  provider: string;
  modelName: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}
```

数据库表：

```sql
model_call_log
```

字段：

```sql
id
user_id
agent_type
provider
model_name
prompt_tokens
completion_tokens
latency_ms
success
error_message
created_at
```

## 18.4 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| POST | `/api/v1/audit/check` | 内容安全与事实校验 | `AuditCheckRequest` | `ApiResponse<AuditResult>` |
| GET | `/api/v1/audit/logs` | 获取安全校验日志 | `PageRequest` | `ApiResponse<PageResult<AuditResult>>` |
| GET | `/api/v1/model-call-logs` | 获取模型调用日志 | `PageRequest` | `ApiResponse<PageResult<ModelCallLog>>` |

---

# 19. 系统接口

## 19.1 HealthCheckResult

```ts
interface HealthCheckResult {
  status: "ok" | "error";
  database: "ok" | "error";
  redis?: "ok" | "error";
  vectorStore?: "ok" | "error";
  graphDb?: "ok" | "error";
  llmService?: "ok" | "error";
  iflytekDigitalHumanChat?: "ok" | "error";
  iflytekTts?: "mock" | "ok" | "error";
  iflytekDigitalHuman?: "mock" | "ok" | "error";
}
```

## 19.2 SystemConfig

```ts
interface SystemConfig {
  appName: string;
  appVersion: string;
  enableMock: boolean;
  enableStreamOutput: boolean;
  enableSafetyAudit: boolean;
}
```

## 19.3 接口列表

| 方法 | 路径 | 说明 | 请求体 | 返回 |
|---|---|---|---|---|
| GET | `/api/v1/system/health` | 健康检查 | 无 | `ApiResponse<HealthCheckResult>` |
| GET | `/api/v1/system/config` | 获取系统配置 | 无 | `ApiResponse<SystemConfig>` |
| GET | `/api/v1/system/version` | 获取系统版本 | 无 | `ApiResponse<{ version: string }>` |

---

# 20. 前端页面与接口对应关系

## 20.1 页面路由

```ts
const routes = [
  "/login",
  "/home",
  "/chat",
  "/profile",
  "/learning-path",
  "/resources",
  "/knowledge-graph",
  "/reports",
  "/practice",
  "/admin/knowledge-base"
];
```

## 20.2 页面接口对应表

| 页面 | 主要接口 |
|---|---|
| 登录页 | `/api/v1/auth/login`, `/api/v1/auth/register` |
| 首页 | `/api/v1/courses`, `/api/v1/users/me` |
| 对话学习页 | `/api/v1/chat/send`, `/api/v1/chat/stream`, `/api/v1/profiles/extract` |
| 学生画像页 | `/api/v1/profiles/{userId}` |
| 学习路径页 | `/api/v1/learning-paths/generate`, `/api/v1/users/{userId}/learning-paths` |
| 资源生成页 | `/api/v1/resources/generate`, `/api/v1/users/{userId}/resources`, `/api/v1/multimodal/videos/generate`, `/api/v1/multimodal/digital-human/explain`, `/api/v1/multimodal/digital-human/chat` |
| 知识图谱页 | `/api/v1/courses/{courseId}/graph`, `/api/v1/users/{userId}/courses/{courseId}/graph`, `/api/v1/multimodal/videos/generate`, `/api/v1/multimodal/digital-human/explain` |
| 学习报告页 | `/api/v1/reports/generate`, `/api/v1/users/{userId}/reports` |
| 测评页 | `/api/v1/practices/generate`, `/api/v1/practices/submit` |
| 浮窗菜单 | `/api/v1/chat/send`, `/api/v1/notes`, `/api/v1/users/{userId}/wrong-questions` |
| 知识库管理页 | `/api/v1/files/upload`, `/api/v1/knowledge-base/build`, `/api/v1/courses/{courseId}/nodes` |

---

# 21. 前端核心状态变量

```ts
const currentUser = ref<User | null>(null);
const currentCourse = ref<Course | null>(null);
const currentNode = ref<KnowledgeNode | null>(null);
const currentProfile = ref<StudentProfile | null>(null);
const currentLearningPath = ref<LearningPath | null>(null);

const selectedNodeId = ref<string | null>(null);
const selectedResourceId = ref<string | null>(null);
const selectedQuestionId = ref<string | null>(null);
const selectedNoteId = ref<string | null>(null);

const loading = ref(false);
const errorMessage = ref("");
const streamContent = ref("");

const floatingMenuState = ref<FloatingMenuState>({
  visible: false,
  activeTab: "qa",
  positionX: 960,
  positionY: 120,
  width: 420,
  height: 620,
  collapsed: false
});
```

---

# 22. 前端 API Client 使用规范

## 22.1 目录结构

```text
frontend/src/
├─ api/
│  ├─ client.ts
│  └─ modules/
│     ├─ auth.ts
│     ├─ users.ts
│     ├─ profiles.ts
│     ├─ courses.ts
│     ├─ graph.ts
│     ├─ chat.ts
│     ├─ agents.ts
│     ├─ resources.ts
│     ├─ recommendations.ts
│     ├─ learningPaths.ts
│     ├─ practices.ts
│     ├─ notes.ts
│     ├─ reports.ts
│     ├─ records.ts
│     ├─ audit.ts
│     └─ files.ts
├─ types/
│  └─ contracts.ts
└─ pages/
```

---

## 22.2 禁止写法

组件中禁止直接写：

```ts
fetch("/api/v1/xxx")
axios.get("/api/v1/xxx")
```

---

## 22.3 正确写法

```ts
import { profileApi } from "@/api/modules/profiles";

const profile = await profileApi.getProfile(userId);
```

---

## 22.4 API Client 基础结构

```ts
import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);
```

---

# 23. 后端目录建议

```text
backend/app/
├─ main.py
├─ core/
│  ├─ config.py
│  ├─ security.py
│  └─ response.py
├─ api/
│  └─ v1/
│     ├─ auth.py
│     ├─ users.py
│     ├─ profiles.py
│     ├─ courses.py
│     ├─ graph.py
│     ├─ knowledge_base.py
│     ├─ chat.py
│     ├─ agents.py
│     ├─ resources.py
│     ├─ recommendations.py
│     ├─ learning_paths.py
│     ├─ practices.py
│     ├─ notes.py
│     ├─ reports.py
│     ├─ records.py
│     ├─ audit.py
│     └─ system.py
├─ schemas/
│  └─ contracts.py
├─ models/
├─ services/
├─ agents/
├─ repositories/
└─ tests/
```

---

# 24. 环境变量

## 24.1 后端环境变量

```env
APP_NAME=NodeLearn AI
APP_ENV=development
APP_PORT=8000
APP_VERSION=0.1.0

DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_EXPIRE_MINUTES=1440

LLM_PROVIDER=
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL_NAME=

EMBEDDING_PROVIDER=
EMBEDDING_API_KEY=
EMBEDDING_MODEL_NAME=

VECTOR_STORE_TYPE=chroma
VECTOR_STORE_URL=

GRAPH_DB_TYPE=neo4j
NEO4J_URI=
NEO4J_USERNAME=
NEO4J_PASSWORD=

FILE_STORAGE_TYPE=local
FILE_STORAGE_PATH=./storage
FILE_STORAGE_URL_PREFIX=/storage
FILE_STORAGE_PUBLIC_BASE_URL=http://localhost:8000/storage
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=

TTS_PROVIDER=doubao_v3_http_chunked
TTS_BASE_URL=https://openspeech.bytedance.com/api/v3/tts/unidirectional
TTS_API_KEY=
TTS_RESOURCE_ID=seed-tts-2.0
TTS_VOICE_NAME=
TTS_AUDIO_FORMAT=mp3
TTS_SAMPLE_RATE=24000
TTS_TIMEOUT_SECONDS=120

IFLYTEK_APP_ID=
IFLYTEK_API_KEY=
IFLYTEK_API_SECRET=
IFLYTEK_BASE_URL=
IFLYTEK_TTS_VOICE=
IFLYTEK_DIGITAL_HUMAN_URL=wss://avatar.cn-huadong-1.xf-yun.com/v1/interact
IFLYTEK_DIGITAL_HUMAN_CHAT_URL=wss://apigateway.xfyousheng.com/nlp/v1/interact_nlp
IFLYTEK_DIGITAL_HUMAN_SERVICE_ID=
IFLYTEK_DIGITAL_HUMAN_AVATAR_ID=201165002
IFLYTEK_DIGITAL_HUMAN_VOICE_ID=x4_lingxiaoxuan_oral
IFLYTEK_DIGITAL_HUMAN_CALLBACK_URL=
IFLYTEK_CALLBACK_TOKEN=
IFLYTEK_REQUEST_TIMEOUT_SECONDS=60
IFLYTEK_DIGITAL_HUMAN_HEARTBEAT_SECONDS=5
IFLYTEK_DIGITAL_HUMAN_IDLE_TIMEOUT_SECONDS=300
IFLYTEK_DIGITAL_HUMAN_STREAM_READY_TIMEOUT_SECONDS=20
IFLYTEK_ENABLE_MOCK=false

VIDEO_RENDER_PROVIDER=remotion
VIDEO_RENDER_PROJECT_PATH=../video-renderer
VIDEO_RENDER_BROWSER_EXECUTABLE=
VIDEO_RENDER_TIMEOUT_SECONDS=600
FFMPEG_BINARY=ffmpeg
FFPROBE_BINARY=ffprobe

AUDIT_API_BASE_URL=http://127.0.0.1:8000/api/v1
AUDIT_TIMEOUT_SECONDS=30
RUN_REAL_VIDEO_TESTS=false

ENABLE_SAFETY_AUDIT=true
ENABLE_STREAM_OUTPUT=true
```

## 24.2 前端环境变量

```env
VITE_APP_NAME=NodeLearn AI
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_ENABLE_MOCK=false
VITE_ENABLE_STREAM=true
VITE_GRAPH_RENDERER=react-flow
```

---

# 25. 数据库表清单

## 25.1 用户与画像

```sql
user
user_profile
user_preference
user_learning_state
```

## 25.2 课程与知识图谱

```sql
course
chapter
knowledge_node
knowledge_relation
node_resource
```

## 25.3 知识库与文件

```sql
uploaded_file
knowledge_build_task
knowledge_document_chunk
embedding_record
```

## 25.4 对话与智能体

```sql
chat_session
chat_message
agent_task
agent_task_event
multimodal_generation_task
multimodal_task_event
```

## 25.5 学习过程

```sql
learning_path
learning_task
learning_record
practice_question
practice_record
wrong_question_record
```

## 25.6 资源管理

```sql
generated_resource
resource_push_record
```

## 25.7 笔记与报告

```sql
note
note_tag
note_relation
study_report
```

## 25.8 日志与安全

```sql
user_behavior_log
model_call_log
audit_log
```

---

# 26. 模拟数据约定

开发早期允许使用模拟数据，但必须满足：

```text
1. 模拟字段必须与本文件接口字段完全一致。
2. 模拟返回必须包裹 ApiResponse<T>。
3. 模拟接口路径必须与正式接口路径一致。
4. 模拟枚举值必须来自本文件定义。
5. 模拟数据需要新增字段时，必须先同步登记到本文件，不能使用未登记的临时字段。
```

示例：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "node_001",
    "courseId": "course_ds_001",
    "name": "链表",
    "nodeType": "concept",
    "difficulty": "medium",
    "learningValue": 90,
    "prerequisiteNodeIds": ["node_array_001"],
    "nextNodeIds": ["node_stack_001"],
    "resourceIds": [],
    "commonMistakes": ["指针断链", "头节点处理错误"],
    "recommendedPracticeIds": [],
    "masteryStatus": "learning",
    "masteryScore": 45,
    "createdAt": "2026-05-19T10:00:00Z",
    "updatedAt": "2026-05-19T10:00:00Z"
  },
  "traceId": "trace_mock_001",
  "timestamp": "2026-05-19T10:00:00Z"
}
```

---

# 27. Codex 开发提示词模板

将以下内容复制给 Codex：

```text
你是 NodeLearn AI 项目的代码生成助手。

你必须先阅读 docs/interface-contract.md。

强制规则：
1. 所有接口路径、请求字段、返回字段、枚举值、数据库字段、前端变量名，必须与 docs/interface-contract.md 对齐；功能需要新增时先同步更新本文件。
2. 前端统一使用 camelCase。
3. 后端和数据库统一使用 snake_case。
4. HTTP 返回必须使用 ApiResponse<T>。
5. 前端不得直接在组件中写 fetch 或 axios，只能调用 src/api/modules 中的方法。
6. 后端新增路由前必须同步登记到本文件。
7. 未实现功能只能保留空接口、TODO 或模拟返回，模拟字段也必须登记到本文件。
8. 如果发现说明书中缺少必要接口或变量，直接补充本文件并同步实现、类型和测试。
9. 每次提交代码后，必须运行契约测试，确保接口和变量没有偏离说明书。
10. safety_agent 或 audit 接口未通过时，不允许把生成资源标记为可用。
```

---

# 28. 契约测试要求

建议新增以下测试文件：

```text
tests/contract/test_api_routes.py
tests/contract/test_response_schema.py
tests/contract/test_enum_values.py
tests/contract/test_db_fields.py
tests/contract/test_frontend_types.py
```

## 28.1 测试目标

```text
1. 检查所有后端路由是否出现在 docs/interface-contract.md 中。
2. 检查所有接口返回是否符合 ApiResponse<T>。
3. 检查所有枚举值是否与本文件一致。
4. 检查数据库字段是否与本文件一致。
5. 检查前端 contracts.ts 是否没有额外字段。
6. 检查前端 api modules 是否没有直接新增接口路径。
```

---

# 29. 新增内容同步规则

```text
允许为功能新增接口路径。
允许为功能新增字段名。
允许为功能新增枚举值。
不允许混用 camelCase 和 snake_case。
不允许前端直接写死后端返回结构。
不允许跳过 ApiResponse<T>。
新增 AgentType、ResourceType、NodeType 或其他枚举值必须先登记到本文件。
不允许绕过 safety_agent 或 audit 输出最终资源。
不允许手写散乱 fetch，必须统一 API Client。
不允许组件直接依赖后端 URL。
不允许数据库字段使用中文名。
不允许接口返回 undefined 字段。
```

---

# 30. 最小可运行接口优先级

如果时间有限，按以下顺序实现：

## 30.1 第一优先级

```text
POST /api/v1/auth/login
GET  /api/v1/users/me
GET  /api/v1/courses
GET  /api/v1/courses/{courseId}/nodes
GET  /api/v1/courses/{courseId}/graph
POST /api/v1/chat/send
POST /api/v1/profiles/extract
POST /api/v1/resources/generate
GET  /api/v1/resources/{resourceId}
```

## 30.2 第二优先级

```text
POST /api/v1/learning-paths/generate
POST /api/v1/practices/generate
POST /api/v1/practices/submit
POST /api/v1/notes
GET  /api/v1/users/{userId}/notes
POST /api/v1/reports/generate
```

## 30.3 第三优先级

```text
POST /api/v1/knowledge-base/build
POST /api/v1/knowledge-base/search
POST /api/v1/agents/workflows/run
POST /api/v1/audit/check
GET  /api/v1/system/health
```

---

# 31. 首期建议模拟用户与课程

## 31.1 默认用户

```json
{
  "id": "user_demo_001",
  "username": "demo_student",
  "role": "student",
  "status": "active"
}
```

## 31.2 默认课程

```json
{
  "id": "course_ds_001",
  "name": "数据结构",
  "code": "DATA_STRUCTURE",
  "description": "面向软件杯项目演示的数据结构课程知识库",
  "targetMajor": "计算机科学与技术",
  "status": "published"
}
```

## 31.3 默认知识节点示例

```json
[
  {
    "id": "node_array_001",
    "courseId": "course_ds_001",
    "name": "数组",
    "nodeType": "concept",
    "difficulty": "easy",
    "learningValue": 80,
    "prerequisiteNodeIds": [],
    "nextNodeIds": ["node_linked_list_001"],
    "resourceIds": [],
    "commonMistakes": ["数组下标越界", "忽略连续存储特点"],
    "recommendedPracticeIds": [],
    "masteryStatus": "basic",
    "masteryScore": 70
  },
  {
    "id": "node_linked_list_001",
    "courseId": "course_ds_001",
    "name": "链表",
    "nodeType": "concept",
    "difficulty": "medium",
    "learningValue": 90,
    "prerequisiteNodeIds": ["node_array_001"],
    "nextNodeIds": ["node_stack_001"],
    "resourceIds": [],
    "commonMistakes": ["指针断链", "头节点处理错误"],
    "recommendedPracticeIds": [],
    "masteryStatus": "learning",
    "masteryScore": 45
  }
]
```

---

# 32. 最终执行要求

本文件是接口契约，不是普通说明文档。

项目开发时应遵循：

```text
先写契约
再写类型
再写接口
再写页面
再补业务逻辑
最后写测试
```

不建议先写页面再临时补接口，否则后期会出现字段混乱、接口重复、前后端对不上、Codex 随意发明变量等问题。
