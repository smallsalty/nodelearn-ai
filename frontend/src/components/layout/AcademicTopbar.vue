<script setup lang="ts">
import { Menu, SwitchButton } from "@element-plus/icons-vue";
import type { Course, KnowledgeNode } from "@/types/course";

defineProps<{
  title: string;
  courses: Course[];
  nodes: KnowledgeNode[];
  selectedCourseId?: string;
  selectedNodeId?: string | null;
  username: string;
  loading?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  courseChange: [courseId: string];
  nodeChange: [nodeId: string];
  openContext: [];
  logout: [];
}>();

function handleCourseChange(value: string | number | boolean | Record<string, unknown>) {
  if (typeof value === "string") emit("courseChange", value);
}

function handleNodeChange(value: string | number | boolean | Record<string, unknown> | undefined) {
  emit("nodeChange", typeof value === "string" ? value : "");
}
</script>

<template>
  <header class="app-topbar">
    <div class="topbar-title">
      <p>Clean Academic Dashboard</p>
      <h1>{{ title }}</h1>
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
        class="topbar-select"
        :model-value="selectedNodeId ?? undefined"
        filterable
        clearable
        placeholder="选择知识点"
        aria-label="选择知识点"
        @change="handleNodeChange"
      >
        <el-option v-for="node in nodes" :key="node.id" :label="node.name" :value="node.id" />
      </el-select>
      <span class="user-chip">{{ username }}</span>
      <el-button class="context-toggle" plain :icon="Menu" @click="emit('openContext')">上下文</el-button>
      <el-button plain size="small" :icon="SwitchButton" @click="emit('logout')">退出</el-button>
    </div>
  </header>
</template>
