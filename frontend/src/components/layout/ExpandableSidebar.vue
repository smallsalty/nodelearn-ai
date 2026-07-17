<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter, type RouteLocationRaw } from "vue-router";
import { ArrowLeft, ArrowRight, FolderOpened } from "@element-plus/icons-vue";
import SidebarGroup from "@/components/layout/SidebarGroup.vue";
import SidebarItem from "@/components/layout/SidebarItem.vue";
import type { Course } from "@/types/course";
import type { Component } from "vue";

const route = useRoute();
const router = useRouter();

export interface SidebarNavItem {
  id: string;
  to: RouteLocationRaw;
  label: string;
  description: string;
  icon: Component;
  match: {
    path: string;
    action?: string | null;
  };
}

export interface SidebarNavGroup {
  title: string;
  icon: Component;
  items: SidebarNavItem[];
}

const props = defineProps<{
  navGroups: SidebarNavGroup[];
  courses: Course[];
  selectedCourseId?: string;
  collapsed: boolean;
  mobileOpen: boolean;
  forceCollapsed?: boolean;
}>();

const emit = defineEmits<{
  "update:collapsed": [value: boolean];
  "update:mobileOpen": [value: boolean];
  courseChange: [courseId: string];
  navActivate: [itemId: string];
}>();

const effectiveCollapsed = computed(() => (props.collapsed || props.forceCollapsed) && !props.mobileOpen);

function toggleCollapsed() {
  emit("update:collapsed", !props.collapsed);
}

function closeMobile() {
  emit("update:mobileOpen", false);
}

function selectCourse(courseId: string) {
  emit("courseChange", courseId);
  closeMobile();
  void router.push("/home");
}

function activateNavItem(itemId: string) {
  emit("navActivate", itemId);
  closeMobile();
}

function isNavItemActive(item: SidebarNavItem) {
  if (item.match.path !== route.path) return false;
  const routeAction = typeof route.query.action === "string" ? route.query.action : null;
  return (item.match.action ?? null) === routeAction;
}

function groupHasActiveChild(group: SidebarNavGroup) {
  return group.items.some(isNavItemActive);
}
</script>

<template>
  <button
    v-if="mobileOpen"
    type="button"
    class="sidebar-mobile-backdrop"
    aria-label="关闭项目栏"
    @click="closeMobile"
  />

  <aside
    class="expandable-sidebar"
    :class="{ collapsed: effectiveCollapsed, 'mobile-open': mobileOpen }"
    aria-label="项目导航"
  >
    <div class="sidebar-brand-row">
      <RouterLink class="brand" to="/home" aria-label="NodeLearn 首页" @click="closeMobile">
        <span class="brand-mark">N</span>
        <span class="brand-copy">
          <strong>NodeLearn</strong>
          <small>学习工作台</small>
        </span>
      </RouterLink>
      <button
        v-if="!forceCollapsed"
        type="button"
        class="sidebar-collapse-button"
        :aria-pressed="effectiveCollapsed"
        @click="toggleCollapsed"
      >
        <el-icon><component :is="effectiveCollapsed ? ArrowRight : ArrowLeft" /></el-icon>
      </button>
    </div>

    <div class="sidebar-scroll-area">
      <SidebarGroup
        title="课程信息"
        :icon="FolderOpened"
        :count="courses.length"
        :collapsed="effectiveCollapsed"
        :has-active-child="route.path === '/home'"
      >
        <button
          v-for="course in courses"
          :key="course.id"
          type="button"
          class="course-switcher"
          :class="{ active: course.id === selectedCourseId && route.path === '/home' }"
          @click="selectCourse(course.id)"
        >
          <span>{{ course.name.slice(0, 1) }}</span>
          <strong>{{ course.name }}</strong>
          <small>{{ course.code ?? course.status }}</small>
        </button>
        <article v-if="!courses.length" class="sidebar-empty-note">暂无课程</article>
      </SidebarGroup>

      <SidebarGroup
        v-for="group in navGroups"
        :key="group.title"
        :title="group.title"
        :icon="group.icon"
        :count="group.items.length"
        :collapsed="effectiveCollapsed"
        :has-active-child="groupHasActiveChild(group)"
      >
        <SidebarItem
          v-for="item in group.items"
          :key="item.id"
          :label="item.label"
          :description="item.description"
          :icon="item.icon"
          :path="item.to"
          :active="isNavItemActive(item)"
          :collapsed="effectiveCollapsed"
          :depth="1"
          @activate="activateNavItem(item.id)"
        />

      </SidebarGroup>
    </div>
  </aside>
</template>
