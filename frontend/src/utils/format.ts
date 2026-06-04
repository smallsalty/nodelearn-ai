import type {
  AgentType,
  AuditStatus,
  DifficultyLevel,
  MasteryStatus,
  QuestionType,
  ResourceType,
  TaskStatus
} from "@/types/contracts";

export const DEFAULT_USER_ID = "user_demo_001";
export const DEFAULT_COURSE_ID = "course_ds_001";

export function percent(value?: number) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

export function score(value?: number) {
  return `${Math.round(value ?? 0)}`;
}

export function formatDate(value?: string) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

export function joinText(values?: string[]) {
  return values?.length ? values.join("、") : "暂无";
}

export function difficultyLabel(value?: DifficultyLevel) {
  const map: Record<DifficultyLevel, string> = {
    easy: "基础",
    medium: "中等",
    hard: "较难",
    challenge: "挑战"
  };
  return value ? map[value] : "暂无";
}

export function masteryLabel(value?: MasteryStatus) {
  const map: Record<MasteryStatus, string> = {
    not_started: "未开始",
    learning: "学习中",
    weak: "薄弱",
    basic: "基本掌握",
    mastered: "已掌握"
  };
  return value ? map[value] : "暂无";
}

export function statusLabel(value?: TaskStatus) {
  const map: Record<TaskStatus, string> = {
    pending: "待处理",
    running: "运行中",
    success: "成功",
    failed: "失败",
    cancelled: "已取消"
  };
  return value ? map[value] : "暂无";
}

export function statusTagType(value?: TaskStatus) {
  if (value === "success") return "success";
  if (value === "failed" || value === "cancelled") return "danger";
  if (value === "running") return "warning";
  return "info";
}

export function auditLabel(value?: AuditStatus) {
  const map: Record<AuditStatus, string> = {
    unchecked: "未审计",
    passed: "已通过",
    rejected: "已拒绝",
    need_review: "需复核"
  };
  return value ? map[value] : "暂无";
}

export function resourceTypeLabel(value?: ResourceType) {
  const map: Record<ResourceType, string> = {
    lecture_doc: "讲解文档",
    mind_map: "思维导图",
    practice_question: "练习题",
    reading_material: "阅读材料",
    code_case: "代码案例",
    video_script: "视频脚本",
    animation_script: "动画脚本",
    project_task: "项目任务",
    summary_note: "总结笔记"
  };
  return value ? map[value] : "资源";
}

export function questionTypeLabel(value?: QuestionType) {
  const map: Record<QuestionType, string> = {
    single_choice: "单选题",
    multiple_choice: "多选题",
    blank: "填空题",
    short_answer: "简答题",
    coding: "代码题",
    case_analysis: "案例分析"
  };
  return value ? map[value] : "题目";
}

export function agentLabel(value?: AgentType) {
  const map: Record<AgentType, string> = {
    profile_agent: "画像智能体",
    planner_agent: "规划智能体",
    qa_agent: "问答智能体",
    resource_agent: "资源智能体",
    practice_agent: "练习智能体",
    multimodal_agent: "多模态智能体",
    recommendation_agent: "推荐智能体",
    safety_agent: "安全智能体",
    knowledge_graph_agent: "图谱智能体",
    note_agent: "笔记智能体",
    report_agent: "报告智能体"
  };
  return value ? map[value] : "智能体";
}
