<script setup lang="ts">
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
    <el-skeleton :rows="4" animated />
  </section>
  <section v-else-if="error" class="state-block error-state" role="alert">
    <strong>{{ error }}</strong>
    <el-button size="small" type="primary" plain @click="emit('retry')">重试</el-button>
  </section>
  <section v-else-if="empty" class="state-block">
    <el-empty :description="emptyText ?? '暂无数据'" />
    <el-button size="small" type="primary" plain @click="emit('retry')">刷新</el-button>
  </section>
  <slot v-else />
</template>
