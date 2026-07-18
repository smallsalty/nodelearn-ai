<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import ProgrammingPracticePanel from "@/components/practice/ProgrammingPracticePanel.vue";
import { courseApi } from "@/api/modules/course";
import { practiceApi } from "@/api/modules/practice";
import { profileApi } from "@/api/modules/profile";
import { programmingApi } from "@/api/modules/programming";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { KnowledgeNode } from "@/types/course";
import type { PracticeGenerationStep, PracticeQuestion, PracticeRecord, UnifiedPracticeType } from "@/types/practice";
import type { ProgrammingQuestion } from "@/types/programming";
import { DEFAULT_COURSE_ID, DEFAULT_USER_ID, difficultyLabel, questionTypeLabel, statusLabel, statusTagType } from "@/utils/format";

const route = useRoute();
const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const courseId = computed(() => appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const selectedNodeId = ref(
  typeof route.query.nodeId === "string" ? route.query.nodeId : appState.selectedNodeId ?? ""
);
const nodes = ref<KnowledgeNode[]>([]);
const questions = ref<PracticeQuestion[]>([]);
const wrongQuestions = ref<PracticeQuestion[]>([]);
const programmingQuestions = ref<ProgrammingQuestion[]>([]);
const selectedQuestionIds = reactive<Record<"single_choice" | "short_answer", string | null>>({
  single_choice: null,
  short_answer: null
});
const selectedProgrammingQuestionId = ref<string | null>(null);
const userAnswer = ref("");
const currentRecord = ref<PracticeRecord | null>(null);
const loading = ref(false);
const generatingAll = ref(false);
const submitting = ref(false);
const errorMessage = ref("");
const activeTab = ref<UnifiedPracticeType | "wrong">(routeTab());
let mounted = false;

const ordinaryTabs = [
  { value: "single_choice" as const, label: "单选题" },
  { value: "short_answer" as const, label: "简答题" }
];
const generationSteps = reactive<PracticeGenerationStep[]>([
  { questionType: "single_choice", status: null },
  { questionType: "short_answer", status: null },
  { questionType: "coding", status: null }
]);

const selectedProgrammingQuestion = computed(
  () =>
    programmingQuestions.value.find((question) => question.id === selectedProgrammingQuestionId.value) ??
    programmingQuestions.value[0] ??
    null
);
const nodeNameMap = computed(() => new Map(nodes.value.map((node) => [node.id, node.name])));
const selectedNodeName = computed(() => {
  if (!selectedNodeId.value) return "请先从工作台选择知识节点";
  return nodeNameMap.value.get(selectedNodeId.value) ?? "未找到对应知识点";
});
const hasValidSelectedNode = computed(() => Boolean(selectedNodeId.value && nodeNameMap.value.has(selectedNodeId.value)));
const filteredWrongQuestions = computed(() =>
  wrongQuestions.value.filter(
    (question) =>
      question.courseId === courseId.value && (!selectedNodeId.value || question.nodeId === selectedNodeId.value)
  )
);

onMounted(async () => {
  applyRouteQuery();
  mounted = true;
  await loadPage();
});

watch(
  () => [route.query.nodeId, route.query.tab],
  () => {
    applyRouteQuery();
    if (mounted) void loadPage();
  }
);

watch(
  () => appState.selectedNodeId,
  (nodeId) => {
    if (!nodeId || nodeId === selectedNodeId.value) return;
    selectedNodeId.value = nodeId;
    resetSelections();
    if (mounted) void loadPage();
  }
);

watch(courseId, () => {
  nodes.value = [];
  resetSelections();
  if (mounted) void loadPage();
});

watch(activeTab, () => resetAnswer());

function routeTab(): UnifiedPracticeType | "wrong" {
  const tab = typeof route.query.tab === "string" ? route.query.tab : "single_choice";
  return ["single_choice", "short_answer", "coding", "wrong"].includes(tab)
    ? (tab as UnifiedPracticeType | "wrong")
    : "single_choice";
}

function applyRouteQuery() {
  const routeNodeId = typeof route.query.nodeId === "string" ? route.query.nodeId : "";
  if (routeNodeId) {
    selectedNodeId.value = routeNodeId;
    appState.selectedNodeId = routeNodeId;
  }
  activeTab.value = routeTab();
}

async function loadPage() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [questionResponse, wrongResponse, programmingResponse, nodeResponse] = await Promise.all([
      practiceApi.getQuestions({ page: 1, pageSize: 100 }),
      practiceApi.getWrongQuestions(userId.value),
      programmingApi.listQuestions({ page: 1, pageSize: 100 }),
      courseApi.getNodes(courseId.value)
    ]);
    nodes.value = nodeResponse.data;
    questions.value = questionResponse.data.list.filter(
      (question) =>
        question.courseId === courseId.value &&
        (!selectedNodeId.value || question.nodeId === selectedNodeId.value) &&
        (question.questionType === "single_choice" || question.questionType === "short_answer")
    );
    wrongQuestions.value = wrongResponse.data;
    programmingQuestions.value = programmingResponse.data.list.filter(
      (question) =>
        question.courseId === courseId.value && (!selectedNodeId.value || question.nodeId === selectedNodeId.value)
    );
    selectedQuestionIds.single_choice = questionsFor("single_choice")[0]?.id ?? null;
    selectedQuestionIds.short_answer = questionsFor("short_answer")[0]?.id ?? null;
    selectedProgrammingQuestionId.value = programmingQuestions.value[0]?.id ?? null;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

function questionsFor(type: "single_choice" | "short_answer") {
  return questions.value.filter((question) => question.questionType === type);
}

function questionFor(type: "single_choice" | "short_answer") {
  const values = questionsFor(type);
  return values.find((question) => question.id === selectedQuestionIds[type]) ?? values[0] ?? null;
}

function resetSelections() {
  selectedQuestionIds.single_choice = null;
  selectedQuestionIds.short_answer = null;
  selectedProgrammingQuestionId.value = null;
  questions.value = [];
  programmingQuestions.value = [];
  resetAnswer();
}

function resetAnswer() {
  userAnswer.value = "";
  currentRecord.value = null;
}

function optionAnswerValue(option: string) {
  return option.match(/^\s*([A-Za-z])(?:[.、:：)）]|\s)/)?.[1]?.toUpperCase() ?? option;
}

