<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { ArrowDown, ArrowRight } from "@element-plus/icons-vue";
import type { Component } from "vue";

const props = withDefaults(
  defineProps<{
    title: string;
    icon?: Component;
    count?: number;
    collapsed?: boolean;
    defaultOpen?: boolean;
    active?: boolean;
    hasActiveChild?: boolean;
    popoverWidth?: number;
  }>(),
  {
    count: undefined,
    collapsed: false,
    defaultOpen: true,
    active: false,
    hasActiveChild: false,
    popoverWidth: 300
  }
);

const open = ref(props.defaultOpen);
const popoverVisible = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.collapsed,
  (collapsed) => {
    if (!collapsed && props.defaultOpen) open.value = true;
    if (!collapsed) popoverVisible.value = false;
  }
);

function clearHideTimer() {
  if (!hideTimer) return;
  clearTimeout(hideTimer);
  hideTimer = null;
}

function showPopover() {
  if (!props.collapsed) return;
  clearHideTimer();
  popoverVisible.value = true;
}

function scheduleHide(delay = 160) {
  clearHideTimer();
  hideTimer = setTimeout(() => {
    popoverVisible.value = false;
  }, delay);
}

function handleTriggerClick() {
  if (props.collapsed) {
    showPopover();
    return;
  }
  open.value = !open.value;
}

onBeforeUnmount(clearHideTimer);
</script>

<template>
  <section class="sidebar-group" :class="{ collapsed, active, 'has-active-child': hasActiveChild }">
    <el-popover
      v-if="collapsed"
      v-model:visible="popoverVisible"
      placement="right-start"
      :width="popoverWidth"
      :show-arrow="false"
      :teleported="true"
      popper-class="sidebar-collapsed-popover"
    >
      <template #reference>
        <button
          type="button"
          class="sidebar-group-trigger"
          :aria-expanded="popoverVisible"
          :title="title"
          @click="handleTriggerClick"
          @mouseenter="showPopover"
          @mouseleave="scheduleHide()"
          @focusin="showPopover"
          @focusout="scheduleHide()"
        >
          <span class="sidebar-group-icon" aria-hidden="true">
            <el-icon v-if="icon"><component :is="icon" /></el-icon>
          </span>
          <span class="sidebar-group-title">{{ title }}</span>
          <span v-if="typeof count === 'number'" class="sidebar-group-count">{{ count }}</span>
          <el-icon class="sidebar-group-arrow" aria-hidden="true">
            <component :is="ArrowRight" />
          </el-icon>
        </button>
      </template>
      <section
        class="sidebar-popover-panel"
        @mouseenter="showPopover"
        @mouseleave="scheduleHide()"
        @focusin="showPopover"
        @focusout="scheduleHide()"
        @click="scheduleHide(120)"
      >
        <header class="sidebar-popover-header">
          <span class="sidebar-group-icon" aria-hidden="true">
            <el-icon v-if="icon"><component :is="icon" /></el-icon>
          </span>
          <strong>{{ title }}</strong>
          <small v-if="typeof count === 'number'">{{ count }}</small>
        </header>
        <div class="sidebar-popover-body">
          <slot />
        </div>
      </section>
    </el-popover>

    <template v-else>
      <button
        type="button"
        class="sidebar-group-trigger"
        :aria-expanded="open"
        :title="title"
        @click="handleTriggerClick"
      >
        <span class="sidebar-group-icon" aria-hidden="true">
          <el-icon v-if="icon"><component :is="icon" /></el-icon>
        </span>
        <span class="sidebar-group-title">{{ title }}</span>
        <span v-if="typeof count === 'number'" class="sidebar-group-count">{{ count }}</span>
        <el-icon class="sidebar-group-arrow" aria-hidden="true">
          <component :is="open ? ArrowDown : ArrowRight" />
        </el-icon>
      </button>
      <div v-show="open" class="sidebar-group-body">
        <slot />
      </div>
    </template>
  </section>
</template>
