<script setup lang="ts">
import type { Component } from "vue";
import type { RouteLocationRaw } from "vue-router";

defineProps<{
  label: string;
  description?: string;
  icon?: Component;
  path?: RouteLocationRaw;
  active?: boolean;
  collapsed?: boolean;
  depth?: number;
}>();

const emit = defineEmits<{ activate: [] }>();
</script>

<template>
  <RouterLink
    v-if="path"
    class="sidebar-item"
    :class="{ active, collapsed, nested: depth }"
    :style="{ '--item-depth': depth ?? 0 }"
    :to="path"
    :title="label"
    @click="emit('activate')"
  >
    <span class="sidebar-item-icon" aria-hidden="true">
      <el-icon v-if="icon"><component :is="icon" /></el-icon>
      <span v-else class="sidebar-item-dot" />
    </span>
    <span class="sidebar-item-text">
      <strong>{{ label }}</strong>
      <small v-if="description">{{ description }}</small>
    </span>
  </RouterLink>

  <button
    v-else
    type="button"
    class="sidebar-item"
    :class="{ active, collapsed, nested: depth }"
    :style="{ '--item-depth': depth ?? 0 }"
    :title="label"
    @click="emit('activate')"
  >
    <span class="sidebar-item-icon" aria-hidden="true">
      <el-icon v-if="icon"><component :is="icon" /></el-icon>
      <span v-else class="sidebar-item-dot" />
    </span>
    <span class="sidebar-item-text">
      <strong>{{ label }}</strong>
      <small v-if="description">{{ description }}</small>
    </span>
  </button>
</template>
