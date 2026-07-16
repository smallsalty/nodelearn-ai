<script setup lang="ts">
import { computed } from "vue";
import { InfoFilled, Menu, SwitchButton } from "@element-plus/icons-vue";
import { useSelectedOptionAtTop } from "@/composables/useSelectedOptionAtTop";
import type { Chapter, Course, KnowledgeNode } from "@/types/course";
import type { StudentProfile } from "@/types/profile";
import { sortChaptersByCourseOrder, sortNodesByCourseOrder } from "@/utils/courseOrder";

const NODE_TARGET_POPPER_CLASS = "topbar-node-target-popper";
const NODE_TARGET_SELECT_ID = "topbar-node-target-select";

const emit = defineEmits<{
  courseChange: [courseId: string];
  chapterChange: [chapterId: string];
  nodeChange: [nodeId: string];
  openSidebar: [];
  openContext: [];
  logout: [];
}>();

const props = defineProps<{
  title: string;
  courses: Course[];
  chapters: Chapter[];
  nodes: KnowledgeNode[];
  selectedCourseId?: string;
  selectedChapterId?: string | null;
  selectedNodeId?: string | null;
  username: string;
  course?: Course | null;
  node?: KnowledgeNode | null;
  profile?: StudentProfile | null;
  loading?: boolean;
  error?: string;
}>();

const selectedTarget = computed(() => {
  if (props.selectedNodeId) return `node:${props.selectedNodeId}`;
  if (props.selectedChapterId) return `chapter:${props.selectedChapterId}`;
  return undefined;
});

const orderedChapters = computed(() => sortChaptersByCourseOrder(props.chapters));
const orderedNodes = computed(() => sortNodesByCourseOrder(orderedChapters.value, props.nodes));
const { handleVisibleChange: handleNodeTargetVisibleChange } = useSelectedOptionAtTop(
  NODE_TARGET_POPPER_CLASS,
  NODE_TARGET_SELECT_ID
);

const nodesByChapter = computed(() => {
  const groups = new Map<string, KnowledgeNode[]>();
  for (const chapter of orderedChapters.value) groups.set(chapter.id, []);
  for (const node of orderedNodes.value) {
    if (!node.chapterId || !groups.has(node.chapterId)) continue;
    groups.get(node.chapterId)?.push(node);
  }
  return groups;
});

function handleCourseChange(value: string | number | boolean | Record<string, unknown>) {
  if (typeof value === "string") emit("courseChange", value);
}

function handleNodeChange(value: string | number | boolean | Record<string, unknown> | undefined) {
  if (typeof value !== "string") {
    emit("nodeChange", "");
    return;
  }
  if (value.startsWith("chapter:")) {
    emit("chapterChange", value.slice("chapter:".length));
    return;
  }
  emit("nodeChange", value.startsWith("node:") ? value.slice("node:".length) : value);
}
</script>

<template>
  <header class="app-topbar">
    <div class="topbar-heading">
      <el-button class="sidebar-mobile-toggle" plain :icon="Menu" aria-label="打开项目栏" @click="emit('openSidebar')" />
      <div class="topbar-title">
        <p>NodeLearn 学习平台</p>
        <h1>{{ title }}</h1>
      </div>
    </div>

    <div class="topbar-controls">
      <el-alert v-if="error" :title="error" type="warning" show-icon :closable="false" />
      <el-select
        class="topbar-select"
        :model-value="selectedCourseId"
        :loading="loading"
        filterable
        placeholder="选择课程"
        aria-label="选择课程"
        @change="handleCourseChange"
      >
        <el-option v-for="course in courses" :key="course.id" :label="course.name" :value="course.id" />
      </el-select>
      <el-select
        :id="NODE_TARGET_SELECT_ID"
        class="topbar-select"
        :model-value="selectedTarget"
        :popper-class="NODE_TARGET_POPPER_CLASS"
        filterable
        clearable
        placeholder="选择章节总览或知识点"
        aria-label="选择章节总览或知识点"
        @change="handleNodeChange"
        @visible-change="handleNodeTargetVisibleChange"
      >
        <el-option-group v-for="chapter in orderedChapters" :key="chapter.id" :label="chapter.title">
          <el-option :label="`${chapter.title} · 总览`" :value="`chapter:${chapter.id}`" />
          <el-option
            v-for="node in nodesByChapter.get(chapter.id) ?? []"
            :key="node.id"
            :label="node.name"
            :value="`node:${node.id}`"
          />
        </el-option-group>
      </el-select>
      <span class="user-chip">{{ username }}</span>
      <button type="button" class="top-context-card" @click="emit('openContext')">
        <el-icon><InfoFilled /></el-icon>
        <span>
          <strong>{{ course?.name ?? "数据结构" }}</strong>
          <small>{{ node?.name ?? profile?.learningProgress ?? "查看学习上下文" }}</small>
        </span>
      </button>
      <el-button plain size="small" :icon="SwitchButton" @click="emit('logout')">退出</el-button>
    </div>
  </header>
</template>
