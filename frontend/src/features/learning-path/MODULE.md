# 前端学习路径边界

- 阅读 `docs/modules/learning-path.md`。
- 使用 `src/types/learningPath.ts`。
- 使用 `src/api/modules/learningPath.ts`。
- 页面壳：`src/pages/LearningPathPage.vue`。
- 任务状态值必须与 `TaskStatus` 保持一致。
- 展示时将 `taskType` 和节点标识映射为中文，不改变契约枚举；每项任务显示建议完成时间、学习工具推荐和可直接复制的中文提示词。
