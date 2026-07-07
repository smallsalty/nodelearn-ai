<script setup lang="ts">
import { computed } from "vue";
import { CircleCheck, Clock, Close, More } from "@element-plus/icons-vue";
import type { TaskStatus } from "@/types/contracts";

const props = defineProps<{
  currentStep?: string | null;
  status?: TaskStatus;
}>();

const steps = [
  { key: "load_context", label: "读取知识点" },
  { key: "generate_teaching_plan", label: "生成教学计划" },
  { key: "generate_script", label: "生成脚本" },
  { key: "generate_storyboard", label: "生成分镜" },
  { key: "validate_script", label: "校验脚本" },
  { key: "synthesize_audio", label: "语音合成" },
  { key: "render_video", label: "视频渲染" },
  { key: "audit_resource", label: "安全校验" },
  { key: "persist_resource", label: "保存资源" }
];

const currentIndex = computed(() => steps.findIndex((step) => step.key === props.currentStep));

function stateFor(index: number, key: string) {
  if (props.status === "success") return "done";
  if ((props.status === "failed" || props.status === "cancelled") && props.currentStep === key) return "error";
  if (index < currentIndex.value) return "done";
  if (index === currentIndex.value) return "active";
  return "pending";
}

function iconFor(state: string) {
  if (state === "done") return CircleCheck;
  if (state === "error") return Close;
  if (state === "active") return Clock;
  return More;
}
</script>

<template>
  <ol class="multimodal-step-list" aria-label="多模态资源生成步骤">
    <li
      v-for="(step, index) in steps"
      :key="step.key"
      :class="stateFor(index, step.key)"
    >
      <el-icon><component :is="iconFor(stateFor(index, step.key))" /></el-icon>
      <span>{{ step.label }}</span>
    </li>
  </ol>
</template>
