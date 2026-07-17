<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Close, Notebook, Position } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import MarkdownContent from "@/components/MarkdownContent.vue";
import { chatApi } from "@/api/modules/chat";
import { noteApi } from "@/api/modules/note";
import { practiceApi } from "@/api/modules/practice";
import { recommendationsApi } from "@/api/modules/recommendations";
import { getErrorMessage } from "@/api/client";
import {
  appState,
  closeFloatingMenu,
  switchFloatingTab,
  toggleFloatingMenu,
  updateFloatingPosition
} from "@/stores";
import type { Note } from "@/types/note";
import type { PracticeQuestion } from "@/types/practice";
import type { ResourceRecommendation } from "@/types/resource";
import type { ChatMessage } from "@/types/agent";
import { difficultyLabel, formatDate, questionTypeLabel } from "@/utils/format";

const router = useRouter();

const userId = computed(() => appState.currentUser?.id ?? "user_demo_001");
const courseId = computed(() => appState.currentCourse?.id ?? "course_ds_001");
const question = ref("");
const qaMessages = ref<ChatMessage[]>([]);
const qaSessionId = ref<string>();
const noteTitle = ref("");
const noteContent = ref("");
const notes = ref<Note[]>([]);
const wrongQuestions = ref<PracticeQuestion[]>([]);
const recommendations = ref<ResourceRecommendation[]>([]);
const loading = ref(false);
const errorMessage = ref("");

const panelStyle = computed(() => ({
  right: "24px",
  bottom: "88px",
  width: `${appState.floatingMenuState.width}px`,
  maxWidth: "calc(100vw - 32px)"
}));

onMounted(() => {
  void loadTabData();
});

async function loadTabData() {
  if (!appState.floatingMenuState.visible) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    if (appState.floatingMenuState.activeTab === "note") {
      notes.value = (await noteApi.getUserNotes(userId.value)).data;
    } else if (appState.floatingMenuState.activeTab === "wrong_book") {
      wrongQuestions.value = (await practiceApi.getWrongQuestions(userId.value)).data;
    } else if (appState.floatingMenuState.activeTab === "resource") {
      recommendations.value = (await recommendationsApi.getUserRecommendations(userId.value)).data;
    } else if (appState.floatingMenuState.activeTab === "qa") {
      await loadQaHistory();
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function loadQaHistory() {
  const sessions = (await chatApi.getSessions({ page: 1, pageSize: 50, userId: userId.value })).data.list;
  qaSessionId.value = sessions.find((session) => session.sessionType === "qa")?.id;
  qaMessages.value = qaSessionId.value ? (await chatApi.getMessages(qaSessionId.value)).data : [];
}

async function ask() {
  const message = question.value.trim();
  if (!message) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await chatApi.sendMessage({
      userId: userId.value,
      sessionId: qaSessionId.value,
      courseId: courseId.value,
      nodeId: appState.selectedNodeId ?? undefined,
      message,
      useRag: true,
      useProfile: true
    });
    qaSessionId.value = response.data.sessionId;
    question.value = "";
    qaMessages.value = (await chatApi.getMessages(response.data.sessionId)).data;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function saveNote() {
  if (!noteTitle.value.trim() || !noteContent.value.trim()) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    await noteApi.createNote({
      userId: userId.value,
      courseId: courseId.value,
      nodeId: appState.selectedNodeId ?? undefined,
      title: noteTitle.value.trim(),
      content: noteContent.value.trim(),
      tags: ["floating"]
    });
    noteTitle.value = "";
    noteContent.value = "";
    notes.value = (await noteApi.getUserNotes(userId.value)).data;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

function changeTab(tab: typeof appState.floatingMenuState.activeTab) {
  switchFloatingTab(tab);
  void loadTabData();
}

function togglePanel() {
  const opening = !appState.floatingMenuState.visible;
  toggleFloatingMenu();
  if (opening) void loadTabData();
}

function openQaHistory() {
  closeFloatingMenu();
  void router.push("/chat");
}

function movePanel() {
  updateFloatingPosition(appState.floatingMenuState.positionX, appState.floatingMenuState.positionY);
}
</script>

<template>
  <button class="floating-trigger" type="button" @click="togglePanel">
    <el-icon><Notebook /></el-icon>
    学习侧栏
  </button>

  <section v-if="appState.floatingMenuState.visible" class="floating-panel" :style="panelStyle">
    <header class="floating-header">
      <strong>学习浮窗</strong>
      <div>
        <el-button size="small" text :icon="Position" @click="movePanel">定位</el-button>
        <el-button size="small" text :icon="Close" @click="closeFloatingMenu">关闭</el-button>
      </div>
    </header>

    <nav class="floating-tabs" aria-label="浮窗标签">
      <button
        v-for="tab in [
          { key: 'qa', label: '问答' },
          { key: 'note', label: '笔记' },
          { key: 'wrong_book', label: '错题' },
          { key: 'resource', label: '资源' }
        ]"
        :key="tab.key"
        type="button"
        :class="{ active: appState.floatingMenuState.activeTab === tab.key }"
        @click="changeTab(tab.key as typeof appState.floatingMenuState.activeTab)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />
    <el-skeleton v-if="loading" :rows="3" animated />

    <section v-else-if="appState.floatingMenuState.activeTab === 'qa'" class="floating-body">
      <el-input v-model="question" type="textarea" :rows="3" placeholder="问一个当前知识点问题" aria-label="浮窗问题" />
      <el-button type="primary" :loading="loading" :disabled="!question.trim()" @click="ask">发送问题</el-button>
      <div v-if="qaMessages.length" class="floating-qa-history" aria-label="最近问答历史">
        <article v-for="message in qaMessages.slice(-4)" :key="message.id" class="floating-answer" :class="message.role">
          <header><strong>{{ message.role === 'user' ? '我' : '问答助手' }}</strong><time>{{ formatDate(message.createdAt) }}</time></header>
          <MarkdownContent v-if="message.contentType !== 'text'" :content="message.content" />
          <p v-else>{{ message.content }}</p>
        </article>
      </div>
      <el-empty v-else description="暂无问答历史" />
      <el-button text @click="openQaHistory">查看全部问答历史</el-button>
    </section>

    <section v-else-if="appState.floatingMenuState.activeTab === 'note'" class="floating-body">
      <el-input v-model="noteTitle" placeholder="笔记标题" aria-label="笔记标题" />
      <el-input v-model="noteContent" type="textarea" :rows="3" placeholder="记录当前疑问或结论" aria-label="笔记内容" />
      <el-button type="primary" :loading="loading" :disabled="!noteTitle.trim() || !noteContent.trim()" @click="saveNote">保存笔记</el-button>
      <article v-for="note in notes" :key="note.id" class="mini-list-item">
        <strong>{{ note.title }}</strong>
        <span>{{ note.content }}</span>
      </article>
    </section>

    <section v-else-if="appState.floatingMenuState.activeTab === 'wrong_book'" class="floating-body">
      <el-empty v-if="!wrongQuestions.length" description="暂无错题" />
      <article v-for="item in wrongQuestions" :key="item.id" class="mini-list-item">
        <strong>{{ item.title }}</strong>
        <span>{{ difficultyLabel(item.difficulty) }} · {{ questionTypeLabel(item.questionType) }}</span>
      </article>
    </section>

    <section v-else class="floating-body">
      <el-empty v-if="!recommendations.length" description="暂无推荐资源" />
      <article v-for="item in recommendations" :key="item.id" class="mini-list-item">
        <strong>{{ item.title }}</strong>
        <span>{{ item.reason }}</span>
      </article>
    </section>
  </section>
</template>
