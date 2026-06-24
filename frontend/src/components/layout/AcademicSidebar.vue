<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  items: Array<{
    path: string;
    label: string;
    description: string;
    icon: Component;
  }>;
}>();
</script>

<template>
  <aside class="academic-sidebar" aria-label="主导航">
    <RouterLink class="brand" to="/home" aria-label="NodeLearn 首页">
      <span class="brand-mark">N</span>
      <span>
        <strong>NodeLearn</strong>
        <small>课程学习工作台</small>
      </span>
    </RouterLink>

    <nav class="nav-list">
      <RouterLink
        v-for="item in items"
        :key="item.path"
        class="nav-item"
        :to="item.path"
      >
        <span class="nav-icon" aria-hidden="true">
          <el-icon><component :is="item.icon" /></el-icon>
        </span>
        <span class="nav-text">
          <span>{{ item.label }}</span>
          <small>{{ item.description }}</small>
        </span>
      </RouterLink>
    </nav>

    <p class="sidebar-footnote">数据结构课程 · 学习资源与评估闭环</p>
  </aside>
</template>
