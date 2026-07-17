import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/layout/DetailDrawer.vue");import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { computed } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { ArrowRight, Document, Reading } from "/node_modules/.vite/deps/@element-plus_icons-vue.js?v=dfeb8a9b";
import { difficultyLabel, masteryLabel } from "/src/utils/format.ts";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "DetailDrawer",
  props: {
    modelValue: { type: Boolean, required: true },
    course: { type: [Object, null], required: false },
    node: { type: [Object, null], required: false },
    profile: { type: [Object, null], required: false }
  },
  emits: ["update:modelValue"],
  setup(__props, { expose: __expose, emit: __emit }) {
    __expose();
    const props = __props;
    const emit = __emit;
    const weakNodes = computed(() => props.profile?.weakNodeIds?.slice(0, 6) ?? []);
    function closeDrawer() {
      emit("update:modelValue", false);
    }
    const __returned__ = { props, emit, weakNodes, closeDrawer, get ArrowRight() {
      return ArrowRight;
    }, get Document() {
      return Document;
    }, get Reading() {
      return Reading;
    }, get difficultyLabel() {
      return difficultyLabel;
    }, get masteryLabel() {
      return masteryLabel;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, createVNode as _createVNode, renderList as _renderList, Fragment as _Fragment, createElementBlock as _createElementBlock } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _hoisted_1 = { class: "context-overview-grid" };
const _hoisted_2 = { class: "context-card" };
const _hoisted_3 = { class: "context-card" };
const _hoisted_4 = { class: "tag-row" };
const _hoisted_5 = { class: "context-card" };
const _hoisted_6 = { class: "context-card" };
const _hoisted_7 = {
  key: 1,
  class: "context-actions"
};
const _hoisted_8 = { class: "context-card" };
const _hoisted_9 = { class: "context-actions" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_tag = _resolveComponent("el-tag");
  const _component_el_progress = _resolveComponent("el-progress");
  const _component_el_empty = _resolveComponent("el-empty");
  const _component_el_icon = _resolveComponent("el-icon");
  const _component_RouterLink = _resolveComponent("RouterLink");
  const _component_el_drawer = _resolveComponent("el-drawer");
  return _openBlock(), _createBlock(_component_el_drawer, {
    class: "detail-drawer",
    "model-value": $props.modelValue,
    title: "学习上下文",
    direction: "rtl",
    size: "min(440px, 92vw)",
    onClose: $setup.closeDrawer
  }, {
    default: _withCtx(() => [
      _createElementVNode("section", _hoisted_1, [
        _createElementVNode("article", _hoisted_2, [
          _cache[0] || (_cache[0] = _createElementVNode(
            "span",
            null,
            "当前课程",
            -1
            /* CACHED */
          )),
          _createElementVNode(
            "strong",
            null,
            _toDisplayString($props.course?.name ?? "数据结构"),
            1
            /* TEXT */
          ),
          _createElementVNode(
            "p",
            null,
            _toDisplayString($props.course?.description ?? $props.course?.code ?? "围绕课程材料、知识图谱和练习记录推进学习。"),
            1
            /* TEXT */
          )
        ]),
        _createElementVNode("article", _hoisted_3, [
          _cache[1] || (_cache[1] = _createElementVNode(
            "span",
            null,
            "当前节点",
            -1
            /* CACHED */
          )),
          _createElementVNode(
            "strong",
            null,
            _toDisplayString($props.node?.name ?? "尚未选择知识点"),
            1
            /* TEXT */
          ),
          _createElementVNode("div", _hoisted_4, [
            $props.node?.difficulty ? (_openBlock(), _createBlock(_component_el_tag, {
              key: 0,
              type: "warning",
              effect: "plain"
            }, {
              default: _withCtx(() => [
                _createTextVNode(
                  _toDisplayString($setup.difficultyLabel($props.node.difficulty)),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : _createCommentVNode("v-if", true),
            $props.node?.masteryStatus ? (_openBlock(), _createBlock(_component_el_tag, {
              key: 1,
              type: "success",
              effect: "plain"
            }, {
              default: _withCtx(() => [
                _createTextVNode(
                  _toDisplayString($setup.masteryLabel($props.node.masteryStatus)),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : _createCommentVNode("v-if", true)
          ]),
          _createElementVNode(
            "p",
            null,
            _toDisplayString($props.node?.description ?? "选择知识节点后，这里会展示节点说明、掌握状态和快捷操作。"),
            1
            /* TEXT */
          )
        ]),
        _createElementVNode("article", _hoisted_5, [
          _cache[2] || (_cache[2] = _createElementVNode(
            "span",
            null,
            "学生画像",
            -1
            /* CACHED */
          )),
          _createElementVNode(
            "strong",
            null,
            _toDisplayString(Math.round(($props.profile?.confidenceScore ?? 0) * 100)) + "% 完整度",
            1
            /* TEXT */
          ),
          _createElementVNode(
            "p",
            null,
            _toDisplayString($props.profile?.profileSummary ?? "画像会根据对话、练习和学习行为逐步更新。"),
            1
            /* TEXT */
          ),
          _createVNode(_component_el_progress, {
            percentage: Math.round(($props.profile?.confidenceScore ?? 0) * 100)
          }, null, 8, ["percentage"])
        ]),
        _createElementVNode("article", _hoisted_6, [
          _cache[3] || (_cache[3] = _createElementVNode(
            "span",
            null,
            "薄弱节点",
            -1
            /* CACHED */
          )),
          !$setup.weakNodes.length ? (_openBlock(), _createBlock(_component_el_empty, {
            key: 0,
            description: "暂无薄弱节点"
          })) : (_openBlock(), _createElementBlock("div", _hoisted_7, [
            (_openBlock(true), _createElementBlock(
              _Fragment,
              null,
              _renderList($setup.weakNodes, (nodeId) => {
                return _openBlock(), _createBlock(
                  _component_RouterLink,
                  {
                    key: nodeId,
                    class: "list-button",
                    to: "/knowledge-graph"
                  },
                  {
                    default: _withCtx(() => [
                      _createVNode(_component_el_icon, null, {
                        default: _withCtx(() => [
                          _createVNode($setup["Reading"])
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      _createElementVNode(
                        "strong",
                        null,
                        _toDisplayString(nodeId),
                        1
                        /* TEXT */
                      )
                    ]),
                    _: 2
                    /* DYNAMIC */
                  },
                  1024
                  /* DYNAMIC_SLOTS */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ]))
        ]),
        _createElementVNode("article", _hoisted_8, [
          _cache[8] || (_cache[8] = _createElementVNode(
            "span",
            null,
            "快捷操作",
            -1
            /* CACHED */
          )),
          _createElementVNode("div", _hoisted_9, [
            _createVNode(_component_RouterLink, {
              class: "list-button",
              to: "/resources"
            }, {
              default: _withCtx(() => [
                _createVNode(_component_el_icon, null, {
                  default: _withCtx(() => [
                    _createVNode($setup["Document"])
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _cache[4] || (_cache[4] = _createElementVNode(
                  "strong",
                  null,
                  "生成学习资源",
                  -1
                  /* CACHED */
                )),
                _cache[5] || (_cache[5] = _createElementVNode(
                  "span",
                  null,
                  "讲解文档、导图、练习、视频与数字人讲解",
                  -1
                  /* CACHED */
                ))
              ]),
              _: 1
              /* STABLE */
            }),
            _createVNode(_component_RouterLink, {
              class: "list-button",
              to: "/learning-path"
            }, {
              default: _withCtx(() => [
                _createVNode(_component_el_icon, null, {
                  default: _withCtx(() => [
                    _createVNode($setup["ArrowRight"])
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _cache[6] || (_cache[6] = _createElementVNode(
                  "strong",
                  null,
                  "查看学习路径",
                  -1
                  /* CACHED */
                )),
                _cache[7] || (_cache[7] = _createElementVNode(
                  "span",
                  null,
                  "按图谱依赖和画像薄弱点推进任务",
                  -1
                  /* CACHED */
                ))
              ]),
              _: 1
              /* STABLE */
            })
          ])
        ])
      ])
    ]),
    _: 1
    /* STABLE */
  }, 8, ["model-value"]);
}
_sfc_main.__hmrId = "00438839";
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
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/components/layout/DetailDrawer.vue"]]);

//# sourceMappingURL=data:application/json;base64,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QUEsa0JBR2E7QUFBQTtBQUFBLG9CQUg0QixLQUFLO0FBQUEsb0JBQVEsT0FBTTtBQUFBLG9CQUFjLElBQUc7QUFBQTs7c0NBQzNFLE1BQThCO0FBQUEsc0JBQTlCLGFBQThCO0FBQUEsMENBQXJCLE1BQVc7QUFBQSwwQkFBWCxhQUFXO0FBQUE7Ozs7c0JBQ3BCO0FBQUEsd0JBQTZCO0FBQUE7QUFBQSx5Q0FBbEIsTUFBTTtBQUFBO0FBQUE7QUFBQTtBQUFBOzs7Ozs7Ozs7Ozs7O1FBS3ZCLG9CQWNVLFdBZFYsWUFjVTtBQUFBLG9DQWJSO0FBQUEsWUFBaUI7QUFBQTtBQUFBLFlBQVg7QUFBQSxZQUFJO0FBQUE7QUFBQTtBQUFBLFVBQ1Ysb0JBV00sT0FYTixZQVdNO0FBQUEsWUFWSixhQUlhO0FBQUEsY0FKRCxPQUFNO0FBQUEsY0FBYyxJQUFHO0FBQUE7Z0NBQ2pDLE1BQStCO0FBQUEsZ0JBQS9CLGFBQStCO0FBQUEsb0NBQXRCLE1BQVk7QUFBQSxvQkFBWixhQUFZO0FBQUE7Ozs7MENBQ3JCO0FBQUEsa0JBQXVCO0FBQUE7QUFBQSxrQkFBZjtBQUFBLGtCQUFNO0FBQUE7QUFBQTtBQUFBLDBDQUNkO0FBQUEsa0JBQWdDO0FBQUE7QUFBQSxrQkFBMUI7QUFBQSxrQkFBbUI7QUFBQTtBQUFBO0FBQUE7Ozs7WUFFM0IsYUFJYTtBQUFBLGNBSkQsT0FBTTtBQUFBLGNBQWMsSUFBRztBQUFBO2dDQUNqQyxNQUFpQztBQUFBLGdCQUFqQyxhQUFpQztBQUFBLG9DQUF4QixNQUFjO0FBQUEsb0JBQWQsYUFBYztBQUFBOzs7OzBDQUN2QjtBQUFBLGtCQUF1QjtBQUFBO0FBQUEsa0JBQWY7QUFBQSxrQkFBTTtBQUFBO0FBQUE7QUFBQSwwQ0FDZDtBQUFBLGtCQUE0QjtBQUFBO0FBQUEsa0JBQXRCO0FBQUEsa0JBQWU7QUFBQTtBQUFBO0FBQUEiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkRldGFpbERyYXdlci52dWUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdCBzZXR1cCBsYW5nPVwidHNcIj5cbmltcG9ydCB7IGNvbXB1dGVkIH0gZnJvbSBcInZ1ZVwiO1xuaW1wb3J0IHsgQXJyb3dSaWdodCwgRG9jdW1lbnQsIFJlYWRpbmcgfSBmcm9tIFwiQGVsZW1lbnQtcGx1cy9pY29ucy12dWVcIjtcbmltcG9ydCB0eXBlIHsgQ291cnNlLCBLbm93bGVkZ2VOb2RlIH0gZnJvbSBcIkAvdHlwZXMvY291cnNlXCI7XG5pbXBvcnQgdHlwZSB7IFN0dWRlbnRQcm9maWxlIH0gZnJvbSBcIkAvdHlwZXMvcHJvZmlsZVwiO1xuaW1wb3J0IHsgZGlmZmljdWx0eUxhYmVsLCBtYXN0ZXJ5TGFiZWwgfSBmcm9tIFwiQC91dGlscy9mb3JtYXRcIjtcblxuY29uc3QgcHJvcHMgPSBkZWZpbmVQcm9wczx7XG4gIG1vZGVsVmFsdWU6IGJvb2xlYW47XG4gIGNvdXJzZT86IENvdXJzZSB8IG51bGw7XG4gIG5vZGU/OiBLbm93bGVkZ2VOb2RlIHwgbnVsbDtcbiAgcHJvZmlsZT86IFN0dWRlbnRQcm9maWxlIHwgbnVsbDtcbn0+KCk7XG5cbmNvbnN0IGVtaXQgPSBkZWZpbmVFbWl0czx7IFwidXBkYXRlOm1vZGVsVmFsdWVcIjogW3ZhbHVlOiBib29sZWFuXSB9PigpO1xuXG5jb25zdCB3ZWFrTm9kZXMgPSBjb21wdXRlZCgoKSA9PiBwcm9wcy5wcm9maWxlPy53ZWFrTm9kZUlkcz8uc2xpY2UoMCwgNikgPz8gW10pO1xuXG5mdW5jdGlvbiBjbG9zZURyYXdlcigpIHtcbiAgZW1pdChcInVwZGF0ZTptb2RlbFZhbHVlXCIsIGZhbHNlKTtcbn1cbjwvc2NyaXB0PlxuXG48dGVtcGxhdGU+XG4gIDxlbC1kcmF3ZXJcbiAgICBjbGFzcz1cImRldGFpbC1kcmF3ZXJcIlxuICAgIDptb2RlbC12YWx1ZT1cIm1vZGVsVmFsdWVcIlxuICAgIHRpdGxlPVwi5a2m5Lmg5LiK5LiL5paHXCJcbiAgICBkaXJlY3Rpb249XCJydGxcIlxuICAgIHNpemU9XCJtaW4oNDQwcHgsIDkydncpXCJcbiAgICBAY2xvc2U9XCJjbG9zZURyYXdlclwiXG4gID5cbiAgICA8c2VjdGlvbiBjbGFzcz1cImNvbnRleHQtb3ZlcnZpZXctZ3JpZFwiPlxuICAgICAgPGFydGljbGUgY2xhc3M9XCJjb250ZXh0LWNhcmRcIj5cbiAgICAgICAgPHNwYW4+5b2T5YmN6K++56iLPC9zcGFuPlxuICAgICAgICA8c3Ryb25nPnt7IGNvdXJzZT8ubmFtZSA/PyBcIuaVsOaNrue7k+aehFwiIH19PC9zdHJvbmc+XG4gICAgICAgIDxwPnt7IGNvdXJzZT8uZGVzY3JpcHRpb24gPz8gY291cnNlPy5jb2RlID8/IFwi5Zu057uV6K++56iL5p2Q5paZ44CB55+l6K+G5Zu+6LCx5ZKM57uD5Lmg6K6w5b2V5o6o6L+b5a2m5Lmg44CCXCIgfX08L3A+XG4gICAgICA8L2FydGljbGU+XG5cbiAgICAgIDxhcnRpY2xlIGNsYXNzPVwiY29udGV4dC1jYXJkXCI+XG4gICAgICAgIDxzcGFuPuW9k+WJjeiKgueCuTwvc3Bhbj5cbiAgICAgICAgPHN0cm9uZz57eyBub2RlPy5uYW1lID8/IFwi5bCa5pyq6YCJ5oup55+l6K+G54K5XCIgfX08L3N0cm9uZz5cbiAgICAgICAgPGRpdiBjbGFzcz1cInRhZy1yb3dcIj5cbiAgICAgICAgICA8ZWwtdGFnIHYtaWY9XCJub2RlPy5kaWZmaWN1bHR5XCIgdHlwZT1cIndhcm5pbmdcIiBlZmZlY3Q9XCJwbGFpblwiPnt7IGRpZmZpY3VsdHlMYWJlbChub2RlLmRpZmZpY3VsdHkpIH19PC9lbC10YWc+XG4gICAgICAgICAgPGVsLXRhZyB2LWlmPVwibm9kZT8ubWFzdGVyeVN0YXR1c1wiIHR5cGU9XCJzdWNjZXNzXCIgZWZmZWN0PVwicGxhaW5cIj57eyBtYXN0ZXJ5TGFiZWwobm9kZS5tYXN0ZXJ5U3RhdHVzKSB9fTwvZWwtdGFnPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPHA+e3sgbm9kZT8uZGVzY3JpcHRpb24gPz8gXCLpgInmi6nnn6Xor4boioLngrnlkI7vvIzov5nph4zkvJrlsZXnpLroioLngrnor7TmmI7jgIHmjozmj6HnirbmgIHlkozlv6vmjbfmk43kvZzjgIJcIiB9fTwvcD5cbiAgICAgIDwvYXJ0aWNsZT5cblxuICAgICAgPGFydGljbGUgY2xhc3M9XCJjb250ZXh0LWNhcmRcIj5cbiAgICAgICAgPHNwYW4+5a2m55Sf55S75YOPPC9zcGFuPlxuICAgICAgICA8c3Ryb25nPnt7IE1hdGgucm91bmQoKHByb2ZpbGU/LmNvbmZpZGVuY2VTY29yZSA/PyAwKSAqIDEwMCkgfX0lIOWujOaVtOW6pjwvc3Ryb25nPlxuICAgICAgICA8cD57eyBwcm9maWxlPy5wcm9maWxlU3VtbWFyeSA/PyBcIueUu+WDj+S8muagueaNruWvueivneOAgee7g+S5oOWSjOWtpuS5oOihjOS4uumAkOatpeabtOaWsOOAglwiIH19PC9wPlxuICAgICAgICA8ZWwtcHJvZ3Jlc3MgOnBlcmNlbnRhZ2U9XCJNYXRoLnJvdW5kKChwcm9maWxlPy5jb25maWRlbmNlU2NvcmUgPz8gMCkgKiAxMDApXCIgLz5cbiAgICAgIDwvYXJ0aWNsZT5cblxuICAgICAgPGFydGljbGUgY2xhc3M9XCJjb250ZXh0LWNhcmRcIj5cbiAgICAgICAgPHNwYW4+6JaE5byx6IqC54K5PC9zcGFuPlxuICAgICAgICA8ZWwtZW1wdHkgdi1pZj1cIiF3ZWFrTm9kZXMubGVuZ3RoXCIgZGVzY3JpcHRpb249XCLmmoLml6DoloTlvLHoioLngrlcIiAvPlxuICAgICAgICA8ZGl2IHYtZWxzZSBjbGFzcz1cImNvbnRleHQtYWN0aW9uc1wiPlxuICAgICAgICAgIDxSb3V0ZXJMaW5rIHYtZm9yPVwibm9kZUlkIGluIHdlYWtOb2Rlc1wiIDprZXk9XCJub2RlSWRcIiBjbGFzcz1cImxpc3QtYnV0dG9uXCIgdG89XCIva25vd2xlZGdlLWdyYXBoXCI+XG4gICAgICAgICAgICA8ZWwtaWNvbj48UmVhZGluZyAvPjwvZWwtaWNvbj5cbiAgICAgICAgICAgIDxzdHJvbmc+e3sgbm9kZUlkIH19PC9zdHJvbmc+XG4gICAgICAgICAgPC9Sb3V0ZXJMaW5rPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvYXJ0aWNsZT5cblxuICAgICAgPGFydGljbGUgY2xhc3M9XCJjb250ZXh0LWNhcmRcIj5cbiAgICAgICAgPHNwYW4+5b+r5o235pON5L2cPC9zcGFuPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGV4dC1hY3Rpb25zXCI+XG4gICAgICAgICAgPFJvdXRlckxpbmsgY2xhc3M9XCJsaXN0LWJ1dHRvblwiIHRvPVwiL3Jlc291cmNlc1wiPlxuICAgICAgICAgICAgPGVsLWljb24+PERvY3VtZW50IC8+PC9lbC1pY29uPlxuICAgICAgICAgICAgPHN0cm9uZz7nlJ/miJDlrabkuaDotYTmupA8L3N0cm9uZz5cbiAgICAgICAgICAgIDxzcGFuPuiusuino+aWh+aho+OAgeWvvOWbvuOAgee7g+S5oOOAgeinhumikeS4juaVsOWtl+S6uuiusuinozwvc3Bhbj5cbiAgICAgICAgICA8L1JvdXRlckxpbms+XG4gICAgICAgICAgPFJvdXRlckxpbmsgY2xhc3M9XCJsaXN0LWJ1dHRvblwiIHRvPVwiL2xlYXJuaW5nLXBhdGhcIj5cbiAgICAgICAgICAgIDxlbC1pY29uPjxBcnJvd1JpZ2h0IC8+PC9lbC1pY29uPlxuICAgICAgICAgICAgPHN0cm9uZz7mn6XnnIvlrabkuaDot6/lvoQ8L3N0cm9uZz5cbiAgICAgICAgICAgIDxzcGFuPuaMieWbvuiwseS+nei1luWSjOeUu+WDj+iWhOW8seeCueaOqOi/m+S7u+WKoTwvc3Bhbj5cbiAgICAgICAgICA8L1JvdXRlckxpbms+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9hcnRpY2xlPlxuICAgIDwvc2VjdGlvbj5cbiAgPC9lbC1kcmF3ZXI+XG48L3RlbXBsYXRlPlxuIl0sImZpbGUiOiJEOi9maXJzdG1vbmV5L25vZGVsZWFybi1haS9mcm9udGVuZC9zcmMvY29tcG9uZW50cy9sYXlvdXQvRGV0YWlsRHJhd2VyLnZ1ZSJ9