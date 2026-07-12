<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ChatLineRound, Refresh, SwitchButton } from "@element-plus/icons-vue";
import { getErrorMessage } from "@/api/client";
import { multimodalApi } from "@/api/modules/multimodal";
import DigitalHumanLivePlayer from "@/components/DigitalHumanLivePlayer.vue";
import type { DigitalHumanChatResult, DigitalHumanLiveSessionResult } from "@/types/multimodal";

const props = defineProps<{
  userId: string;
  courseId: string;
  nodeId?: string | null;
}>();

const question = ref("");
const loading = ref(false);
const stopping = ref(false);
const errorMessage = ref("");
const sessionId = ref<string | undefined>();
const liveSession = ref<DigitalHumanLiveSessionResult | null>(null);
const messages = ref<Array<{ role: "user" | "assistant"; content: string; result?: DigitalHumanChatResult }>>([]);
const lastQuestion = ref("");
let livePollTimer: number | undefined;

const liveStatusLabel = computed(() => {
  if (!liveSession.value) return "未连接";
  if (liveSession.value.status === "running") return "直播中";
  if (liveSession.value.status === "cancelled") return "已结束";
  if (liveSession.value.status === "failed") return "连接失败";
  return "已连接";
});

function stopPolling() {
  if (livePollTimer !== undefined) window.clearInterval(livePollTimer);
  livePollTimer = undefined;
}

function startPolling() {
  stopPolling();
  if (!sessionId.value || liveSession.value?.status !== "running") return;
  livePollTimer = window.setInterval(async () => {
    if (!sessionId.value) return;
    try {
      const response = await multimodalApi.getDigitalHumanLiveSession(sessionId.value);
      liveSession.value = response.data;
      if (response.data.status !== "running") stopPolling();
    } catch (error) {
      errorMessage.value = getErrorMessage(error);
      stopPolling();
    }
  }, 5000);
}

async function refreshLiveSession() {
  if (!sessionId.value) return;
  const response = await multimodalApi.getDigitalHumanLiveSession(sessionId.value);
  liveSession.value = response.data;
  startPolling();
}

async function sendQuestion(value = question.value) {
  const content = value.trim();
  if (!content) return;
  loading.value = true;
  errorMessage.value = "";
  lastQuestion.value = content;
  messages.value.push({ role: "user", content });
  question.value = "";
  try {
    const response = await multimodalApi.chatWithDigitalHuman({
      userId: props.userId,
      courseId: props.courseId,
      nodeId: props.nodeId ?? undefined,
      sessionId: sessionId.value,
      message: content,
      useRag: true,
      useProfile: true
    });
    sessionId.value = response.data.sessionId;
    messages.value.push({ role: "assistant", content: response.data.answer, result: response.data });
    if (response.data.liveSession) {
      liveSession.value = response.data.liveSession;
      startPolling();
    } else if (response.data.status === "success") {
      await refreshLiveSession();
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function stopLiveSession() {
  if (!sessionId.value || liveSession.value?.status !== "running") return;
  stopping.value = true;
  errorMessage.value = "";
  try {
    const response = await multimodalApi.stopDigitalHumanLiveSession(sessionId.value);
    liveSession.value = response.data;
    stopPolling();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    stopping.value = false;
  }
}

function retry() {
  void sendQuestion(lastQuestion.value);
}

function stopLiveSessionOnExit() {
  if (sessionId.value && liveSession.value?.status === "running") {
    multimodalApi.stopDigitalHumanLiveSessionKeepalive(sessionId.value);
  }
}

onMounted(() => {
  window.addEventListener("pagehide", stopLiveSessionOnExit);
});

onBeforeUnmount(() => {
  stopPolling();
  window.removeEventListener("pagehide", stopLiveSessionOnExit);
  stopLiveSessionOnExit();
});
</script>

<template>
  <section class="digital-human-chat">
    <header class="chat-header">
      <div>
        <strong>数字人对话</strong>
        <el-tag size="small" effect="plain">课程材料 + 学生画像</el-tag>
      </div>
      <div class="live-actions">
        <el-tag :type="liveSession?.status === 'failed' ? 'danger' : liveSession?.status === 'running' ? 'success' : 'info'" effect="plain">
          {{ liveStatusLabel }}
        </el-tag>
        <el-button
          v-if="liveSession?.status === 'running'"
          size="small"
          :icon="SwitchButton"
          :loading="stopping"
          @click="stopLiveSession"
        >结束会话</el-button>
      </div>
    </header>

    <DigitalHumanLivePlayer
      :video-url="liveSession?.videoUrl"
      :status="liveSession?.status ?? 'pending'"
      :error-message="liveSession?.errorMessage"
    />

    <div class="message-list" aria-live="polite">
      <article v-for="(message, index) in messages" :key="`${message.role}-${index}`" class="chat-message" :class="message.role">
        <strong>{{ message.role === "user" ? "我的问题" : "讲解回应" }}</strong>
        <p>{{ message.content }}</p>
        <div v-if="message.result?.usedDocuments?.length" class="source-list">
          <span v-for="document in message.result.usedDocuments" :key="document.id">{{ document.title }}</span>
        </div>
      </article>
      <section v-if="!messages.length" class="state-block">
        <el-icon class="state-icon"><ChatLineRound /></el-icon>
        <strong>围绕当前知识点提问</strong>
        <span>回答通过课程材料、画像和安全校验后，由数字人实时播报。</span>
      </section>
    </div>

    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false">
      <template #default>
        <el-button size="small" :icon="Refresh" @click="retry">重试</el-button>
      </template>
    </el-alert>

    <div class="input-row">
      <el-input
        v-model="question"
        type="textarea"
        :rows="3"
        placeholder="输入你想追问的知识点问题"
        aria-label="数字人对话问题"
        @keyup.ctrl.enter="sendQuestion()"
      />
      <el-button type="primary" :icon="ChatLineRound" :loading="loading" :disabled="!question.trim()" @click="sendQuestion()">发送</el-button>
    </div>
  </section>
</template>

<style scoped>
.digital-human-chat {
  display: grid;
  gap: 12px;
}

.chat-header,
.input-row,
.chat-header > div,
.live-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.chat-header > div,
.live-actions {
  align-items: center;
  justify-content: flex-start;
}

.message-list {
  display: grid;
  gap: 10px;
  max-height: 420px;
  overflow: auto;
  padding-right: 4px;
}

.chat-message {
  max-width: 92%;
  padding: 12px 14px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-lg);
  background: var(--nl-surface);
}

.chat-message.user {
  justify-self: end;
  border-color: var(--nl-primary-soft);
  background: var(--nl-primary-tint);
}

.chat-message.assistant {
  justify-self: start;
}

.chat-message p {
  margin: 6px 0 0;
  color: var(--nl-text);
  line-height: 1.6;
}

.source-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.source-list span {
  padding: 2px 8px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-sm);
  background: var(--nl-bg);
  color: var(--nl-text-muted);
  font-size: 12px;
}

@media (max-width: 640px) {
  .chat-header,
  .input-row {
    align-items: stretch;
    flex-direction: column;
  }

  .input-row .el-button {
    width: 100%;
  }
}
</style>
