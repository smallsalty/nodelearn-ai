import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { usersApi } from "@/api/modules/users";
import { appState, clearAuthState, setCurrentUser } from "@/stores";

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/home" },
  { path: "/login", name: "login", component: () => import("@/pages/LoginPage.vue"), meta: { public: true } },
  { path: "/home", name: "home", component: () => import("@/pages/HomePage.vue") },
  { path: "/chat", name: "chat", component: () => import("@/pages/ChatPage.vue") },
  { path: "/profile", name: "profile", component: () => import("@/pages/ProfilePage.vue") },
  {
    path: "/learning-path",
    name: "learning-path",
    component: () => import("@/pages/LearningPathPage.vue")
  },
  { path: "/resources", name: "resources", component: () => import("@/pages/ResourcePage.vue") },
  {
    path: "/knowledge-graph",
    name: "knowledge-graph",
    component: () => import("@/pages/KnowledgeGraphPage.vue")
  },
  {
    path: "/courses/:courseId/content",
    name: "course-content",
    component: () => import("@/pages/CourseContentPage.vue")
  },
  {
    path: "/nodes/:nodeId/content",
    name: "knowledge-node-content",
    component: () => import("@/pages/KnowledgeNodeContentPage.vue")
  },
  { path: "/practice", name: "practice", component: () => import("@/pages/PracticePage.vue") },
  { path: "/notes", name: "notes", component: () => import("@/pages/NotePage.vue") },
  {
    path: "/programming",
    name: "programming",
    redirect: (to) => ({ path: "/practice", query: { ...to.query, tab: "coding" } })
  },
  { path: "/reports", name: "reports", component: () => import("@/pages/ReportPage.vue") },
  {
    path: "/admin/knowledge-base",
    name: "knowledge-base-admin",
    component: () => import("@/pages/KnowledgeBaseAdminPage.vue")
  }
];

if (import.meta.env.DEV) {
  routes.push({
    path: "/dev/agent-flow-test",
    name: "dev-agent-flow-test",
    component: () => import("@/pages/dev/AgentFlowTestPage.vue")
  });
}

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  const token = localStorage.getItem("accessToken");

  if (to.meta.public) {
    if (to.path === "/login" && token) {
      return "/home";
    }
    return true;
  }

  if (!token) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  if (!appState.currentUser) {
    try {
      const response = await usersApi.getCurrentUser();
      setCurrentUser(response.data);
    } catch {
      clearAuthState();
      return { path: "/login", query: { redirect: to.fullPath } };
    }
  }

  return true;
});

export default router;
