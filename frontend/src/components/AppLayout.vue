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
import { appState, clearAuthState, requestGraphOverview, setCurrentCourse } from "@/stores";
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

const navGroups = computed<SidebarNavGroup[]>(() => [
  {
    title: "学习入口",
    icon: Notebook,
    items: [
      {
        id: "course-content",
        to: `/courses/${selectedCourseId.value}/content`,
        label: "课程正文",
        description: "全文与目录",
        icon: Notebook,
        match: { path: `/courses/${selectedCourseId.value}/content` }
      },
      {
        id: "practice",
        to: "/practice",
        label: "练习测评",
        description: "题目与错因",
        icon: EditPen,
        match: { path: "/practice" }
      }
    ]
  },
  {
    title: "学习工具",
    icon: Collection,
    items: [
      {
        id: "notes",
        to: "/notes",
        label: "学习笔记",
        description: "记录与回顾",
        icon: Notebook,
        match: { path: "/notes", action: null }
      },
      {
        id: "resources",
        to: "/resources",
        label: "资源中心",
        description: "讲解与拓展阅读",
        icon: Collection,
        match: { path: "/resources", action: null }
      },
      {
        id: "mind-map",
        to: { path: "/resources", query: { action: "mind_map" } },
        label: "思维导图",
        description: "生成知识结构图",
        icon: Share,
        match: { path: "/resources", action: "mind_map" }
      },
      {
        id: "digital-human-answer",
        to: { path: "/resources", query: { action: "digital_human_chat" } },
        label: "数字人解答",
        description: "实时数字人问答",
        icon: ChatLineRound,
        match: { path: "/resources", action: "digital_human_chat" }
      }
    ]
  },
  {
    title: "个性化管理",
    icon: User,
    items: [
      {
        id: "chat",
        to: "/chat",
        label: "问答助手",
        description: "提问与历史",
        icon: ChatLineRound,
        match: { path: "/chat" }
      },
      {
        id: "profile",
        to: "/profile",
        label: "学生画像",
        description: "偏好与薄弱点",
        icon: User,
        match: { path: "/profile" }
      },
      {
        id: "learning-path",
        to: "/learning-path",
        label: "学习路径",
        description: "阶段任务",
        icon: Guide,
        match: { path: "/learning-path" }
      },
      {
        id: "reports",
        to: "/reports",
        label: "学习报告",
        description: "评估与建议",
        icon: DataAnalysis,
        match: { path: "/reports" }
      }
    ]
  },
  {
    title: "课程管理",
    icon: Management,
    items: [
      {
        id: "knowledge-base",
        to: "/admin/knowledge-base",
        label: "知识库管理",
        description: "课程材料",
        icon: FolderOpened,
        match: { path: "/admin/knowledge-base" }
      },
      {
        id: "knowledge-nodes",
        to: "/knowledge-graph",
        label: "知识节点",
        description: "章节与节点总览",
        icon: Share,
        match: { path: "/knowledge-graph" }
      }
    ]
  }
]);

const currentPageTitle = computed(() => {
  if (route.name === "knowledge-node-content") return "知识节点正文";
  if (route.name === "course-content") return "课程正文";
  if (route.path === "/knowledge-graph") return "知识图谱";
  const action = typeof route.query.action === "string" ? route.query.action : null;
  const item = navGroups.value
    .flatMap((group) => group.items)
    .find((candidate) => candidate.match.path === route.path && (candidate.match.action ?? null) === action);
  return item?.label ?? (route.path === "/home" ? "课程首页" : "NodeLearn AI");
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

function activateSidebarNav(itemId: string) {
  if (itemId === "knowledge-nodes") requestGraphOverview();
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
      :selected-course-id="selectedCourseId"
      :force-collapsed="forceReaderSidebarCollapsed"
      @course-change="changeCourse"
      @nav-activate="activateSidebarNav"
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
