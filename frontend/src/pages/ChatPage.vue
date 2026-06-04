<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import MarkdownContent from "@/components/MarkdownContent.vue";
import StateBlock from "@/components/StateBlock.vue";
import { chatApi } from "@/api/modules/chat";
import { agentsApi } from "@/api/modules/agents";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { AgentRunResult, ChatMessage, ChatResult, ChatSession } from "@/types/agent";
import type { RetrievedDocument } from "@/types/resource";
import { agentLabel, DEFAULT_COURSE_ID, DEFAULT_USER_ID, formatDate } from "@/utils/format";

const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const courseId = computed(() => appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const sessions = ref<ChatSession[]>([]);
const messages = ref<ChatMessage[]>([]);
const currentSessionId = ref<string | undefined>();
const input = ref("栈为什么是后进先出？请结合数据结构课程材料解释。");
const loading = ref(false);
const sending = ref(false);
const workflowRunning = ref(false);
const errorMessage = ref("");
const lastResult = ref<ChatResult | null>(null);
const workflowSteps = ref<AgentRunResult[]>([]);

const retrievedDocuments = computed<RetrievedDocument[]>(() => lastResult.value?.retrievedDocuments ?? []);

onMounted(() => {
  void loadSessions();
});

async function loadSessions() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await chatApi.getSessions({ page: 1, pageSize: 20 });
    sessions.value = response.data.list;
    currentSessionId.value = sessions.value[0]?.id;
    if (currentSessionId.value) {
      const messageResponse = await chatApi.getMessages(currentSessionId.value);
      messages.value = messageResponse.data;
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;
  sending.value = true;
  errorMessage.value = "";
  messages.value.push(createLocalMessage("user", message));
  input.value = "";
  try {
    const response = await chatApi.sendMessage({
      userId: userId.value,
      sessionId: currentSessionId.value,
      courseId: courseId.value,
      nodeId: appState.selectedNodeId ?? undefined,
      message,
      useRag: true,
      useProfile: true
    });
    lastResult.value = response.data;
    currentSessionId.value = response.data.sessionId;
    messages.value.push(createLocalMessage("assistant", response.data.answer, response.data.messageId));
  } catch (error) {
    errorMessage.value = getErrorMessage(error) || "对话接口调用失败";
  } finally {
    sending.value = false;
  }
}

async function runQaWorkflow() {
  workflowRunning.value = true;
  errorMessage.value = "";
  try {
    const response = await agentsApi.runWorkflow({
      userId: userId.value,
      courseId: courseId.value,
      nodeId: appState.selectedNodeId ?? undefined,
      workflowType: "qa",
      input: { message: input.value || "解释当前知识点" }
    });
    workflowSteps.value = response.data.steps;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    workflowRunning.value = false;
  }
}

function createLocalMessage(role: "user" | "assistant", content: string, id = `message_local_${Date.now()}`): ChatMessage {
  return {
    id,
    sessionId: currentSessionId.value ?? "session_pending",
    userId: userId.value,
    role,
    content,
    contentType: role === "assistant" ? "markdown" : "text",
    agentType: role === "assistant" ? "qa_agent" : undefined,
    createdAt: new Date().toISOString()
  };
}
</script>

<template>
  <section class="chat-page two-column-page">
    <section class="panel-card chat-main-card">
      <header class="panel-header">
        <div>
          <h2>AI 对话学习</h2>
          <p>通过后端 RAG 问答接口获取课程材料、画像上下文和智能体结果。</p>
        </div>
        <el-button :loading="loading" @click="loadSessions">刷新会话</el-button>
      </header>

      <StateBlock :loading="loading" :error="errorMessage" :empty="!messages.length" empty-text="暂无消息" @retry="loadSessions">
        <div class="message-list">
          <article v-for="message in messages" :key="message.id" class="chat-bubble" :class="message.role">
            <header>
              <strong>{{ message.role === "user" ? "我" : "NodeLearn AI" }}</strong>
              <time>{{ formatDate(message.createdAt) }}</time>
            </header>
            <MarkdownContent v-if="message.contentType !== 'text'" :content="message.content" />
            <p v-else>{{ message.content }}</p>
          </article>
        </div>
      </StateBlock>

      <footer class="chat-composer">
        <el-input
          v-model="input"
          type="textarea"
          :rows="4"
          resize="none"
          placeholder="输入你的数据结构问题"
          @keydown.ctrl.enter.prevent="sendMessage"
        />
        <div class="button-row">
          <el-button type="primary" :loading="sending" @click="sendMessage">发送</el-button>
          <el-button :loading="workflowRunning" @click="runQaWorkflow">运行 QA 工作流</el-button>
        </div>
      </footer>
    </section>

    <aside class="side-stack">
      <el-card shadow="never">
        <template #header>使用的智能体</template>
        <el-empty v-if="!lastResult?.usedAgentTypes.length" description="发送问题后展示" />
        <div v-else class="tag-row">
          <el-tag v-for="agent in lastResult.usedAgentTypes" :key="agent" type="success">
            {{ agentLabel(agent) }}
          </el-tag>
        </div>
      </el-card>

      <el-card shadow="never">
        <template #header>RAG 检索材料</template>
        <el-empty v-if="!retrievedDocuments.length" description="暂无检索材料" />
        <article v-for="doc in retrievedDocuments" :key="doc.id" class="mini-list-item">
          <strong>{{ doc.title }}</strong>
          <span>score {{ doc.score.toFixed(2) }}</span>
          <p>{{ doc.content.slice(0, 120) }}</p>
        </article>
      </el-card>

      <el-card shadow="never">
        <template #header>智能体步骤</template>
        <el-empty v-if="!workflowSteps.length" description="暂无工作流步骤" />
        <el-timeline v-else>
          <el-timeline-item v-for="step in workflowSteps" :key="step.taskId" :timestamp="step.status">
            {{ agentLabel(step.agentType) }}
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </aside>
  </section>
</template>
