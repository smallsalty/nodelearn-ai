<script setup lang="ts">
import { ref } from "vue";
import { ChatLineRound, Refresh, VideoPlay } from "@element-plus/icons-vue";
import { getErrorMessage } from "@/api/client";
import { multimodalApi } from "@/api/modules/multimodal";
import type { DigitalHumanChatResult } from "@/types/multimodal";

const props = defineProps<{
  userId: string;
  courseId: string;
  nodeId?: string | null;
}>();

const question = ref("");
const loading = ref(false);
const errorMessage = ref("");
const sessionId = ref<string | undefined>();
const messages = ref<Array<{ role: "user" | "assistant"; content: string; result?: DigitalHumanChatResult }>>([]);
const lastQuestion = ref("");

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
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

function retry() {
  void sendQuestion(lastQuestion.value);
}
</script>

<template>
  <section class="digital-human-chat">
    <header class="chat-header">
      <strong>数字人对话</strong>
      <el-tag size="small" effect="plain">课程材料 + 学生画像</el-tag>
    </header>

    <div class="message-list" aria-live="polite">
      <article v-for="(message, index) in messages" :key="`${message.role}-${index}`" class="chat-message" :class="message.role">
        <strong>{{ message.role === "user" ? "我的问题" : "讲解回应" }}</strong>
        <p>{{ message.content }}</p>
        <div v-if="message.result" class="media-stack">
          <audio v-if="message.result.audioUrl" :src="message.result.audioUrl" controls />
          <video v-if="message.result.videoUrl" :src="message.result.videoUrl" controls />
          <el-tag v-if="!message.result.audioUrl && !message.result.videoUrl" type="info" effect="plain">
            当前返回文本讲解，暂无媒体文件
          </el-tag>
          <div v-if="message.result.usedDocuments?.length" class="source-list">
            <span v-for="document in message.result.usedDocuments" :key="document.id">{{ document.title }}</span>
          </div>
        </div>
      </article>
      <section v-if="!messages.length" class="state-block">
        <el-icon class="state-icon"><VideoPlay /></el-icon>
        <strong>围绕当前知识点提问</strong>
        <span>回答会优先结合课程材料、画像和安全校验结果。</span>
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
.input-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
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

.media-stack {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.media-stack audio,
.media-stack video {
  width: 100%;
  max-height: 220px;
  border-radius: var(--nl-radius-md);
}

.source-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.source-list span {
  padding: 2px 8px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-sm);
  background: var(--nl-bg);
  color: var(--nl-text-muted);
  font-size: 12px;
}
</style>
