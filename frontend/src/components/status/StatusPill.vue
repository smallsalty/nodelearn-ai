<script setup lang="ts">
import { CircleCheck, Clock, Close, Warning } from "@element-plus/icons-vue";
import type { TaskStatus } from "@/types/contracts";
import { statusLabel } from "@/utils/format";

const props = defineProps<{
  status?: TaskStatus;
}>();

function iconForStatus() {
  if (props.status === "success") return CircleCheck;
  if (props.status === "failed" || props.status === "cancelled") return Close;
  if (props.status === "running") return Clock;
  return Warning;
}
</script>

<template>
  <span class="status-pill" :class="status ? `status-${status}` : 'status-pending'">
    <el-icon><component :is="iconForStatus()" /></el-icon>
    {{ statusLabel(status) }}
  </span>
</template>