function nodeName(nodeId?: string) {
  if (!nodeId) return "未关联知识点";
  return nodeNameMap.value.get(nodeId) ?? "未找到对应知识点";
}

function selectQuestion(question: PracticeQuestion, type: "single_choice" | "short_answer") {
  selectedQuestionIds[type] = question.id;
  appState.selectedQuestionId = question.id;
  resetAnswer();
}

function showReferenceAnswer(question: PracticeQuestion | null) {
  userAnswer.value = question?.answer ?? "";
}

async function submitAnswer(question: PracticeQuestion | null) {
  if (!question || !userAnswer.value.trim()) return;
  submitting.value = true;
  errorMessage.value = "";
  try {
    const response = await practiceApi.submitPractice({
      userId: userId.value,
      questionId: question.id,
      userAnswer: userAnswer.value.trim(),
      durationSeconds: 60
    });
    currentRecord.value = response.data;
    await profileApi.updateByPractice({
      userId: userId.value,
      courseId: courseId.value,
      questionId: question.id,
      nodeId: question.nodeId,
      isCorrect: response.data.isCorrect,
      mistakeReason: response.data.mistakeReason
    });
    wrongQuestions.value = (await practiceApi.getWrongQuestions(userId.value)).data;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    submitting.value = false;
  }
}

async function generateAllPractices() {
  if (!selectedNodeId.value) return;
  generatingAll.value = true;
  for (const step of generationSteps) {
    step.status = null;
    step.errorMessage = undefined;
  }
  await generateOrdinary("single_choice");
  await generateOrdinary("short_answer");
  await generateProgramming();
  generatingAll.value = false;
}

