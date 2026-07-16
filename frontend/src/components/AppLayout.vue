<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
const routeCourseId = typeof route.params.courseId === "string" ? route.params.courseId : "";
const selectedCourseId = ref(routeCourseId || appState.currentCourse?.id || DEFAULT_COURSE_ID);
const layoutLoading = ref(false);
const layoutError = ref("");
const contextOpen = ref(false);
const sidebarCollapsed = ref(false);
const sidebarMobileOpen = ref(false);
const readerCompactViewport = ref(false);
let readerCompactMedia: MediaQueryList | null = null;

const navItems = computed(() => [
  { path: `/courses/${selectedCourseId.value}/content`, label: "课程正文", description: "全文与目录", icon: Notebook },
  { path: "/home", label: "首页", description: "学习概览", icon: House },
  { path: "/chat", label: "对话学习", description: "课程问答", icon: ChatLineRound },
  { path: "/profile", label: "学生画像", description: "偏好与薄弱点", icon: User },
  { path: "/learning-path", label: "学习路径", description: "阶段任务", icon: Guide },
  { path: "/resources", label: "资源中心", description: "生成与预览", icon: Collection },
  { path: "/knowledge-graph", label: "知识图谱", description: "节点依赖", icon: Share },
  { path: "/practice", label: "练习测评", description: "题目与错因", icon: EditPen },
  { path: "/reports", label: "学习报告", description: "评估与建议", icon: DataAnalysis },
  { path: "/admin/knowledge-base", label: "知识库管理", description: "课程材料", icon: FolderOpened }
]);

const navGroups = computed<SidebarNavGroup[]>(() => [
  {
    title: "学习入口",
    icon: Notebook,
    items: navItems.value.slice(0, 5)
  },
  {
    title: "学习工具",
    icon: Collection,
    items: navItems.value.slice(5, 8)
  },
  {
    title: "项目管理",
    icon: Management,
    items: navItems.value.slice(8)
  }
]);

const currentPageTitle = computed(() => {
  if (route.name === "knowledge-node-content") return "知识节点正文";
  if (route.name === "course-content") return "课程正文";
  return navItems.value.find((item) => item.path === route.path)?.label ?? "NodeLearn AI";
});

const currentCourse = computed(() => courses.value.find((course) => course.id === selectedCourseId.value) ?? appState.currentCourse);
const selectedNode = computed(() => nodes.value.find((node) => node.id === appState.selectedNodeId));
const courseReaderMode = computed(() => route.name === "course-content");
const forceReaderSidebarCollapsed = computed(() => courseReaderMode.value && readerCompactViewport.value);
const effectiveSidebarCollapsed = computed(() => sidebarCollapsed.value || forceReaderSidebarCollapsed.value);

function updateReaderCompactViewport(event?: MediaQueryListEvent) {
  readerCompactViewport.value = event?.matches ?? readerCompactMedia?.matches ?? false;
}

onMounted(() => {
  readerCompactMedia = window.matchMedia("(min-width: 768px) and (max-width: 1199px)");
  updateReaderCompactViewport();
  readerCompactMedia.addEventListener("change", updateReaderCompactViewport);
  void loadCourses();
});

onBeforeUnmount(() => readerCompactMedia?.removeEventListener("change", updateReaderCompactViewport));

watch(
  () => appState.currentCourse?.id,
  (courseId) => {
    if (courseId && courseId !== selectedCourseId.value) {
      selectedCourseId.value = courseId;
      void loadNodes();
    }
  }
);

watch(
  () => appState.selectedNodeId,
  (nodeId) => {
    if (!nodeId) return;
    const node = nodes.value.find((item) => item.id === nodeId);
    if (node?.chapterId) appState.selectedChapterId = node.chapterId;
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
    const currentNode = nodes.value.find((node) => node.id === appState.selectedNodeId);
    if (currentNode?.chapterId) appState.selectedChapterId = currentNode.chapterId;
    const preservesCourseOverview = route.name === "knowledge-node-content"
      || route.name === "course-content"
      || route.name === "knowledge-graph";
    if (!preservesCourseOverview && !appState.selectedChapterId && !appState.selectedNodeId && nodes.value[0]) {
      appState.selectedNodeId = nodes.value[0].id;
      appState.selectedChapterId = nodes.value[0].chapterId ?? null;
    }
  } catch (error) {
    layoutError.value = getErrorMessage(error);
  }
}

function changeCourse(courseId: string) {
  selectedCourseId.value = courseId;
  const course = courses.value.find((item) => item.id === courseId) ?? null;
  setCurrentCourse(course);
  appState.selectedChapterId = null;
  appState.selectedNodeId = null;
  chapters.value = [];
  void loadNodes();
  if (route.name === "course-content") {
    void router.push({ name: "course-content", params: { courseId } });
  }
}

function changeNode(nodeId: string) {
  if (!nodeId) {
    appState.selectedChapterId = null;
    appState.selectedNodeId = null;
    return;
  }
  const node = nodes.value.find((item) => item.id === nodeId);
  appState.selectedChapterId = node?.chapterId ?? null;
  appState.selectedNodeId = nodeId;
}

function changeChapter(chapterId: string) {
  if (!chapterId) return;
  appState.selectedChapterId = chapterId;
  appState.selectedNodeId = null;
  void router.push({ name: "course-content", params: { courseId: selectedCourseId.value }, hash: `#chapter-${chapterId}` });
}

async function logout() {
  clearAuthState();
  await router.push("/login");
}
</script>

<template>
  <div
    class="app-layout"
    :class="{
      'sidebar-collapsed': effectiveSidebarCollapsed,
      'course-reader-mode': courseReaderMode
    }"
  >
    <ExpandableSidebar
      v-model:collapsed="sidebarCollapsed"
      v-model:mobile-open="sidebarMobileOpen"
      :nav-groups="navGroups"
      :courses="courses"
      :chapters="chapters"
      :nodes="nodes"
      :selected-course-id="selectedCourseId"
      :selected-chapter-id="appState.selectedChapterId"
      :selected-node-id="appState.selectedNodeId"
      :force-collapsed="forceReaderSidebarCollapsed"
      @course-change="changeCourse"
      @chapter-change="changeChapter"
      @node-change="changeNode"
    />

    <section class="app-main">
      <AcademicTopbar
        :title="currentPageTitle"
        :courses="courses"
        :chapters="chapters"
        :nodes="nodes"
        :selected-course-id="selectedCourseId"
        :selected-chapter-id="appState.selectedChapterId"
        :selected-node-id="appState.selectedNodeId"
        :username="appState.currentUser?.username ?? 'demo_student'"
        :course="currentCourse"
        :node="selectedNode"
        :profile="appState.currentProfile"
        :loading="layoutLoading"
        :error="layoutError"
        @course-change="changeCourse"
        @chapter-change="changeChapter"
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
