import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/App.vue");import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { useRoute } from "/node_modules/.vite/deps/vue-router.js?v=d8ae4e15";
import AppLayout from "/src/components/AppLayout.vue";
import FloatingMenu from "/src/components/FloatingMenu.vue";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "App",
  setup(__props, { expose: __expose }) {
    __expose();
    const route = useRoute();
    const __returned__ = { route, AppLayout, FloatingMenu };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { createElementVNode as _createElementVNode, resolveDynamicComponent as _resolveDynamicComponent, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, withCtx as _withCtx, resolveComponent as _resolveComponent, createVNode as _createVNode } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_RouterView = _resolveComponent("RouterView");
  const _component_el_config_provider = _resolveComponent("el-config-provider");
  return _openBlock(), _createBlock(_component_el_config_provider, null, {
    default: _withCtx(() => [
      _cache[0] || (_cache[0] = _createElementVNode(
        "a",
        {
          href: "#main-content",
          class: "skip-link"
        },
        "跳到主内容",
        -1
        /* CACHED */
      )),
      _createVNode(_component_RouterView, null, {
        default: _withCtx(({ Component, route }) => [
          route.meta.public ? (_openBlock(), _createBlock(_resolveDynamicComponent(Component), { key: 0 })) : (_openBlock(), _createBlock(
            $setup["AppLayout"],
            { key: 1 },
            {
              default: _withCtx(() => [
                (_openBlock(), _createBlock(_resolveDynamicComponent(Component)))
              ]),
              _: 2
              /* DYNAMIC */
            },
            1024
            /* DYNAMIC_SLOTS */
          ))
        ]),
        _: 1
        /* STABLE */
      }),
      !$setup.route.meta.public ? (_openBlock(), _createBlock($setup["FloatingMenu"], { key: 0 })) : _createCommentVNode("v-if", true)
    ]),
    _: 1
    /* STABLE */
  });
}
_sfc_main.__hmrId = "7a7a37b1";
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
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/App.vue"]]);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IjtBQWNBLFNBQVMsZ0JBQWdCO0FBQ3pCLE9BQU8sZUFBZTtBQUN0QixPQUFPLGtCQUFrQjs7Ozs7QUFFekIsVUFBTSxRQUFRLFNBQVM7Ozs7Ozs7Ozs7dUJBakJyQixhQVNxQjtBQUFBLHNCQVJuQixNQUFtRDtBQUFBLGdDQUFuRDtBQUFBLFFBQW1EO0FBQUE7QUFBQSxVQUFoRCxNQUFLO0FBQUEsVUFBZ0IsT0FBTTtBQUFBO1FBQVk7QUFBQSxRQUFLO0FBQUE7QUFBQTtBQUFBLE1BQy9DLGFBS2E7QUFBQSwwQkFKWCxDQUFzRCxFQURsQyxXQUFXLE1BQUs7QUFBQSxVQUNILE1BQU0sS0FBSyx3QkFBNUMsYUFBc0QseUJBQXRDLFNBQVMsaUNBQ3pCO0FBQUEsWUFFWTtBQUFBO0FBQUE7QUFBQSxnQ0FEVixNQUE2QjtBQUFBLCtCQUE3QixhQUE2Qix5QkFBYixTQUFTO0FBQUE7Ozs7Ozs7Ozs7O09BR1IsYUFBTSxLQUFLLHdCQUFoQyxhQUEwQyIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQXBwLnZ1ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8dGVtcGxhdGU+XHJcbiAgPGVsLWNvbmZpZy1wcm92aWRlcj5cclxuICAgIDxhIGhyZWY9XCIjbWFpbi1jb250ZW50XCIgY2xhc3M9XCJza2lwLWxpbmtcIj7ot7PliLDkuLvlhoXlrrk8L2E+XHJcbiAgICA8Um91dGVyVmlldyB2LXNsb3Q9XCJ7IENvbXBvbmVudCwgcm91dGUgfVwiPlxyXG4gICAgICA8Y29tcG9uZW50IDppcz1cIkNvbXBvbmVudFwiIHYtaWY9XCJyb3V0ZS5tZXRhLnB1YmxpY1wiIC8+XHJcbiAgICAgIDxBcHBMYXlvdXQgdi1lbHNlPlxyXG4gICAgICAgIDxjb21wb25lbnQgOmlzPVwiQ29tcG9uZW50XCIgLz5cclxuICAgICAgPC9BcHBMYXlvdXQ+XHJcbiAgICA8L1JvdXRlclZpZXc+XHJcbiAgICA8RmxvYXRpbmdNZW51IHYtaWY9XCIhcm91dGUubWV0YS5wdWJsaWNcIiAvPlxyXG4gIDwvZWwtY29uZmlnLXByb3ZpZGVyPlxyXG48L3RlbXBsYXRlPlxyXG5cclxuPHNjcmlwdCBzZXR1cCBsYW5nPVwidHNcIj5cclxuaW1wb3J0IHsgdXNlUm91dGUgfSBmcm9tIFwidnVlLXJvdXRlclwiO1xyXG5pbXBvcnQgQXBwTGF5b3V0IGZyb20gXCJAL2NvbXBvbmVudHMvQXBwTGF5b3V0LnZ1ZVwiO1xyXG5pbXBvcnQgRmxvYXRpbmdNZW51IGZyb20gXCJAL2NvbXBvbmVudHMvRmxvYXRpbmdNZW51LnZ1ZVwiO1xyXG5cclxuY29uc3Qgcm91dGUgPSB1c2VSb3V0ZSgpO1xyXG48L3NjcmlwdD5cclxuIl0sImZpbGUiOiJEOi9maXJzdG1vbmV5L25vZGVsZWFybi1haS9mcm9udGVuZC9zcmMvQXBwLnZ1ZSJ9