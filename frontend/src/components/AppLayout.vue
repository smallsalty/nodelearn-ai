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
  Share,
  User
} from "@element-plus/icons-vue";
import AcademicSidebar from "@/components/layout/AcademicSidebar.vue";
import AcademicTopbar from "@/components/layout/AcademicTopbar.vue";
import ContextPanel from "@/components/layout/ContextPanel.vue";
import { courseApi } from "@/api/modules/course";
import { getErrorMessage } from "@/api/client";
import { appState, clearAuthState, setCurrentCourse } from "@/stores";
import type { Course, KnowledgeNode } from "@/types/course";
import { DEFAULT_COURSE_ID } from "@/utils/format";

const route = useRoute();
const router = useRouter();
const courses = ref<Course[]>([]);
const nodes = ref<KnowledgeNode[]>([]);
const selectedCourseId = ref(appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const layoutLoading = ref(false);
const layoutError = ref("");
const contextOpen = ref(false);

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
    const response = await courseApi.getNodes(selectedCourseId.value);
    nodes.value = response.data;
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
  <div class="app-layout">
    <AcademicSidebar :items="navItems" />

    <nav class="mobile-bottom-nav" aria-label="移动导航">
      <RouterLink
        v-for="item in navItems"
        :key="`mobile-${item.path}`"
        class="nav-item"
        :to="item.path"
        :aria-current="route.path === item.path ? 'page' : undefined"
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

    <section class="app-main">
      <AcademicTopbar
        :title="currentPageTitle"
        :courses="courses"
        :nodes="nodes"
        :selected-course-id="selectedCourseId"
        :selected-node-id="appState.selectedNodeId"
        :username="appState.currentUser?.username ?? 'demo_student'"
        :loading="layoutLoading"
        :error="layoutError"
        @course-change="changeCourse"
        @node-change="changeNode"
        @open-context="contextOpen = true"
        @logout="logout"
      />

      <main id="main-content" class="app-content" tabindex="-1">
        <slot />
      </main>
    </section>

    <ContextPanel
      :mobile-open="contextOpen"
      :course="currentCourse"
      :node="selectedNode"
      :profile="appState.currentProfile"
      @close="contextOpen = false"
    />
  </div>
</template>
