<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import {
  ArrowLeft,
  ArrowRight,
  Collection,
  Files,
  FolderOpened,
  Notebook,
  Reading,
  Tickets
} from "@element-plus/icons-vue";
import SidebarGroup from "@/components/layout/SidebarGroup.vue";
import SidebarItem from "@/components/layout/SidebarItem.vue";
import type { Chapter, Course, KnowledgeNode } from "@/types/course";
import type { Component } from "vue";
import { difficultyLabel } from "@/utils/format";

const route = useRoute();

export interface SidebarNavItem {
  path: string;
  label: string;
  description: string;
  icon: Component;
}

export interface SidebarNavGroup {
  title: string;
  icon: Component;
  items: SidebarNavItem[];
}

interface SidebarNodeBranch {
  id: string;
  title: string;
  description?: string;
  root?: KnowledgeNode;
  nodes: KnowledgeNode[];
}

const props = defineProps<{
  navGroups: SidebarNavGroup[];
  courses: Course[];
  chapters: Chapter[];
  nodes: KnowledgeNode[];
  selectedCourseId?: string;
  selectedNodeId?: string | null;
  collapsed: boolean;
  mobileOpen: boolean;
}>();

const emit = defineEmits<{
  "update:collapsed": [value: boolean];
  "update:mobileOpen": [value: boolean];
  courseChange: [courseId: string];
  nodeChange: [nodeId: string];
}>();

const expandedBranches = ref(new Set<string>());

const effectiveCollapsed = computed(() => props.collapsed && !props.mobileOpen);

const activeCourse = computed(() => props.courses.find((course) => course.id === props.selectedCourseId) ?? props.courses[0]);

const nodeById = computed(() => new Map(props.nodes.map((node) => [node.id, node])));

const nodeBranches = computed<SidebarNodeBranch[]>(() => {
  const branchesFromChapters = props.chapters
    .map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      root: undefined,
      nodes: props.nodes.filter((node) => node.chapterId === chapter.id)
    }))
    .filter((branch) => branch.nodes.length);

  if (branchesFromChapters.length) return branchesFromChapters;

  const childIds = new Set(props.nodes.flatMap((node) => node.nextNodeIds ?? []));
  const roots = props.nodes.filter((node) => !node.prerequisiteNodeIds?.length || !childIds.has(node.id)).slice(0, 10);
  const fallbackRoots = roots.length ? roots : props.nodes.slice(0, 8);

  return fallbackRoots.map((root) => ({
    id: root.id,
    title: root.name,
    description: root.description,
    root,
    nodes: (root.nextNodeIds ?? [])
      .map((nodeId) => nodeById.value.get(nodeId))
      .filter((node): node is KnowledgeNode => Boolean(node))
      .slice(0, 8)
  }));
});

function toggleCollapsed() {
  emit("update:collapsed", !props.collapsed);
}

function closeMobile() {
  emit("update:mobileOpen", false);
}

function selectCourse(courseId: string) {
  emit("courseChange", courseId);
  closeMobile();
}

function selectNode(nodeId: string) {
  emit("nodeChange", nodeId);
  closeMobile();
}

function toggleBranch(branchId: string) {
  const next = new Set(expandedBranches.value);
  if (next.has(branchId)) {
    next.delete(branchId);
  } else {
    next.add(branchId);
  }
  expandedBranches.value = next;
}

function isBranchOpen(branchId: string) {
  return expandedBranches.value.has(branchId);
}

function groupHasActiveChild(group: SidebarNavGroup) {
  return group.items.some((item) => item.path === route.path);
}

function branchHasActiveNode(branch: SidebarNodeBranch) {
  return branch.root?.id === props.selectedNodeId || branch.nodes.some((node) => node.id === props.selectedNodeId);
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
      <button type="button" class="sidebar-collapse-button" :aria-pressed="collapsed" @click="toggleCollapsed">
        <el-icon><component :is="collapsed ? ArrowRight : ArrowLeft" /></el-icon>
      </button>
    </div>

    <div class="sidebar-scroll-area">
      <SidebarGroup
        title="课程入口"
        :icon="FolderOpened"
        :count="courses.length"
        :collapsed="effectiveCollapsed"
        :has-active-child="Boolean(selectedCourseId)"
      >
        <button
          v-for="course in courses"
          :key="course.id"
          type="button"
          class="course-switcher"
          :class="{ active: course.id === selectedCourseId }"
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
          :key="item.path"
          :label="item.label"
          :description="item.description"
          :icon="item.icon"
          :path="item.path"
          :active="route.path === item.path"
          :collapsed="effectiveCollapsed"
          :depth="1"
          @activate="closeMobile"
        />
      </SidebarGroup>

      <SidebarGroup
        title="知识节点"
        :icon="Reading"
        :count="nodes.length"
        :collapsed="effectiveCollapsed"
        :has-active-child="route.path === '/knowledge-graph' || Boolean(selectedNodeId)"
        :popover-width="340"
      >
        <article v-if="activeCourse" class="sidebar-course-note">
          <el-icon><Files /></el-icon>
          <span>{{ activeCourse.name }}</span>
        </article>
        <article v-if="!nodeBranches.length" class="sidebar-empty-note">暂无知识节点</article>
        <section v-for="branch in nodeBranches" :key="branch.id" class="sidebar-node-branch">
          <button
            type="button"
            class="sidebar-branch-trigger"
            :class="{ 'has-active-child': branchHasActiveNode(branch) }"
            :aria-expanded="isBranchOpen(branch.id)"
            @click="toggleBranch(branch.id)"
          >
            <span class="sidebar-item-icon">
              <el-icon><Notebook /></el-icon>
            </span>
            <span>
              <strong>{{ branch.title }}</strong>
              <small>{{ branch.nodes.length }} 个子节点</small>
            </span>
            <el-icon class="sidebar-group-arrow"><component :is="isBranchOpen(branch.id) ? ArrowLeft : ArrowRight" /></el-icon>
          </button>

          <div v-show="isBranchOpen(branch.id)" class="sidebar-child-list">
            <SidebarItem
              v-if="branch.root"
              :label="branch.root.name"
              :description="`${branch.root.nodeType} · ${difficultyLabel(branch.root.difficulty)}`"
              :icon="Tickets"
              path="/knowledge-graph"
              :active="branch.root.id === selectedNodeId"
              :depth="2"
              @activate="selectNode(branch.root.id)"
            />
            <SidebarItem
              v-for="node in branch.nodes"
              :key="node.id"
              :label="node.name"
              :description="`${node.nodeType} · ${difficultyLabel(node.difficulty)}`"
              :icon="Collection"
              path="/knowledge-graph"
              :active="node.id === selectedNodeId"
              :depth="2"
              @activate="selectNode(node.id)"
            />
          </div>
        </section>
      </SidebarGroup>
    </div>
  </aside>
</template>
