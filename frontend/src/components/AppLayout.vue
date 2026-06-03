<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { appState, clearAuthState } from "@/stores";

const route = useRoute();
const router = useRouter();

const navItems = [
  { path: "/home", label: "首页", icon: "⌂" },
  { path: "/chat", label: "AI 对话", icon: "◇" },
  { path: "/profile", label: "学生画像", icon: "◎" },
  { path: "/learning-path", label: "学习路径", icon: "↗" },
  { path: "/resources", label: "资源中心", icon: "▣" },
  { path: "/knowledge-graph", label: "知识图谱", icon: "⌬" },
  { path: "/practice", label: "练习测评", icon: "✓" },
  { path: "/reports", label: "学习报告", icon: "▤" },
  { path: "/admin/knowledge-base", label: "知识库管理", icon: "▦" }
];

const currentPageTitle = computed(() => {
  return navItems.find((item) => item.path === route.path)?.label ?? "NodeLearn AI";
});

async function logout() {
  clearAuthState();
  await router.push("/login");
}
</script>

<template>
  <div class="app-layout">
    <aside class="app-sidebar" aria-label="主导航">
      <RouterLink class="brand" to="/home" aria-label="NodeLearn AI 首页">
        <span class="brand-mark">N</span>
        <span>
          <strong>NodeLearn AI</strong>
          <small>个性化学习系统</small>
        </span>
      </RouterLink>

      <nav class="nav-list">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          class="nav-item"
          :to="item.path"
          :aria-current="route.path === item.path ? 'page' : undefined"
        >
          <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <nav class="mobile-bottom-nav" aria-label="移动导航">
      <RouterLink
        v-for="item in navItems"
        :key="`mobile-${item.path}`"
        class="nav-item"
        :to="item.path"
        :aria-current="route.path === item.path ? 'page' : undefined"
      >
        <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <section class="app-main">
      <header class="app-topbar">
        <div>
          <p class="topbar-kicker">数据结构 · 多智能体学习</p>
          <h1>{{ currentPageTitle }}</h1>
        </div>
        <div class="topbar-actions">
          <el-tag type="success" effect="light">{{ appState.currentCourse?.name ?? "数据结构" }}</el-tag>
          <span class="user-chip">{{ appState.currentUser?.username ?? "demo_student" }}</span>
          <el-button plain size="small" @click="logout">退出</el-button>
        </div>
      </header>

      <main id="main-content" class="app-content" tabindex="-1">
        <slot />
      </main>
    </section>
  </div>
</template>
