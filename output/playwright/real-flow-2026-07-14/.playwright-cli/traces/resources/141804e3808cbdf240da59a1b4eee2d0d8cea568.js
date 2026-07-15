import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/layout/ExpandableSidebar.vue");import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { computed, ref } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { useRoute } from "/node_modules/.vite/deps/vue-router.js?v=d8ae4e15";
import {
  ArrowLeft,
  ArrowRight,
  Collection,
  Files,
  FolderOpened,
  Notebook,
  Reading,
  Tickets
} from "/node_modules/.vite/deps/@element-plus_icons-vue.js?v=dfeb8a9b";
import SidebarGroup from "/src/components/layout/SidebarGroup.vue";
import SidebarItem from "/src/components/layout/SidebarItem.vue";
import { difficultyLabel } from "/src/utils/format.ts";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "ExpandableSidebar",
  props: {
    navGroups: { type: Array, required: true },
    courses: { type: Array, required: true },
    chapters: { type: Array, required: true },
    nodes: { type: Array, required: true },
    selectedCourseId: { type: String, required: false },
    selectedNodeId: { type: [String, null], required: false },
    collapsed: { type: Boolean, required: true },
    mobileOpen: { type: Boolean, required: true }
  },
  emits: ["update:collapsed", "update:mobileOpen", "courseChange", "nodeChange"],
  setup(__props, { expose: __expose, emit: __emit }) {
    __expose();
    const route = useRoute();
    const props = __props;
    const emit = __emit;
    const expandedBranches = ref(/* @__PURE__ */ new Set());
    const effectiveCollapsed = computed(() => props.collapsed && !props.mobileOpen);
    const activeCourse = computed(() => props.courses.find((course) => course.id === props.selectedCourseId) ?? props.courses[0]);
    const nodeById = computed(() => new Map(props.nodes.map((node) => [node.id, node])));
    const nodeBranches = computed(() => {
      const branchesFromChapters = props.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        root: void 0,
        nodes: props.nodes.filter((node) => node.chapterId === chapter.id)
      })).filter((branch) => branch.nodes.length);
      if (branchesFromChapters.length) return branchesFromChapters;
      const childIds = new Set(props.nodes.flatMap((node) => node.nextNodeIds ?? []));
      const roots = props.nodes.filter((node) => !node.prerequisiteNodeIds?.length || !childIds.has(node.id)).slice(0, 10);
      const fallbackRoots = roots.length ? roots : props.nodes.slice(0, 8);
      return fallbackRoots.map((root) => ({
        id: root.id,
        title: root.name,
        description: root.description,
        root,
        nodes: (root.nextNodeIds ?? []).map((nodeId) => nodeById.value.get(nodeId)).filter((node) => Boolean(node)).slice(0, 8)
      }));
    });
    function toggleCollapsed() {
      emit("update:collapsed", !props.collapsed);
    }
    function closeMobile() {
      emit("update:mobileOpen", false);
    }
    function selectCourse(courseId) {
      emit("courseChange", courseId);
      closeMobile();
    }
    function selectNode(nodeId) {
      emit("nodeChange", nodeId);
      closeMobile();
    }
    function toggleBranch(branchId) {
      const next = new Set(expandedBranches.value);
      if (next.has(branchId)) {
        next.delete(branchId);
      } else {
        next.add(branchId);
      }
      expandedBranches.value = next;
    }
    function isBranchOpen(branchId) {
      return expandedBranches.value.has(branchId);
    }
    function groupHasActiveChild(group) {
      return group.items.some((item) => item.path === route.path);
    }
    function branchHasActiveNode(branch) {
      return branch.root?.id === props.selectedNodeId || branch.nodes.some((node) => node.id === props.selectedNodeId);
    }
    const __returned__ = { route, props, emit, expandedBranches, effectiveCollapsed, activeCourse, nodeById, nodeBranches, toggleCollapsed, closeMobile, selectCourse, selectNode, toggleBranch, isBranchOpen, groupHasActiveChild, branchHasActiveNode, get ArrowLeft() {
      return ArrowLeft;
    }, get ArrowRight() {
      return ArrowRight;
    }, get Collection() {
      return Collection;
    }, get Files() {
      return Files;
    }, get FolderOpened() {
      return FolderOpened;
    }, get Notebook() {
      return Notebook;
    }, get Reading() {
      return Reading;
    }, get Tickets() {
      return Tickets;
    }, SidebarGroup, SidebarItem, get difficultyLabel() {
      return difficultyLabel;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, createElementVNode as _createElementVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, resolveDynamicComponent as _resolveDynamicComponent, createBlock as _createBlock, renderList as _renderList, Fragment as _Fragment, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, vShow as _vShow, withDirectives as _withDirectives } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _hoisted_1 = { class: "sidebar-brand-row" };
const _hoisted_2 = ["aria-pressed"];
const _hoisted_3 = { class: "sidebar-scroll-area" };
const _hoisted_4 = ["onClick"];
const _hoisted_5 = {
  key: 0,
  class: "sidebar-empty-note"
};
const _hoisted_6 = {
  key: 0,
  class: "sidebar-course-note"
};
const _hoisted_7 = {
  key: 1,
  class: "sidebar-empty-note"
};
const _hoisted_8 = ["aria-expanded", "onClick"];
const _hoisted_9 = { class: "sidebar-item-icon" };
const _hoisted_10 = { class: "sidebar-child-list" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_RouterLink = _resolveComponent("RouterLink");
  const _component_el_icon = _resolveComponent("el-icon");
  return _openBlock(), _createElementBlock(
    _Fragment,
    null,
    [
      $props.mobileOpen ? (_openBlock(), _createElementBlock("button", {
        key: 0,
        type: "button",
        class: "sidebar-mobile-backdrop",
        "aria-label": "关闭项目栏",
        onClick: $setup.closeMobile
      })) : _createCommentVNode("v-if", true),
      _createElementVNode(
        "aside",
        {
          class: _normalizeClass(["expandable-sidebar", { collapsed: $setup.effectiveCollapsed, "mobile-open": $props.mobileOpen }]),
          "aria-label": "项目导航"
        },
        [
          _createElementVNode("div", _hoisted_1, [
            _createVNode(_component_RouterLink, {
              class: "brand",
              to: "/home",
              "aria-label": "NodeLearn 首页",
              onClick: $setup.closeMobile
            }, {
              default: _withCtx(() => [..._cache[0] || (_cache[0] = [
                _createElementVNode(
                  "span",
                  { class: "brand-mark" },
                  "N",
                  -1
                  /* CACHED */
                ),
                _createElementVNode(
                  "span",
                  { class: "brand-copy" },
                  [
                    _createElementVNode("strong", null, "NodeLearn"),
                    _createElementVNode("small", null, "学习工作台")
                  ],
                  -1
                  /* CACHED */
                )
              ])]),
              _: 1
              /* STABLE */
            }),
            _createElementVNode("button", {
              type: "button",
              class: "sidebar-collapse-button",
              "aria-pressed": $props.collapsed,
              onClick: $setup.toggleCollapsed
            }, [
              _createVNode(_component_el_icon, null, {
                default: _withCtx(() => [
                  (_openBlock(), _createBlock(_resolveDynamicComponent($props.collapsed ? $setup.ArrowRight : $setup.ArrowLeft)))
                ]),
                _: 1
                /* STABLE */
              })
            ], 8, _hoisted_2)
          ]),
          _createElementVNode("div", _hoisted_3, [
            _createVNode($setup["SidebarGroup"], {
              title: "课程入口",
              icon: $setup.FolderOpened,
              count: $props.courses.length,
              collapsed: $setup.effectiveCollapsed,
              "has-active-child": Boolean($props.selectedCourseId)
            }, {
              default: _withCtx(() => [
                (_openBlock(true), _createElementBlock(
                  _Fragment,
                  null,
                  _renderList($props.courses, (course) => {
                    return _openBlock(), _createElementBlock("button", {
                      key: course.id,
                      type: "button",
                      class: _normalizeClass(["course-switcher", { active: course.id === $props.selectedCourseId }]),
                      onClick: ($event) => $setup.selectCourse(course.id)
                    }, [
                      _createElementVNode(
                        "span",
                        null,
                        _toDisplayString(course.name.slice(0, 1)),
                        1
                        /* TEXT */
                      ),
                      _createElementVNode(
                        "strong",
                        null,
                        _toDisplayString(course.name),
                        1
                        /* TEXT */
                      ),
                      _createElementVNode(
                        "small",
                        null,
                        _toDisplayString(course.code ?? course.status),
                        1
                        /* TEXT */
                      )
                    ], 10, _hoisted_4);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                )),
                !$props.courses.length ? (_openBlock(), _createElementBlock("article", _hoisted_5, "暂无课程")) : _createCommentVNode("v-if", true)
              ]),
              _: 1
              /* STABLE */
            }, 8, ["icon", "count", "collapsed", "has-active-child"]),
            (_openBlock(true), _createElementBlock(
              _Fragment,
              null,
              _renderList($props.navGroups, (group) => {
                return _openBlock(), _createBlock($setup["SidebarGroup"], {
                  key: group.title,
                  title: group.title,
                  icon: group.icon,
                  count: group.items.length,
                  collapsed: $setup.effectiveCollapsed,
                  "has-active-child": $setup.groupHasActiveChild(group)
                }, {
                  default: _withCtx(() => [
                    (_openBlock(true), _createElementBlock(
                      _Fragment,
                      null,
                      _renderList(group.items, (item) => {
                        return _openBlock(), _createBlock($setup["SidebarItem"], {
                          key: item.path,
                          label: item.label,
                          description: item.description,
                          icon: item.icon,
                          path: item.path,
                          active: $setup.route.path === item.path,
                          collapsed: $setup.effectiveCollapsed,
                          depth: 1,
                          onActivate: $setup.closeMobile
                        }, null, 8, ["label", "description", "icon", "path", "active", "collapsed"]);
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ]),
                  _: 2
                  /* DYNAMIC */
                }, 1032, ["title", "icon", "count", "collapsed", "has-active-child"]);
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            _createVNode($setup["SidebarGroup"], {
              title: "知识节点",
              icon: $setup.Reading,
              count: $props.nodes.length,
              collapsed: $setup.effectiveCollapsed,
              "has-active-child": $setup.route.path === "/knowledge-graph" || Boolean($props.selectedNodeId),
              "popover-width": 340
            }, {
              default: _withCtx(() => [
                $setup.activeCourse ? (_openBlock(), _createElementBlock("article", _hoisted_6, [
                  _createVNode(_component_el_icon, null, {
                    default: _withCtx(() => [
                      _createVNode($setup["Files"])
                    ]),
                    _: 1
                    /* STABLE */
                  }),
                  _createElementVNode(
                    "span",
                    null,
                    _toDisplayString($setup.activeCourse.name),
                    1
                    /* TEXT */
                  )
                ])) : _createCommentVNode("v-if", true),
                !$setup.nodeBranches.length ? (_openBlock(), _createElementBlock("article", _hoisted_7, "暂无知识节点")) : _createCommentVNode("v-if", true),
                (_openBlock(true), _createElementBlock(
                  _Fragment,
                  null,
                  _renderList($setup.nodeBranches, (branch) => {
                    return _openBlock(), _createElementBlock("section", {
                      key: branch.id,
                      class: "sidebar-node-branch"
                    }, [
                      _createElementVNode("button", {
                        type: "button",
                        class: _normalizeClass(["sidebar-branch-trigger", { "has-active-child": $setup.branchHasActiveNode(branch) }]),
                        "aria-expanded": $setup.isBranchOpen(branch.id),
                        onClick: ($event) => $setup.toggleBranch(branch.id)
                      }, [
                        _createElementVNode("span", _hoisted_9, [
                          _createVNode(_component_el_icon, null, {
                            default: _withCtx(() => [
                              _createVNode($setup["Notebook"])
                            ]),
                            _: 1
                            /* STABLE */
                          })
                        ]),
                        _createElementVNode("span", null, [
                          _createElementVNode(
                            "strong",
                            null,
                            _toDisplayString(branch.title),
                            1
                            /* TEXT */
                          ),
                          _createElementVNode(
                            "small",
                            null,
                            _toDisplayString(branch.nodes.length) + " 个子节点",
                            1
                            /* TEXT */
                          )
                        ]),
                        _createVNode(
                          _component_el_icon,
                          { class: "sidebar-group-arrow" },
                          {
                            default: _withCtx(() => [
                              (_openBlock(), _createBlock(_resolveDynamicComponent($setup.isBranchOpen(branch.id) ? $setup.ArrowLeft : $setup.ArrowRight)))
                            ]),
                            _: 2
                            /* DYNAMIC */
                          },
                          1024
                          /* DYNAMIC_SLOTS */
                        )
                      ], 10, _hoisted_8),
                      _withDirectives(_createElementVNode(
                        "div",
                        _hoisted_10,
                        [
                          branch.root ? (_openBlock(), _createBlock($setup["SidebarItem"], {
                            key: 0,
                            label: branch.root.name,
                            description: `${branch.root.nodeType} · ${$setup.difficultyLabel(branch.root.difficulty)}`,
                            icon: $setup.Tickets,
                            path: "/knowledge-graph",
                            active: branch.root.id === $props.selectedNodeId,
                            depth: 2,
                            onActivate: ($event) => $setup.selectNode(branch.root.id)
                          }, null, 8, ["label", "description", "icon", "active", "onActivate"])) : _createCommentVNode("v-if", true),
                          (_openBlock(true), _createElementBlock(
                            _Fragment,
                            null,
                            _renderList(branch.nodes, (node) => {
                              return _openBlock(), _createBlock($setup["SidebarItem"], {
                                key: node.id,
                                label: node.name,
                                description: `${node.nodeType} · ${$setup.difficultyLabel(node.difficulty)}`,
                                icon: $setup.Collection,
                                path: "/knowledge-graph",
                                active: node.id === $props.selectedNodeId,
                                depth: 2,
                                onActivate: ($event) => $setup.selectNode(node.id)
                              }, null, 8, ["label", "description", "icon", "active", "onActivate"]);
                            }),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ],
                        512
                        /* NEED_PATCH */
                      ), [
                        [_vShow, $setup.isBranchOpen(branch.id)]
                      ])
                    ]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ]),
              _: 1
              /* STABLE */
            }, 8, ["icon", "count", "collapsed", "has-active-child"])
          ])
        ],
        2
        /* CLASS */
      )
    ],
    64
    /* STABLE_FRAGMENT */
  );
}
_sfc_main.__hmrId = "350a7b73";
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
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/components/layout/ExpandableSidebar.vue"]]);

//# sourceMappingURL=data:application/json;base64,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QUFLLEtBQUssUUFBUSxNQUFNLHVCQUFnQixLQUFLLFVBQVU7QUFBQSxnQ0FDbEUsTUFBTTtBQUFBLGdDQUNQLE1BQUs7QUFBQSxnQ0FDSixRQUFRLEtBQUssT0FBTztBQUFBLGdDQUNwQixPQUFPO0FBQUEsZ0NBQ1AsWUFBUSxZQUFFLGtCQUFXLEtBQUssRUFBRTtBQUFBOzs7Ozs7Ozs7aUNBcEJwQixvQkFBYSxPQUFPLEVBQUU7QUFBQSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiRXhwYW5kYWJsZVNpZGViYXIudnVlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQgc2V0dXAgbGFuZz1cInRzXCI+XG5pbXBvcnQgeyBjb21wdXRlZCwgcmVmIH0gZnJvbSBcInZ1ZVwiO1xuaW1wb3J0IHsgdXNlUm91dGUgfSBmcm9tIFwidnVlLXJvdXRlclwiO1xuaW1wb3J0IHtcbiAgQXJyb3dMZWZ0LFxuICBBcnJvd1JpZ2h0LFxuICBDb2xsZWN0aW9uLFxuICBGaWxlcyxcbiAgRm9sZGVyT3BlbmVkLFxuICBOb3RlYm9vayxcbiAgUmVhZGluZyxcbiAgVGlja2V0c1xufSBmcm9tIFwiQGVsZW1lbnQtcGx1cy9pY29ucy12dWVcIjtcbmltcG9ydCBTaWRlYmFyR3JvdXAgZnJvbSBcIkAvY29tcG9uZW50cy9sYXlvdXQvU2lkZWJhckdyb3VwLnZ1ZVwiO1xuaW1wb3J0IFNpZGViYXJJdGVtIGZyb20gXCJAL2NvbXBvbmVudHMvbGF5b3V0L1NpZGViYXJJdGVtLnZ1ZVwiO1xuaW1wb3J0IHR5cGUgeyBDaGFwdGVyLCBDb3Vyc2UsIEtub3dsZWRnZU5vZGUgfSBmcm9tIFwiQC90eXBlcy9jb3Vyc2VcIjtcbmltcG9ydCB0eXBlIHsgQ29tcG9uZW50IH0gZnJvbSBcInZ1ZVwiO1xuaW1wb3J0IHsgZGlmZmljdWx0eUxhYmVsIH0gZnJvbSBcIkAvdXRpbHMvZm9ybWF0XCI7XG5cbmNvbnN0IHJvdXRlID0gdXNlUm91dGUoKTtcblxuZXhwb3J0IGludGVyZmFjZSBTaWRlYmFyTmF2SXRlbSB7XG4gIHBhdGg6IHN0cmluZztcbiAgbGFiZWw6IHN0cmluZztcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgaWNvbjogQ29tcG9uZW50O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNpZGViYXJOYXZHcm91cCB7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGljb246IENvbXBvbmVudDtcbiAgaXRlbXM6IFNpZGViYXJOYXZJdGVtW107XG59XG5cbmludGVyZmFjZSBTaWRlYmFyTm9kZUJyYW5jaCB7XG4gIGlkOiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuICByb290PzogS25vd2xlZGdlTm9kZTtcbiAgbm9kZXM6IEtub3dsZWRnZU5vZGVbXTtcbn1cblxuY29uc3QgcHJvcHMgPSBkZWZpbmVQcm9wczx7XG4gIG5hdkdyb3VwczogU2lkZWJhck5hdkdyb3VwW107XG4gIGNvdXJzZXM6IENvdXJzZVtdO1xuICBjaGFwdGVyczogQ2hhcHRlcltdO1xuICBub2RlczogS25vd2xlZGdlTm9kZVtdO1xuICBzZWxlY3RlZENvdXJzZUlkPzogc3RyaW5nO1xuICBzZWxlY3RlZE5vZGVJZD86IHN0cmluZyB8IG51bGw7XG4gIGNvbGxhcHNlZDogYm9vbGVhbjtcbiAgbW9iaWxlT3BlbjogYm9vbGVhbjtcbn0+KCk7XG5cbmNvbnN0IGVtaXQgPSBkZWZpbmVFbWl0czx7XG4gIFwidXBkYXRlOmNvbGxhcHNlZFwiOiBbdmFsdWU6IGJvb2xlYW5dO1xuICBcInVwZGF0ZTptb2JpbGVPcGVuXCI6IFt2YWx1ZTogYm9vbGVhbl07XG4gIGNvdXJzZUNoYW5nZTogW2NvdXJzZUlkOiBzdHJpbmddO1xuICBub2RlQ2hhbmdlOiBbbm9kZUlkOiBzdHJpbmddO1xufT4oKTtcblxuY29uc3QgZXhwYW5kZWRCcmFuY2hlcyA9IHJlZihuZXcgU2V0PHN0cmluZz4oKSk7XG5cbmNvbnN0IGVmZmVjdGl2ZUNvbGxhcHNlZCA9IGNvbXB1dGVkKCgpID0+IHByb3BzLmNvbGxhcHNlZCAmJiAhcHJvcHMubW9iaWxlT3Blbik7XG5cbmNvbnN0IGFjdGl2ZUNvdXJzZSA9IGNvbXB1dGVkKCgpID0+IHByb3BzLmNvdXJzZXMuZmluZCgoY291cnNlKSA9PiBjb3Vyc2UuaWQgPT09IHByb3BzLnNlbGVjdGVkQ291cnNlSWQpID8/IHByb3BzLmNvdXJzZXNbMF0pO1xuXG5jb25zdCBub2RlQnlJZCA9IGNvbXB1dGVkKCgpID0+IG5ldyBNYXAocHJvcHMubm9kZXMubWFwKChub2RlKSA9PiBbbm9kZS5pZCwgbm9kZV0pKSk7XG5cbmNvbnN0IG5vZGVCcmFuY2hlcyA9IGNvbXB1dGVkPFNpZGViYXJOb2RlQnJhbmNoW10+KCgpID0+IHtcbiAgY29uc3QgYnJhbmNoZXNGcm9tQ2hhcHRlcnMgPSBwcm9wcy5jaGFwdGVyc1xuICAgIC5tYXAoKGNoYXB0ZXIpID0+ICh7XG4gICAgICBpZDogY2hhcHRlci5pZCxcbiAgICAgIHRpdGxlOiBjaGFwdGVyLnRpdGxlLFxuICAgICAgZGVzY3JpcHRpb246IGNoYXB0ZXIuZGVzY3JpcHRpb24sXG4gICAgICByb290OiB1bmRlZmluZWQsXG4gICAgICBub2RlczogcHJvcHMubm9kZXMuZmlsdGVyKChub2RlKSA9PiBub2RlLmNoYXB0ZXJJZCA9PT0gY2hhcHRlci5pZClcbiAgICB9KSlcbiAgICAuZmlsdGVyKChicmFuY2gpID0+IGJyYW5jaC5ub2Rlcy5sZW5ndGgpO1xuXG4gIGlmIChicmFuY2hlc0Zyb21DaGFwdGVycy5sZW5ndGgpIHJldHVybiBicmFuY2hlc0Zyb21DaGFwdGVycztcblxuICBjb25zdCBjaGlsZElkcyA9IG5ldyBTZXQocHJvcHMubm9kZXMuZmxhdE1hcCgobm9kZSkgPT4gbm9kZS5uZXh0Tm9kZUlkcyA/PyBbXSkpO1xuICBjb25zdCByb290cyA9IHByb3BzLm5vZGVzLmZpbHRlcigobm9kZSkgPT4gIW5vZGUucHJlcmVxdWlzaXRlTm9kZUlkcz8ubGVuZ3RoIHx8ICFjaGlsZElkcy5oYXMobm9kZS5pZCkpLnNsaWNlKDAsIDEwKTtcbiAgY29uc3QgZmFsbGJhY2tSb290cyA9IHJvb3RzLmxlbmd0aCA/IHJvb3RzIDogcHJvcHMubm9kZXMuc2xpY2UoMCwgOCk7XG5cbiAgcmV0dXJuIGZhbGxiYWNrUm9vdHMubWFwKChyb290KSA9PiAoe1xuICAgIGlkOiByb290LmlkLFxuICAgIHRpdGxlOiByb290Lm5hbWUsXG4gICAgZGVzY3JpcHRpb246IHJvb3QuZGVzY3JpcHRpb24sXG4gICAgcm9vdCxcbiAgICBub2RlczogKHJvb3QubmV4dE5vZGVJZHMgPz8gW10pXG4gICAgICAubWFwKChub2RlSWQpID0+IG5vZGVCeUlkLnZhbHVlLmdldChub2RlSWQpKVxuICAgICAgLmZpbHRlcigobm9kZSk6IG5vZGUgaXMgS25vd2xlZGdlTm9kZSA9PiBCb29sZWFuKG5vZGUpKVxuICAgICAgLnNsaWNlKDAsIDgpXG4gIH0pKTtcbn0pO1xuXG5mdW5jdGlvbiB0b2dnbGVDb2xsYXBzZWQoKSB7XG4gIGVtaXQoXCJ1cGRhdGU6Y29sbGFwc2VkXCIsICFwcm9wcy5jb2xsYXBzZWQpO1xufVxuXG5mdW5jdGlvbiBjbG9zZU1vYmlsZSgpIHtcbiAgZW1pdChcInVwZGF0ZTptb2JpbGVPcGVuXCIsIGZhbHNlKTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0Q291cnNlKGNvdXJzZUlkOiBzdHJpbmcpIHtcbiAgZW1pdChcImNvdXJzZUNoYW5nZVwiLCBjb3Vyc2VJZCk7XG4gIGNsb3NlTW9iaWxlKCk7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdE5vZGUobm9kZUlkOiBzdHJpbmcpIHtcbiAgZW1pdChcIm5vZGVDaGFuZ2VcIiwgbm9kZUlkKTtcbiAgY2xvc2VNb2JpbGUoKTtcbn1cblxuZnVuY3Rpb24gdG9nZ2xlQnJhbmNoKGJyYW5jaElkOiBzdHJpbmcpIHtcbiAgY29uc3QgbmV4dCA9IG5ldyBTZXQoZXhwYW5kZWRCcmFuY2hlcy52YWx1ZSk7XG4gIGlmIChuZXh0LmhhcyhicmFuY2hJZCkpIHtcbiAgICBuZXh0LmRlbGV0ZShicmFuY2hJZCk7XG4gIH0gZWxzZSB7XG4gICAgbmV4dC5hZGQoYnJhbmNoSWQpO1xuICB9XG4gIGV4cGFuZGVkQnJhbmNoZXMudmFsdWUgPSBuZXh0O1xufVxuXG5mdW5jdGlvbiBpc0JyYW5jaE9wZW4oYnJhbmNoSWQ6IHN0cmluZykge1xuICByZXR1cm4gZXhwYW5kZWRCcmFuY2hlcy52YWx1ZS5oYXMoYnJhbmNoSWQpO1xufVxuXG5mdW5jdGlvbiBncm91cEhhc0FjdGl2ZUNoaWxkKGdyb3VwOiBTaWRlYmFyTmF2R3JvdXApIHtcbiAgcmV0dXJuIGdyb3VwLml0ZW1zLnNvbWUoKGl0ZW0pID0+IGl0ZW0ucGF0aCA9PT0gcm91dGUucGF0aCk7XG59XG5cbmZ1bmN0aW9uIGJyYW5jaEhhc0FjdGl2ZU5vZGUoYnJhbmNoOiBTaWRlYmFyTm9kZUJyYW5jaCkge1xuICByZXR1cm4gYnJhbmNoLnJvb3Q/LmlkID09PSBwcm9wcy5zZWxlY3RlZE5vZGVJZCB8fCBicmFuY2gubm9kZXMuc29tZSgobm9kZSkgPT4gbm9kZS5pZCA9PT0gcHJvcHMuc2VsZWN0ZWROb2RlSWQpO1xufVxuPC9zY3JpcHQ+XG5cbjx0ZW1wbGF0ZT5cbiAgPGJ1dHRvblxuICAgIHYtaWY9XCJtb2JpbGVPcGVuXCJcbiAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICBjbGFzcz1cInNpZGViYXItbW9iaWxlLWJhY2tkcm9wXCJcbiAgICBhcmlhLWxhYmVsPVwi5YWz6Zet6aG555uu5qCPXCJcbiAgICBAY2xpY2s9XCJjbG9zZU1vYmlsZVwiXG4gIC8+XG5cbiAgPGFzaWRlXG4gICAgY2xhc3M9XCJleHBhbmRhYmxlLXNpZGViYXJcIlxuICAgIDpjbGFzcz1cInsgY29sbGFwc2VkOiBlZmZlY3RpdmVDb2xsYXBzZWQsICdtb2JpbGUtb3Blbic6IG1vYmlsZU9wZW4gfVwiXG4gICAgYXJpYS1sYWJlbD1cIumhueebruWvvOiIqlwiXG4gID5cbiAgICA8ZGl2IGNsYXNzPVwic2lkZWJhci1icmFuZC1yb3dcIj5cbiAgICAgIDxSb3V0ZXJMaW5rIGNsYXNzPVwiYnJhbmRcIiB0bz1cIi9ob21lXCIgYXJpYS1sYWJlbD1cIk5vZGVMZWFybiDpppbpobVcIiBAY2xpY2s9XCJjbG9zZU1vYmlsZVwiPlxuICAgICAgICA8c3BhbiBjbGFzcz1cImJyYW5kLW1hcmtcIj5OPC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzcz1cImJyYW5kLWNvcHlcIj5cbiAgICAgICAgICA8c3Ryb25nPk5vZGVMZWFybjwvc3Ryb25nPlxuICAgICAgICAgIDxzbWFsbD7lrabkuaDlt6XkvZzlj7A8L3NtYWxsPlxuICAgICAgICA8L3NwYW4+XG4gICAgICA8L1JvdXRlckxpbms+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInNpZGViYXItY29sbGFwc2UtYnV0dG9uXCIgOmFyaWEtcHJlc3NlZD1cImNvbGxhcHNlZFwiIEBjbGljaz1cInRvZ2dsZUNvbGxhcHNlZFwiPlxuICAgICAgICA8ZWwtaWNvbj48Y29tcG9uZW50IDppcz1cImNvbGxhcHNlZCA/IEFycm93UmlnaHQgOiBBcnJvd0xlZnRcIiAvPjwvZWwtaWNvbj5cbiAgICAgIDwvYnV0dG9uPlxuICAgIDwvZGl2PlxuXG4gICAgPGRpdiBjbGFzcz1cInNpZGViYXItc2Nyb2xsLWFyZWFcIj5cbiAgICAgIDxTaWRlYmFyR3JvdXBcbiAgICAgICAgdGl0bGU9XCLor77nqIvlhaXlj6NcIlxuICAgICAgICA6aWNvbj1cIkZvbGRlck9wZW5lZFwiXG4gICAgICAgIDpjb3VudD1cImNvdXJzZXMubGVuZ3RoXCJcbiAgICAgICAgOmNvbGxhcHNlZD1cImVmZmVjdGl2ZUNvbGxhcHNlZFwiXG4gICAgICAgIDpoYXMtYWN0aXZlLWNoaWxkPVwiQm9vbGVhbihzZWxlY3RlZENvdXJzZUlkKVwiXG4gICAgICA+XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICB2LWZvcj1cImNvdXJzZSBpbiBjb3Vyc2VzXCJcbiAgICAgICAgICA6a2V5PVwiY291cnNlLmlkXCJcbiAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICBjbGFzcz1cImNvdXJzZS1zd2l0Y2hlclwiXG4gICAgICAgICAgOmNsYXNzPVwieyBhY3RpdmU6IGNvdXJzZS5pZCA9PT0gc2VsZWN0ZWRDb3Vyc2VJZCB9XCJcbiAgICAgICAgICBAY2xpY2s9XCJzZWxlY3RDb3Vyc2UoY291cnNlLmlkKVwiXG4gICAgICAgID5cbiAgICAgICAgICA8c3Bhbj57eyBjb3Vyc2UubmFtZS5zbGljZSgwLCAxKSB9fTwvc3Bhbj5cbiAgICAgICAgICA8c3Ryb25nPnt7IGNvdXJzZS5uYW1lIH19PC9zdHJvbmc+XG4gICAgICAgICAgPHNtYWxsPnt7IGNvdXJzZS5jb2RlID8/IGNvdXJzZS5zdGF0dXMgfX08L3NtYWxsPlxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPGFydGljbGUgdi1pZj1cIiFjb3Vyc2VzLmxlbmd0aFwiIGNsYXNzPVwic2lkZWJhci1lbXB0eS1ub3RlXCI+5pqC5peg6K++56iLPC9hcnRpY2xlPlxuICAgICAgPC9TaWRlYmFyR3JvdXA+XG5cbiAgICAgIDxTaWRlYmFyR3JvdXBcbiAgICAgICAgdi1mb3I9XCJncm91cCBpbiBuYXZHcm91cHNcIlxuICAgICAgICA6a2V5PVwiZ3JvdXAudGl0bGVcIlxuICAgICAgICA6dGl0bGU9XCJncm91cC50aXRsZVwiXG4gICAgICAgIDppY29uPVwiZ3JvdXAuaWNvblwiXG4gICAgICAgIDpjb3VudD1cImdyb3VwLml0ZW1zLmxlbmd0aFwiXG4gICAgICAgIDpjb2xsYXBzZWQ9XCJlZmZlY3RpdmVDb2xsYXBzZWRcIlxuICAgICAgICA6aGFzLWFjdGl2ZS1jaGlsZD1cImdyb3VwSGFzQWN0aXZlQ2hpbGQoZ3JvdXApXCJcbiAgICAgID5cbiAgICAgICAgPFNpZGViYXJJdGVtXG4gICAgICAgICAgdi1mb3I9XCJpdGVtIGluIGdyb3VwLml0ZW1zXCJcbiAgICAgICAgICA6a2V5PVwiaXRlbS5wYXRoXCJcbiAgICAgICAgICA6bGFiZWw9XCJpdGVtLmxhYmVsXCJcbiAgICAgICAgICA6ZGVzY3JpcHRpb249XCJpdGVtLmRlc2NyaXB0aW9uXCJcbiAgICAgICAgICA6aWNvbj1cIml0ZW0uaWNvblwiXG4gICAgICAgICAgOnBhdGg9XCJpdGVtLnBhdGhcIlxuICAgICAgICAgIDphY3RpdmU9XCJyb3V0ZS5wYXRoID09PSBpdGVtLnBhdGhcIlxuICAgICAgICAgIDpjb2xsYXBzZWQ9XCJlZmZlY3RpdmVDb2xsYXBzZWRcIlxuICAgICAgICAgIDpkZXB0aD1cIjFcIlxuICAgICAgICAgIEBhY3RpdmF0ZT1cImNsb3NlTW9iaWxlXCJcbiAgICAgICAgLz5cbiAgICAgIDwvU2lkZWJhckdyb3VwPlxuXG4gICAgICA8U2lkZWJhckdyb3VwXG4gICAgICAgIHRpdGxlPVwi55+l6K+G6IqC54K5XCJcbiAgICAgICAgOmljb249XCJSZWFkaW5nXCJcbiAgICAgICAgOmNvdW50PVwibm9kZXMubGVuZ3RoXCJcbiAgICAgICAgOmNvbGxhcHNlZD1cImVmZmVjdGl2ZUNvbGxhcHNlZFwiXG4gICAgICAgIDpoYXMtYWN0aXZlLWNoaWxkPVwicm91dGUucGF0aCA9PT0gJy9rbm93bGVkZ2UtZ3JhcGgnIHx8IEJvb2xlYW4oc2VsZWN0ZWROb2RlSWQpXCJcbiAgICAgICAgOnBvcG92ZXItd2lkdGg9XCIzNDBcIlxuICAgICAgPlxuICAgICAgICA8YXJ0aWNsZSB2LWlmPVwiYWN0aXZlQ291cnNlXCIgY2xhc3M9XCJzaWRlYmFyLWNvdXJzZS1ub3RlXCI+XG4gICAgICAgICAgPGVsLWljb24+PEZpbGVzIC8+PC9lbC1pY29uPlxuICAgICAgICAgIDxzcGFuPnt7IGFjdGl2ZUNvdXJzZS5uYW1lIH19PC9zcGFuPlxuICAgICAgICA8L2FydGljbGU+XG4gICAgICAgIDxhcnRpY2xlIHYtaWY9XCIhbm9kZUJyYW5jaGVzLmxlbmd0aFwiIGNsYXNzPVwic2lkZWJhci1lbXB0eS1ub3RlXCI+5pqC5peg55+l6K+G6IqC54K5PC9hcnRpY2xlPlxuICAgICAgICA8c2VjdGlvbiB2LWZvcj1cImJyYW5jaCBpbiBub2RlQnJhbmNoZXNcIiA6a2V5PVwiYnJhbmNoLmlkXCIgY2xhc3M9XCJzaWRlYmFyLW5vZGUtYnJhbmNoXCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICBjbGFzcz1cInNpZGViYXItYnJhbmNoLXRyaWdnZXJcIlxuICAgICAgICAgICAgOmNsYXNzPVwieyAnaGFzLWFjdGl2ZS1jaGlsZCc6IGJyYW5jaEhhc0FjdGl2ZU5vZGUoYnJhbmNoKSB9XCJcbiAgICAgICAgICAgIDphcmlhLWV4cGFuZGVkPVwiaXNCcmFuY2hPcGVuKGJyYW5jaC5pZClcIlxuICAgICAgICAgICAgQGNsaWNrPVwidG9nZ2xlQnJhbmNoKGJyYW5jaC5pZClcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic2lkZWJhci1pdGVtLWljb25cIj5cbiAgICAgICAgICAgICAgPGVsLWljb24+PE5vdGVib29rIC8+PC9lbC1pY29uPlxuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4+XG4gICAgICAgICAgICAgIDxzdHJvbmc+e3sgYnJhbmNoLnRpdGxlIH19PC9zdHJvbmc+XG4gICAgICAgICAgICAgIDxzbWFsbD57eyBicmFuY2gubm9kZXMubGVuZ3RoIH19IOS4quWtkOiKgueCuTwvc21hbGw+XG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8ZWwtaWNvbiBjbGFzcz1cInNpZGViYXItZ3JvdXAtYXJyb3dcIj48Y29tcG9uZW50IDppcz1cImlzQnJhbmNoT3BlbihicmFuY2guaWQpID8gQXJyb3dMZWZ0IDogQXJyb3dSaWdodFwiIC8+PC9lbC1pY29uPlxuICAgICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgICAgPGRpdiB2LXNob3c9XCJpc0JyYW5jaE9wZW4oYnJhbmNoLmlkKVwiIGNsYXNzPVwic2lkZWJhci1jaGlsZC1saXN0XCI+XG4gICAgICAgICAgICA8U2lkZWJhckl0ZW1cbiAgICAgICAgICAgICAgdi1pZj1cImJyYW5jaC5yb290XCJcbiAgICAgICAgICAgICAgOmxhYmVsPVwiYnJhbmNoLnJvb3QubmFtZVwiXG4gICAgICAgICAgICAgIDpkZXNjcmlwdGlvbj1cImAke2JyYW5jaC5yb290Lm5vZGVUeXBlfSDCtyAke2RpZmZpY3VsdHlMYWJlbChicmFuY2gucm9vdC5kaWZmaWN1bHR5KX1gXCJcbiAgICAgICAgICAgICAgOmljb249XCJUaWNrZXRzXCJcbiAgICAgICAgICAgICAgcGF0aD1cIi9rbm93bGVkZ2UtZ3JhcGhcIlxuICAgICAgICAgICAgICA6YWN0aXZlPVwiYnJhbmNoLnJvb3QuaWQgPT09IHNlbGVjdGVkTm9kZUlkXCJcbiAgICAgICAgICAgICAgOmRlcHRoPVwiMlwiXG4gICAgICAgICAgICAgIEBhY3RpdmF0ZT1cInNlbGVjdE5vZGUoYnJhbmNoLnJvb3QuaWQpXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8U2lkZWJhckl0ZW1cbiAgICAgICAgICAgICAgdi1mb3I9XCJub2RlIGluIGJyYW5jaC5ub2Rlc1wiXG4gICAgICAgICAgICAgIDprZXk9XCJub2RlLmlkXCJcbiAgICAgICAgICAgICAgOmxhYmVsPVwibm9kZS5uYW1lXCJcbiAgICAgICAgICAgICAgOmRlc2NyaXB0aW9uPVwiYCR7bm9kZS5ub2RlVHlwZX0gwrcgJHtkaWZmaWN1bHR5TGFiZWwobm9kZS5kaWZmaWN1bHR5KX1gXCJcbiAgICAgICAgICAgICAgOmljb249XCJDb2xsZWN0aW9uXCJcbiAgICAgICAgICAgICAgcGF0aD1cIi9rbm93bGVkZ2UtZ3JhcGhcIlxuICAgICAgICAgICAgICA6YWN0aXZlPVwibm9kZS5pZCA9PT0gc2VsZWN0ZWROb2RlSWRcIlxuICAgICAgICAgICAgICA6ZGVwdGg9XCIyXCJcbiAgICAgICAgICAgICAgQGFjdGl2YXRlPVwic2VsZWN0Tm9kZShub2RlLmlkKVwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L3NlY3Rpb24+XG4gICAgICA8L1NpZGViYXJHcm91cD5cbiAgICA8L2Rpdj5cbiAgPC9hc2lkZT5cbjwvdGVtcGxhdGU+XG4iXSwiZmlsZSI6IkQ6L2ZpcnN0bW9uZXkvbm9kZWxlYXJuLWFpL2Zyb250ZW5kL3NyYy9jb21wb25lbnRzL2xheW91dC9FeHBhbmRhYmxlU2lkZWJhci52dWUifQ==