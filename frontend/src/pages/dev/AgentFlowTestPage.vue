<script setup lang="ts">
import { computed, ref } from "vue";
import { agentApi } from "@/api/modules/agent";
import { practiceApi } from "@/api/modules/practice";
import MindMapViewer from "@/components/mind-map/MindMapViewer.vue";
import VideoLessonPlayer from "@/components/VideoLessonPlayer.vue";
import type { ApiResponse, AgentType, TaskStatus } from "@/types/contracts";
import type {
  AgentRunRequest,
  AgentRunResult,
  ChatResult,
  MultiAgentWorkflowRequest,
  MultiAgentWorkflowResult
} from "@/types/agent";
import type { PracticeQuestion, PracticeRecord, PracticeSubmitRequest } from "@/types/practice";
import type { StudentProfile } from "@/types/profile";
import type { GeneratedResource } from "@/types/resource";

type CallStatus = "idle" | "loading" | "success" | "failed";

interface TestLog {
  id: string;
  title: string;
  agentType?: AgentType;
  status: "success" | "failed";
  request: Record<string, any>;
  response?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
}

const testConfig = {
  userId: "user_demo_001",
  courseId: "course_ds_001",
  nodeId: "node_stack_001"
};

const demoProfile: StudentProfile = {
  id: "profile_demo_001",
  userId: "user_demo_001",
  major: "计算机科学与技术",
  grade: "大二",
  currentCourseId: "course_ds_001",
  learningGoal: "准备数据结构期末考试",
  knowledgeBaseLevel: "easy",
  learningProgress: "数组和链表已学完，正在复习栈",
  weakNodeIds: ["node_stack_001", "node_recursion_001"],
  cognitiveStyle: "diagram",
  practicePreference: "coding",
  resourcePreference: ["lecture_doc", "mind_map", "practice_question", "code_case"],
  commonMistakes: ["栈顶边界判断遗漏", "递归终止条件错误", "数组下标越界"],
  availableStudyTime: "每天晚上30分钟",
  profileSummary: "学生具备基础编程能力，正在补强栈和递归，偏好图解和代码练习。",
  confidenceScore: 0.82,
  lastUpdatedBy: "manual",
  createdAt: "2026-05-28T10:00:00Z",
  updatedAt: "2026-05-28T10:00:00Z"
};

const taskStatuses: TaskStatus[] = ["pending", "running", "success", "failed", "cancelled"];
const agentTypes: AgentType[] = [
  "profile_agent",
  "planner_agent",
  "qa_agent",
  "resource_agent",
  "practice_agent",
  "multimodal_agent",
  "safety_agent"
];

const callStatus = ref<CallStatus>("idle");
const errorMessage = ref("");
const currentTitle = ref("等待测试");
const currentRequest = ref<Record<string, any> | null>(null);
const currentResponse = ref<Record<string, any> | null>(null);
const currentAgentResult = ref<AgentRunResult | null>(null);
const currentChatResult = ref<ChatResult | null>(null);
const currentWorkflowResult = ref<MultiAgentWorkflowResult | null>(null);
const testLogs = ref<TestLog[]>([]);
const answers = ref<Record<string, string>>({});
const submittedRecords = ref<Record<string, PracticeRecord>>({});
const naturalLanguageMessage = ref(
  "我是计算机专业大二学生，正在复习数据结构。请结合 Hello 算法材料解释栈为什么后进先出，并生成三道题、思维导图和讲解视频。"
);

