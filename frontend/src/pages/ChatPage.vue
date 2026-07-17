<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ChatLineRound, Clock, Plus, Refresh } from "@element-plus/icons-vue";
import MarkdownContent from "@/components/MarkdownContent.vue";
import StateBlock from "@/components/StateBlock.vue";
import { chatApi } from "@/api/modules/chat";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { ChatMessage, ChatSession } from "@/types/agent";
import { DEFAULT_COURSE_ID, DEFAULT_USER_ID, formatDate } from "@/utils/format";

const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const courseId = computed(() => appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const sessions = ref<ChatSession[]>([]);
const messages = ref<ChatMessage[]>([]);
const currentSessionId = ref<string>();
const input = ref("请结合当前课程材料，用一个生活中的例子解释栈为什么是后进先出。最近有哪些容易混淆的地方？");
const pendingQuestion = ref("");
const loading = ref(false);
const sending = ref(false);
const creating = ref(false);
const errorMessage = ref("");
const activeTab = ref("assistant");

const currentSession = computed(() => sessions.value.find((session) => session.id === currentSessionId.value));

onMounted(() => {
  void loadSessions();
});

async function loadSessions(preferredSessionId?: string) {
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await chatApi.getSessions({ page: 1, pageSize: 50, userId: userId.value });
    sessions.value = response.data.list.filter((session) => session.sessionType === "qa");
    const nextSessionId = preferredSessionId
      ?? (sessions.value.some((session) => session.id === currentSessionId.value) ? currentSessionId.value : undefined)
      ?? sessions.value[0]?.id;
    currentSessionId.value = nextSessionId;
    await loadMessages(nextSessionId);
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function loadMessages(sessionId?: string) {
  if (!sessionId) {
    messages.value = [];
    return;
  }
  const response = await chatApi.getMessages(sessionId);
  messages.value = response.data;
}

async function selectSession(sessionId: string) {
  currentSessionId.value = sessionId;
  loading.value = true;
  errorMessage.value = "";
  try {
    await loadMessages(sessionId);
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function createSession() {
  creating.value = true;
  errorMessage.value = "";
  try {
    const response = await chatApi.createSession({
      userId: userId.value,
      courseId: courseId.value,
      title: "新的课程问答",
      sessionType: "qa"
    });
    await loadSessions(response.data.id);
    activeTab.value = "assistant";
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    creating.value = false;
  }
}

async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;
  sending.value = true;
  errorMessage.value = "";
  pendingQuestion.value = message;
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
    currentSessionId.value = response.data.sessionId;
    pendingQuestion.value = "";
    await loadSessions(response.data.sessionId);
  } catch (error) {
    errorMessage.value = getErrorMessage(error) || "问答助手暂时无法回答";
    input.value = message;
    pendingQuestion.value = "";
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <section class="chat-page qa-assistant-page">
    <section class="panel-card qa-shell">
      <header class="panel-header qa-header">
        <div>
          <div class="eyebrow-row">
            <el-icon><ChatLineRound /></el-icon>
            <span>课程材料与学生画像联合回答</span>
          </div>
          <h2>问答助手</h2>
          <p>向助手提出课程问题。页面与学习侧栏的问答会进入同一份历史记录。</p>
        </div>
        <div class="button-row">
          <el-button :icon="Refresh" :loading="loading" @click="loadSessions()">刷新历史</el-button>
          <el-button type="primary" :icon="Plus" :loading="creating" @click="createSession">新建问答</el-button>
        </div>
      </header>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

      <el-tabs v-model="activeTab" class="page-tabs qa-tabs">
        <el-tab-pane label="开始问答" name="assistant">
          <section class="qa-conversation">
            <div class="conversation-meta">
              <div>
                <strong>{{ currentSession?.title ?? "新的课程问答" }}</strong>
                <span>{{ currentSession ? `最近更新：${formatDate(currentSession.updatedAt)}` : "发送第一条问题后自动建立记录" }}</span>
              </div>
              <el-tag type="success" effect="plain">真实课程问答</el-tag>
            </div>

            <StateBlock
              :loading="loading"
              :error="errorMessage"
              :empty="!messages.length && !pendingQuestion"
              empty-text="还没有问答记录，可以直接在下方提问"
              @retry="loadSessions()"
            >
              <div class="message-list qa-message-list" aria-live="polite">
                <article v-for="message in messages" :key="message.id" class="chat-bubble" :class="message.role">
                  <header>
                    <strong>{{ message.role === "user" ? "我" : "问答助手" }}</strong>
                    <time>{{ formatDate(message.createdAt) }}</time>
                  </header>
                  <MarkdownContent v-if="message.contentType !== 'text'" :content="message.content" />
                  <p v-else>{{ message.content }}</p>
                </article>
                <article v-if="pendingQuestion" class="chat-bubble user pending-message">
                  <header><strong>我</strong><span>正在发送</span></header>
                  <p>{{ pendingQuestion }}</p>
                </article>
                <article v-if="sending" class="chat-bubble assistant pending-message" aria-label="问答助手正在思考">
                  <header><strong>问答助手</strong><span>正在结合课程材料思考</span></header>
                  <el-skeleton :rows="2" animated />
                </article>
              </div>
            </StateBlock>

            <footer class="chat-composer qa-composer">
              <el-input
                v-model="input"
                type="textarea"
                :rows="4"
                resize="none"
                placeholder="例如：请结合课程材料解释递归终止条件，并给我一个自检问题。"
                aria-label="问答助手输入"
                @keydown.ctrl.enter.prevent="sendMessage"
              />
              <div class="composer-actions">
                <span>按 Ctrl + Enter 发送</span>
                <el-button type="primary" :loading="sending" :disabled="!input.trim()" @click="sendMessage">发送问题</el-button>
              </div>
            </footer>
          </section>
        </el-tab-pane>

        <el-tab-pane name="history">
          <template #label>
            <span class="history-tab-label"><el-icon><Clock /></el-icon>问答历史 <b>{{ sessions.length }}</b></span>
          </template>
          <section class="history-layout">
            <aside class="history-session-list" aria-label="问答会话列表">
              <button
                v-for="session in sessions"
                :key="session.id"
                type="button"
                :class="{ active: session.id === currentSessionId }"
                @click="selectSession(session.id)"
              >
                <strong>{{ session.title }}</strong>
                <span>{{ formatDate(session.updatedAt) }}</span>
              </button>
              <el-empty v-if="!sessions.length" description="暂无问答历史" />
            </aside>
            <section class="history-detail" aria-label="问答历史详情">
              <header>
                <div>
                  <strong>{{ currentSession?.title ?? "选择一条问答历史" }}</strong>
                  <span v-if="currentSession">共 {{ messages.length }} 条消息</span>
                </div>
              </header>
              <div v-if="messages.length" class="message-list qa-message-list">
                <article v-for="message in messages" :key="message.id" class="chat-bubble" :class="message.role">
                  <header>
                    <strong>{{ message.role === "user" ? "我" : "问答助手" }}</strong>
                    <time>{{ formatDate(message.createdAt) }}</time>
                  </header>
                  <MarkdownContent v-if="message.contentType !== 'text'" :content="message.content" />
                  <p v-else>{{ message.content }}</p>
                </article>
              </div>
              <el-empty v-else description="该会话还没有消息" />
            </section>
          </section>
        </el-tab-pane>
      </el-tabs>
    </section>
  </section>
</template>

<style scoped>
.qa-shell {
  min-height: 720px;
}

.qa-header {
  align-items: flex-start;
}

.eyebrow-row,
.history-tab-label,
.composer-actions,
.conversation-meta,
.history-detail > header {
  display: flex;
  align-items: center;
}

.eyebrow-row {
  gap: 7px;
  margin-bottom: 8px;
  color: var(--nl-warning);
  font-size: 13px;
  font-weight: 700;
}

.qa-tabs,
.qa-conversation {
  min-height: 0;
}

.qa-conversation {
  display: grid;
  grid-template-rows: auto minmax(320px, 1fr) auto;
  gap: 14px;
}

.conversation-meta,
.history-detail > header {
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-md);
  background: var(--nl-primary-tint);
}

.conversation-meta > div,
.history-detail > header > div {
  display: grid;
  gap: 4px;
}

.conversation-meta span,
.history-detail span,
.composer-actions span {
  color: var(--nl-text-muted);
  font-size: 13px;
}

.qa-message-list {
  width: 100%;
  max-height: 52vh;
}

.pending-message {
  opacity: 0.82;
}

.qa-composer {
  margin-top: 0;
}

.composer-actions {
  justify-content: space-between;
  gap: 12px;
}

.history-tab-label {
  gap: 6px;
}

.history-tab-label b {
  min-width: 22px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--nl-primary-tint);
  color: var(--nl-text);
  text-align: center;
}

.history-layout {
  display: grid;
  grid-template-columns: minmax(220px, 0.34fr) minmax(0, 1fr);
  gap: 14px;
  min-height: 540px;
}

.history-session-list,
.history-detail {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-lg);
  background: var(--nl-workbench-bg);
}

.history-session-list {
  display: grid;
  align-content: start;
  gap: 8px;
  max-height: 620px;
  overflow: auto;
}

.history-session-list button {
  display: grid;
  gap: 5px;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-md);
  background: var(--nl-surface);
  color: var(--nl-text);
  text-align: left;
  cursor: pointer;
}

.history-session-list button:hover,
.history-session-list button:focus-visible,
.history-session-list button.active {
  border-color: var(--nl-primary-hover);
  background: var(--nl-primary-tint);
  outline: none;
}

.history-session-list button span {
  color: var(--nl-text-muted);
  font-size: 12px;
}

.history-detail {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
}

@media (max-width: 768px) {
  .history-layout {
    grid-template-columns: 1fr;
  }

  .history-session-list {
    max-height: 240px;
  }

  .composer-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
