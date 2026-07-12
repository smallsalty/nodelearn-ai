<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import StateBlock from "@/components/StateBlock.vue";
import { practiceApi } from "@/api/modules/practice";
import { profileApi } from "@/api/modules/profile";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { PracticeQuestion, PracticeRecord } from "@/types/practice";
import type { QuestionType } from "@/types/contracts";
import { DEFAULT_COURSE_ID, DEFAULT_USER_ID, difficultyLabel, questionTypeLabel } from "@/utils/format";

const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const courseId = computed(() => appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const questions = ref<PracticeQuestion[]>([]);
const wrongQuestions = ref<PracticeQuestion[]>([]);
const selectedQuestionId = ref<string | null>(null);
const userAnswer = ref("");
const currentRecord = ref<PracticeRecord | null>(null);
const loading = ref(false);
const generating = ref(false);
const submitting = ref(false);
const errorMessage = ref("");

const selectedQuestion = computed(() => questions.value.find((question) => question.id === selectedQuestionId.value) ?? questions.value[0]);

onMounted(() => {
  void loadPage();
});

async function loadPage() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [questionResponse, wrongResponse] = await Promise.all([
      practiceApi.getQuestions({ page: 1, pageSize: 20 }),
      practiceApi.getWrongQuestions(userId.value)
    ]);
    questions.value = questionResponse.data.list;
    wrongQuestions.value = wrongResponse.data;
    selectedQuestionId.value = selectedQuestion.value?.id ?? null;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function generatePractices() {
  generating.value = true;
  errorMessage.value = "";
  try {
    const response = await practiceApi.generatePractices({
      userId: userId.value,
      courseId: courseId.value,
      nodeId: appState.selectedNodeId ?? "node_stack_001",
      questionTypes: ["single_choice", "short_answer"] as QuestionType[],
      difficulty: "medium",
      count: 2
    });
    questions.value = response.data;
    selectedQuestionId.value = questions.value[0]?.id ?? null;
    currentRecord.value = null;
    userAnswer.value = "";
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    generating.value = false;
  }
}

async function submitAnswer() {
  if (!selectedQuestion.value || !userAnswer.value.trim()) return;
  submitting.value = true;
  errorMessage.value = "";
  try {
    const response = await practiceApi.submitPractice({
      userId: userId.value,
      questionId: selectedQuestion.value.id,
      userAnswer: userAnswer.value.trim(),
      durationSeconds: 60
    });
    currentRecord.value = response.data;
    await profileApi.updateByPractice({
      userId: userId.value,
      courseId: courseId.value,
      questionId: selectedQuestion.value.id,
      nodeId: selectedQuestion.value.nodeId,
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

function selectQuestion(question: PracticeQuestion) {
  selectedQuestionId.value = question.id;
  appState.selectedQuestionId = question.id;
  userAnswer.value = "";
  currentRecord.value = null;
}
</script>

<template>
  <section class="practice-page two-column-page">
    <section class="panel-card">
      <header class="panel-header">
        <div>
          <h2>练习测评</h2>
          <p>题目生成、提交、错因和画像反馈均通过后端契约接口。</p>
        </div>
        <div class="button-row">
          <el-button :loading="loading" @click="loadPage">刷新</el-button>
          <el-button type="primary" :loading="generating" @click="generatePractices">生成练习题</el-button>
        </div>
      </header>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="mb-16" />

      <StateBlock :loading="loading" :error="errorMessage" :empty="!selectedQuestion" empty-text="暂无题目" @retry="loadPage">
        <article v-if="selectedQuestion" class="question-card">
          <div class="tag-row">
            <el-tag>{{ questionTypeLabel(selectedQuestion.questionType) }}</el-tag>
            <el-tag type="warning">{{ difficultyLabel(selectedQuestion.difficulty) }}</el-tag>
            <el-tag v-if="selectedQuestion.nodeId" type="info">{{ selectedQuestion.nodeId }}</el-tag>
          </div>
          <h3>{{ selectedQuestion.title }}</h3>
          <p>{{ selectedQuestion.content }}</p>

          <el-radio-group v-if="selectedQuestion.options?.length" v-model="userAnswer" class="option-list">
            <el-radio v-for="option in selectedQuestion.options" :key="option" :label="option">
              {{ option }}
            </el-radio>
          </el-radio-group>
          <el-input
            v-else
            v-model="userAnswer"
            type="textarea"
            :rows="6"
            placeholder="输入你的答案"
          />

          <div class="button-row">
            <el-button type="primary" :loading="submitting" :disabled="!userAnswer.trim()" @click="submitAnswer">提交答案</el-button>
            <el-button plain @click="userAnswer = selectedQuestion.answer">查看参考答案</el-button>
          </div>

          <el-result
            v-if="currentRecord"
            :icon="currentRecord.isCorrect ? 'success' : 'warning'"
            :title="currentRecord.isCorrect ? '回答正确' : '需要复习'"
            :sub-title="`得分 ${currentRecord.score}，正确答案：${currentRecord.correctAnswer}`"
          >
            <template #extra>
              <p>{{ currentRecord.mistakeReason || selectedQuestion.explanation }}</p>
            </template>
          </el-result>
        </article>
      </StateBlock>
    </section>

    <aside class="side-stack">
      <el-card shadow="never">
        <template #header>题目列表</template>
        <button
          v-for="question in questions"
          :key="question.id"
          type="button"
          class="list-button"
          :class="{ active: question.id === selectedQuestion?.id }"
          @click="selectQuestion(question)"
        >
          <strong>{{ question.title }}</strong>
          <span>{{ questionTypeLabel(question.questionType) }} · {{ difficultyLabel(question.difficulty) }}</span>
        </button>
      </el-card>

      <el-card shadow="never">
        <template #header>错题本</template>
        <el-empty v-if="!wrongQuestions.length" description="暂无错题" />
        <article v-for="question in wrongQuestions" :key="question.id" class="mini-list-item">
          <strong>{{ question.title }}</strong>
          <span>{{ question.nodeId ?? "未关联节点" }}</span>
        </article>
      </el-card>
    </aside>
  </section>
</template>
