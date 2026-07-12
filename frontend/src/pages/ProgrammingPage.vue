<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import StateBlock from "@/components/StateBlock.vue";
import { courseApi } from "@/api/modules/course";
import { programmingApi } from "@/api/modules/programming";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { KnowledgeNode } from "@/types/course";
import type { DifficultyLevel, ProgrammingLanguage } from "@/types/contracts";
import type { ProgrammingJudgeResult, ProgrammingQuestion } from "@/types/programming";
import { DEFAULT_COURSE_ID, DEFAULT_USER_ID, difficultyLabel } from "@/utils/format";

const route = useRoute();
const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const courseId = computed(() => appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const nodes = ref<KnowledgeNode[]>([]); const questions = ref<ProgrammingQuestion[]>([]);
const selectedNodeId = ref(typeof route.query.nodeId === "string" ? route.query.nodeId : appState.selectedNodeId ?? "");
const selectedQuestionId = ref<string | null>(null); const difficulty = ref<DifficultyLevel>("medium");
const templates: Record<ProgrammingLanguage, string> = {
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n  long long a, b;\n  cin >> a >> b;\n  cout << a + b << '\\n';\n  return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main(void) {\n  long long a, b;\n  scanf(\"%lld %lld\", &a, &b);\n  printf(\"%lld\\n\", a + b);\n  return 0;\n}\n",
  python: "import sys\n\na, b = map(int, sys.stdin.read().split())\nprint(a + b)\n"
};
const language = ref<ProgrammingLanguage>("cpp"); const sourceCode = ref(templates.cpp); const result = ref<ProgrammingJudgeResult | null>(null);
const loading = ref(false); const generating = ref(false); const running = ref(false); const errorMessage = ref("");
const selectedQuestion = computed(() => questions.value.find((item) => item.id === selectedQuestionId.value) ?? questions.value[0]);
onMounted(() => void loadPage());
async function loadPage() { loading.value = true; try { const response = await courseApi.getNodes(courseId.value); nodes.value = response.data; if (!selectedNodeId.value) selectedNodeId.value = nodes.value[0]?.id ?? ""; } catch (error) { errorMessage.value = getErrorMessage(error); } finally { loading.value = false; } }
async function generateQuestion() { generating.value = true; errorMessage.value = ""; try { const response = await programmingApi.generateQuestions({ userId: userId.value, courseId: courseId.value, nodeId: selectedNodeId.value || undefined, difficulty: difficulty.value, count: 1 }); questions.value = response.data; selectedQuestionId.value = questions.value[0]?.id ?? null; result.value = null; } catch (error) { errorMessage.value = getErrorMessage(error); } finally { generating.value = false; } }
async function runCode() { if (!selectedQuestion.value || !sourceCode.value.trim()) return; running.value = true; errorMessage.value = ""; try { result.value = (await programmingApi.submit({ userId: userId.value, questionId: selectedQuestion.value.id, language: language.value, sourceCode: sourceCode.value })).data; } catch (error) { errorMessage.value = getErrorMessage(error); } finally { running.value = false; } }
function changeLanguage(value: ProgrammingLanguage) { language.value = value; sourceCode.value = templates[value]; result.value = null; }
</script>

<template><section class="programming-page two-column-page wide-left"><section class="panel-card"><header class="panel-header"><div><h2>编程题</h2><p>选择知识点生成题目，使用标准输入输出完成代码并提交判题。</p></div><el-button :loading="loading" @click="loadPage">刷新</el-button></header><el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="mb-16" /><section class="generator-card"><el-form label-position="top"><div class="option-grid"><el-form-item label="知识点"><el-select v-model="selectedNodeId" filterable><el-option v-for="node in nodes" :key="node.id" :label="node.name" :value="node.id" /></el-select></el-form-item><el-form-item label="难度"><el-select v-model="difficulty"><el-option label="简单" value="easy" /><el-option label="中等" value="medium" /><el-option label="困难" value="hard" /><el-option label="挑战" value="challenge" /></el-select></el-form-item></div><el-button type="primary" :loading="generating" @click="generateQuestion">生成编程题</el-button></el-form></section><StateBlock :loading="loading" :error="errorMessage" :empty="!selectedQuestion" empty-text="请选择知识点后生成一道编程题"><article v-if="selectedQuestion" class="question-card"><div class="tag-row"><el-tag>编程题</el-tag><el-tag type="warning">{{ difficultyLabel(selectedQuestion.difficulty) }}</el-tag><el-tag>{{ selectedQuestion.timeLimitSeconds }} 秒</el-tag></div><h3>{{ selectedQuestion.title }}</h3><p>{{ selectedQuestion.content }}</p><h4>输入格式</h4><p>{{ selectedQuestion.inputFormat }}</p><h4>输出格式</h4><p>{{ selectedQuestion.outputFormat }}</p><h4>约束</h4><p>{{ selectedQuestion.constraints }}</p><h4>样例</h4><article v-for="(sample, index) in selectedQuestion.sampleCases" :key="index" class="sample-case"><strong>输入</strong><pre>{{ sample.input }}</pre><strong>输出</strong><pre>{{ sample.output }}</pre></article><el-form-item label="编程语言"><el-radio-group :model-value="language" @change="changeLanguage"><el-radio-button label="cpp">C++</el-radio-button><el-radio-button label="c">C</el-radio-button><el-radio-button label="python">Python</el-radio-button></el-radio-group></el-form-item><el-input v-model="sourceCode" type="textarea" :rows="16" class="code-editor" /><div class="button-row"><el-button type="primary" :loading="running" @click="runCode">运行并判题</el-button></div><el-result v-if="result" :icon="result.verdict === 'AC' ? 'success' : 'warning'" :title="result.verdict" :sub-title="result.stderr || result.compileOutput || (result.verdict === 'AC' ? '全部公开与隐藏测试用例通过。' : '未通过判题测试。')"><template #extra><p v-if="result.timeSeconds">运行时间：{{ result.timeSeconds }} 秒</p><p v-if="result.failedSampleIndex !== undefined">未通过公开样例 {{ result.failedSampleIndex + 1 }}</p></template></el-result></article></StateBlock></section><aside class="side-stack"><el-card shadow="never"><template #header>本次题目</template><el-empty v-if="!questions.length" description="暂无编程题" /><button v-for="question in questions" :key="question.id" type="button" class="list-button" :class="{ active: question.id === selectedQuestion?.id }" @click="selectedQuestionId = question.id"><strong>{{ question.title }}</strong><span>{{ difficultyLabel(question.difficulty) }}</span></button></el-card></aside></section></template>
<style scoped>.option-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }.sample-case { border:1px solid var(--nl-border); padding:10px; margin-bottom:8px; }.sample-case pre { margin:6px 0; white-space:pre-wrap; }.code-editor :deep(textarea) { font-family:Consolas, monospace; } @media (max-width:760px) { .option-grid { grid-template-columns:1fr; } }</style>
