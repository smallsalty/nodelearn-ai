import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false, "VITE_API_BASE_URL": "http://localhost:8000/api/v1", "VITE_APP_NAME": "NodeLearn AI", "VITE_ENABLE_MOCK": "false", "VITE_ENABLE_STREAM": "true", "VITE_GRAPH_RENDERER": "echarts"};import { createRouter, createWebHistory } from "/node_modules/.vite/deps/vue-router.js?v=d8ae4e15";
import { usersApi } from "/src/api/modules/users.ts";
import { appState, clearAuthState, setCurrentUser } from "/src/stores/index.ts";
const routes = [
  { path: "/", redirect: "/home" },
  { path: "/login", name: "login", component: () => import("/src/pages/LoginPage.vue"), meta: { public: true } },
  { path: "/home", name: "home", component: () => import("/src/pages/HomePage.vue") },
  { path: "/chat", name: "chat", component: () => import("/src/pages/ChatPage.vue") },
  { path: "/profile", name: "profile", component: () => import("/src/pages/ProfilePage.vue") },
  {
    path: "/learning-path",
    name: "learning-path",
    component: () => import("/src/pages/LearningPathPage.vue")
  },
  { path: "/resources", name: "resources", component: () => import("/src/pages/ResourcePage.vue") },
  {
    path: "/knowledge-graph",
    name: "knowledge-graph",
    component: () => import("/src/pages/KnowledgeGraphPage.vue")
  },
  { path: "/practice", name: "practice", component: () => import("/src/pages/PracticePage.vue") },
  { path: "/programming", name: "programming", component: () => import("/src/pages/ProgrammingPage.vue") },
  { path: "/reports", name: "reports", component: () => import("/src/pages/ReportPage.vue") },
  {
    path: "/admin/knowledge-base",
    name: "knowledge-base-admin",
    component: () => import("/src/pages/KnowledgeBaseAdminPage.vue")
  }
];
if (import.meta.env.DEV) {
  routes.push({
    path: "/dev/agent-flow-test",
    name: "dev-agent-flow-test",
    component: () => import("/src/pages/dev/AgentFlowTestPage.vue")
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZVJvdXRlciwgY3JlYXRlV2ViSGlzdG9yeSB9IGZyb20gXCJ2dWUtcm91dGVyXCI7XHJcbmltcG9ydCB7IHVzZXJzQXBpIH0gZnJvbSBcIkAvYXBpL21vZHVsZXMvdXNlcnNcIjtcclxuaW1wb3J0IHsgYXBwU3RhdGUsIGNsZWFyQXV0aFN0YXRlLCBzZXRDdXJyZW50VXNlciB9IGZyb20gXCJAL3N0b3Jlc1wiO1xyXG5cclxuY29uc3Qgcm91dGVzID0gW1xyXG4gIHsgcGF0aDogXCIvXCIsIHJlZGlyZWN0OiBcIi9ob21lXCIgfSxcclxuICB7IHBhdGg6IFwiL2xvZ2luXCIsIG5hbWU6IFwibG9naW5cIiwgY29tcG9uZW50OiAoKSA9PiBpbXBvcnQoXCJAL3BhZ2VzL0xvZ2luUGFnZS52dWVcIiksIG1ldGE6IHsgcHVibGljOiB0cnVlIH0gfSxcclxuICB7IHBhdGg6IFwiL2hvbWVcIiwgbmFtZTogXCJob21lXCIsIGNvbXBvbmVudDogKCkgPT4gaW1wb3J0KFwiQC9wYWdlcy9Ib21lUGFnZS52dWVcIikgfSxcclxuICB7IHBhdGg6IFwiL2NoYXRcIiwgbmFtZTogXCJjaGF0XCIsIGNvbXBvbmVudDogKCkgPT4gaW1wb3J0KFwiQC9wYWdlcy9DaGF0UGFnZS52dWVcIikgfSxcclxuICB7IHBhdGg6IFwiL3Byb2ZpbGVcIiwgbmFtZTogXCJwcm9maWxlXCIsIGNvbXBvbmVudDogKCkgPT4gaW1wb3J0KFwiQC9wYWdlcy9Qcm9maWxlUGFnZS52dWVcIikgfSxcclxuICB7XHJcbiAgICBwYXRoOiBcIi9sZWFybmluZy1wYXRoXCIsXHJcbiAgICBuYW1lOiBcImxlYXJuaW5nLXBhdGhcIixcclxuICAgIGNvbXBvbmVudDogKCkgPT4gaW1wb3J0KFwiQC9wYWdlcy9MZWFybmluZ1BhdGhQYWdlLnZ1ZVwiKVxyXG4gIH0sXHJcbiAgeyBwYXRoOiBcIi9yZXNvdXJjZXNcIiwgbmFtZTogXCJyZXNvdXJjZXNcIiwgY29tcG9uZW50OiAoKSA9PiBpbXBvcnQoXCJAL3BhZ2VzL1Jlc291cmNlUGFnZS52dWVcIikgfSxcclxuICB7XHJcbiAgICBwYXRoOiBcIi9rbm93bGVkZ2UtZ3JhcGhcIixcclxuICAgIG5hbWU6IFwia25vd2xlZGdlLWdyYXBoXCIsXHJcbiAgICBjb21wb25lbnQ6ICgpID0+IGltcG9ydChcIkAvcGFnZXMvS25vd2xlZGdlR3JhcGhQYWdlLnZ1ZVwiKVxyXG4gIH0sXHJcbiAgeyBwYXRoOiBcIi9wcmFjdGljZVwiLCBuYW1lOiBcInByYWN0aWNlXCIsIGNvbXBvbmVudDogKCkgPT4gaW1wb3J0KFwiQC9wYWdlcy9QcmFjdGljZVBhZ2UudnVlXCIpIH0sXHJcbiAgeyBwYXRoOiBcIi9wcm9ncmFtbWluZ1wiLCBuYW1lOiBcInByb2dyYW1taW5nXCIsIGNvbXBvbmVudDogKCkgPT4gaW1wb3J0KFwiQC9wYWdlcy9Qcm9ncmFtbWluZ1BhZ2UudnVlXCIpIH0sXHJcbiAgeyBwYXRoOiBcIi9yZXBvcnRzXCIsIG5hbWU6IFwicmVwb3J0c1wiLCBjb21wb25lbnQ6ICgpID0+IGltcG9ydChcIkAvcGFnZXMvUmVwb3J0UGFnZS52dWVcIikgfSxcclxuICB7XHJcbiAgICBwYXRoOiBcIi9hZG1pbi9rbm93bGVkZ2UtYmFzZVwiLFxyXG4gICAgbmFtZTogXCJrbm93bGVkZ2UtYmFzZS1hZG1pblwiLFxyXG4gICAgY29tcG9uZW50OiAoKSA9PiBpbXBvcnQoXCJAL3BhZ2VzL0tub3dsZWRnZUJhc2VBZG1pblBhZ2UudnVlXCIpXHJcbiAgfVxyXG5dO1xyXG5cclxuaWYgKGltcG9ydC5tZXRhLmVudi5ERVYpIHtcclxuICByb3V0ZXMucHVzaCh7XHJcbiAgICBwYXRoOiBcIi9kZXYvYWdlbnQtZmxvdy10ZXN0XCIsXHJcbiAgICBuYW1lOiBcImRldi1hZ2VudC1mbG93LXRlc3RcIixcclxuICAgIGNvbXBvbmVudDogKCkgPT4gaW1wb3J0KFwiQC9wYWdlcy9kZXYvQWdlbnRGbG93VGVzdFBhZ2UudnVlXCIpXHJcbiAgfSk7XHJcbn1cclxuXHJcbmNvbnN0IHJvdXRlciA9IGNyZWF0ZVJvdXRlcih7XHJcbiAgaGlzdG9yeTogY3JlYXRlV2ViSGlzdG9yeSgpLFxyXG4gIHJvdXRlc1xyXG59KTtcclxuXHJcbnJvdXRlci5iZWZvcmVFYWNoKGFzeW5jICh0bykgPT4ge1xyXG4gIGNvbnN0IHRva2VuID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJhY2Nlc3NUb2tlblwiKTtcclxuXHJcbiAgaWYgKHRvLm1ldGEucHVibGljKSB7XHJcbiAgICBpZiAodG8ucGF0aCA9PT0gXCIvbG9naW5cIiAmJiB0b2tlbikge1xyXG4gICAgICByZXR1cm4gXCIvaG9tZVwiO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBpZiAoIXRva2VuKSB7XHJcbiAgICByZXR1cm4geyBwYXRoOiBcIi9sb2dpblwiLCBxdWVyeTogeyByZWRpcmVjdDogdG8uZnVsbFBhdGggfSB9O1xyXG4gIH1cclxuXHJcbiAgaWYgKCFhcHBTdGF0ZS5jdXJyZW50VXNlcikge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB1c2Vyc0FwaS5nZXRDdXJyZW50VXNlcigpO1xyXG4gICAgICBzZXRDdXJyZW50VXNlcihyZXNwb25zZS5kYXRhKTtcclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICBjbGVhckF1dGhTdGF0ZSgpO1xyXG4gICAgICByZXR1cm4geyBwYXRoOiBcIi9sb2dpblwiLCBxdWVyeTogeyByZWRpcmVjdDogdG8uZnVsbFBhdGggfSB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRydWU7XHJcbn0pO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgcm91dGVyO1xyXG4iXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsY0FBYyx3QkFBd0I7QUFDL0MsU0FBUyxnQkFBZ0I7QUFDekIsU0FBUyxVQUFVLGdCQUFnQixzQkFBc0I7QUFFekQsTUFBTSxTQUFTO0FBQUEsRUFDYixFQUFFLE1BQU0sS0FBSyxVQUFVLFFBQVE7QUFBQSxFQUMvQixFQUFFLE1BQU0sVUFBVSxNQUFNLFNBQVMsV0FBVyxNQUFNLE9BQU8sdUJBQXVCLEdBQUcsTUFBTSxFQUFFLFFBQVEsS0FBSyxFQUFFO0FBQUEsRUFDMUcsRUFBRSxNQUFNLFNBQVMsTUFBTSxRQUFRLFdBQVcsTUFBTSxPQUFPLHNCQUFzQixFQUFFO0FBQUEsRUFDL0UsRUFBRSxNQUFNLFNBQVMsTUFBTSxRQUFRLFdBQVcsTUFBTSxPQUFPLHNCQUFzQixFQUFFO0FBQUEsRUFDL0UsRUFBRSxNQUFNLFlBQVksTUFBTSxXQUFXLFdBQVcsTUFBTSxPQUFPLHlCQUF5QixFQUFFO0FBQUEsRUFDeEY7QUFBQSxJQUNFLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFdBQVcsTUFBTSxPQUFPLDhCQUE4QjtBQUFBLEVBQ3hEO0FBQUEsRUFDQSxFQUFFLE1BQU0sY0FBYyxNQUFNLGFBQWEsV0FBVyxNQUFNLE9BQU8sMEJBQTBCLEVBQUU7QUFBQSxFQUM3RjtBQUFBLElBQ0UsTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sV0FBVyxNQUFNLE9BQU8sZ0NBQWdDO0FBQUEsRUFDMUQ7QUFBQSxFQUNBLEVBQUUsTUFBTSxhQUFhLE1BQU0sWUFBWSxXQUFXLE1BQU0sT0FBTywwQkFBMEIsRUFBRTtBQUFBLEVBQzNGLEVBQUUsTUFBTSxnQkFBZ0IsTUFBTSxlQUFlLFdBQVcsTUFBTSxPQUFPLDZCQUE2QixFQUFFO0FBQUEsRUFDcEcsRUFBRSxNQUFNLFlBQVksTUFBTSxXQUFXLFdBQVcsTUFBTSxPQUFPLHdCQUF3QixFQUFFO0FBQUEsRUFDdkY7QUFBQSxJQUNFLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFdBQVcsTUFBTSxPQUFPLG9DQUFvQztBQUFBLEVBQzlEO0FBQ0Y7QUFFQSxJQUFJLFlBQVksSUFBSSxLQUFLO0FBQ3ZCLFNBQU8sS0FBSztBQUFBLElBQ1YsTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sV0FBVyxNQUFNLE9BQU8sbUNBQW1DO0FBQUEsRUFDN0QsQ0FBQztBQUNIO0FBRUEsTUFBTSxTQUFTLGFBQWE7QUFBQSxFQUMxQixTQUFTLGlCQUFpQjtBQUFBLEVBQzFCO0FBQ0YsQ0FBQztBQUVELE9BQU8sV0FBVyxPQUFPLE9BQU87QUFDOUIsUUFBTSxRQUFRLGFBQWEsUUFBUSxhQUFhO0FBRWhELE1BQUksR0FBRyxLQUFLLFFBQVE7QUFDbEIsUUFBSSxHQUFHLFNBQVMsWUFBWSxPQUFPO0FBQ2pDLGFBQU87QUFBQSxJQUNUO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFFQSxNQUFJLENBQUMsT0FBTztBQUNWLFdBQU8sRUFBRSxNQUFNLFVBQVUsT0FBTyxFQUFFLFVBQVUsR0FBRyxTQUFTLEVBQUU7QUFBQSxFQUM1RDtBQUVBLE1BQUksQ0FBQyxTQUFTLGFBQWE7QUFDekIsUUFBSTtBQUNGLFlBQU0sV0FBVyxNQUFNLFNBQVMsZUFBZTtBQUMvQyxxQkFBZSxTQUFTLElBQUk7QUFBQSxJQUM5QixRQUFRO0FBQ04scUJBQWU7QUFDZixhQUFPLEVBQUUsTUFBTSxVQUFVLE9BQU8sRUFBRSxVQUFVLEdBQUcsU0FBUyxFQUFFO0FBQUEsSUFDNUQ7QUFBQSxFQUNGO0FBRUEsU0FBTztBQUNULENBQUM7QUFFRCxlQUFlOyIsIm5hbWVzIjpbXX0=