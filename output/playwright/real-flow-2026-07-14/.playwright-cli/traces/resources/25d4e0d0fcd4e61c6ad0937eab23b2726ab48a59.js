import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/AppLayout.vue");import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { computed, onMounted, ref, watch } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { useRoute, useRouter } from "/node_modules/.vite/deps/vue-router.js?v=d8ae4e15";
import {
  ChatLineRound,
  Collection,
  DataAnalysis,
  EditPen,
  Monitor,
  FolderOpened,
  Guide,
  House,
  Management,
  Notebook,
  Share,
  User
} from "/node_modules/.vite/deps/@element-plus_icons-vue.js?v=dfeb8a9b";
import AcademicTopbar from "/src/components/layout/AcademicTopbar.vue";
import DetailDrawer from "/src/components/layout/DetailDrawer.vue";
import ExpandableSidebar from "/src/components/layout/ExpandableSidebar.vue";
import { courseApi } from "/src/api/modules/course.ts";
import { getErrorMessage } from "/src/api/client.ts";
import { appState, clearAuthState, setCurrentCourse } from "/src/stores/index.ts";
import { DEFAULT_COURSE_ID } from "/src/utils/format.ts";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "AppLayout",
  setup(__props, { expose: __expose }) {
    __expose();
    const route = useRoute();
    const router = useRouter();
    const courses = ref([]);
    const chapters = ref([]);
    const nodes = ref([]);
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
      { path: "/programming", label: "编程题", description: "代码运行与判题", icon: Monitor },
      { path: "/reports", label: "学习报告", description: "评估与建议", icon: DataAnalysis },
      { path: "/admin/knowledge-base", label: "知识库管理", description: "课程材料", icon: FolderOpened }
    ];
    const navGroups = [
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
    function changeCourse(courseId) {
      selectedCourseId.value = courseId;
      const course = courses.value.find((item) => item.id === courseId) ?? null;
      setCurrentCourse(course);
      appState.selectedNodeId = null;
      chapters.value = [];
      void loadNodes();
    }
    function changeNode(nodeId) {
      appState.selectedNodeId = nodeId || null;
    }
    async function logout() {
      clearAuthState();
      await router.push("/login");
    }
    const __returned__ = { route, router, courses, chapters, nodes, selectedCourseId, layoutLoading, layoutError, contextOpen, sidebarCollapsed, sidebarMobileOpen, navItems, navGroups, currentPageTitle, currentCourse, selectedNode, loadCourses, loadNodes, changeCourse, changeNode, logout, AcademicTopbar, DetailDrawer, ExpandableSidebar, get appState() {
      return appState;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { createVNode as _createVNode, renderSlot as _renderSlot, createElementVNode as _createElementVNode, normalizeClass as _normalizeClass, openBlock as _openBlock, createElementBlock as _createElementBlock } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _hoisted_1 = { class: "app-main" };
const _hoisted_2 = {
  id: "main-content",
  class: "app-content",
  tabindex: "-1"
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return _openBlock(), _createElementBlock(
    "div",
    {
      class: _normalizeClass(["app-layout", { "sidebar-collapsed": $setup.sidebarCollapsed }])
    },
    [
      _createVNode($setup["ExpandableSidebar"], {
        collapsed: $setup.sidebarCollapsed,
        "onUpdate:collapsed": _cache[0] || (_cache[0] = ($event) => $setup.sidebarCollapsed = $event),
        "mobile-open": $setup.sidebarMobileOpen,
        "onUpdate:mobileOpen": _cache[1] || (_cache[1] = ($event) => $setup.sidebarMobileOpen = $event),
        "nav-groups": $setup.navGroups,
        courses: $setup.courses,
        chapters: $setup.chapters,
        nodes: $setup.nodes,
        "selected-course-id": $setup.selectedCourseId,
        "selected-node-id": $setup.appState.selectedNodeId,
        onCourseChange: $setup.changeCourse,
        onNodeChange: $setup.changeNode
      }, null, 8, ["collapsed", "mobile-open", "courses", "chapters", "nodes", "selected-course-id", "selected-node-id"]),
      _createElementVNode("section", _hoisted_1, [
        _createVNode($setup["AcademicTopbar"], {
          title: $setup.currentPageTitle,
          courses: $setup.courses,
          nodes: $setup.nodes,
          "selected-course-id": $setup.selectedCourseId,
          "selected-node-id": $setup.appState.selectedNodeId,
          username: $setup.appState.currentUser?.username ?? "demo_student",
          course: $setup.currentCourse,
          node: $setup.selectedNode,
          profile: $setup.appState.currentProfile,
          loading: $setup.layoutLoading,
          error: $setup.layoutError,
          onCourseChange: $setup.changeCourse,
          onNodeChange: $setup.changeNode,
          onOpenSidebar: _cache[2] || (_cache[2] = ($event) => $setup.sidebarMobileOpen = true),
          onOpenContext: _cache[3] || (_cache[3] = ($event) => $setup.contextOpen = true),
          onLogout: $setup.logout
        }, null, 8, ["title", "courses", "nodes", "selected-course-id", "selected-node-id", "username", "course", "node", "profile", "loading", "error"]),
        _createElementVNode("main", _hoisted_2, [
          _renderSlot(_ctx.$slots, "default")
        ])
      ]),
      _createVNode($setup["DetailDrawer"], {
        modelValue: $setup.contextOpen,
        "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $setup.contextOpen = $event),
        course: $setup.currentCourse,
        node: $setup.selectedNode,
        profile: $setup.appState.currentProfile
      }, null, 8, ["modelValue", "course", "node", "profile"])
    ],
    2
    /* CLASS */
  );
}
_sfc_main.__hmrId = "6f6437fc";
typeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main);
import.meta.hot.on("file-changed", ({ file }) => {
  __VUE_HMR_RUNTIME__.CHANGED_FILE = file;
});
import.meta.hot.accept((mod) => {
  if (!mod) return;
  const { default: updated, _rerender_only } = mod;
  if (_rerender_only) {
    __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render);
  } else {
    __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated);
  }
});
import _export_sfc from "/@id/__x00__plugin-vue:export-helper";
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/components/AppLayout.vue"]]);

