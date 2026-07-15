<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { programmingApi } from "@/api/modules/programming";
import { getErrorMessage } from "@/api/client";
import type { ProgrammingLanguage } from "@/types/contracts";
import type { ProgrammingJudgeResult, ProgrammingQuestion } from "@/types/programming";
import { difficultyLabel } from "@/utils/format";

const props = defineProps<{
  userId: string;
  question: ProgrammingQuestion | null;
}>();

const templates: Record<ProgrammingLanguage, string> = {
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n  // 在这里完成题目\n  return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main(void) {\n  // 在这里完成题目\n  return 0;\n}\n",
  python: "import sys\n\n# 在这里完成题目\n"
};

const language = ref<ProgrammingLanguage>("cpp");
const sourceCode = ref(templates.cpp);
const result = ref<ProgrammingJudgeResult | null>(null);
const running = ref(false);
const errorMessage = ref("");
const canSubmit = computed(() => Boolean(props.question && sourceCode.value.trim()));

watch(
  () => props.question?.id,
  () => {
    sourceCode.value = templates[language.value];
    result.value = null;
    errorMessage.value = "";
  }
);

function changeLanguage(value: ProgrammingLanguage) {
  language.value = value;
  sourceCode.value = templates[value];
  result.value = null;
}

async function runCode() {
  if (!props.question || !sourceCode.value.trim()) return;
  running.value = true;
  errorMessage.value = "";
  try {
    const response = await programmingApi.submit({
      userId: props.userId,
      questionId: props.question.id,
      language: language.value,
      sourceCode: sourceCode.value
    });
    result.value = {
      ...response.data,
      failedSampleIndex: response.data.failedSampleIndex ?? undefined
    };
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <el-empty v-if="!question" description="请先生成当前知识节点的编程题" />
  <article v-else class="question-card programming-question-card">
    <div class="tag-row">
      <el-tag>编程题</el-tag>
      <el-tag type="warning">{{ difficultyLabel(question.difficulty) }}</el-tag>
      <el-tag>{{ question.timeLimitSeconds }} 秒</el-tag>
    </div>
    <h3>{{ question.title }}</h3>
    <p>{{ question.content }}</p>
    <h4>输入格式</h4>
    <p>{{ question.inputFormat }}</p>
    <h4>输出格式</h4>
    <p>{{ question.outputFormat }}</p>
    <h4>约束</h4>
    <p>{{ question.constraints }}</p>
    <h4>样例</h4>
    <article v-for="(sample, index) in question.sampleCases" :key="index" class="sample-case">
      <strong>输入</strong>
      <pre>{{ sample.input }}</pre>
      <strong>输出</strong>
      <pre>{{ sample.output }}</pre>
    </article>

    <el-form-item label="编程语言">
      <el-radio-group :model-value="language" @change="changeLanguage">
        <el-radio-button value="cpp">C++</el-radio-button>
        <el-radio-button value="c">C</el-radio-button>
        <el-radio-button value="python">Python</el-radio-button>
      </el-radio-group>
    </el-form-item>
    <el-input v-model="sourceCode" type="textarea" :rows="16" class="code-editor" aria-label="编程题代码编辑器" />
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="mt-16" />
    <div class="button-row">
      <el-button type="primary" :loading="running" :disabled="!canSubmit" @click="runCode">运行并判题</el-button>
    </div>

    <el-result
      v-if="result"
      :icon="result.verdict === 'AC' ? 'success' : 'warning'"
      :title="result.verdict"
      :sub-title="result.stderr || result.compileOutput || (result.verdict === 'AC' ? '全部公开与隐藏测试用例通过。' : '未通过判题测试。')"
    >
      <template #extra>
        <p v-if="result.timeSeconds">运行时间：{{ result.timeSeconds }} 秒</p>
        <p v-if="result.failedSampleIndex !== undefined">未通过公开样例 {{ result.failedSampleIndex + 1 }}</p>
      </template>
    </el-result>
  </article>
</template>

<style scoped>
.programming-question-card {
  min-width: 0;
}

.sample-case {
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-md);
}

.sample-case pre {
  margin: 6px 0;
  white-space: pre-wrap;
}

.code-editor :deep(textarea) {
  font-family: Consolas, "Courier New", monospace;
}
</style>
