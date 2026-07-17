<script setup lang="ts">
import { computed } from "vue";
import { CircleCheck, Clock, Close, More } from "@element-plus/icons-vue";
import type { TaskStatus } from "@/types/contracts";

const props = defineProps<{
  currentStep?: string | null;
  status?: TaskStatus;
}>();

const steps = [
  { key: "context_building", label: "构建学习上下文" },
  { key: "teaching_strategy", label: "规划个性化策略" },
  { key: "narrative_planning", label: "规划教学叙事" },
  { key: "storyboard_generation", label: "生成 Scene DSL" },
  { key: "storyboard_validation", label: "校验分镜与安全" },
  { key: "scene_template_resolution", label: "解析场景模板" },
  { key: "tts_generation", label: "逐场景语音合成" },
  { key: "audio_duration_analysis", label: "分析真实音频时长" },
  { key: "animation_timing_resolution", label: "解析动画时间轴" },
  { key: "remotion_rendering", label: "Remotion 渲染" },
  { key: "video_validation", label: "媒体与安全验收" },
  { key: "persistence", label: "发布资源" }
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