//# sourceMappingURL=data:application/json;base64,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QWlCRTtBQUFBLFVBaEJDLE9BQU87QUFBQSxVQUNQLFNBQVM7QUFBQSxVQUNULE9BQU87QUFBQSxVQUNQLHNCQUFvQjtBQUFBLFVBQ3BCLG9CQUFrQixnQkFBUztBQUFBLFVBQzNCLFVBQVUsZ0JBQVMsYUFBYSxZQUFRO0FBQUEsVUFDeEMsUUFBUTtBQUFBLFVBQ1IsTUFBTTtBQUFBLFVBQ04sU0FBUyxnQkFBUztBQUFBLFVBQ2xCLFNBQVM7QUFBQSxVQUNULE9BQU87QUFBQSxVQUNQLGdCQUFlO0FBQUEsVUFDZixjQUFhO0FBQUEsVUFDYixlQUFZLHNDQUFFLDJCQUFpQjtBQUFBLFVBQy9CLGVBQVksc0NBQUUscUJBQVc7QUFBQSxVQUN6QixVQUFRO0FBQUE7UUFHWCxvQkFFTyxRQUZQLFlBRU87QUFBQSxVQURMLFlBQVE7QUFBQTs7TUFJWixhQUtFO0FBQUEsb0JBSlM7QUFBQSwwRkFBVztBQUFBLFFBQ25CLFFBQVE7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFNBQVMsZ0JBQVM7QUFBQSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQXBwTGF5b3V0LnZ1ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0IHNldHVwIGxhbmc9XCJ0c1wiPlxyXG5pbXBvcnQgeyBjb21wdXRlZCwgb25Nb3VudGVkLCByZWYsIHdhdGNoIH0gZnJvbSBcInZ1ZVwiO1xyXG5pbXBvcnQgeyB1c2VSb3V0ZSwgdXNlUm91dGVyIH0gZnJvbSBcInZ1ZS1yb3V0ZXJcIjtcclxuaW1wb3J0IHtcclxuICBDaGF0TGluZVJvdW5kLFxyXG4gIENvbGxlY3Rpb24sXHJcbiAgRGF0YUFuYWx5c2lzLFxyXG4gIEVkaXRQZW4sIE1vbml0b3IsXHJcbiAgRm9sZGVyT3BlbmVkLFxyXG4gIEd1aWRlLFxyXG4gIEhvdXNlLFxyXG4gIE1hbmFnZW1lbnQsXHJcbiAgTm90ZWJvb2ssXHJcbiAgU2hhcmUsXHJcbiAgVXNlclxyXG59IGZyb20gXCJAZWxlbWVudC1wbHVzL2ljb25zLXZ1ZVwiO1xyXG5pbXBvcnQgQWNhZGVtaWNUb3BiYXIgZnJvbSBcIkAvY29tcG9uZW50cy9sYXlvdXQvQWNhZGVtaWNUb3BiYXIudnVlXCI7XHJcbmltcG9ydCBEZXRhaWxEcmF3ZXIgZnJvbSBcIkAvY29tcG9uZW50cy9sYXlvdXQvRGV0YWlsRHJhd2VyLnZ1ZVwiO1xyXG5pbXBvcnQgRXhwYW5kYWJsZVNpZGViYXIsIHsgdHlwZSBTaWRlYmFyTmF2R3JvdXAgfSBmcm9tIFwiQC9jb21wb25lbnRzL2xheW91dC9FeHBhbmRhYmxlU2lkZWJhci52dWVcIjtcclxuaW1wb3J0IHsgY291cnNlQXBpIH0gZnJvbSBcIkAvYXBpL21vZHVsZXMvY291cnNlXCI7XHJcbmltcG9ydCB7IGdldEVycm9yTWVzc2FnZSB9IGZyb20gXCJAL2FwaS9jbGllbnRcIjtcclxuaW1wb3J0IHsgYXBwU3RhdGUsIGNsZWFyQXV0aFN0YXRlLCBzZXRDdXJyZW50Q291cnNlIH0gZnJvbSBcIkAvc3RvcmVzXCI7XHJcbmltcG9ydCB0eXBlIHsgQ2hhcHRlciwgQ291cnNlLCBLbm93bGVkZ2VOb2RlIH0gZnJvbSBcIkAvdHlwZXMvY291cnNlXCI7XHJcbmltcG9ydCB7IERFRkFVTFRfQ09VUlNFX0lEIH0gZnJvbSBcIkAvdXRpbHMvZm9ybWF0XCI7XHJcblxyXG5jb25zdCByb3V0ZSA9IHVzZVJvdXRlKCk7XHJcbmNvbnN0IHJvdXRlciA9IHVzZVJvdXRlcigpO1xyXG5jb25zdCBjb3Vyc2VzID0gcmVmPENvdXJzZVtdPihbXSk7XHJcbmNvbnN0IGNoYXB0ZXJzID0gcmVmPENoYXB0ZXJbXT4oW10pO1xyXG5jb25zdCBub2RlcyA9IHJlZjxLbm93bGVkZ2VOb2RlW10+KFtdKTtcclxuY29uc3Qgc2VsZWN0ZWRDb3Vyc2VJZCA9IHJlZihhcHBTdGF0ZS5jdXJyZW50Q291cnNlPy5pZCA/PyBERUZBVUxUX0NPVVJTRV9JRCk7XHJcbmNvbnN0IGxheW91dExvYWRpbmcgPSByZWYoZmFsc2UpO1xyXG5jb25zdCBsYXlvdXRFcnJvciA9IHJlZihcIlwiKTtcclxuY29uc3QgY29udGV4dE9wZW4gPSByZWYoZmFsc2UpO1xyXG5jb25zdCBzaWRlYmFyQ29sbGFwc2VkID0gcmVmKGZhbHNlKTtcclxuY29uc3Qgc2lkZWJhck1vYmlsZU9wZW4gPSByZWYoZmFsc2UpO1xyXG5cclxuY29uc3QgbmF2SXRlbXMgPSBbXHJcbiAgeyBwYXRoOiBcIi9ob21lXCIsIGxhYmVsOiBcIummlumhtVwiLCBkZXNjcmlwdGlvbjogXCLlrabkuaDmpoLop4hcIiwgaWNvbjogSG91c2UgfSxcclxuICB7IHBhdGg6IFwiL2NoYXRcIiwgbGFiZWw6IFwi5a+56K+d5a2m5LmgXCIsIGRlc2NyaXB0aW9uOiBcIuivvueoi+mXruetlFwiLCBpY29uOiBDaGF0TGluZVJvdW5kIH0sXHJcbiAgeyBwYXRoOiBcIi9wcm9maWxlXCIsIGxhYmVsOiBcIuWtpueUn+eUu+WDj1wiLCBkZXNjcmlwdGlvbjogXCLlgY/lpb3kuI7oloTlvLHngrlcIiwgaWNvbjogVXNlciB9LFxyXG4gIHsgcGF0aDogXCIvbGVhcm5pbmctcGF0aFwiLCBsYWJlbDogXCLlrabkuaDot6/lvoRcIiwgZGVzY3JpcHRpb246IFwi6Zi25q615Lu75YqhXCIsIGljb246IEd1aWRlIH0sXHJcbiAgeyBwYXRoOiBcIi9yZXNvdXJjZXNcIiwgbGFiZWw6IFwi6LWE5rqQ5Lit5b+DXCIsIGRlc2NyaXB0aW9uOiBcIueUn+aIkOS4jumihOiniFwiLCBpY29uOiBDb2xsZWN0aW9uIH0sXHJcbiAgeyBwYXRoOiBcIi9rbm93bGVkZ2UtZ3JhcGhcIiwgbGFiZWw6IFwi55+l6K+G5Zu+6LCxXCIsIGRlc2NyaXB0aW9uOiBcIuiKgueCueS+nei1llwiLCBpY29uOiBTaGFyZSB9LFxyXG4gIHsgcGF0aDogXCIvcHJhY3RpY2VcIiwgbGFiZWw6IFwi57uD5Lmg5rWL6K+EXCIsIGRlc2NyaXB0aW9uOiBcIumimOebruS4jumUmeWboFwiLCBpY29uOiBFZGl0UGVuIH0sXHJcbiAgeyBwYXRoOiBcIi9wcm9ncmFtbWluZ1wiLCBsYWJlbDogXCLnvJbnqIvpophcIiwgZGVzY3JpcHRpb246IFwi5Luj56CB6L+Q6KGM5LiO5Yik6aKYXCIsIGljb246IE1vbml0b3IgfSxcclxuICB7IHBhdGg6IFwiL3JlcG9ydHNcIiwgbGFiZWw6IFwi5a2m5Lmg5oql5ZGKXCIsIGRlc2NyaXB0aW9uOiBcIuivhOS8sOS4juW7uuiurlwiLCBpY29uOiBEYXRhQW5hbHlzaXMgfSxcclxuICB7IHBhdGg6IFwiL2FkbWluL2tub3dsZWRnZS1iYXNlXCIsIGxhYmVsOiBcIuefpeivhuW6k+euoeeQhlwiLCBkZXNjcmlwdGlvbjogXCLor77nqIvmnZDmlplcIiwgaWNvbjogRm9sZGVyT3BlbmVkIH1cclxuXTtcclxuXHJcbmNvbnN0IG5hdkdyb3VwczogU2lkZWJhck5hdkdyb3VwW10gPSBbXHJcbiAge1xyXG4gICAgdGl0bGU6IFwi5a2m5Lmg5YWl5Y+jXCIsXHJcbiAgICBpY29uOiBOb3RlYm9vayxcclxuICAgIGl0ZW1zOiBuYXZJdGVtcy5zbGljZSgwLCA0KVxyXG4gIH0sXHJcbiAge1xyXG4gICAgdGl0bGU6IFwi5a2m5Lmg5bel5YW3XCIsXHJcbiAgICBpY29uOiBDb2xsZWN0aW9uLFxyXG4gICAgaXRlbXM6IG5hdkl0ZW1zLnNsaWNlKDQsIDgpXHJcbiAgfSxcclxuICB7XHJcbiAgICB0aXRsZTogXCLpobnnm67nrqHnkIZcIixcclxuICAgIGljb246IE1hbmFnZW1lbnQsXHJcbiAgICBpdGVtczogbmF2SXRlbXMuc2xpY2UoOClcclxuICB9XHJcbl07XHJcblxyXG5jb25zdCBjdXJyZW50UGFnZVRpdGxlID0gY29tcHV0ZWQoKCkgPT4ge1xyXG4gIHJldHVybiBuYXZJdGVtcy5maW5kKChpdGVtKSA9PiBpdGVtLnBhdGggPT09IHJvdXRlLnBhdGgpPy5sYWJlbCA/PyBcIk5vZGVMZWFybiBBSVwiO1xyXG59KTtcclxuXHJcbmNvbnN0IGN1cnJlbnRDb3Vyc2UgPSBjb21wdXRlZCgoKSA9PiBjb3Vyc2VzLnZhbHVlLmZpbmQoKGNvdXJzZSkgPT4gY291cnNlLmlkID09PSBzZWxlY3RlZENvdXJzZUlkLnZhbHVlKSA/PyBhcHBTdGF0ZS5jdXJyZW50Q291cnNlKTtcclxuY29uc3Qgc2VsZWN0ZWROb2RlID0gY29tcHV0ZWQoKCkgPT4gbm9kZXMudmFsdWUuZmluZCgobm9kZSkgPT4gbm9kZS5pZCA9PT0gYXBwU3RhdGUuc2VsZWN0ZWROb2RlSWQpKTtcclxuXHJcbm9uTW91bnRlZCgoKSA9PiB7XHJcbiAgdm9pZCBsb2FkQ291cnNlcygpO1xyXG59KTtcclxuXHJcbndhdGNoKFxyXG4gICgpID0+IGFwcFN0YXRlLmN1cnJlbnRDb3Vyc2U/LmlkLFxyXG4gIChjb3Vyc2VJZCkgPT4ge1xyXG4gICAgaWYgKGNvdXJzZUlkICYmIGNvdXJzZUlkICE9PSBzZWxlY3RlZENvdXJzZUlkLnZhbHVlKSB7XHJcbiAgICAgIHNlbGVjdGVkQ291cnNlSWQudmFsdWUgPSBjb3Vyc2VJZDtcclxuICAgICAgdm9pZCBsb2FkTm9kZXMoKTtcclxuICAgIH1cclxuICB9XHJcbik7XHJcblxyXG5hc3luYyBmdW5jdGlvbiBsb2FkQ291cnNlcygpIHtcclxuICBsYXlvdXRMb2FkaW5nLnZhbHVlID0gdHJ1ZTtcclxuICBsYXlvdXRFcnJvci52YWx1ZSA9IFwiXCI7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY291cnNlQXBpLmdldENvdXJzZXMoeyBwYWdlOiAxLCBwYWdlU2l6ZTogMjAgfSk7XHJcbiAgICBjb3Vyc2VzLnZhbHVlID0gcmVzcG9uc2UuZGF0YS5saXN0O1xyXG4gICAgY29uc3QgbmV4dENvdXJzZSA9IGNvdXJzZXMudmFsdWUuZmluZCgoY291cnNlKSA9PiBjb3Vyc2UuaWQgPT09IHNlbGVjdGVkQ291cnNlSWQudmFsdWUpID8/IGNvdXJzZXMudmFsdWVbMF0gPz8gbnVsbDtcclxuICAgIGlmIChuZXh0Q291cnNlKSB7XHJcbiAgICAgIHNlbGVjdGVkQ291cnNlSWQudmFsdWUgPSBuZXh0Q291cnNlLmlkO1xyXG4gICAgICBzZXRDdXJyZW50Q291cnNlKG5leHRDb3Vyc2UpO1xyXG4gICAgfVxyXG4gICAgYXdhaXQgbG9hZE5vZGVzKCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGxheW91dEVycm9yLnZhbHVlID0gZ2V0RXJyb3JNZXNzYWdlKGVycm9yKTtcclxuICB9IGZpbmFsbHkge1xyXG4gICAgbGF5b3V0TG9hZGluZy52YWx1ZSA9IGZhbHNlO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbG9hZE5vZGVzKCkge1xyXG4gIGlmICghc2VsZWN0ZWRDb3Vyc2VJZC52YWx1ZSkgcmV0dXJuO1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBbbm9kZVJlc3BvbnNlLCBjaGFwdGVyUmVzcG9uc2VdID0gYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKFtcclxuICAgICAgY291cnNlQXBpLmdldE5vZGVzKHNlbGVjdGVkQ291cnNlSWQudmFsdWUpLFxyXG4gICAgICBjb3Vyc2VBcGkuZ2V0Q2hhcHRlcnMoc2VsZWN0ZWRDb3Vyc2VJZC52YWx1ZSlcclxuICAgIF0pO1xyXG4gICAgaWYgKG5vZGVSZXNwb25zZS5zdGF0dXMgPT09IFwicmVqZWN0ZWRcIikge1xyXG4gICAgICB0aHJvdyBub2RlUmVzcG9uc2UucmVhc29uO1xyXG4gICAgfVxyXG4gICAgbm9kZXMudmFsdWUgPSBub2RlUmVzcG9uc2UudmFsdWUuZGF0YTtcclxuICAgIGNoYXB0ZXJzLnZhbHVlID0gY2hhcHRlclJlc3BvbnNlLnN0YXR1cyA9PT0gXCJmdWxmaWxsZWRcIiA/IGNoYXB0ZXJSZXNwb25zZS52YWx1ZS5kYXRhIDogW107XHJcbiAgICBpZiAoIWFwcFN0YXRlLnNlbGVjdGVkTm9kZUlkICYmIG5vZGVzLnZhbHVlWzBdKSB7XHJcbiAgICAgIGFwcFN0YXRlLnNlbGVjdGVkTm9kZUlkID0gbm9kZXMudmFsdWVbMF0uaWQ7XHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGxheW91dEVycm9yLnZhbHVlID0gZ2V0RXJyb3JNZXNzYWdlKGVycm9yKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNoYW5nZUNvdXJzZShjb3Vyc2VJZDogc3RyaW5nKSB7XHJcbiAgc2VsZWN0ZWRDb3Vyc2VJZC52YWx1ZSA9IGNvdXJzZUlkO1xyXG4gIGNvbnN0IGNvdXJzZSA9IGNvdXJzZXMudmFsdWUuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gY291cnNlSWQpID8/IG51bGw7XHJcbiAgc2V0Q3VycmVudENvdXJzZShjb3Vyc2UpO1xyXG4gIGFwcFN0YXRlLnNlbGVjdGVkTm9kZUlkID0gbnVsbDtcclxuICBjaGFwdGVycy52YWx1ZSA9IFtdO1xyXG4gIHZvaWQgbG9hZE5vZGVzKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNoYW5nZU5vZGUobm9kZUlkOiBzdHJpbmcpIHtcclxuICBhcHBTdGF0ZS5zZWxlY3RlZE5vZGVJZCA9IG5vZGVJZCB8fCBudWxsO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBsb2dvdXQoKSB7XHJcbiAgY2xlYXJBdXRoU3RhdGUoKTtcclxuICBhd2FpdCByb3V0ZXIucHVzaChcIi9sb2dpblwiKTtcclxufVxyXG48L3NjcmlwdD5cclxuXHJcbjx0ZW1wbGF0ZT5cclxuICA8ZGl2IGNsYXNzPVwiYXBwLWxheW91dFwiIDpjbGFzcz1cInsgJ3NpZGViYXItY29sbGFwc2VkJzogc2lkZWJhckNvbGxhcHNlZCB9XCI+XHJcbiAgICA8RXhwYW5kYWJsZVNpZGViYXJcclxuICAgICAgdi1tb2RlbDpjb2xsYXBzZWQ9XCJzaWRlYmFyQ29sbGFwc2VkXCJcclxuICAgICAgdi1tb2RlbDptb2JpbGUtb3Blbj1cInNpZGViYXJNb2JpbGVPcGVuXCJcclxuICAgICAgOm5hdi1ncm91cHM9XCJuYXZHcm91cHNcIlxyXG4gICAgICA6Y291cnNlcz1cImNvdXJzZXNcIlxyXG4gICAgICA6Y2hhcHRlcnM9XCJjaGFwdGVyc1wiXHJcbiAgICAgIDpub2Rlcz1cIm5vZGVzXCJcclxuICAgICAgOnNlbGVjdGVkLWNvdXJzZS1pZD1cInNlbGVjdGVkQ291cnNlSWRcIlxyXG4gICAgICA6c2VsZWN0ZWQtbm9kZS1pZD1cImFwcFN0YXRlLnNlbGVjdGVkTm9kZUlkXCJcclxuICAgICAgQGNvdXJzZS1jaGFuZ2U9XCJjaGFuZ2VDb3Vyc2VcIlxyXG4gICAgICBAbm9kZS1jaGFuZ2U9XCJjaGFuZ2VOb2RlXCJcclxuICAgIC8+XHJcblxyXG4gICAgPHNlY3Rpb24gY2xhc3M9XCJhcHAtbWFpblwiPlxyXG4gICAgICA8QWNhZGVtaWNUb3BiYXJcclxuICAgICAgICA6dGl0bGU9XCJjdXJyZW50UGFnZVRpdGxlXCJcclxuICAgICAgICA6Y291cnNlcz1cImNvdXJzZXNcIlxyXG4gICAgICAgIDpub2Rlcz1cIm5vZGVzXCJcclxuICAgICAgICA6c2VsZWN0ZWQtY291cnNlLWlkPVwic2VsZWN0ZWRDb3Vyc2VJZFwiXHJcbiAgICAgICAgOnNlbGVjdGVkLW5vZGUtaWQ9XCJhcHBTdGF0ZS5zZWxlY3RlZE5vZGVJZFwiXHJcbiAgICAgICAgOnVzZXJuYW1lPVwiYXBwU3RhdGUuY3VycmVudFVzZXI/LnVzZXJuYW1lID8/ICdkZW1vX3N0dWRlbnQnXCJcclxuICAgICAgICA6Y291cnNlPVwiY3VycmVudENvdXJzZVwiXHJcbiAgICAgICAgOm5vZGU9XCJzZWxlY3RlZE5vZGVcIlxyXG4gICAgICAgIDpwcm9maWxlPVwiYXBwU3RhdGUuY3VycmVudFByb2ZpbGVcIlxyXG4gICAgICAgIDpsb2FkaW5nPVwibGF5b3V0TG9hZGluZ1wiXHJcbiAgICAgICAgOmVycm9yPVwibGF5b3V0RXJyb3JcIlxyXG4gICAgICAgIEBjb3Vyc2UtY2hhbmdlPVwiY2hhbmdlQ291cnNlXCJcclxuICAgICAgICBAbm9kZS1jaGFuZ2U9XCJjaGFuZ2VOb2RlXCJcclxuICAgICAgICBAb3Blbi1zaWRlYmFyPVwic2lkZWJhck1vYmlsZU9wZW4gPSB0cnVlXCJcclxuICAgICAgICBAb3Blbi1jb250ZXh0PVwiY29udGV4dE9wZW4gPSB0cnVlXCJcclxuICAgICAgICBAbG9nb3V0PVwibG9nb3V0XCJcclxuICAgICAgLz5cclxuXHJcbiAgICAgIDxtYWluIGlkPVwibWFpbi1jb250ZW50XCIgY2xhc3M9XCJhcHAtY29udGVudFwiIHRhYmluZGV4PVwiLTFcIj5cclxuICAgICAgICA8c2xvdCAvPlxyXG4gICAgICA8L21haW4+XHJcbiAgICA8L3NlY3Rpb24+XHJcblxyXG4gICAgPERldGFpbERyYXdlclxyXG4gICAgICB2LW1vZGVsPVwiY29udGV4dE9wZW5cIlxyXG4gICAgICA6Y291cnNlPVwiY3VycmVudENvdXJzZVwiXHJcbiAgICAgIDpub2RlPVwic2VsZWN0ZWROb2RlXCJcclxuICAgICAgOnByb2ZpbGU9XCJhcHBTdGF0ZS5jdXJyZW50UHJvZmlsZVwiXHJcbiAgICAvPlxyXG4gIDwvZGl2PlxyXG48L3RlbXBsYXRlPlxyXG4iXSwiZmlsZSI6IkQ6L2ZpcnN0bW9uZXkvbm9kZWxlYXJuLWFpL2Zyb250ZW5kL3NyYy9jb21wb25lbnRzL0FwcExheW91dC52dWUifQ==