<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Calendar, CopyDocument, MagicStick, Tools } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useRouter, type RouteLocationRaw } from "vue-router";
import StateBlock from "@/components/StateBlock.vue";
import { courseApi } from "@/api/modules/course";
import { learningPathApi } from "@/api/modules/learningPath";
import { profileApi } from "@/api/modules/profile";
import { systemApi } from "@/api/modules/system";
import { getErrorMessage } from "@/api/client";
import { appState, setCurrentProfile } from "@/stores";
import type { KnowledgeNode } from "@/types/course";
import type { LearningPath, LearningTask } from "@/types/learningPath";
import type { SystemConfig, TaskStatus } from "@/types/contracts";
import {
  DEFAULT_COURSE_ID,
  DEFAULT_USER_ID,
  formatDate,
  learningTaskStatusLabel,
  learningTaskTypeLabel,
  statusTagType
} from "@/utils/format";

interface LearningToolRecommendation {
  name: string;
  description: string;
  prompt: string;
  route: RouteLocationRaw;
}

const router = useRouter();
const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const courseId = computed(() => appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const paths = ref<LearningPath[]>([]);
const selectedPathId = ref("");
const tasks = ref<LearningTask[]>([]);
const nodes = ref<KnowledgeNode[]>([]);
const systemConfig = ref<SystemConfig>();
const targetGoal = ref("准备数据结构期末考试，优先补强栈、递归和哈希表");
const timeBudget = ref("每天晚上30分钟");
const additionalRequirements = ref(
  "请把每天的学习拆成不超过30分钟的任务；每个任务写明建议完成时间、学习重点和验收标准；每一步至少推荐一种学习工具并给出可直接使用的中文提示词；所有展示文本使用中文，不显示内部编号。"
);
const loading = ref(false);
const generating = ref(false);
const errorMessage = ref("");

const currentPath = computed(() => paths.value.find((path) => path.id === selectedPathId.value) ?? paths.value[0]);
const nodeNameMap = computed(() => new Map(nodes.value.map((node) => [node.id, node.name])));

onMounted(() => {
  void loadPage();
});

async function loadPage() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [pathResponse, profileResponse, nodeResponse, configResponse] = await Promise.all([
      learningPathApi.getUserLearningPaths(userId.value),
      profileApi.getProfile(userId.value),
      courseApi.getNodes(courseId.value),
      systemApi.config()
    ]);
    paths.value = pathResponse.data;
    nodes.value = nodeResponse.data;
    systemConfig.value = configResponse.data;
    setCurrentProfile(profileResponse.data);
    if (!selectedPathId.value && paths.value[0]) selectedPathId.value = paths.value[0].id;
    await loadTasks();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function loadTasks() {
  if (!currentPath.value) {
    tasks.value = [];
    return;
  }
  const response = await learningPathApi.getLearningTasks(currentPath.value.id);
  tasks.value = response.data;
}

async function generatePath() {
  generating.value = true;
  errorMessage.value = "";
  try {
    const response = await learningPathApi.generateLearningPath({
      userId: userId.value,
      courseId: courseId.value,
      targetGoal: targetGoal.value.trim(),
      timeBudget: timeBudget.value.trim(),
      weakNodeIds: appState.currentProfile?.weakNodeIds,
      additionalRequirements: additionalRequirements.value.trim()
    });
    paths.value = [response.data, ...paths.value.filter((item) => item.id !== response.data.id)];
    selectedPathId.value = response.data.id;
    await loadTasks();
    ElMessage.success("个性化学习路径已生成");
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    generating.value = false;
  }
}

async function updateTask(task: LearningTask, status: TaskStatus) {
  const response = await learningPathApi.updateLearningTaskStatus(task.id, {
    status,
    completedAt: status === "success" ? new Date().toISOString() : undefined
  });
  tasks.value = tasks.value.map((item) => (item.id === task.id ? response.data : item));
}

function nodeName(task: LearningTask) {
  return nodeNameMap.value.get(task.nodeId) ?? "课程重点知识点";
}

function toolRecommendations(task: LearningTask): LearningToolRecommendation[] {
  const topic = nodeName(task);
  const videoPromptByTaskType: Record<LearningTask["taskType"], string> = {
    learn: `请为“${topic}”生成约两分钟的中文讲解视频，从一个问题切入，动态演示核心机制，包含完整例子和一个易错点。`,
    practice: `请为“${topic}”生成约两分钟的中文讲解视频，围绕典型解题过程，展示关键状态变化、常见错误和纠正方法。`,
    review: `请为“${topic}”生成约两分钟的中文复习视频，串联核心定义、关键步骤、知识对比和三个记忆结论。`,
    project: `请为“${topic}”生成约两分钟的中文应用讲解视频，用具体项目案例说明工作机制、实现步骤和方案取舍。`
  };
  const shared = {
    qa: {
      name: "问答助手",
      description: "围绕当前知识点追问原理、误区和自检方法。",
      prompt: `请结合当前课程材料，用一个生活化例子解释“${topic}”，指出两个易错点，并给我一道不直接给答案的自检题。`,
      route: { path: "/chat" }
    },
    mindMap: {
      name: "思维导图",
      description: "把概念、步骤和关联知识整理成结构图。",
      prompt: `请为“${topic}”整理一张中文思维导图，包含核心概念、关键步骤、常见错误和与前置知识的联系。`,
      route: { path: "/resources", query: { action: "mind_map", nodeId: task.nodeId } }
    },
    video: {
      name: "视频讲解",
      description: "用动态演示讲清原理、过程、案例和易错点。",
      prompt: videoPromptByTaskType[task.taskType],
      route: { path: "/resources", query: { action: "knowledge_video", nodeId: task.nodeId } }
    },
    practice: {
      name: "练习测评",
      description: "用由浅入深的题目检查是否真正掌握。",
      prompt: `请围绕“${topic}”生成三道由浅入深的中文练习题，先只给题目和提示，我作答后再逐题讲解。`,
      route: { path: "/practice", query: { nodeId: task.nodeId } }
    },
    digital: {
      name: "数字人解答",
      description: "通过实时口头讲解梳理难点和思考过程。",
      prompt: `请用不超过两分钟的中文口头讲解说明“${topic}”，先讲直观例子，再讲原理，最后给出一个记忆口诀。`,
      route: { path: "/resources", query: { action: "digital_human_chat", nodeId: task.nodeId } }
    },
    resource: {
      name: "课程资源",
      description: "查看讲解文档、案例和补充学习材料。",
      prompt: `请推荐最适合学习“${topic}”的课程资源，并说明阅读顺序、每份材料要解决的问题和完成标准。`,
      route: { path: "/resources", query: { nodeId: task.nodeId } }
    }
  };

  if (task.taskType === "learn") return [shared.resource, shared.mindMap, shared.video, shared.qa];
  if (task.taskType === "practice") return [shared.practice, shared.video, shared.qa, shared.resource];
  if (task.taskType === "project") return [shared.resource, shared.video, shared.practice, shared.qa];
  return [shared.mindMap, shared.video, shared.qa, shared.digital];
}

async function copyPrompt(prompt: string) {
  await navigator.clipboard.writeText(prompt);
  ElMessage.success("提示词已复制");
}

function openTool(task: LearningTask, recommendation: LearningToolRecommendation) {
  appState.selectedNodeId = task.nodeId;
  void router.push(recommendation.route);
}
</script>

<template>
  <section class="learning-path-page localized-path-page">
    <section class="panel-card path-generator-card">
      <header class="panel-header">
        <div>
          <div class="path-eyebrow"><el-icon><MagicStick /></el-icon>根据画像与课程知识生成</div>
          <h2>个性化学习路径</h2>
          <p>把学习目标、时间安排、学习工具和可直接使用的提示词组织到每一个任务中。</p>
        </div>
        <div class="tag-row">
          <el-tag :type="systemConfig?.enableMock ? 'warning' : 'success'" effect="plain">
            {{ systemConfig?.enableMock ? "演示规则规划" : "真实智能规划" }}
          </el-tag>
          <el-button :loading="loading" @click="loadPage">刷新</el-button>
        </div>
      </header>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="mb-16" />

      <el-form class="path-plan-form" label-position="top">
        <div class="form-grid">
          <el-form-item label="学习目标">
            <el-input v-model="targetGoal" placeholder="例如：准备数据结构期末考试，重点补强栈和递归" />
          </el-form-item>
          <el-form-item label="可用学习时间">
            <el-input v-model="timeBudget" placeholder="例如：每天晚上30分钟" />
          </el-form-item>
        </div>
        <el-form-item label="补充要求（已为你准备好，可按需修改）">
          <el-input v-model="additionalRequirements" type="textarea" :rows="4" resize="vertical" />
        </el-form-item>
        <div class="generator-actions">
          <span>生成后会为每项任务安排建议完成时间，并配套学习工具。</span>
          <el-button
            type="primary"
            :loading="generating"
            :disabled="!targetGoal.trim() || !timeBudget.trim()"
            @click="generatePath"
          >
            生成学习路径
          </el-button>
        </div>
      </el-form>

      <StateBlock :loading="loading" :error="errorMessage" :empty="!currentPath" empty-text="暂无学习路径" @retry="loadPage">
        <section v-if="currentPath" class="path-summary localized-path-summary">
          <el-select v-model="selectedPathId" placeholder="选择学习路径" @change="loadTasks">
            <el-option v-for="path in paths" :key="path.id" :label="path.title" :value="path.id" />
          </el-select>
          <div>
            <h3>{{ currentPath.title }}</h3>
            <p>{{ currentPath.description ?? currentPath.targetGoal }}</p>
          </div>
          <div class="tag-row">
            <el-tag>{{ currentPath.currentStage }}</el-tag>
            <el-tag :type="statusTagType(currentPath.status)">{{ learningTaskStatusLabel(currentPath.status) }}</el-tag>
            <el-tag type="info">{{ tasks.length || currentPath.pathNodeIds.length }} 项任务</el-tag>
          </div>
        </section>
      </StateBlock>
    </section>

    <section class="panel-card">
      <header class="panel-header">
        <div>
          <h2>路径任务</h2>
          <p>建议时间已写入每项任务；工具提示词可以直接复制使用。</p>
        </div>
      </header>
      <el-empty v-if="!tasks.length" description="暂无任务，请先生成学习路径" />
      <el-timeline v-else class="path-step-flow localized-task-flow">
        <el-timeline-item
          v-for="task in tasks"
          :key="task.id"
          :timestamp="task.dueAt ? `建议完成：${formatDate(task.dueAt)}` : '建议完成时间待安排'"
        >
          <article class="task-card localized-task-card">
            <header>
              <div class="task-heading">
                <span>第 {{ task.orderIndex }} 项 · {{ learningTaskTypeLabel(task.taskType) }}</span>
                <strong>{{ task.title }}</strong>
              </div>
              <el-tag size="small" :type="statusTagType(task.status)">{{ learningTaskStatusLabel(task.status) }}</el-tag>
            </header>

            <div class="task-focus-row">
              <span><el-icon><Calendar /></el-icon> {{ task.dueAt ? formatDate(task.dueAt) : "时间待安排" }}</span>
              <span>学习重点：{{ nodeName(task) }}</span>
            </div>

            <section class="task-tools" :aria-label="`${task.title}的学习工具推荐`">
              <div class="tool-section-heading">
                <el-icon><Tools /></el-icon>
                <div><strong>学习工具推荐</strong><span>选择工具后，可将提示词直接用于该功能。</span></div>
              </div>
              <div class="tool-grid">
                <article v-for="tool in toolRecommendations(task)" :key="tool.name" class="tool-card">
                  <header><strong>{{ tool.name }}</strong><el-tag size="small" effect="plain">推荐</el-tag></header>
                  <p>{{ tool.description }}</p>
                  <div class="prompt-box"><span>可用提示词</span><p>{{ tool.prompt }}</p></div>
                  <div class="tool-actions">
                    <el-button size="small" :icon="CopyDocument" @click="copyPrompt(tool.prompt)">复制提示词</el-button>
                    <el-button size="small" type="primary" plain @click="openTool(task, tool)">打开工具</el-button>
                  </div>
                </article>
              </div>
            </section>

            <div class="button-row task-status-actions">
              <el-button size="small" plain :disabled="task.status === 'running'" @click="updateTask(task, 'running')">开始学习</el-button>
              <el-button size="small" type="success" plain :disabled="task.status === 'success'" @click="updateTask(task, 'success')">标记完成</el-button>
            </div>
          </article>
        </el-timeline-item>
      </el-timeline>
    </section>
  </section>
</template>

<style scoped>
.path-eyebrow,
.task-focus-row,
.tool-section-heading,
.generator-actions,
.tool-actions {
  display: flex;
  align-items: center;
}

.path-eyebrow {
  gap: 7px;
  margin-bottom: 8px;
  color: var(--nl-warning);
  font-size: 13px;
  font-weight: 700;
}

.path-plan-form {
  margin-bottom: 18px;
  padding: 18px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-lg);
  background: var(--nl-primary-tint);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.generator-actions {
  justify-content: space-between;
  gap: 16px;
  color: var(--nl-text-muted);
  font-size: 13px;
}

.localized-path-summary {
  grid-template-columns: minmax(210px, 0.35fr) minmax(0, 1fr) auto;
  align-items: center;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-lg);
  background: var(--nl-surface);
}