async function generateOrdinary(type: "single_choice" | "short_answer") {
  const step = generationStep(type);
  step.status = "running";
  step.errorMessage = undefined;
  try {
    const response = await practiceApi.generatePractices({
      userId: userId.value,
      courseId: courseId.value,
      nodeId: selectedNodeId.value,
      questionTypes: [type],
      difficulty: "medium",
      count: 1
    });
    const question = response.data[0];
    if (!question) throw new Error(`${questionTypeLabel(type)}没有返回题目`);
    questions.value = [question, ...questions.value.filter((item) => item.id !== question.id)];
    selectedQuestionIds[type] = question.id;
    step.status = "success";
  } catch (error) {
    step.status = "failed";
    step.errorMessage = getErrorMessage(error);
  }
}

async function generateProgramming() {
  const step = generationStep("coding");
  step.status = "running";
  step.errorMessage = undefined;
  try {
    const response = await programmingApi.generateQuestions({
      userId: userId.value,
      courseId: courseId.value,
      nodeId: selectedNodeId.value,
      difficulty: "medium",
      count: 1
    });
    const question = response.data[0];
    if (!question) throw new Error("编程题没有返回题目");
    programmingQuestions.value = [question, ...programmingQuestions.value.filter((item) => item.id !== question.id)];
    selectedProgrammingQuestionId.value = question.id;
    step.status = "success";
  } catch (error) {
    step.status = "failed";
    step.errorMessage = getErrorMessage(error);
  }
}

function generationStep(type: UnifiedPracticeType) {
  const step = generationSteps.find((item) => item.questionType === type);
  if (!step) throw new Error(`Unknown practice generation step: ${type}`);
  return step;
}

function retryStep(type: UnifiedPracticeType) {
  if (type === "coding") {
    void generateProgramming();
    return;
  }
  void generateOrdinary(type);
}

function generationLabel(type: UnifiedPracticeType) {
  if (type === "coding") return "编程题";
  return questionTypeLabel(type);
}
</script>

