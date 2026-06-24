<script setup lang="ts">
import { CircleClose, Document, Loading, Refresh } from "@element-plus/icons-vue";

defineProps<{
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyText?: string;
}>();

const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <section v-if="loading" class="state-block" aria-live="polite">
    <el-icon class="state-icon"><Loading /></el-icon>
    <strong>正在加载</strong>
    <el-skeleton :rows="4" animated />
  </section>
  <section v-else-if="error" class="state-block error-state" role="alert">
    <el-icon class="state-icon"><CircleClose /></el-icon>
    <strong>{{ error }}</strong>
    <el-button size="small" type="primary" plain :icon="Refresh" @click="emit('retry')">重试</el-button>
  </section>
  <section v-else-if="empty" class="state-block">
    <el-icon class="state-icon"><Document /></el-icon>
    <strong>{{ emptyText ?? "暂无数据" }}</strong>
    <span>可以刷新或切换当前课程、知识点后再查看。</span>
    <el-button size="small" type="primary" plain :icon="Refresh" @click="emit('retry')">刷新</el-button>
  </section>
  <slot v-else />
</template>