.localized-path-summary h3,
.localized-path-summary p {
  margin: 0;
}

.localized-task-card,
.localized-path-page .localized-task-card:nth-child(odd),
.localized-path-page .localized-task-card:nth-child(even) {
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--nl-border);
  background: var(--nl-surface);
  color: var(--nl-text);
  box-shadow: var(--nl-shadow-card);
}

.localized-path-page .localized-task-card p,
.localized-path-page .localized-task-card span,
.localized-path-page .localized-task-card small {
  color: var(--nl-text-muted);
}

.task-heading {
  display: grid;
  gap: 4px;
}

.task-heading > span {
  color: var(--nl-warning) !important;
  font-size: 12px;
  font-weight: 700;
}

.task-heading > strong {
  font-size: 18px;
}

.task-focus-row {
  flex-wrap: wrap;
  gap: 10px;
}

.task-focus-row > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 999px;
  background: var(--nl-workbench-bg);
  color: var(--nl-text) !important;
  font-size: 13px;
}

.task-tools {
  display: grid;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--nl-border);
}

.tool-section-heading {
  align-items: flex-start;
  gap: 9px;
}

.tool-section-heading > div {
  display: grid;
  gap: 2px;
}

.tool-section-heading span {
  font-size: 13px;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.tool-card {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 9px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-md);
  background: var(--nl-workbench-bg);
}

.tool-card > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tool-card > p,
.prompt-box p {
  margin: 0;
  line-height: 1.65;
}

.prompt-box {
  padding: 10px;
  border-left: 3px solid var(--nl-primary);
  border-radius: var(--nl-radius-sm);
  background: var(--nl-surface);
}

.prompt-box > span {
  display: block;
  margin-bottom: 4px;
  color: var(--nl-warning) !important;
  font-size: 12px;
  font-weight: 700;
}

.prompt-box p {
  color: var(--nl-text) !important;
  font-size: 13px;
}

.tool-actions {
  flex-wrap: wrap;
  gap: 6px;
}

.tool-actions .el-button + .el-button {
  margin-left: 0;
}

.task-status-actions {
  justify-content: flex-end;
}

@media (max-width: 1080px) {
  .tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .localized-path-summary {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .tool-grid {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .generator-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .generator-actions .el-button {
    width: 100%;
  }

  .localized-task-card {
    padding: 15px;
  }

  .localized-task-card > header {
    align-items: flex-start;
  }
}
</style>
