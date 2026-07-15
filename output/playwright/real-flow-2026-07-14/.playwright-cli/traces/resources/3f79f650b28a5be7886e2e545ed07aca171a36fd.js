import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/layout/SidebarGroup.vue");import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { onBeforeUnmount, ref, watch } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { ArrowDown, ArrowRight } from "/node_modules/.vite/deps/@element-plus_icons-vue.js?v=dfeb8a9b";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "SidebarGroup",
  props: {
    title: { type: String, required: true },
    icon: { type: null, required: false },
    count: { type: Number, required: false, default: void 0 },
    collapsed: { type: Boolean, required: false, default: false },
    defaultOpen: { type: Boolean, required: false, default: true },
    active: { type: Boolean, required: false, default: false },
    hasActiveChild: { type: Boolean, required: false, default: false },
    popoverWidth: { type: Number, required: false, default: 300 }
  },
  setup(__props, { expose: __expose }) {
    __expose();
    const props = __props;
    const open = ref(props.defaultOpen);
    const popoverVisible = ref(false);
    let hideTimer = null;
    watch(
      () => props.collapsed,
      (collapsed) => {
        if (!collapsed && props.defaultOpen) open.value = true;
        if (!collapsed) popoverVisible.value = false;
      }
    );
    function clearHideTimer() {
      if (!hideTimer) return;
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    function showPopover() {
      if (!props.collapsed) return;
      clearHideTimer();
      popoverVisible.value = true;
    }
    function scheduleHide(delay = 160) {
      clearHideTimer();
      hideTimer = setTimeout(() => {
        popoverVisible.value = false;
      }, delay);
    }
    function handleTriggerClick() {
      if (props.collapsed) {
        showPopover();
        return;
      }
      open.value = !open.value;
    }
    onBeforeUnmount(clearHideTimer);
    const __returned__ = { props, open, popoverVisible, get hideTimer() {
      return hideTimer;
    }, set hideTimer(v) {
      hideTimer = v;
    }, clearHideTimer, showPopover, scheduleHide, handleTriggerClick, get ArrowDown() {
      return ArrowDown;
    }, get ArrowRight() {
      return ArrowRight;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { resolveDynamicComponent as _resolveDynamicComponent, openBlock as _openBlock, createBlock as _createBlock, resolveComponent as _resolveComponent, withCtx as _withCtx, createCommentVNode as _createCommentVNode, createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, createElementBlock as _createElementBlock, createVNode as _createVNode, renderSlot as _renderSlot, vShow as _vShow, withDirectives as _withDirectives, Fragment as _Fragment, normalizeClass as _normalizeClass } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _hoisted_1 = ["aria-expanded", "title"];
const _hoisted_2 = {
  class: "sidebar-group-icon",
  "aria-hidden": "true"
};
const _hoisted_3 = { class: "sidebar-group-title" };
const _hoisted_4 = {
  key: 0,
  class: "sidebar-group-count"
};
const _hoisted_5 = { class: "sidebar-popover-header" };
const _hoisted_6 = {
  class: "sidebar-group-icon",
  "aria-hidden": "true"
};
const _hoisted_7 = { key: 0 };
const _hoisted_8 = { class: "sidebar-popover-body" };
const _hoisted_9 = ["aria-expanded", "title"];
const _hoisted_10 = {
  class: "sidebar-group-icon",
  "aria-hidden": "true"
};
const _hoisted_11 = { class: "sidebar-group-title" };
const _hoisted_12 = {
  key: 0,
  class: "sidebar-group-count"
};
const _hoisted_13 = { class: "sidebar-group-body" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_icon = _resolveComponent("el-icon");
  const _component_el_popover = _resolveComponent("el-popover");
  return _openBlock(), _createElementBlock(
    "section",
    {
      class: _normalizeClass(["sidebar-group", { collapsed: $props.collapsed, active: $props.active, "has-active-child": $props.hasActiveChild }])
    },
    [
      $props.collapsed ? (_openBlock(), _createBlock(_component_el_popover, {
        key: 0,
        visible: $setup.popoverVisible,
        "onUpdate:visible": _cache[5] || (_cache[5] = ($event) => $setup.popoverVisible = $event),
        placement: "right-start",
        width: $props.popoverWidth,
        "show-arrow": false,
        teleported: true,
        "popper-class": "sidebar-collapsed-popover"
      }, {
        reference: _withCtx(() => [
          _createElementVNode("button", {
            type: "button",
            class: "sidebar-group-trigger",
            "aria-expanded": $setup.popoverVisible,
            title: $props.title,
            onClick: $setup.handleTriggerClick,
            onMouseenter: $setup.showPopover,
            onMouseleave: _cache[0] || (_cache[0] = ($event) => $setup.scheduleHide()),
            onFocusin: $setup.showPopover,
            onFocusout: _cache[1] || (_cache[1] = ($event) => $setup.scheduleHide())
          }, [
            _createElementVNode("span", _hoisted_2, [
              $props.icon ? (_openBlock(), _createBlock(_component_el_icon, { key: 0 }, {
                default: _withCtx(() => [
                  (_openBlock(), _createBlock(_resolveDynamicComponent($props.icon)))
                ]),
                _: 1
                /* STABLE */
              })) : _createCommentVNode("v-if", true)
            ]),
            _createElementVNode(
              "span",
              _hoisted_3,
              _toDisplayString($props.title),
              1
              /* TEXT */
            ),
            typeof $props.count === "number" ? (_openBlock(), _createElementBlock(
              "span",
              _hoisted_4,
              _toDisplayString($props.count),
              1
              /* TEXT */
            )) : _createCommentVNode("v-if", true),
            _createVNode(_component_el_icon, {
              class: "sidebar-group-arrow",
              "aria-hidden": "true"
            }, {
              default: _withCtx(() => [
                (_openBlock(), _createBlock(_resolveDynamicComponent($setup.ArrowRight)))
              ]),
              _: 1
              /* STABLE */
            })
          ], 40, _hoisted_1)
        ]),
        default: _withCtx(() => [
          _createElementVNode(
            "section",
            {
              class: "sidebar-popover-panel",
              onMouseenter: $setup.showPopover,
              onMouseleave: _cache[2] || (_cache[2] = ($event) => $setup.scheduleHide()),
              onFocusin: $setup.showPopover,
              onFocusout: _cache[3] || (_cache[3] = ($event) => $setup.scheduleHide()),
              onClick: _cache[4] || (_cache[4] = ($event) => $setup.scheduleHide(120))
            },
            [
              _createElementVNode("header", _hoisted_5, [
                _createElementVNode("span", _hoisted_6, [
                  $props.icon ? (_openBlock(), _createBlock(_component_el_icon, { key: 0 }, {
                    default: _withCtx(() => [
                      (_openBlock(), _createBlock(_resolveDynamicComponent($props.icon)))
                    ]),
                    _: 1
                    /* STABLE */
                  })) : _createCommentVNode("v-if", true)
                ]),
                _createElementVNode(
                  "strong",
                  null,
                  _toDisplayString($props.title),
                  1
                  /* TEXT */
                ),
                typeof $props.count === "number" ? (_openBlock(), _createElementBlock(
                  "small",
                  _hoisted_7,
                  _toDisplayString($props.count),
                  1
                  /* TEXT */
                )) : _createCommentVNode("v-if", true)
              ]),
              _createElementVNode("div", _hoisted_8, [
                _renderSlot(_ctx.$slots, "default")
              ])
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        _: 3
        /* FORWARDED */
      }, 8, ["visible", "width"])) : (_openBlock(), _createElementBlock(
        _Fragment,
        { key: 1 },
        [
          _createElementVNode("button", {
            type: "button",
            class: "sidebar-group-trigger",
            "aria-expanded": $setup.open,
            title: $props.title,
            onClick: $setup.handleTriggerClick
          }, [
            _createElementVNode("span", _hoisted_10, [
              $props.icon ? (_openBlock(), _createBlock(_component_el_icon, { key: 0 }, {
                default: _withCtx(() => [
                  (_openBlock(), _createBlock(_resolveDynamicComponent($props.icon)))
                ]),
                _: 1
                /* STABLE */
              })) : _createCommentVNode("v-if", true)
            ]),
            _createElementVNode(
              "span",
              _hoisted_11,
              _toDisplayString($props.title),
              1
              /* TEXT */
            ),
            typeof $props.count === "number" ? (_openBlock(), _createElementBlock(
              "span",
              _hoisted_12,
              _toDisplayString($props.count),
              1
              /* TEXT */
            )) : _createCommentVNode("v-if", true),
            _createVNode(_component_el_icon, {
              class: "sidebar-group-arrow",
              "aria-hidden": "true"
            }, {
              default: _withCtx(() => [
                (_openBlock(), _createBlock(_resolveDynamicComponent($setup.open ? $setup.ArrowDown : $setup.ArrowRight)))
              ]),
              _: 1
              /* STABLE */
            })
          ], 8, _hoisted_9),
          _withDirectives(_createElementVNode(
            "div",
            _hoisted_13,
            [
              _renderSlot(_ctx.$slots, "default")
            ],
            512
            /* NEED_PATCH */
          ), [
            [_vShow, $setup.open]
          ])
        ],
        64
        /* STABLE_FRAGMENT */
      ))
    ],
    2
    /* CLASS */
  );
}
_sfc_main.__hmrId = "c9173bbd";
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
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/components/layout/SidebarGroup.vue"]]);

//# sourceMappingURL=data:application/json;base64,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QUFBLFlBRU07QUFBQSxjQURKLFlBQVE7QUFBQTs7OztxQkFERyxXQUFJO0FBQUEiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlNpZGViYXJHcm91cC52dWUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdCBzZXR1cCBsYW5nPVwidHNcIj5cbmltcG9ydCB7IG9uQmVmb3JlVW5tb3VudCwgcmVmLCB3YXRjaCB9IGZyb20gXCJ2dWVcIjtcbmltcG9ydCB7IEFycm93RG93biwgQXJyb3dSaWdodCB9IGZyb20gXCJAZWxlbWVudC1wbHVzL2ljb25zLXZ1ZVwiO1xuaW1wb3J0IHR5cGUgeyBDb21wb25lbnQgfSBmcm9tIFwidnVlXCI7XG5cbmNvbnN0IHByb3BzID0gd2l0aERlZmF1bHRzKFxuICBkZWZpbmVQcm9wczx7XG4gICAgdGl0bGU6IHN0cmluZztcbiAgICBpY29uPzogQ29tcG9uZW50O1xuICAgIGNvdW50PzogbnVtYmVyO1xuICAgIGNvbGxhcHNlZD86IGJvb2xlYW47XG4gICAgZGVmYXVsdE9wZW4/OiBib29sZWFuO1xuICAgIGFjdGl2ZT86IGJvb2xlYW47XG4gICAgaGFzQWN0aXZlQ2hpbGQ/OiBib29sZWFuO1xuICAgIHBvcG92ZXJXaWR0aD86IG51bWJlcjtcbiAgfT4oKSxcbiAge1xuICAgIGNvdW50OiB1bmRlZmluZWQsXG4gICAgY29sbGFwc2VkOiBmYWxzZSxcbiAgICBkZWZhdWx0T3BlbjogdHJ1ZSxcbiAgICBhY3RpdmU6IGZhbHNlLFxuICAgIGhhc0FjdGl2ZUNoaWxkOiBmYWxzZSxcbiAgICBwb3BvdmVyV2lkdGg6IDMwMFxuICB9XG4pO1xuXG5jb25zdCBvcGVuID0gcmVmKHByb3BzLmRlZmF1bHRPcGVuKTtcbmNvbnN0IHBvcG92ZXJWaXNpYmxlID0gcmVmKGZhbHNlKTtcbmxldCBoaWRlVGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgbnVsbCA9IG51bGw7XG5cbndhdGNoKFxuICAoKSA9PiBwcm9wcy5jb2xsYXBzZWQsXG4gIChjb2xsYXBzZWQpID0+IHtcbiAgICBpZiAoIWNvbGxhcHNlZCAmJiBwcm9wcy5kZWZhdWx0T3Blbikgb3Blbi52YWx1ZSA9IHRydWU7XG4gICAgaWYgKCFjb2xsYXBzZWQpIHBvcG92ZXJWaXNpYmxlLnZhbHVlID0gZmFsc2U7XG4gIH1cbik7XG5cbmZ1bmN0aW9uIGNsZWFySGlkZVRpbWVyKCkge1xuICBpZiAoIWhpZGVUaW1lcikgcmV0dXJuO1xuICBjbGVhclRpbWVvdXQoaGlkZVRpbWVyKTtcbiAgaGlkZVRpbWVyID0gbnVsbDtcbn1cblxuZnVuY3Rpb24gc2hvd1BvcG92ZXIoKSB7XG4gIGlmICghcHJvcHMuY29sbGFwc2VkKSByZXR1cm47XG4gIGNsZWFySGlkZVRpbWVyKCk7XG4gIHBvcG92ZXJWaXNpYmxlLnZhbHVlID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gc2NoZWR1bGVIaWRlKGRlbGF5ID0gMTYwKSB7XG4gIGNsZWFySGlkZVRpbWVyKCk7XG4gIGhpZGVUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIHBvcG92ZXJWaXNpYmxlLnZhbHVlID0gZmFsc2U7XG4gIH0sIGRlbGF5KTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlVHJpZ2dlckNsaWNrKCkge1xuICBpZiAocHJvcHMuY29sbGFwc2VkKSB7XG4gICAgc2hvd1BvcG92ZXIoKTtcbiAgICByZXR1cm47XG4gIH1cbiAgb3Blbi52YWx1ZSA9ICFvcGVuLnZhbHVlO1xufVxuXG5vbkJlZm9yZVVubW91bnQoY2xlYXJIaWRlVGltZXIpO1xuPC9zY3JpcHQ+XG5cbjx0ZW1wbGF0ZT5cbiAgPHNlY3Rpb24gY2xhc3M9XCJzaWRlYmFyLWdyb3VwXCIgOmNsYXNzPVwieyBjb2xsYXBzZWQsIGFjdGl2ZSwgJ2hhcy1hY3RpdmUtY2hpbGQnOiBoYXNBY3RpdmVDaGlsZCB9XCI+XG4gICAgPGVsLXBvcG92ZXJcbiAgICAgIHYtaWY9XCJjb2xsYXBzZWRcIlxuICAgICAgdi1tb2RlbDp2aXNpYmxlPVwicG9wb3ZlclZpc2libGVcIlxuICAgICAgcGxhY2VtZW50PVwicmlnaHQtc3RhcnRcIlxuICAgICAgOndpZHRoPVwicG9wb3ZlcldpZHRoXCJcbiAgICAgIDpzaG93LWFycm93PVwiZmFsc2VcIlxuICAgICAgOnRlbGVwb3J0ZWQ9XCJ0cnVlXCJcbiAgICAgIHBvcHBlci1jbGFzcz1cInNpZGViYXItY29sbGFwc2VkLXBvcG92ZXJcIlxuICAgID5cbiAgICAgIDx0ZW1wbGF0ZSAjcmVmZXJlbmNlPlxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgY2xhc3M9XCJzaWRlYmFyLWdyb3VwLXRyaWdnZXJcIlxuICAgICAgICAgIDphcmlhLWV4cGFuZGVkPVwicG9wb3ZlclZpc2libGVcIlxuICAgICAgICAgIDp0aXRsZT1cInRpdGxlXCJcbiAgICAgICAgICBAY2xpY2s9XCJoYW5kbGVUcmlnZ2VyQ2xpY2tcIlxuICAgICAgICAgIEBtb3VzZWVudGVyPVwic2hvd1BvcG92ZXJcIlxuICAgICAgICAgIEBtb3VzZWxlYXZlPVwic2NoZWR1bGVIaWRlKClcIlxuICAgICAgICAgIEBmb2N1c2luPVwic2hvd1BvcG92ZXJcIlxuICAgICAgICAgIEBmb2N1c291dD1cInNjaGVkdWxlSGlkZSgpXCJcbiAgICAgICAgPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwic2lkZWJhci1ncm91cC1pY29uXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XG4gICAgICAgICAgICA8ZWwtaWNvbiB2LWlmPVwiaWNvblwiPjxjb21wb25lbnQgOmlzPVwiaWNvblwiIC8+PC9lbC1pY29uPlxuICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInNpZGViYXItZ3JvdXAtdGl0bGVcIj57eyB0aXRsZSB9fTwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiB2LWlmPVwidHlwZW9mIGNvdW50ID09PSAnbnVtYmVyJ1wiIGNsYXNzPVwic2lkZWJhci1ncm91cC1jb3VudFwiPnt7IGNvdW50IH19PC9zcGFuPlxuICAgICAgICAgIDxlbC1pY29uIGNsYXNzPVwic2lkZWJhci1ncm91cC1hcnJvd1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPlxuICAgICAgICAgICAgPGNvbXBvbmVudCA6aXM9XCJBcnJvd1JpZ2h0XCIgLz5cbiAgICAgICAgICA8L2VsLWljb24+XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC90ZW1wbGF0ZT5cbiAgICAgIDxzZWN0aW9uXG4gICAgICAgIGNsYXNzPVwic2lkZWJhci1wb3BvdmVyLXBhbmVsXCJcbiAgICAgICAgQG1vdXNlZW50ZXI9XCJzaG93UG9wb3ZlclwiXG4gICAgICAgIEBtb3VzZWxlYXZlPVwic2NoZWR1bGVIaWRlKClcIlxuICAgICAgICBAZm9jdXNpbj1cInNob3dQb3BvdmVyXCJcbiAgICAgICAgQGZvY3Vzb3V0PVwic2NoZWR1bGVIaWRlKClcIlxuICAgICAgICBAY2xpY2s9XCJzY2hlZHVsZUhpZGUoMTIwKVwiXG4gICAgICA+XG4gICAgICAgIDxoZWFkZXIgY2xhc3M9XCJzaWRlYmFyLXBvcG92ZXItaGVhZGVyXCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJzaWRlYmFyLWdyb3VwLWljb25cIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICAgICAgICAgIDxlbC1pY29uIHYtaWY9XCJpY29uXCI+PGNvbXBvbmVudCA6aXM9XCJpY29uXCIgLz48L2VsLWljb24+XG4gICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgIDxzdHJvbmc+e3sgdGl0bGUgfX08L3N0cm9uZz5cbiAgICAgICAgICA8c21hbGwgdi1pZj1cInR5cGVvZiBjb3VudCA9PT0gJ251bWJlcidcIj57eyBjb3VudCB9fTwvc21hbGw+XG4gICAgICAgIDwvaGVhZGVyPlxuICAgICAgICA8ZGl2IGNsYXNzPVwic2lkZWJhci1wb3BvdmVyLWJvZHlcIj5cbiAgICAgICAgICA8c2xvdCAvPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2VsLXBvcG92ZXI+XG5cbiAgICA8dGVtcGxhdGUgdi1lbHNlPlxuICAgICAgPGJ1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgY2xhc3M9XCJzaWRlYmFyLWdyb3VwLXRyaWdnZXJcIlxuICAgICAgICA6YXJpYS1leHBhbmRlZD1cIm9wZW5cIlxuICAgICAgICA6dGl0bGU9XCJ0aXRsZVwiXG4gICAgICAgIEBjbGljaz1cImhhbmRsZVRyaWdnZXJDbGlja1wiXG4gICAgICA+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwic2lkZWJhci1ncm91cC1pY29uXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XG4gICAgICAgICAgPGVsLWljb24gdi1pZj1cImljb25cIj48Y29tcG9uZW50IDppcz1cImljb25cIiAvPjwvZWwtaWNvbj5cbiAgICAgICAgPC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInNpZGViYXItZ3JvdXAtdGl0bGVcIj57eyB0aXRsZSB9fTwvc3Bhbj5cbiAgICAgICAgPHNwYW4gdi1pZj1cInR5cGVvZiBjb3VudCA9PT0gJ251bWJlcidcIiBjbGFzcz1cInNpZGViYXItZ3JvdXAtY291bnRcIj57eyBjb3VudCB9fTwvc3Bhbj5cbiAgICAgICAgPGVsLWljb24gY2xhc3M9XCJzaWRlYmFyLWdyb3VwLWFycm93XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XG4gICAgICAgICAgPGNvbXBvbmVudCA6aXM9XCJvcGVuID8gQXJyb3dEb3duIDogQXJyb3dSaWdodFwiIC8+XG4gICAgICAgIDwvZWwtaWNvbj5cbiAgICAgIDwvYnV0dG9uPlxuICAgICAgPGRpdiB2LXNob3c9XCJvcGVuXCIgY2xhc3M9XCJzaWRlYmFyLWdyb3VwLWJvZHlcIj5cbiAgICAgICAgPHNsb3QgLz5cbiAgICAgIDwvZGl2PlxuICAgIDwvdGVtcGxhdGU+XG4gIDwvc2VjdGlvbj5cbjwvdGVtcGxhdGU+XG4iXSwiZmlsZSI6IkQ6L2ZpcnN0bW9uZXkvbm9kZWxlYXJuLWFpL2Zyb250ZW5kL3NyYy9jb21wb25lbnRzL2xheW91dC9TaWRlYmFyR3JvdXAudnVlIn0=