# Database Schema Summary

Source: `docs/interface-contract.md` sections 2.5 and 25.

## Base Fields

```sql
id
created_at
updated_at
deleted_at
version
```

## Tables

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

### 笔记与报告

```sql
note
note_tag
note_relation
study_report
```

### 日志与安全

```sql
user_behavior_log
model_call_log
audit_log
```

When creating real models or migrations later, copy exact field lists from `docs/interface-contract.md`; do not infer missing columns.
