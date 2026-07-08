<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ChatLineRound,
  Collection,
  DataAnalysis,
  EditPen,
  FolderOpened,
  Guide,
  House,
  Management,
  Notebook,
  Share,
  User
} from "@element-plus/icons-vue";
import AcademicTopbar from "@/components/layout/AcademicTopbar.vue";
import DetailDrawer from "@/components/layout/DetailDrawer.vue";
import ExpandableSidebar, { type SidebarNavGroup } from "@/components/layout/ExpandableSidebar.vue";
import { courseApi } from "@/api/modules/course";
import { getErrorMessage } from "@/api/client";
import { appState, clearAuthState, setCurrentCourse } from "@/stores";
import type { Chapter, Course, KnowledgeNode } from "@/types/course";
import { DEFAULT_COURSE_ID } from "@/utils/format";

const route = useRoute();
const router = useRouter();
const courses = ref<Course[]>([]);
const chapters = ref<Chapter[]>([]);
const nodes = ref<KnowledgeNode[]>([]);
const selectedCourseId = ref(appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const layoutLoading = ref(false);
const layoutError = ref("");
const contextOpen = ref(false);
const sidebarCollapsed = ref(false);
const sidebarMobileOpen = ref(false);

const navItems = [
  { path: "/home", label: "首页", description: "学习概览", icon: House },
  { path: "/chat", label: "对话学习", description: "课程问答", icon: ChatLineRound },
  { path: "/profile", label: "学生画像", description: "偏好与薄弱点", icon: User },
  { path: "/learning-path", label: "学习路径", description: "阶段任务", icon: Guide },
  { path: "/resources", label: "资源中心", description: "生成与预览", icon: Collection },
  { path: "/knowledge-graph", label: "知识图谱", description: "节点依赖", icon: Share },
  { path: "/practice", label: "练习测评", description: "题目与错因", icon: EditPen },
  { path: "/reports", label: "学习报告", description: "评估与建议", icon: DataAnalysis },
  { path: "/admin/knowledge-base", label: "知识库管理", description: "课程材料", icon: FolderOpened }
];

const navGroups: SidebarNavGroup[] = [
  {
    title: "学习入口",
    icon: Notebook,
    items: navItems.slice(0, 4)
  },
  {
    title: "学习工具",
    icon: Collection,
    items: navItems.slice(4, 8)
  },
  {
    title: "项目管理",
    icon: Management,
    items: navItems.slice(8)
  }
];

const currentPageTitle = computed(() => {
  return navItems.find((item) => item.path === route.path)?.label ?? "NodeLearn AI";
});

const currentCourse = computed(() => courses.value.find((course) => course.id === selectedCourseId.value) ?? appState.currentCourse);
const selectedNode = computed(() => nodes.value.find((node) => node.id === appState.selectedNodeId));

onMounted(() => {
  void loadCourses();
});

watch(
  () => appState.currentCourse?.id,
  (courseId) => {
    if (courseId && courseId !== selectedCourseId.value) {
      selectedCourseId.value = courseId;
      void loadNodes();
    }
  }
);

async function loadCourses() {
  layoutLoading.value = true;
  layoutError.value = "";
  try {
    const response = await courseApi.getCourses({ page: 1, pageSize: 20 });
    courses.value = response.data.list;
    const nextCourse = courses.value.find((course) => course.id === selectedCourseId.value) ?? courses.value[0] ?? null;
    if (nextCourse) {
      selectedCourseId.value = nextCourse.id;
      setCurrentCourse(nextCourse);
    }
    await loadNodes();
  } catch (error) {
    layoutError.value = getErrorMessage(error);
  } finally {
    layoutLoading.value = false;
  }
}

async function loadNodes() {
  if (!selectedCourseId.value) return;
  try {
    const [nodeResponse, chapterResponse] = await Promise.allSettled([
      courseApi.getNodes(selectedCourseId.value),
      courseApi.getChapters(selectedCourseId.value)
    ]);
    if (nodeResponse.status === "rejected") {
      throw nodeResponse.reason;
    }
    nodes.value = nodeResponse.value.data;
    chapters.value = chapterResponse.status === "fulfilled" ? chapterResponse.value.data : [];
    if (!appState.selectedNodeId && nodes.value[0]) {
      appState.selectedNodeId = nodes.value[0].id;
    }
  } catch (error) {
    layoutError.value = getErrorMessage(error);
  }
}

function changeCourse(courseId: string) {
  selectedCourseId.value = courseId;
  const course = courses.value.find((item) => item.id === courseId) ?? null;
  setCurrentCourse(course);
  appState.selectedNodeId = null;
  chapters.value = [];
  void loadNodes();
}

function changeNode(nodeId: string) {
  appState.selectedNodeId = nodeId || null;
}

async function logout() {
  clearAuthState();
  await router.push("/login");
}
</script>

<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <ExpandableSidebar
      v-model:collapsed="sidebarCollapsed"
      v-model:mobile-open="sidebarMobileOpen"
      :nav-groups="navGroups"
      :courses="courses"
      :chapters="chapters"
      :nodes="nodes"
      :selected-course-id="selectedCourseId"
      :selected-node-id="appState.selectedNodeId"
      @course-change="changeCourse"
      @node-change="changeNode"
    />

    <section class="app-main">
      <AcademicTopbar
        :title="currentPageTitle"
        :courses="courses"
        :nodes="nodes"
        :selected-course-id="selectedCourseId"
        :selected-node-id="appState.selectedNodeId"
        :username="appState.currentUser?.username ?? 'demo_student'"
        :course="currentCourse"
        :node="selectedNode"
        :profile="appState.currentProfile"
        :loading="layoutLoading"
        :error="layoutError"
        @course-change="changeCourse"
        @node-change="changeNode"
        @open-sidebar="sidebarMobileOpen = true"
        @open-context="contextOpen = true"
        @logout="logout"
      />

      <main id="main-content" class="app-content" tabindex="-1">
        <slot />
      </main>
    </section>

    <DetailDrawer
      v-model="contextOpen"
      :course="currentCourse"
      :node="selectedNode"
      :profile="appState.currentProfile"
    />
  </div>
</template>
