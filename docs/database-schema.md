# 数据库结构摘要

来源：`docs/interface-contract.md` 第 2.5 和 25 节。

## 基础字段

```sql
id
created_at
updated_at
deleted_at
version
```

## 数据表

### 用户与画像

```sql
user
user_profile
user_preference
user_learning_state
```

### 课程与知识图谱

```sql
course
chapter
knowledge_node
knowledge_relation
node_resource
```

`chapter.content` 为可空章节总览 Markdown；Hello Algo 的 20 个章节要求非空。`knowledge_node.content` 为非空 Markdown 正文，`knowledge_node.order_index` 为非空章节内顺序；`description` 只保存可选摘要。已有正文数据通过版本化迁移优先从同节点 `reading_material.content` 回填，无法回填时必须终止迁移并报告节点，禁止写入占位正文；节点顺序按 `course_id + chapter_id + created_at + id` 幂等回填后设置非空约束。

### 知识库与文件

```sql
uploaded_file
knowledge_build_task
knowledge_document_chunk
embedding_record
```

### 对话与智能体

```sql
chat_session
chat_message
agent_task
agent_task_event
multimodal_generation_task
multimodal_task_event
```

### 学习过程

```sql
learning_path
learning_task
learning_record
practice_question
practice_record
wrong_question_record
```

### 资源管理

```sql
generated_resource
resource_push_record
```

`generated_resource.chapter_id` 可空并外键关联 `chapter.id`；章节资源使用该字段，节点资源继续使用 `node_id`。

### 笔记与报告

```sql
note
note_tag
note_relation
study_report
```

`note` 保存 `id`、`user_id`、可空 `course_id` / `node_id` / `question_id`、`title`、`content`、`pinned`、`created_at`、`updated_at`。`note_tag` 保存唯一的 `note_id + tag`，`note_relation` 保存每条笔记最多一个 `relation_type + relation_id` 主关联；两个子表均在笔记硬删除时级联删除。`user_id + pinned + updated_at`、课程、节点、标签和关联目标均建立查询索引。

### 日志与安全

```sql
user_behavior_log
model_call_log
audit_log
```

## 多模态增强字段

```sql
chat_session.session_type
chat_message.audio_url
chat_message.video_url
chat_message.provider_task_id
chat_message.used_documents

multimodal_generation_task.id
multimodal_generation_task.user_id
multimodal_generation_task.course_id
multimodal_generation_task.node_id
multimodal_generation_task.resource_id
multimodal_generation_task.task_type
multimodal_generation_task.provider
multimodal_generation_task.status
multimodal_generation_task.progress
multimodal_generation_task.current_step
multimodal_generation_task.input_payload
multimodal_generation_task.output_payload
multimodal_generation_task.error_message
multimodal_generation_task.created_at
multimodal_generation_task.updated_at

multimodal_task_event.id
multimodal_task_event.task_id
multimodal_task_event.event_type
multimodal_task_event.step_name
multimodal_task_event.progress
multimodal_task_event.message
multimodal_task_event.payload
multimodal_task_event.created_at
```

后续创建真实模型或迁移时，必须先从 `docs/interface-contract.md` 复制准确字段列表；如果功能需要新增列，先同步契约再实现。
