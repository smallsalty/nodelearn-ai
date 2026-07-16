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
- `CourseContent`
- `CourseContentChapter`
- `CourseContentSection`

## 路由

- `GET /api/v1/courses`
- `POST /api/v1/courses`
- `GET /api/v1/courses/{courseId}`
- `PUT /api/v1/courses/{courseId}`
- `DELETE /api/v1/courses/{courseId}`
- `GET /api/v1/courses/{courseId}/chapters`
- `POST /api/v1/courses/{courseId}/chapters`
- `GET /api/v1/courses/{courseId}/content`
- `GET /api/v1/courses/{courseId}/nodes`
- `POST /api/v1/courses/{courseId}/nodes`
- `GET /api/v1/nodes/{nodeId}`
- `PUT /api/v1/nodes/{nodeId}`
- `DELETE /api/v1/nodes/{nodeId}`
- `GET /api/v1/courses/{courseId}/relations`
- `POST /api/v1/courses/{courseId}/relations`

## 前端

- 页面：`HomePage.vue`、`KnowledgeBaseAdminPage.vue`、`CourseContentPage.vue`
- API：`frontend/src/api/modules/course.ts`
- 类型：`frontend/src/types/course.ts`
- 状态变量：`currentCourse`、`currentNode`、`selectedChapterId`、`selectedNodeId`
- `KnowledgeNode.content` 是必填 Markdown 正文，`description` 仅作为摘要；节点创建、导入和迁移不得产生空正文。
- 课程正文页一次获取完整 `CourseContent`，客户端每次只渲染一个章节总览及其全部小节；正文顶部和底部提供上下章翻页，不因翻页重复请求接口。
- 章节锚点为 `chapter-{chapterId}`，小节锚点为 `node-{nodeId}`；节点深链接先切换到所属章节再定位，旧节点正文入口继续读取节点后重定向到对应课程锚点。
- 课程阅读模式将学习工作台、课程目录和正文分为独立滚动区：根布局使用受视口约束的可收缩 Grid 行，工作台中间轨道和正文区域各自承担溢出滚动；1200px 以上双侧栏完整常驻，768–1199px 使用 88px 工作台图标栏与 220px 目录，低于 768px 使用两个左侧抽屉。
- 左侧工作台和顶部选择器将每章 `Chapter.content` 暴露为合成的“总览”入口，并与真实小节按章节分组；总览不会重新创建为 `KnowledgeNode`。
- 选中章节总览时只设置 `selectedChapterId`，选中小节时同时设置所属章节和唯一 `selectedNodeId`；父章节只显示上下文提示，不得让同章其他小节进入强选中态。
- `Chapter.content` 对普通课程允许为空，Hello Algo 导入要求 20 个章节均有正文；`KnowledgeNode.orderIndex` 是所属章节内的稳定目录顺序。

## 后端

- 路由文件：`backend/app/api/v1/course.py`
- 结构定义文件：`backend/app/schemas/course.py`
- 服务文件：`backend/app/services/course_service.py`

## 约束事项

- 如需求需要新增 `CourseStatus`、`NodeType`、`DifficultyLevel`、`MasteryStatus` 或关系类型值，必须先同步 `docs/interface-contract.md`，再更新 schema、类型、服务、页面和测试。
- 不重命名 `orderIndex`、`learningValue` 或节点 id 数组字段。
- Hello Algo 的展示正文与来源材料分离：章节/节点 `content` 只保存规范化 Markdown；`reading_material.content` 保留原始 Markdown 以及 Source、Commit、License、Path。
- Hello Algo 以 `mkdocs.yml` 的中文 `nav` 为唯一顺序来源；20 个 `index.md` 写入章节正文，不再生成重名总览节点，最终固定为 20 章、85 个节点和 68 条章内顺序关系。
- 导入时只展开并保留 C++、Python、Java 替代实现，图片复制到版本化课程存储，公式、提示块、Tabs 与表格编号转换为可安全渲染的 Markdown；缺少源码、符号、图片或显式提交号时终止导入。