const mockEnabled = computed(() => import.meta.env.VITE_ENABLE_MOCK === "true");
const practiceQuestions = computed<PracticeQuestion[]>(() => {
  const questions = currentAgentResult.value?.output?.questions;
  return Array.isArray(questions) ? questions : [];
});
const workflowQuestions = computed<PracticeQuestion[]>(() => {
  const questions = currentWorkflowResult.value?.finalOutput?.questions;
  return Array.isArray(questions) ? (questions as PracticeQuestion[]) : [];
});
const workflowResources = computed<GeneratedResource[]>(() => {
  const resources = currentWorkflowResult.value?.finalOutput?.generatedResources;
  return Array.isArray(resources) ? (resources as GeneratedResource[]) : [];
});
const workflowMindMaps = computed(() =>
  workflowResources.value.filter((resource) => resource.resourceType === "mind_map")
);
const workflowVideos = computed(() => workflowResources.value.filter(isVideoResource));

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function formatJson(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

function addLog(log: Omit<TestLog, "id" | "createdAt">) {
  testLogs.value.unshift({
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString()
  });
}

function validateApiResponse<T>(response: ApiResponse<T>): string | null {
  const value = response as Record<string, any>;
  if (
    typeof value.code === "undefined" ||
    typeof value.message === "undefined" ||
    typeof value.data === "undefined" ||
    typeof value.traceId === "undefined" ||
    typeof value.timestamp === "undefined"
  ) {
    return "返回结构不符合 ApiResponse<T> 或 AgentRunResult";
  }
  return null;
}

function validateAgentResponse(response: ApiResponse<AgentRunResult>, agentType: AgentType): string | null {
  const baseError = validateApiResponse(response);
  if (baseError) return baseError;
  if (response.data.agentType !== agentType || !taskStatuses.includes(response.data.status)) {
    return "返回结构不符合 ApiResponse<T> 或 AgentRunResult";
  }
  return null;
}

function validateWorkflowResponse(response: ApiResponse<MultiAgentWorkflowResult>): string | null {
  const baseError = validateApiResponse(response);
  if (baseError) return baseError;
  if (!taskStatuses.includes(response.data.status)) {
    return "返回结构不符合 ApiResponse<T> 或 AgentRunResult";
  }
  return null;
}

function buildAgentRequest(agentType: AgentType): AgentRunRequest {
  const base = {
    userId: testConfig.userId,
    courseId: testConfig.courseId,
    nodeId: testConfig.nodeId,
    agentType,
    context: {
      profile: demoProfile
    }
  };

  if (agentType === "profile_agent") {
    return {
      ...base,
      input: {
        mode: "analyze_profile",
        message: naturalLanguageMessage.value
      }
    };
  }

  if (agentType === "planner_agent") {
    return {
      ...base,
      input: {
        targetGoal: "准备数据结构期末考试",
        timeBudget: "每天30分钟",
        weakNodeIds: ["node_stack_001", "node_recursion_001"],
        profileAnalysis: {
          learningStage: "基础补强阶段",
          riskLevel: "medium",
          preferredResourceTypes: ["mind_map", "code_case", "practice_question"]
        }
      }
    };
  }

  if (agentType === "qa_agent") {
    return {
      ...base,
      input: {
        message: naturalLanguageMessage.value,
        useRag: true,
        useProfile: true
      }
    };
  }

  if (agentType === "resource_agent") {
    return {
      ...base,
      input: {
        resourceTypes: ["lecture_doc", "mind_map", "practice_question", "code_case"],
        difficulty: "medium",
        learningGoal: "准备数据结构期末考试",
        customRequirement: "偏图解和代码案例，适合每天30分钟学习"
      }
    };
  }

  if (agentType === "multimodal_agent") {
    return {
      ...base,
      input: {
        resourceTypes: ["mind_map"],
        topic: "栈",
        difficulty: "medium"
      }
    };
  }

  if (agentType === "safety_agent") {
    return {
      ...base,
      input: {
        targetType: "resource",
        targetId: "resource_stack_demo_001",
        content: "栈遵循后进先出原则，入栈和出栈都在栈顶进行。"
      }
    };
  }

  return {
    ...base,
    input: {
      mode: "generate",
      questionTypes: ["single_choice", "short_answer", "coding"],
      difficulty: "medium",
      count: 3
    }
  };
}

function buildWorkflowRequest(): MultiAgentWorkflowRequest {
  return {
    userId: testConfig.userId,
    courseId: testConfig.courseId,
    nodeId: testConfig.nodeId,
    workflowType: "resource_generate",
    input: {
      profile: demoProfile,
      message: naturalLanguageMessage.value,
      targetGoal: "准备数据结构期末考试",
      timeBudget: "每天30分钟",
      weakNodeIds: ["node_stack_001", "node_recursion_001"],
      resourceTypes: ["lecture_doc"],
      questionTypes: ["single_choice", "short_answer", "coding"],
      difficulty: "medium",
      count: 3,
      multimodalResourceTypes: ["mind_map", "video_script", "animation_script"]
    }
  };
}

async function runSingleAgent(agentType: AgentType) {
  const request = buildAgentRequest(agentType);
  callStatus.value = "loading";
  errorMessage.value = "";
  currentTitle.value = `测试 ${agentType}`;
  currentRequest.value = request;
  currentResponse.value = null;
  currentAgentResult.value = null;
  currentChatResult.value = null;
  currentWorkflowResult.value = null;

  try {
    const response = await agentApi.runAgent(request);
    const validationError = validateAgentResponse(response, agentType);
    currentResponse.value = response as unknown as Record<string, any>;
    currentAgentResult.value = response.data;
    callStatus.value = validationError ? "failed" : "success";
    errorMessage.value = validationError ?? "";
    addLog({
      title: currentTitle.value,
      agentType,
      status: validationError ? "failed" : "success",
      request,
      response: response as unknown as Record<string, any>,
      errorMessage: validationError ?? undefined
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "接口调用失败";
    callStatus.value = "failed";
    errorMessage.value = message;
    addLog({
      title: currentTitle.value,
      agentType,
      status: "failed",
      request,
      errorMessage: message
    });
  }
}

async function runWorkflow() {
  const request = buildWorkflowRequest();
  callStatus.value = "loading";
  errorMessage.value = "";
  currentTitle.value = "一键测试完整链路";
  currentRequest.value = request;
  currentResponse.value = null;
  currentAgentResult.value = null;
  currentChatResult.value = null;
  currentWorkflowResult.value = null;

  try {
    const response = await agentApi.runWorkflow(request);
    const validationError = validateWorkflowResponse(response);
    currentResponse.value = response as unknown as Record<string, any>;
    currentWorkflowResult.value = response.data;
    callStatus.value = validationError ? "failed" : "success";
    errorMessage.value = validationError ?? "";
    addLog({
      title: currentTitle.value,
      status: validationError ? "failed" : "success",
      request,
      response: response as unknown as Record<string, any>,
      errorMessage: validationError ?? undefined
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "接口调用失败";
    callStatus.value = "failed";
    errorMessage.value = message;
    addLog({
      title: currentTitle.value,
      status: "failed",
      request,
      errorMessage: message
    });
  }
}

async function runRagChat() {
  const request = {
    userId: testConfig.userId,
    courseId: testConfig.courseId,
    nodeId: testConfig.nodeId,
    message: naturalLanguageMessage.value,
    useRag: true,
    useProfile: true
  };
  callStatus.value = "loading";
  errorMessage.value = "";
  currentTitle.value = "真实 RAG 问答";
  currentRequest.value = request;
  currentResponse.value = null;
  currentAgentResult.value = null;
  currentChatResult.value = null;
  currentWorkflowResult.value = null;

  try {
    const response = await agentApi.sendChat(request);
    const validationError = validateApiResponse(response);
    currentResponse.value = response as unknown as Record<string, any>;
    currentChatResult.value = response.data;
    callStatus.value = validationError ? "failed" : "success";
    errorMessage.value = validationError ?? "";
    addLog({
      title: currentTitle.value,
      status: validationError ? "failed" : "success",
      request,
      response: response as unknown as Record<string, any>,
      errorMessage: validationError ?? undefined
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RAG 问答失败";
    callStatus.value = "failed";
    errorMessage.value = message;
    addLog({
      title: currentTitle.value,
      status: "failed",
      request,
      errorMessage: message
    });
  }
}

async function submitPracticeAnswer(question: PracticeQuestion) {
  const payload: PracticeSubmitRequest = {
    userId: testConfig.userId,
    questionId: question.id,
    userAnswer: answers.value[question.id] || question.answer,
    durationSeconds: 30
  };

  callStatus.value = "loading";
  errorMessage.value = "";
  currentTitle.value = `模拟提交答案：${question.title}`;
  currentRequest.value = payload as unknown as Record<string, any>;

  try {
    const response = await practiceApi.submitAnswer(payload);
    const validationError = validateApiResponse(response);
    currentResponse.value = response as unknown as Record<string, any>;
    submittedRecords.value[question.id] = response.data;
    callStatus.value = validationError ? "failed" : "success";
    errorMessage.value = validationError ?? "";
    addLog({
      title: currentTitle.value,
      status: validationError ? "failed" : "success",
      request: payload as unknown as Record<string, any>,
      response: response as unknown as Record<string, any>,
      errorMessage: validationError ?? undefined
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交答案失败";
    callStatus.value = "failed";
    errorMessage.value = message;
    addLog({
      title: currentTitle.value,
      status: "failed",
      request: payload as unknown as Record<string, any>,
      errorMessage: message
    });
  }
}

function outputValue(key: string) {
  return asRecord(currentAgentResult.value?.output)[key];
}

function isVideoResource(resource: GeneratedResource) {
  return resource.resourceType === "video_script" || resource.resourceType === "animation_script";
}
</script>

<template>
  <main class="agent-test-page">
    <header class="agent-test-header">
      <div>
        <p class="eyebrow">Dev Test</p>
        <h1>NodeLearn AI 智能体链路测试面板</h1>
      </div>
      <el-tag :type="mockEnabled ? 'warning' : 'success'" size="large">
        {{ mockEnabled ? "Mock 模式" : "真实后端" }}
      </el-tag>
    </header>

    <section class="agent-test-layout">
      <aside class="left-column">
        <el-card shadow="never">
          <template #header>测试配置区</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="userId">{{ testConfig.userId }}</el-descriptions-item>
            <el-descriptions-item label="courseId">{{ testConfig.courseId }}</el-descriptions-item>
            <el-descriptions-item label="nodeId">{{ testConfig.nodeId }}</el-descriptions-item>
          </el-descriptions>
          <h3>Demo StudentProfile</h3>
          <pre class="json-block">{{ formatJson(demoProfile) }}</pre>
        </el-card>

        <el-card shadow="never">
          <template #header>自然语言入口</template>
          <el-input v-model="naturalLanguageMessage" type="textarea" :rows="6" />
          <div class="action-row">
            <el-button type="primary" :loading="callStatus === 'loading'" @click="runRagChat">
              真实 RAG 问答
            </el-button>
          </div>
        </el-card>

        <el-card shadow="never">
          <template #header>单智能体测试区</template>
          <div class="button-grid">
            <el-button
              v-for="agentType in agentTypes"
              :key="agentType"
              type="primary"
              :loading="callStatus === 'loading'"
              @click="runSingleAgent(agentType)"
            >
              测试 {{ agentType }}
            </el-button>
          </div>
        </el-card>

        <el-card shadow="never">
          <template #header>多智能体工作流测试区</template>
          <el-button type="success" :loading="callStatus === 'loading'" @click="runWorkflow">
            自然语言完整工作流
          </el-button>
        </el-card>
      </aside>

      <section class="right-column">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>结果展示区</span>
              <el-tag>{{ callStatus }}</el-tag>
            </div>
          </template>

          <h2>{{ currentTitle }}</h2>

          <div class="split-panel">
            <section>
              <h3>请求 JSON</h3>
              <pre class="json-block">{{ formatJson(currentRequest) }}</pre>
            </section>
            <section>
              <h3>响应 JSON</h3>
              <pre class="json-block">{{ formatJson(currentResponse) }}</pre>
            </section>
          </div>

          <section v-if="currentAgentResult" class="summary-section">
            <h3>智能体输出摘要</h3>

            <el-card v-if="currentAgentResult.agentType === 'profile_agent'" shadow="never">
              <template #header>画像分析卡片</template>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="学习阶段">{{ outputValue("learningStage") }}</el-descriptions-item>
                <el-descriptions-item label="风险等级">{{ outputValue("riskLevel") }}</el-descriptions-item>
                <el-descriptions-item label="薄弱点总结">{{ outputValue("weakNodeSummary") }}</el-descriptions-item>
                <el-descriptions-item label="推荐资源类型">
                  {{ formatJson(outputValue("preferredResourceTypes")) }}
                </el-descriptions-item>
                <el-descriptions-item label="推荐题型">
                  {{ formatJson(outputValue("recommendedQuestionTypes")) }}
                </el-descriptions-item>
                <el-descriptions-item label="给 planner_agent 的 nextAgentInput">
                  <pre class="inline-json">{{ formatJson(outputValue("nextAgentInput")) }}</pre>
                </el-descriptions-item>
              </el-descriptions>
            </el-card>

            <el-card v-if="currentAgentResult.agentType === 'planner_agent'" shadow="never">
              <template #header>学习路径卡片</template>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="LearningPath.title">
                  {{ outputValue("learningPath")?.title }}
                </el-descriptions-item>
                <el-descriptions-item label="LearningPath.currentStage">
                  {{ outputValue("learningPath")?.currentStage }}
                </el-descriptions-item>
                <el-descriptions-item label="LearningPath.targetGoal">
                  {{ outputValue("learningPath")?.targetGoal }}
                </el-descriptions-item>
                <el-descriptions-item label="LearningPath.pathNodeIds">
                  {{ formatJson(outputValue("learningPath")?.pathNodeIds) }}
                </el-descriptions-item>
                <el-descriptions-item label="planningReason">
                  {{ outputValue("planningReason") }}
                </el-descriptions-item>
              </el-descriptions>
              <h4>LearningTask 列表</h4>
              <pre class="json-block compact">{{ formatJson(outputValue("learningTasks")) }}</pre>
            </el-card>

            <el-card v-if="currentAgentResult.agentType === 'resource_agent'" shadow="never">
              <template #header>资源推荐卡片</template>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="resourcePlan">
                  <pre class="inline-json">{{ formatJson(outputValue("resourcePlan")) }}</pre>
                </el-descriptions-item>
                <el-descriptions-item label="resourceIds">
                  {{ formatJson(outputValue("resourceIds")) }}
                </el-descriptions-item>
                <el-descriptions-item label="auditStatus">{{ outputValue("auditStatus") }}</el-descriptions-item>
              </el-descriptions>
              <h4>recommendations</h4>
              <pre class="json-block compact">{{ formatJson(outputValue("recommendations")) }}</pre>
              <h4>pushRecords</h4>
              <pre class="json-block compact">{{ formatJson(outputValue("pushRecords")) }}</pre>
            </el-card>

            <el-card v-if="currentAgentResult.agentType === 'qa_agent'" shadow="never">
              <template #header>问答智能体结果</template>
              <p>{{ outputValue("answer") }}</p>
              <h4>usedAgentTypes</h4>
              <pre class="json-block compact">{{ formatJson(outputValue("usedAgentTypes")) }}</pre>
              <h4>retrievedDocuments</h4>
              <pre class="json-block compact">{{ formatJson(outputValue("retrievedDocuments")) }}</pre>
            </el-card>

            <el-card v-if="currentAgentResult.agentType === 'multimodal_agent'" shadow="never">
              <template #header>多模态资源卡片</template>
              <div
                v-for="resource in outputValue('generatedResources') || []"
                :key="resource.id"
                class="resource-preview"
              >
                <h4>{{ resource.title }} / {{ resource.resourceType }}</h4>
                <MindMapViewer v-if="resource.resourceType === 'mind_map'" :content="resource.content" />
                <template v-else-if="isVideoResource(resource)">
                  <video v-if="resource.fileUrl" class="mp4-player" :src="resource.fileUrl" controls />
                  <VideoLessonPlayer :content="resource.content" />
                </template>
                <pre v-else class="json-block compact">{{ resource.content }}</pre>
                <el-tag>{{ resource.auditStatus }}</el-tag>
              </div>
              <h4>renderHints</h4>
              <pre class="json-block compact">{{ formatJson(outputValue("renderHints")) }}</pre>
            </el-card>

            <el-card v-if="currentAgentResult.agentType === 'practice_agent'" shadow="never">
              <template #header>练习题卡片</template>
              <el-alert
                title="masteryUpdatePreview / profileUpdatePreview 为智能体解释信息，只存在于 AgentRunResult.output，不属于 PracticeRecord 字段。"
                type="warning"
                show-icon
                :closable="false"
              />
              <div v-for="question in practiceQuestions" :key="question.id" class="question-card">
                <h4>{{ question.title }}</h4>
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item label="questionType">{{ question.questionType }}</el-descriptions-item>
                  <el-descriptions-item label="content">{{ question.content }}</el-descriptions-item>
                  <el-descriptions-item label="options">{{ formatJson(question.options) }}</el-descriptions-item>
                  <el-descriptions-item label="answer">{{ question.answer }}</el-descriptions-item>
                  <el-descriptions-item label="explanation">{{ question.explanation }}</el-descriptions-item>
                  <el-descriptions-item label="difficulty">{{ question.difficulty }}</el-descriptions-item>
                  <el-descriptions-item label="tags">{{ formatJson(question.tags) }}</el-descriptions-item>
                </el-descriptions>
                <div class="answer-row">
                  <el-input v-model="answers[question.id]" placeholder="模拟答案，不填则使用正确答案" />
                  <el-button type="primary" @click="submitPracticeAnswer(question)">模拟提交答案</el-button>
                </div>
                <pre v-if="submittedRecords[question.id]" class="json-block compact">
{{ formatJson(submittedRecords[question.id]) }}
                </pre>
              </div>
              <h4>masteryUpdatePreview</h4>
              <pre class="json-block compact">{{ formatJson(outputValue("masteryUpdatePreview")) }}</pre>
              <h4>profileUpdatePreview</h4>
              <pre class="json-block compact">{{ formatJson(outputValue("profileUpdatePreview")) }}</pre>
            </el-card>
          </section>

          <section v-if="currentChatResult" class="summary-section">
            <h3>真实 RAG 问答结果</h3>
            <el-card shadow="never">
              <template #header>回答</template>
              <p>{{ currentChatResult.answer }}</p>
              <h4>retrievedDocuments</h4>
              <pre class="json-block compact">{{ formatJson(currentChatResult.retrievedDocuments) }}</pre>
            </el-card>
          </section>

          <section v-if="currentWorkflowResult" class="summary-section">
            <h3>工作流步骤卡片</h3>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="taskId">{{ currentWorkflowResult.taskId }}</el-descriptions-item>
              <el-descriptions-item label="workflowType">{{ currentWorkflowResult.workflowType }}</el-descriptions-item>
              <el-descriptions-item label="status">{{ currentWorkflowResult.status }}</el-descriptions-item>
              <el-descriptions-item label="finalOutput">
                <pre class="inline-json">{{ formatJson(currentWorkflowResult.finalOutput) }}</pre>
              </el-descriptions-item>
            </el-descriptions>
            <div class="workflow-grid">
              <el-card v-for="step in currentWorkflowResult.steps" :key="step.taskId" shadow="never">
                <template #header>
                  <div class="card-header">
                    <span>{{ step.agentType }}</span>
                    <el-tag>{{ step.status }}</el-tag>
                  </div>
                </template>
                <p v-if="step.errorMessage" class="error-text">{{ step.errorMessage }}</p>
                <pre class="json-block compact">{{ formatJson(step.output) }}</pre>
              </el-card>
            </div>

            <el-card shadow="never">
              <template #header>自然语言回答</template>
              <p>{{ currentWorkflowResult.finalOutput.answer }}</p>
            </el-card>

            <el-card shadow="never">
              <template #header>完整题目</template>
              <div v-for="question in workflowQuestions" :key="question.id" class="question-card">
                <h4>{{ question.title }}</h4>
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item label="questionType">{{ question.questionType }}</el-descriptions-item>
                  <el-descriptions-item label="content">{{ question.content }}</el-descriptions-item>
                  <el-descriptions-item label="options">{{ formatJson(question.options) }}</el-descriptions-item>
                  <el-descriptions-item label="answer">{{ question.answer }}</el-descriptions-item>
                  <el-descriptions-item label="explanation">{{ question.explanation }}</el-descriptions-item>
                  <el-descriptions-item label="difficulty">{{ question.difficulty }}</el-descriptions-item>
                  <el-descriptions-item label="tags">{{ formatJson(question.tags) }}</el-descriptions-item>
                </el-descriptions>
              </div>
            </el-card>

            <el-card shadow="never">
              <template #header>思维导图</template>
              <MindMapViewer v-for="resource in workflowMindMaps" :key="resource.id" :content="resource.content" />
            </el-card>

            <el-card shadow="never">
              <template #header>视频资源</template>
              <div v-for="resource in workflowVideos" :key="resource.id" class="resource-preview">
                <h4>{{ resource.title }} / {{ resource.resourceType }}</h4>
                <video v-if="resource.fileUrl" class="mp4-player" :src="resource.fileUrl" controls />
                <VideoLessonPlayer :content="resource.content" />
                <el-tag :type="resource.auditStatus === 'passed' ? 'success' : 'warning'">
                  {{ resource.auditStatus }}
                </el-tag>
              </div>
            </el-card>
          </section>
        </el-card>

        <el-card shadow="never">
          <template #header>错误信息区</template>
          <el-alert
            v-if="errorMessage"
            :title="errorMessage"
            type="error"
            show-icon
            :closable="false"
          />
          <el-empty v-else description="暂无错误" />
        </el-card>
      </section>
    </section>

    <section class="log-section">
      <el-card shadow="never">
        <template #header>测试日志</template>
        <el-table :data="testLogs" border>
          <el-table-column prop="createdAt" label="createdAt" min-width="180" />
          <el-table-column prop="title" label="title" min-width="200" />
          <el-table-column prop="agentType" label="agentType" min-width="150" />
          <el-table-column prop="status" label="status" min-width="100" />
          <el-table-column prop="errorMessage" label="errorMessage" min-width="240" />
        </el-table>
      </el-card>
    </section>
  </main>
</template>

<style scoped>
.agent-test-page {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: #f5f7fb;
}

.agent-test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1480px;
  margin: 0 auto 20px;
}

.agent-test-header h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.3;
}

.eyebrow {
  margin: 0 0 4px;
  color: #64748b;
  font-size: 13px;
  text-transform: uppercase;
}

.agent-test-layout {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 18px;
  max-width: 1480px;
  margin: 0 auto;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.button-grid {
  display: grid;
  gap: 10px;
}

.action-row {
  margin-top: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.split-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.json-block,
.inline-json {
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid #d9e2ec;
  border-radius: 6px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.inline-json {
  max-height: 180px;
}

.compact {
  max-height: 260px;
}

.summary-section {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.resource-preview,
.question-card {
  display: grid;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid #e5e7eb;
}

.mp4-player {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  background: #071426;
}

.resource-preview:last-child,
.question-card:last-child {
  border-bottom: 0;
}

.answer-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.workflow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.error-text {
  color: #dc2626;
}

.log-section {
  max-width: 1480px;
  margin: 18px auto 0;
}

@media (max-width: 980px) {
  .agent-test-layout,
  .split-panel,
  .answer-row {
    grid-template-columns: 1fr;
  }

  .agent-test-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }
}
</style>
