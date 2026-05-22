import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/", redirect: "/home" },
  { path: "/login", name: "login", component: () => import("@/pages/LoginPage.vue") },
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
  { path: "/practice", name: "practice", component: () => import("@/pages/PracticePage.vue") },
  { path: "/reports", name: "reports", component: () => import("@/pages/ReportPage.vue") },
  {
    path: "/admin/knowledge-base",
    name: "knowledge-base-admin",
    component: () => import("@/pages/KnowledgeBaseAdminPage.vue")
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
