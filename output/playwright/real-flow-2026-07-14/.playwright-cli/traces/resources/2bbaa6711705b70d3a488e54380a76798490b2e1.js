import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/mind-map/MindMapNode.vue");import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { computed } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { ArrowRight, Connection, Cpu, Grid, Operation, Share, Tickets } from "/node_modules/.vite/deps/@element-plus_icons-vue.js?v=dfeb8a9b";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  ...{ name: "MindMapNode" },
  __name: "MindMapNode",
  props: {
    node: { type: Object, required: true },
    level: { type: Number, required: true },
    side: { type: String, required: true },
    expandedIds: { type: Set, required: true },
    selectedId: { type: [String, null], required: false },
    matchedIds: { type: Set, required: true }
  },
  emits: ["select", "toggle"],
  setup(__props, { expose: __expose, emit: __emit }) {
    __expose();
    const props = __props;
    const emit = __emit;
    const hasChildren = computed(() => props.node.children.length > 0);
    const isExpanded = computed(() => props.expandedIds.has(props.node.id));
    const iconByType = {
      definition: Tickets,
      structure: Grid,
      principle: Cpu,
      classification: Share,
      operation: Operation,
      algorithm: Operation,
      complexity: Connection,
      relation: Share,
      application: ArrowRight
    };
    function handleClick() {
      emit("select", props.node);
      if (hasChildren.value) {
        emit("toggle", props.node);
      }
    }
    const __returned__ = { props, emit, hasChildren, isExpanded, iconByType, handleClick, get ArrowRight() {
      return ArrowRight;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { resolveDynamicComponent as _resolveDynamicComponent, openBlock as _openBlock, createBlock as _createBlock, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, normalizeClass as _normalizeClass, renderList as _renderList, Fragment as _Fragment } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _hoisted_1 = ["aria-expanded"];
const _hoisted_2 = { class: "node-copy" };
const _hoisted_3 = { key: 0 };
const _hoisted_4 = {
  key: 0,
  class: "mind-node-children"
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_icon = _resolveComponent("el-icon");
  const _component_MindMapNode = _resolveComponent("MindMapNode", true);
  return _openBlock(), _createElementBlock(
    "li",
    {
      class: _normalizeClass(["mind-node-item", [`level-${$props.level}`, $props.side]])
    },
    [
      _createElementVNode("button", {
        type: "button",
        class: _normalizeClass(["mind-node", {
          selected: $props.selectedId === $props.node.id,
          matched: $props.matchedIds.has($props.node.id),
          expandable: $setup.hasChildren,
          expanded: $setup.isExpanded
        }]),
        "aria-expanded": $setup.hasChildren ? $setup.isExpanded : void 0,
        onClick: $setup.handleClick
      }, [
        _createVNode(_component_el_icon, { class: "node-icon" }, {
          default: _withCtx(() => [
            (_openBlock(), _createBlock(_resolveDynamicComponent($setup.iconByType[$props.node.branchType])))
          ]),
          _: 1
          /* STABLE */
        }),
        _createElementVNode("span", _hoisted_2, [
          _createElementVNode(
            "strong",
            null,
            _toDisplayString($props.node.title),
            1
            /* TEXT */
          ),
          $props.node.knowledgePoint && $props.node.knowledgePoint !== $props.node.title ? (_openBlock(), _createElementBlock(
            "small",
            _hoisted_3,
            _toDisplayString($props.node.knowledgePoint),
            1
            /* TEXT */
          )) : _createCommentVNode("v-if", true)
        ]),
        $setup.hasChildren ? (_openBlock(), _createBlock(_component_el_icon, {
          key: 0,
          class: "expand-icon"
        }, {
          default: _withCtx(() => [
            _createVNode($setup["ArrowRight"])
          ]),
          _: 1
          /* STABLE */
        })) : _createCommentVNode("v-if", true)
      ], 10, _hoisted_1),
      $setup.hasChildren && $setup.isExpanded ? (_openBlock(), _createElementBlock("ul", _hoisted_4, [
        (_openBlock(true), _createElementBlock(
          _Fragment,
          null,
          _renderList($props.node.children, (child) => {
            return _openBlock(), _createBlock(_component_MindMapNode, {
              key: child.id,
              node: child,
              level: $props.level + 1,
              side: $props.side,
              "expanded-ids": $props.expandedIds,
              "selected-id": $props.selectedId,
              "matched-ids": $props.matchedIds,
              onSelect: _cache[0] || (_cache[0] = ($event) => $setup.emit("select", $event)),
              onToggle: _cache[1] || (_cache[1] = ($event) => $setup.emit("toggle", $event))
            }, null, 8, ["node", "level", "side", "expanded-ids", "selected-id", "matched-ids"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])) : _createCommentVNode("v-if", true)
    ],
    2
    /* CLASS */
  );
}
import "/src/components/mind-map/MindMapNode.vue?vue&type=style&index=0&scoped=e82a9bc8&lang.css";
_sfc_main.__hmrId = "e82a9bc8";
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
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-e82a9bc8"], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/components/mind-map/MindMapNode.vue"]]);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IjtBQUNBLFNBQVMsZ0JBQWdCO0FBQ3pCLFNBQVMsWUFBWSxZQUFZLEtBQUssTUFBTSxXQUFXLE9BQU8sZUFBZTs7Ozs7Ozs7Ozs7Ozs7O0FBSzdFLFVBQU0sUUFBUTtBQVNkLFVBQU0sT0FBTztBQUtiLFVBQU0sY0FBYyxTQUFTLE1BQU0sTUFBTSxLQUFLLFNBQVMsU0FBUyxDQUFDO0FBQ2pFLFVBQU0sYUFBYSxTQUFTLE1BQU0sTUFBTSxZQUFZLElBQUksTUFBTSxLQUFLLEVBQUUsQ0FBQztBQUN0RSxVQUFNLGFBQWlEO0FBQUEsTUFDckQsWUFBWTtBQUFBLE1BQ1osV0FBVztBQUFBLE1BQ1gsV0FBVztBQUFBLE1BQ1gsZ0JBQWdCO0FBQUEsTUFDaEIsV0FBVztBQUFBLE1BQ1gsV0FBVztBQUFBLE1BQ1gsWUFBWTtBQUFBLE1BQ1osVUFBVTtBQUFBLE1BQ1YsYUFBYTtBQUFBLElBQ2Y7QUFFQSxhQUFTLGNBQWM7QUFDckIsV0FBSyxVQUFVLE1BQU0sSUFBSTtBQUN6QixVQUFJLFlBQVksT0FBTztBQUNyQixhQUFLLFVBQVUsTUFBTSxJQUFJO0FBQUEsTUFDM0I7QUFBQSxJQUNGOzs7Ozs7Ozs7O3FCQW9CWSxPQUFNLFlBQVc7Ozs7RUFTWSxPQUFNOzs7Ozt1QkF6QjdDO0FBQUEsSUF1Q0s7QUFBQTtBQUFBLE1BdkNELE9BQUssaUJBQUMsa0JBQWdCLFVBQW1CLFlBQUssSUFBSSxXQUFJO0FBQUE7O01BQ3hELG9CQXNCUztBQUFBLFFBckJQLE1BQUs7QUFBQSxRQUNMLE9BQUssaUJBQUMsYUFBVztBQUFBLG9CQUNXLHNCQUFlLFlBQUs7QUFBQSxtQkFBcUIsa0JBQVcsSUFBSSxZQUFLLEVBQUU7QUFBQSxzQkFBdUI7QUFBQSxvQkFBK0I7QUFBQTtRQU1oSixpQkFBZSxxQkFBYyxvQkFBYTtBQUFBLFFBQzFDLFNBQU87QUFBQTtRQUVSLGFBRVUsc0JBRkQsT0FBTSxZQUFXO0FBQUEsNEJBQ3hCLE1BQStDO0FBQUEsMkJBQS9DLGFBQStDLHlCQUEvQixrQkFBVyxZQUFLLFVBQVU7QUFBQTs7OztRQUU1QyxvQkFHTyxRQUhQLFlBR087QUFBQSxVQUZMO0FBQUEsWUFBaUM7QUFBQTtBQUFBLDZCQUF0QixZQUFLLEtBQUs7QUFBQTtBQUFBO0FBQUE7QUFBQSxVQUNSLFlBQUssa0JBQWtCLFlBQUssbUJBQW1CLFlBQUssdUJBQWpFO0FBQUEsWUFBeUc7QUFBQTtBQUFBLDZCQUE5QixZQUFLLGNBQWM7QUFBQTtBQUFBO0FBQUE7O1FBRWpGLG9DQUFmLGFBRVU7QUFBQTtVQUZrQixPQUFNO0FBQUE7NEJBQ2hDLE1BQWM7QUFBQSxZQUFkLGFBQWM7QUFBQTs7Ozs7TUFJUixzQkFBZSxtQ0FBekIsb0JBYUssTUFiTCxZQWFLO0FBQUEsMkJBWkg7QUFBQSxVQVdFO0FBQUE7QUFBQSxzQkFWZ0IsWUFBSyxVQUFRLENBQXRCLFVBQUs7aUNBRGQsYUFXRTtBQUFBLGNBVEMsS0FBSyxNQUFNO0FBQUEsY0FDWCxNQUFNO0FBQUEsY0FDTixPQUFPLGVBQUs7QUFBQSxjQUNaLE1BQU07QUFBQSxjQUNOLGdCQUFjO0FBQUEsY0FDZCxlQUFhO0FBQUEsY0FDYixlQUFhO0FBQUEsY0FDYixVQUFNLHNDQUFFLFlBQUksVUFBVyxNQUFNO0FBQUEsY0FDN0IsVUFBTSxzQ0FBRSxZQUFJLFVBQVcsTUFBTTtBQUFBIiwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJNaW5kTWFwTm9kZS52dWUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdCBzZXR1cCBsYW5nPVwidHNcIj5cbmltcG9ydCB7IGNvbXB1dGVkIH0gZnJvbSBcInZ1ZVwiO1xuaW1wb3J0IHsgQXJyb3dSaWdodCwgQ29ubmVjdGlvbiwgQ3B1LCBHcmlkLCBPcGVyYXRpb24sIFNoYXJlLCBUaWNrZXRzIH0gZnJvbSBcIkBlbGVtZW50LXBsdXMvaWNvbnMtdnVlXCI7XG5pbXBvcnQgdHlwZSB7IEtub3dsZWRnZU1pbmRNYXBOb2RlLCBNaW5kTWFwQnJhbmNoVHlwZSB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmRlZmluZU9wdGlvbnMoeyBuYW1lOiBcIk1pbmRNYXBOb2RlXCIgfSk7XG5cbmNvbnN0IHByb3BzID0gZGVmaW5lUHJvcHM8e1xuICBub2RlOiBLbm93bGVkZ2VNaW5kTWFwTm9kZTtcbiAgbGV2ZWw6IG51bWJlcjtcbiAgc2lkZTogXCJsZWZ0XCIgfCBcInJpZ2h0XCI7XG4gIGV4cGFuZGVkSWRzOiBTZXQ8c3RyaW5nPjtcbiAgc2VsZWN0ZWRJZD86IHN0cmluZyB8IG51bGw7XG4gIG1hdGNoZWRJZHM6IFNldDxzdHJpbmc+O1xufT4oKTtcblxuY29uc3QgZW1pdCA9IGRlZmluZUVtaXRzPHtcbiAgc2VsZWN0OiBbbm9kZTogS25vd2xlZGdlTWluZE1hcE5vZGVdO1xuICB0b2dnbGU6IFtub2RlOiBLbm93bGVkZ2VNaW5kTWFwTm9kZV07XG59PigpO1xuXG5jb25zdCBoYXNDaGlsZHJlbiA9IGNvbXB1dGVkKCgpID0+IHByb3BzLm5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCk7XG5jb25zdCBpc0V4cGFuZGVkID0gY29tcHV0ZWQoKCkgPT4gcHJvcHMuZXhwYW5kZWRJZHMuaGFzKHByb3BzLm5vZGUuaWQpKTtcbmNvbnN0IGljb25CeVR5cGU6IFJlY29yZDxNaW5kTWFwQnJhbmNoVHlwZSwgdW5rbm93bj4gPSB7XG4gIGRlZmluaXRpb246IFRpY2tldHMsXG4gIHN0cnVjdHVyZTogR3JpZCxcbiAgcHJpbmNpcGxlOiBDcHUsXG4gIGNsYXNzaWZpY2F0aW9uOiBTaGFyZSxcbiAgb3BlcmF0aW9uOiBPcGVyYXRpb24sXG4gIGFsZ29yaXRobTogT3BlcmF0aW9uLFxuICBjb21wbGV4aXR5OiBDb25uZWN0aW9uLFxuICByZWxhdGlvbjogU2hhcmUsXG4gIGFwcGxpY2F0aW9uOiBBcnJvd1JpZ2h0XG59O1xuXG5mdW5jdGlvbiBoYW5kbGVDbGljaygpIHtcbiAgZW1pdChcInNlbGVjdFwiLCBwcm9wcy5ub2RlKTtcbiAgaWYgKGhhc0NoaWxkcmVuLnZhbHVlKSB7XG4gICAgZW1pdChcInRvZ2dsZVwiLCBwcm9wcy5ub2RlKTtcbiAgfVxufVxuPC9zY3JpcHQ+XG5cbjx0ZW1wbGF0ZT5cbiAgPGxpIGNsYXNzPVwibWluZC1ub2RlLWl0ZW1cIiA6Y2xhc3M9XCJbYGxldmVsLSR7bGV2ZWx9YCwgc2lkZV1cIj5cbiAgICA8YnV0dG9uXG4gICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgIGNsYXNzPVwibWluZC1ub2RlXCJcbiAgICAgIDpjbGFzcz1cIntcbiAgICAgICAgc2VsZWN0ZWQ6IHNlbGVjdGVkSWQgPT09IG5vZGUuaWQsXG4gICAgICAgIG1hdGNoZWQ6IG1hdGNoZWRJZHMuaGFzKG5vZGUuaWQpLFxuICAgICAgICBleHBhbmRhYmxlOiBoYXNDaGlsZHJlbixcbiAgICAgICAgZXhwYW5kZWQ6IGlzRXhwYW5kZWRcbiAgICAgIH1cIlxuICAgICAgOmFyaWEtZXhwYW5kZWQ9XCJoYXNDaGlsZHJlbiA/IGlzRXhwYW5kZWQgOiB1bmRlZmluZWRcIlxuICAgICAgQGNsaWNrPVwiaGFuZGxlQ2xpY2tcIlxuICAgID5cbiAgICAgIDxlbC1pY29uIGNsYXNzPVwibm9kZS1pY29uXCI+XG4gICAgICAgIDxjb21wb25lbnQgOmlzPVwiaWNvbkJ5VHlwZVtub2RlLmJyYW5jaFR5cGVdXCIgLz5cbiAgICAgIDwvZWwtaWNvbj5cbiAgICAgIDxzcGFuIGNsYXNzPVwibm9kZS1jb3B5XCI+XG4gICAgICAgIDxzdHJvbmc+e3sgbm9kZS50aXRsZSB9fTwvc3Ryb25nPlxuICAgICAgICA8c21hbGwgdi1pZj1cIm5vZGUua25vd2xlZGdlUG9pbnQgJiYgbm9kZS5rbm93bGVkZ2VQb2ludCAhPT0gbm9kZS50aXRsZVwiPnt7IG5vZGUua25vd2xlZGdlUG9pbnQgfX08L3NtYWxsPlxuICAgICAgPC9zcGFuPlxuICAgICAgPGVsLWljb24gdi1pZj1cImhhc0NoaWxkcmVuXCIgY2xhc3M9XCJleHBhbmQtaWNvblwiPlxuICAgICAgICA8QXJyb3dSaWdodCAvPlxuICAgICAgPC9lbC1pY29uPlxuICAgIDwvYnV0dG9uPlxuXG4gICAgPHVsIHYtaWY9XCJoYXNDaGlsZHJlbiAmJiBpc0V4cGFuZGVkXCIgY2xhc3M9XCJtaW5kLW5vZGUtY2hpbGRyZW5cIj5cbiAgICAgIDxNaW5kTWFwTm9kZVxuICAgICAgICB2LWZvcj1cImNoaWxkIGluIG5vZGUuY2hpbGRyZW5cIlxuICAgICAgICA6a2V5PVwiY2hpbGQuaWRcIlxuICAgICAgICA6bm9kZT1cImNoaWxkXCJcbiAgICAgICAgOmxldmVsPVwibGV2ZWwgKyAxXCJcbiAgICAgICAgOnNpZGU9XCJzaWRlXCJcbiAgICAgICAgOmV4cGFuZGVkLWlkcz1cImV4cGFuZGVkSWRzXCJcbiAgICAgICAgOnNlbGVjdGVkLWlkPVwic2VsZWN0ZWRJZFwiXG4gICAgICAgIDptYXRjaGVkLWlkcz1cIm1hdGNoZWRJZHNcIlxuICAgICAgICBAc2VsZWN0PVwiZW1pdCgnc2VsZWN0JywgJGV2ZW50KVwiXG4gICAgICAgIEB0b2dnbGU9XCJlbWl0KCd0b2dnbGUnLCAkZXZlbnQpXCJcbiAgICAgIC8+XG4gICAgPC91bD5cbiAgPC9saT5cbjwvdGVtcGxhdGU+XG5cbjxzdHlsZSBzY29wZWQ+XG4ubWluZC1ub2RlLWl0ZW0ge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIGdhcDogOHB4O1xuICBsaXN0LXN0eWxlOiBub25lO1xufVxuXG4ubWluZC1ub2RlIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBkaXNwbGF5OiBncmlkO1xuICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDIycHggbWlubWF4KDAsIDFmcikgMTZweDtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgZ2FwOiA4cHg7XG4gIHdpZHRoOiAxMDAlO1xuICBtaW4taGVpZ2h0OiA0NnB4O1xuICBwYWRkaW5nOiA5cHggMTBweDtcbiAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tbmwtYm9yZGVyKTtcbiAgYm9yZGVyLXJhZGl1czogMTJweDtcbiAgYmFja2dyb3VuZDogdmFyKC0tbmwtc3VyZmFjZSk7XG4gIGNvbG9yOiB2YXIoLS1ubC10ZXh0KTtcbiAgdGV4dC1hbGlnbjogbGVmdDtcbiAgY3Vyc29yOiBwb2ludGVyO1xuICB0cmFuc2l0aW9uOiBib3JkZXItY29sb3IgdmFyKC0tbmwtdHJhbnNpdGlvbi1mYXN0KSwgYm94LXNoYWRvdyB2YXIoLS1ubC10cmFuc2l0aW9uLWZhc3QpLCBiYWNrZ3JvdW5kIHZhcigtLW5sLXRyYW5zaXRpb24tZmFzdCksIHRyYW5zZm9ybSB2YXIoLS1ubC10cmFuc2l0aW9uLWZhc3QpO1xufVxuXG4ubWluZC1ub2RlOmhvdmVyIHtcbiAgYm9yZGVyLWNvbG9yOiB2YXIoLS1ubC1wcmltYXJ5LWhvdmVyKTtcbiAgYm94LXNoYWRvdzogMCA4cHggMThweCByZ2JhKDI5LCAyNywgNDMsIDAuMDgpO1xufVxuXG4ubWluZC1ub2RlOmZvY3VzLXZpc2libGUge1xuICBvdXRsaW5lOiBub25lO1xuICBib3gtc2hhZG93OiB2YXIoLS1ubC1mb2N1cy1yaW5nKTtcbn1cblxuLm1pbmQtbm9kZS5zZWxlY3RlZCB7XG4gIGJvcmRlci1jb2xvcjogdmFyKC0tbmwtcHJpbWFyeS1ob3Zlcik7XG4gIGJhY2tncm91bmQ6IHZhcigtLW5sLXByaW1hcnktdGludCk7XG4gIGJveC1zaGFkb3c6IDAgMTBweCAyMnB4IHJnYmEoMTg1LCAxMjAsIDI0LCAwLjE0KTtcbn1cblxuLm1pbmQtbm9kZS5tYXRjaGVkIHtcbiAgYm9yZGVyLWNvbG9yOiB2YXIoLS1ubC1pbmZvKTtcbn1cblxuLm5vZGUtaWNvbiB7XG4gIGRpc3BsYXk6IGlubGluZS1mbGV4O1xuICB3aWR0aDogMjJweDtcbiAgaGVpZ2h0OiAyMnB4O1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgYm9yZGVyLXJhZGl1czogOHB4O1xuICBiYWNrZ3JvdW5kOiB2YXIoLS1ubC1taW50KTtcbiAgY29sb3I6IHZhcigtLW5sLWRlZXApO1xufVxuXG4ubm9kZS1jb3B5IHtcbiAgbWluLXdpZHRoOiAwO1xuICBkaXNwbGF5OiBncmlkO1xuICBnYXA6IDJweDtcbn1cblxuLm5vZGUtY29weSBzdHJvbmcsXG4ubm9kZS1jb3B5IHNtYWxsIHtcbiAgb3ZlcmZsb3ctd3JhcDogYW55d2hlcmU7XG4gIGxldHRlci1zcGFjaW5nOiAwO1xufVxuXG4ubm9kZS1jb3B5IHN0cm9uZyB7XG4gIGZvbnQtc2l6ZTogMTNweDtcbiAgbGluZS1oZWlnaHQ6IDEuMztcbn1cblxuLm5vZGUtY29weSBzbWFsbCB7XG4gIGNvbG9yOiB2YXIoLS1ubC10ZXh0LXN1YnRsZSk7XG4gIGZvbnQtc2l6ZTogMTJweDtcbn1cblxuLmV4cGFuZC1pY29uIHtcbiAgY29sb3I6IHZhcigtLW5sLXRleHQtc3VidGxlKTtcbiAgdHJhbnNpdGlvbjogdHJhbnNmb3JtIHZhcigtLW5sLXRyYW5zaXRpb24tZmFzdCk7XG59XG5cbi5taW5kLW5vZGUuZXhwYW5kZWQgLmV4cGFuZC1pY29uIHtcbiAgdHJhbnNmb3JtOiByb3RhdGUoOTBkZWcpO1xufVxuXG4ubWluZC1ub2RlLWNoaWxkcmVuIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBkaXNwbGF5OiBncmlkO1xuICBnYXA6IDhweDtcbiAgbWFyZ2luOiAwO1xuICBwYWRkaW5nOiAwIDAgMCAxOHB4O1xufVxuXG4ubGVmdCAubWluZC1ub2RlLWNoaWxkcmVuIHtcbiAgcGFkZGluZzogMCAxOHB4IDAgMDtcbn1cblxuLm1pbmQtbm9kZS1jaGlsZHJlbjo6YmVmb3JlIHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB0b3A6IDA7XG4gIGJvdHRvbTogMjJweDtcbiAgbGVmdDogN3B4O1xuICB3aWR0aDogMXB4O1xuICBiYWNrZ3JvdW5kOiB2YXIoLS1ubC1ib3JkZXItc3Ryb25nKTtcbiAgY29udGVudDogXCJcIjtcbn1cblxuLmxlZnQgPiAubWluZC1ub2RlLWNoaWxkcmVuOjpiZWZvcmUge1xuICByaWdodDogN3B4O1xuICBsZWZ0OiBhdXRvO1xufVxuXG4ubGV2ZWwtMiAubWluZC1ub2RlIHtcbiAgYmFja2dyb3VuZDogdmFyKC0tbmwtc3VyZmFjZS1tdXRlZCk7XG59XG5cbkBtZWRpYSAobWF4LXdpZHRoOiA3NjBweCkge1xuICAubGVmdCAubWluZC1ub2RlLWNoaWxkcmVuLFxuICAubWluZC1ub2RlLWNoaWxkcmVuIHtcbiAgICBwYWRkaW5nOiAwIDAgMCAxNHB4O1xuICB9XG5cbiAgLmxlZnQgPiAubWluZC1ub2RlLWNoaWxkcmVuOjpiZWZvcmUge1xuICAgIHJpZ2h0OiBhdXRvO1xuICAgIGxlZnQ6IDZweDtcbiAgfVxufVxuPC9zdHlsZT5cbiJdLCJmaWxlIjoiRDovZmlyc3Rtb25leS9ub2RlbGVhcm4tYWkvZnJvbnRlbmQvc3JjL2NvbXBvbmVudHMvbWluZC1tYXAvTWluZE1hcE5vZGUudnVlIn0=