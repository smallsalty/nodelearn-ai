import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/layout/SidebarItem.vue");import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "SidebarItem",
  props: {
    label: { type: String, required: true },
    description: { type: String, required: false },
    icon: { type: null, required: false },
    path: { type: String, required: false },
    active: { type: Boolean, required: false },
    collapsed: { type: Boolean, required: false },
    depth: { type: Number, required: false }
  },
  emits: ["activate"],
  setup(__props, { expose: __expose, emit: __emit }) {
    __expose();
    const emit = __emit;
    const __returned__ = { emit };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { resolveDynamicComponent as _resolveDynamicComponent, openBlock as _openBlock, createBlock as _createBlock, resolveComponent as _resolveComponent, withCtx as _withCtx, createCommentVNode as _createCommentVNode, createElementBlock as _createElementBlock, createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _hoisted_1 = {
  class: "sidebar-item-icon",
  "aria-hidden": "true"
};
const _hoisted_2 = {
  key: 1,
  class: "sidebar-item-dot"
};
const _hoisted_3 = { class: "sidebar-item-text" };
const _hoisted_4 = { key: 0 };
const _hoisted_5 = ["title"];
const _hoisted_6 = {
  class: "sidebar-item-icon",
  "aria-hidden": "true"
};
const _hoisted_7 = {
  key: 1,
  class: "sidebar-item-dot"
};
const _hoisted_8 = { class: "sidebar-item-text" };
const _hoisted_9 = { key: 0 };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_icon = _resolveComponent("el-icon");
  const _component_RouterLink = _resolveComponent("RouterLink");
  return $props.path ? (_openBlock(), _createBlock(_component_RouterLink, {
    key: 0,
    class: _normalizeClass(["sidebar-item", { active: $props.active, collapsed: $props.collapsed, nested: $props.depth }]),
    style: _normalizeStyle({ "--item-depth": $props.depth ?? 0 }),
    to: $props.path,
    title: $props.label,
    onClick: _cache[0] || (_cache[0] = ($event) => $setup.emit("activate"))
  }, {
    default: _withCtx(() => [
      _createElementVNode("span", _hoisted_1, [
        $props.icon ? (_openBlock(), _createBlock(_component_el_icon, { key: 0 }, {
          default: _withCtx(() => [
            (_openBlock(), _createBlock(_resolveDynamicComponent($props.icon)))
          ]),
          _: 1
          /* STABLE */
        })) : (_openBlock(), _createElementBlock("span", _hoisted_2))
      ]),
      _createElementVNode("span", _hoisted_3, [
        _createElementVNode(
          "strong",
          null,
          _toDisplayString($props.label),
          1
          /* TEXT */
        ),
        $props.description ? (_openBlock(), _createElementBlock(
          "small",
          _hoisted_4,
          _toDisplayString($props.description),
          1
          /* TEXT */
        )) : _createCommentVNode("v-if", true)
      ])
    ]),
    _: 1
    /* STABLE */
  }, 8, ["class", "style", "to", "title"])) : (_openBlock(), _createElementBlock("button", {
    key: 1,
    type: "button",
    class: _normalizeClass(["sidebar-item", { active: $props.active, collapsed: $props.collapsed, nested: $props.depth }]),
    style: _normalizeStyle({ "--item-depth": $props.depth ?? 0 }),
    title: $props.label,
    onClick: _cache[1] || (_cache[1] = ($event) => $setup.emit("activate"))
  }, [
    _createElementVNode("span", _hoisted_6, [
      $props.icon ? (_openBlock(), _createBlock(_component_el_icon, { key: 0 }, {
        default: _withCtx(() => [
          (_openBlock(), _createBlock(_resolveDynamicComponent($props.icon)))
        ]),
        _: 1
        /* STABLE */
      })) : (_openBlock(), _createElementBlock("span", _hoisted_7))
    ]),
    _createElementVNode("span", _hoisted_8, [
      _createElementVNode(
        "strong",
        null,
        _toDisplayString($props.label),
        1
        /* TEXT */
      ),
      $props.description ? (_openBlock(), _createElementBlock(
        "small",
        _hoisted_9,
        _toDisplayString($props.description),
        1
        /* TEXT */
      )) : _createCommentVNode("v-if", true)
    ])
  ], 14, _hoisted_5));
}
_sfc_main.__hmrId = "b309bdc6";
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
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/components/layout/SidebarItem.vue"]]);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBYUEsVUFBTSxPQUFPOzs7Ozs7OztFQWFILE9BQU07QUFBQSxFQUFvQixlQUFZOzs7O0VBRTdCLE9BQU07O3FCQUVmLE9BQU0sb0JBQW1COzs7O0VBZXpCLE9BQU07QUFBQSxFQUFvQixlQUFZOzs7O0VBRTdCLE9BQU07O3FCQUVmLE9BQU0sb0JBQW1COzs7OztTQS9CekIsNkJBRFIsYUFpQmE7QUFBQTtJQWZYLE9BQUssaUJBQUMsZ0JBQWMsVUFDVixlQUFNLFdBQUUsa0JBQVMsUUFBVSxhQUFLO0FBQUEsSUFDekMsT0FBSyxrQ0FBb0IsZ0JBQUs7QUFBQSxJQUM5QixJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxTQUFLLHNDQUFFLFlBQUk7QUFBQTtzQkFFWixNQUdPO0FBQUEsTUFIUCxvQkFHTyxRQUhQLFlBR087QUFBQSxRQUZVLDZCQUFmLGFBQXVEO0FBQUEsNEJBQWxDLE1BQXdCO0FBQUEsMkJBQXhCLGFBQXdCLHlCQUFSLFdBQUk7QUFBQTs7OzZCQUN6QyxvQkFBd0MsUUFBeEMsVUFBd0M7QUFBQTtNQUUxQyxvQkFHTyxRQUhQLFlBR087QUFBQSxRQUZMO0FBQUEsVUFBNEI7QUFBQTtBQUFBLDJCQUFqQixZQUFLO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFDSCxvQ0FBYjtBQUFBLFVBQW1EO0FBQUE7QUFBQSwyQkFBdEIsa0JBQVc7QUFBQTtBQUFBO0FBQUE7Ozs7OzZEQUk1QyxvQkFpQlM7QUFBQTtJQWZQLE1BQUs7QUFBQSxJQUNMLE9BQUssaUJBQUMsZ0JBQWMsVUFDVixlQUFNLFdBQUUsa0JBQVMsUUFBVSxhQUFLO0FBQUEsSUFDekMsT0FBSyxrQ0FBb0IsZ0JBQUs7QUFBQSxJQUM5QixPQUFPO0FBQUEsSUFDUCxTQUFLLHNDQUFFLFlBQUk7QUFBQTtJQUVaLG9CQUdPLFFBSFAsWUFHTztBQUFBLE1BRlUsNkJBQWYsYUFBdUQ7QUFBQSwwQkFBbEMsTUFBd0I7QUFBQSx5QkFBeEIsYUFBd0IseUJBQVIsV0FBSTtBQUFBOzs7MkJBQ3pDLG9CQUF3QyxRQUF4QyxVQUF3QztBQUFBO0lBRTFDLG9CQUdPLFFBSFAsWUFHTztBQUFBLE1BRkw7QUFBQSxRQUE0QjtBQUFBO0FBQUEseUJBQWpCLFlBQUs7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUNILG9DQUFiO0FBQUEsUUFBbUQ7QUFBQTtBQUFBLHlCQUF0QixrQkFBVztBQUFBO0FBQUE7QUFBQSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiU2lkZWJhckl0ZW0udnVlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQgc2V0dXAgbGFuZz1cInRzXCI+XG5pbXBvcnQgdHlwZSB7IENvbXBvbmVudCB9IGZyb20gXCJ2dWVcIjtcblxuZGVmaW5lUHJvcHM8e1xuICBsYWJlbDogc3RyaW5nO1xuICBkZXNjcmlwdGlvbj86IHN0cmluZztcbiAgaWNvbj86IENvbXBvbmVudDtcbiAgcGF0aD86IHN0cmluZztcbiAgYWN0aXZlPzogYm9vbGVhbjtcbiAgY29sbGFwc2VkPzogYm9vbGVhbjtcbiAgZGVwdGg/OiBudW1iZXI7XG59PigpO1xuXG5jb25zdCBlbWl0ID0gZGVmaW5lRW1pdHM8eyBhY3RpdmF0ZTogW10gfT4oKTtcbjwvc2NyaXB0PlxuXG48dGVtcGxhdGU+XG4gIDxSb3V0ZXJMaW5rXG4gICAgdi1pZj1cInBhdGhcIlxuICAgIGNsYXNzPVwic2lkZWJhci1pdGVtXCJcbiAgICA6Y2xhc3M9XCJ7IGFjdGl2ZSwgY29sbGFwc2VkLCBuZXN0ZWQ6IGRlcHRoIH1cIlxuICAgIDpzdHlsZT1cInsgJy0taXRlbS1kZXB0aCc6IGRlcHRoID8/IDAgfVwiXG4gICAgOnRvPVwicGF0aFwiXG4gICAgOnRpdGxlPVwibGFiZWxcIlxuICAgIEBjbGljaz1cImVtaXQoJ2FjdGl2YXRlJylcIlxuICA+XG4gICAgPHNwYW4gY2xhc3M9XCJzaWRlYmFyLWl0ZW0taWNvblwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPlxuICAgICAgPGVsLWljb24gdi1pZj1cImljb25cIj48Y29tcG9uZW50IDppcz1cImljb25cIiAvPjwvZWwtaWNvbj5cbiAgICAgIDxzcGFuIHYtZWxzZSBjbGFzcz1cInNpZGViYXItaXRlbS1kb3RcIiAvPlxuICAgIDwvc3Bhbj5cbiAgICA8c3BhbiBjbGFzcz1cInNpZGViYXItaXRlbS10ZXh0XCI+XG4gICAgICA8c3Ryb25nPnt7IGxhYmVsIH19PC9zdHJvbmc+XG4gICAgICA8c21hbGwgdi1pZj1cImRlc2NyaXB0aW9uXCI+e3sgZGVzY3JpcHRpb24gfX08L3NtYWxsPlxuICAgIDwvc3Bhbj5cbiAgPC9Sb3V0ZXJMaW5rPlxuXG4gIDxidXR0b25cbiAgICB2LWVsc2VcbiAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICBjbGFzcz1cInNpZGViYXItaXRlbVwiXG4gICAgOmNsYXNzPVwieyBhY3RpdmUsIGNvbGxhcHNlZCwgbmVzdGVkOiBkZXB0aCB9XCJcbiAgICA6c3R5bGU9XCJ7ICctLWl0ZW0tZGVwdGgnOiBkZXB0aCA/PyAwIH1cIlxuICAgIDp0aXRsZT1cImxhYmVsXCJcbiAgICBAY2xpY2s9XCJlbWl0KCdhY3RpdmF0ZScpXCJcbiAgPlxuICAgIDxzcGFuIGNsYXNzPVwic2lkZWJhci1pdGVtLWljb25cIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICAgIDxlbC1pY29uIHYtaWY9XCJpY29uXCI+PGNvbXBvbmVudCA6aXM9XCJpY29uXCIgLz48L2VsLWljb24+XG4gICAgICA8c3BhbiB2LWVsc2UgY2xhc3M9XCJzaWRlYmFyLWl0ZW0tZG90XCIgLz5cbiAgICA8L3NwYW4+XG4gICAgPHNwYW4gY2xhc3M9XCJzaWRlYmFyLWl0ZW0tdGV4dFwiPlxuICAgICAgPHN0cm9uZz57eyBsYWJlbCB9fTwvc3Ryb25nPlxuICAgICAgPHNtYWxsIHYtaWY9XCJkZXNjcmlwdGlvblwiPnt7IGRlc2NyaXB0aW9uIH19PC9zbWFsbD5cbiAgICA8L3NwYW4+XG4gIDwvYnV0dG9uPlxuPC90ZW1wbGF0ZT5cbiJdLCJmaWxlIjoiRDovZmlyc3Rtb25leS9ub2RlbGVhcm4tYWkvZnJvbnRlbmQvc3JjL2NvbXBvbmVudHMvbGF5b3V0L1NpZGViYXJJdGVtLnZ1ZSJ9