<template>
  <section class="practice-page">
    <section class="panel-card" v-loading="loading">
      <header class="panel-header">
        <div>
          <h2>统一练习</h2>
          <p>当前节点：{{ selectedNodeName }}。依次生成单选、简答和真实判题编程题。</p>
        </div>
        <div class="button-row">
          <el-button :loading="loading" @click="loadPage">刷新</el-button>
          <el-button
            type="primary"
            :loading="generatingAll"
            :disabled="!hasValidSelectedNode"
            @click="generateAllPractices"
          >
            生成三类练习
          </el-button>
        </div>
      </header>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="mb-16" />

      <section class="generation-step-grid" aria-label="练习生成进度">
        <article v-for="step in generationSteps" :key="step.questionType" class="generation-step-card">
          <div>
            <strong>{{ generationLabel(step.questionType) }}</strong>
            <span>{{ step.status ? statusLabel(step.status) : "等待生成" }}</span>
          </div>
          <el-tag :type="step.status ? statusTagType(step.status) : 'info'">
            {{ step.status ?? "idle" }}
          </el-tag>
          <p v-if="step.errorMessage">{{ step.errorMessage }}</p>
          <el-button v-if="step.status === 'failed'" size="small" plain @click="retryStep(step.questionType)">单独重试</el-button>
        </article>
      </section>
    </section>

    <el-tabs v-model="activeTab" class="page-tabs unified-practice-tabs">
      <el-tab-pane v-for="tab in ordinaryTabs" :key="tab.value" :label="tab.label" :name="tab.value">
        <section class="practice-workspace">
          <article v-if="questionFor(tab.value)" class="question-card">
            <div class="tag-row">
              <el-tag>{{ questionTypeLabel(questionFor(tab.value)!.questionType) }}</el-tag>
              <el-tag type="warning">{{ difficultyLabel(questionFor(tab.value)!.difficulty) }}</el-tag>
              <el-tag type="info">{{ nodeName(questionFor(tab.value)!.nodeId) }}</el-tag>
            </div>
            <h3>{{ questionFor(tab.value)!.title }}</h3>
            <p>{{ questionFor(tab.value)!.content }}</p>

            <el-radio-group
              v-if="questionFor(tab.value)!.options?.length"
              v-model="userAnswer"
              class="option-list"
            >
              <el-radio
                v-for="option in questionFor(tab.value)!.options"
                :key="option"
                :value="optionAnswerValue(option)"
              >
                {{ option }}
              </el-radio>
            </el-radio-group>
            <el-input v-else v-model="userAnswer" type="textarea" :rows="6" placeholder="输入你的答案" />

            <div class="button-row">
              <el-button
                type="primary"
                :loading="submitting"
                :disabled="!userAnswer.trim()"
                @click="submitAnswer(questionFor(tab.value))"
              >
                提交答案
              </el-button>
              <el-button plain @click="showReferenceAnswer(questionFor(tab.value))">查看参考答案</el-button>
            </div>

            <el-result
              v-if="currentRecord"
              :icon="currentRecord.isCorrect ? 'success' : 'warning'"
              :title="currentRecord.isCorrect ? '回答正确' : '需要复习'"
              :sub-title="`得分 ${currentRecord.score}，正确答案：${currentRecord.correctAnswer}`"
            >
              <template #extra>
                <p>{{ currentRecord.mistakeReason || questionFor(tab.value)!.explanation }}</p>
              </template>
            </el-result>
          </article>
          <el-empty v-else :description="`暂无${tab.label}，可使用上方总生成按钮`" />

          <aside class="practice-question-list">
            <h3>{{ tab.label }}列表</h3>
            <button
              v-for="question in questionsFor(tab.value)"
              :key="question.id"
              type="button"
              class="list-button"
              :class="{ active: question.id === questionFor(tab.value)?.id }"
              @click="selectQuestion(question, tab.value)"
            >
              <strong>{{ question.title }}</strong>
              <span>{{ difficultyLabel(question.difficulty) }}</span>
            </button>
          </aside>
        </section>
      </el-tab-pane>

      <el-tab-pane label="编程题" name="coding">
        <section class="practice-workspace">
          <ProgrammingPracticePanel :user-id="userId" :question="selectedProgrammingQuestion" />
          <aside class="practice-question-list">
            <h3>编程题列表</h3>
            <button
              v-for="question in programmingQuestions"
              :key="question.id"
              type="button"
              class="list-button"
              :class="{ active: question.id === selectedProgrammingQuestion?.id }"
              @click="selectedProgrammingQuestionId = question.id"
            >
              <strong>{{ question.title }}</strong>
              <span>{{ difficultyLabel(question.difficulty) }}</span>
            </button>
          </aside>
        </section>
      </el-tab-pane>

      <el-tab-pane label="错题本" name="wrong">
        <el-empty v-if="!filteredWrongQuestions.length" description="当前节点暂无错题" />
        <section v-else class="soft-card-grid">
          <article v-for="question in filteredWrongQuestions" :key="question.id" class="mini-list-item">
            <strong>{{ question.title }}</strong>
            <span>{{ questionTypeLabel(question.questionType) }} · {{ nodeName(question.nodeId) }}</span>
          </article>
        </section>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<style scoped>
.generation-step-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.generation-step-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-md);
  background: var(--nl-bg);
}

.generation-step-card div {
  display: grid;
  gap: 4px;
}

.generation-step-card span,
.generation-step-card p {
  color: var(--nl-text-muted);
  font-size: 12px;
}

.generation-step-card p,
.generation-step-card .el-button {
  grid-column: 1 / -1;
  margin: 0;
}

.practice-workspace {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(240px, 0.75fr);
  align-items: start;
  gap: 14px;
}

.practice-question-list {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-lg);
  background: var(--nl-surface);
}

.practice-question-list h3 {
  margin: 0 0 4px;
}

@media (max-width: 900px) {
  .practice-workspace,
  .generation-step-grid {
    grid-template-columns: 1fr;
  }
}
</style>
