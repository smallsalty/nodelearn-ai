<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import MultimodalStepList from "@/components/multimodal/MultimodalStepList.vue";
import { getErrorMessage } from "@/api/client";
import { multimodalApi } from "@/api/modules/multimodal";
import type { MultimodalTaskEvent, MultimodalTaskResult } from "@/types/multimodal";
import { statusLabel, statusTagType } from "@/utils/format";

const props = defineProps<{
  taskId?: string | null;
  initialTask?: MultimodalTaskResult | null;
}>();

const emit = defineEmits<{
  completed: [task: MultimodalTaskResult];
  failed: [task: MultimodalTaskResult];
}>();

const task = ref<MultimodalTaskResult | null>(props.initialTask ?? null);
const events = ref<MultimodalTaskEvent[]>([]);
const loading = ref(false);
const errorMessage = ref("");
let timer: number | undefined;

watch(
  () => props.initialTask,
  (value) => {
    if (value) task.value = value;
  }
);

watch(
  () => props.taskId,
  (value) => {
    window.clearInterval(timer);
    if (value) {
      void refresh();
      timer = window.setInterval(refresh, 1600);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  window.clearInterval(timer);
});

async function refresh() {
  if (!props.taskId) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const [taskResponse, eventsResponse] = await Promise.all([
      multimodalApi.getVideoTask(props.taskId),
      multimodalApi.getVideoTaskEvents(props.taskId)
    ]);
    task.value = taskResponse.data;
    events.value = eventsResponse.data;
    if (task.value.status === "success") {
      window.clearInterval(timer);
      emit("completed", task.value);
    }
    if (task.value.status === "failed" || task.value.status === "cancelled") {
      window.clearInterval(timer);
      emit("failed", task.value);
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

defineExpose({ refresh });
</script>

<template>
  <section v-if="task" class="multimodal-progress">
    <div class="progress-title">
      <strong>任务 {{ task.taskId }}</strong>
      <el-tag :type="statusTagType(task.status)">{{ statusLabel(task.status) }}</el-tag>
    </div>
    <el-progress :percentage="Math.round(task.progress ?? 0)" />
    <MultimodalStepList :current-step="task.currentStep" :status="task.status" />
    <el-alert v-if="task.errorMessage" :title="task.errorMessage" type="error" show-icon :closable="false" />
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />
    <div class="event-list" aria-live="polite">
      <article v-for="event in events.slice(-5)" :key="`${event.createdAt}-${event.stepName}`" class="event-item">
        <strong>{{ event.stepName }}</strong>
        <span>{{ event.message }}</span>
      </article>
    </div>
    <el-button v-if="task.status === 'failed'" :loading="loading" @click="refresh">重试查询</el-button>
  </section>
</template>

<style scoped>
.multimodal-progress {
  display: grid;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-lg);
  background: var(--nl-bg);
}

.progress-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.event-list {
  display: grid;
  gap: 6px;
}

.event-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--nl-text-muted);
  font-size: 13px;
}

.event-item strong {
  color: var(--nl-text);
}
</style>
