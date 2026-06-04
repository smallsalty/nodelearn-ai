<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { chatApi } from "@/api/modules/chat";
import { noteApi } from "@/api/modules/note";
import { practiceApi } from "@/api/modules/practice";
import { recommendationsApi } from "@/api/modules/recommendations";
import { getErrorMessage } from "@/api/client";
import {
  appState,
  closeFloatingMenu,
  openFloatingMenu,
  switchFloatingTab,
  toggleFloatingMenu,
  updateFloatingPosition
} from "@/stores";
import type { Note } from "@/types/note";
import type { PracticeQuestion } from "@/types/practice";
import type { ResourceRecommendation } from "@/types/resource";

const userId = computed(() => appState.currentUser?.id ?? "user_demo_001");
const courseId = computed(() => appState.currentCourse?.id ?? "course_ds_001");
const question = ref("");
const answer = ref("");
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
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function ask() {
  const message = question.value.trim();
  if (!message) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await chatApi.sendMessage({
      userId: userId.value,
      courseId: courseId.value,
      nodeId: appState.selectedNodeId ?? undefined,
      message,
      useRag: true,
      useProfile: true
    });
    answer.value = response.data.answer;
    question.value = "";
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

function movePanel() {
  updateFloatingPosition(appState.floatingMenuState.positionX, appState.floatingMenuState.positionY);
}
</script>

<template>
  <button class="floating-trigger" type="button" @click="toggleFloatingMenu">
    AI 助手
  </button>

  <section v-if="appState.floatingMenuState.visible" class="floating-panel" :style="panelStyle">
    <header class="floating-header">
      <strong>学习浮窗</strong>
      <div>
        <el-button size="small" text @click="movePanel">定位</el-button>
        <el-button size="small" text @click="closeFloatingMenu">关闭</el-button>
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
      <el-input v-model="question" type="textarea" :rows="3" placeholder="问一个当前知识点问题" />
      <el-button type="primary" @click="ask">发送问题</el-button>
      <p v-if="answer" class="floating-answer">{{ answer }}</p>
    </section>

    <section v-else-if="appState.floatingMenuState.activeTab === 'note'" class="floating-body">
      <el-input v-model="noteTitle" placeholder="笔记标题" />
      <el-input v-model="noteContent" type="textarea" :rows="3" placeholder="记录当前疑问或结论" />
      <el-button type="primary" @click="saveNote">保存笔记</el-button>
      <article v-for="note in notes" :key="note.id" class="mini-list-item">
        <strong>{{ note.title }}</strong>
        <span>{{ note.content }}</span>
      </article>
    </section>

    <section v-else-if="appState.floatingMenuState.activeTab === 'wrong_book'" class="floating-body">
      <el-empty v-if="!wrongQuestions.length" description="暂无错题" />
      <article v-for="item in wrongQuestions" :key="item.id" class="mini-list-item">
        <strong>{{ item.title }}</strong>
        <span>{{ item.difficulty }} · {{ item.questionType }}</span>
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
