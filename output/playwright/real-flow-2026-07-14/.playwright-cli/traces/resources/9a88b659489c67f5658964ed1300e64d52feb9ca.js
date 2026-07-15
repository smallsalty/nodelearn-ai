import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/FloatingMenu.vue");import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { computed, onMounted, ref } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { Close, Notebook, Position } from "/node_modules/.vite/deps/@element-plus_icons-vue.js?v=dfeb8a9b";
import { chatApi } from "/src/api/modules/chat.ts";
import { noteApi } from "/src/api/modules/note.ts";
import { practiceApi } from "/src/api/modules/practice.ts";
import { recommendationsApi } from "/src/api/modules/recommendations.ts";
import { getErrorMessage } from "/src/api/client.ts";
import {
  appState,
  closeFloatingMenu,
  switchFloatingTab,
  toggleFloatingMenu,
  updateFloatingPosition
} from "/src/stores/index.ts";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "FloatingMenu",
  setup(__props, { expose: __expose }) {
    __expose();
    const userId = computed(() => appState.currentUser?.id ?? "user_demo_001");
    const courseId = computed(() => appState.currentCourse?.id ?? "course_ds_001");
    const question = ref("");
    const answer = ref("");
    const noteTitle = ref("");
    const noteContent = ref("");
    const notes = ref([]);
    const wrongQuestions = ref([]);
    const recommendations = ref([]);
    const loading = ref(false);
    const errorMessage = ref("");
    const panelStyle = computed(() => ({
      right: "24px",
      bottom: "88px",
      width: `${appState.floatingMenuState.width}px`,
      maxWidth: "calc(100vw - 32px)"
    }));
    onMounted(() => {
      void loadTabData();
    });
    async function loadTabData() {
      if (!appState.floatingMenuState.visible) return;
      loading.value = true;
      errorMessage.value = "";
      try {
        if (appState.floatingMenuState.activeTab === "note") {
          notes.value = (await noteApi.getUserNotes(userId.value)).data;
        } else if (appState.floatingMenuState.activeTab === "wrong_book") {
          wrongQuestions.value = (await practiceApi.getWrongQuestions(userId.value)).data;
        } else if (appState.floatingMenuState.activeTab === "resource") {
          recommendations.value = (await recommendationsApi.getUserRecommendations(userId.value)).data;
        }
      } catch (error) {
        errorMessage.value = getErrorMessage(error);
      } finally {
        loading.value = false;
      }
    }
    async function ask() {
      const message = question.value.trim();
      if (!message) return;
      loading.value = true;
      errorMessage.value = "";
      try {
        const response = await chatApi.sendMessage({
          userId: userId.value,
          courseId: courseId.value,
          nodeId: appState.selectedNodeId ?? void 0,
          message,
          useRag: true,
          useProfile: true
        });
        answer.value = response.data.answer;
        question.value = "";
      } catch (error) {
        errorMessage.value = getErrorMessage(error);
      } finally {
        loading.value = false;
      }
    }
    async function saveNote() {
      if (!noteTitle.value.trim() || !noteContent.value.trim()) return;
      loading.value = true;
      errorMessage.value = "";
      try {
        await noteApi.createNote({
          userId: userId.value,
          courseId: courseId.value,
          nodeId: appState.selectedNodeId ?? void 0,
          title: noteTitle.value.trim(),
          content: noteContent.value.trim(),
          tags: ["floating"]
        });
        noteTitle.value = "";
        noteContent.value = "";
        notes.value = (await noteApi.getUserNotes(userId.value)).data;
      } catch (error) {
        errorMessage.value = getErrorMessage(error);
      } finally {
        loading.value = false;
      }
    }
    function changeTab(tab) {
      switchFloatingTab(tab);
      void loadTabData();
    }
    function movePanel() {
      updateFloatingPosition(appState.floatingMenuState.positionX, appState.floatingMenuState.positionY);
    }
    const __returned__ = { userId, courseId, question, answer, noteTitle, noteContent, notes, wrongQuestions, recommendations, loading, errorMessage, panelStyle, loadTabData, ask, saveNote, changeTab, movePanel, get Close() {
      return Close;
    }, get Notebook() {
      return Notebook;
    }, get Position() {
      return Position;
    }, get appState() {
      return appState;
    }, get closeFloatingMenu() {
      return closeFloatingMenu;
    }, get toggleFloatingMenu() {
      return toggleFloatingMenu;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { createVNode as _createVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createTextVNode as _createTextVNode, createElementVNode as _createElementVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, createBlock as _createBlock, createCommentVNode as _createCommentVNode, normalizeStyle as _normalizeStyle } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _hoisted_1 = { class: "floating-header" };
const _hoisted_2 = {
  class: "floating-tabs",
  "aria-label": "浮窗标签"
};
const _hoisted_3 = ["onClick"];
const _hoisted_4 = {
  key: 2,
  class: "floating-body"
};
const _hoisted_5 = {
  key: 0,
  class: "floating-answer"
};
const _hoisted_6 = {
  key: 3,
  class: "floating-body"
};
const _hoisted_7 = {
  key: 4,
  class: "floating-body"
};
const _hoisted_8 = {
  key: 5,
  class: "floating-body"
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_icon = _resolveComponent("el-icon");
  const _component_el_button = _resolveComponent("el-button");
  const _component_el_alert = _resolveComponent("el-alert");
  const _component_el_skeleton = _resolveComponent("el-skeleton");
  const _component_el_input = _resolveComponent("el-input");
  const _component_el_empty = _resolveComponent("el-empty");
  return _openBlock(), _createElementBlock(
    _Fragment,
    null,
    [
      _createElementVNode("button", {
        class: "floating-trigger",
        type: "button",
        onClick: _cache[0] || (_cache[0] = (...args) => $setup.toggleFloatingMenu && $setup.toggleFloatingMenu(...args))
      }, [
        _createVNode(_component_el_icon, null, {
          default: _withCtx(() => [
            _createVNode($setup["Notebook"])
          ]),
          _: 1
          /* STABLE */
        }),
        _cache[4] || (_cache[4] = _createTextVNode(
          " 学习侧栏 ",
          -1
          /* CACHED */
        ))
      ]),
      $setup.appState.floatingMenuState.visible ? (_openBlock(), _createElementBlock(
        "section",
        {
          key: 0,
          class: "floating-panel",
          style: _normalizeStyle($setup.panelStyle)
        },
        [
          _createElementVNode("header", _hoisted_1, [
            _cache[7] || (_cache[7] = _createElementVNode(
              "strong",
              null,
              "学习浮窗",
              -1
              /* CACHED */
            )),
            _createElementVNode("div", null, [
              _createVNode(_component_el_button, {
                size: "small",
                text: "",
                icon: $setup.Position,
                onClick: $setup.movePanel
              }, {
                default: _withCtx(() => [..._cache[5] || (_cache[5] = [
                  _createTextVNode(
                    "定位",
                    -1
                    /* CACHED */
                  )
                ])]),
                _: 1
                /* STABLE */
              }, 8, ["icon"]),
              _createVNode(_component_el_button, {
                size: "small",
                text: "",
                icon: $setup.Close,
                onClick: $setup.closeFloatingMenu
              }, {
                default: _withCtx(() => [..._cache[6] || (_cache[6] = [
                  _createTextVNode(
                    "关闭",
                    -1
                    /* CACHED */
                  )
                ])]),
                _: 1
                /* STABLE */
              }, 8, ["icon", "onClick"])
            ])
          ]),
          _createElementVNode("nav", _hoisted_2, [
            (_openBlock(), _createElementBlock(
              _Fragment,
              null,
              _renderList([
                { key: "qa", label: "提问" },
                { key: "note", label: "笔记" },
                { key: "wrong_book", label: "错题" },
                { key: "resource", label: "资源" }
              ], (tab) => {
                return _createElementVNode("button", {
                  key: tab.key,
                  type: "button",
                  class: _normalizeClass({ active: $setup.appState.floatingMenuState.activeTab === tab.key }),
                  onClick: ($event) => $setup.changeTab(tab.key)
                }, _toDisplayString(tab.label), 11, _hoisted_3);
              }),
              64
              /* STABLE_FRAGMENT */
            ))
          ]),
          $setup.errorMessage ? (_openBlock(), _createBlock(_component_el_alert, {
            key: 0,
            title: $setup.errorMessage,
            type: "error",
            "show-icon": "",
            closable: false
          }, null, 8, ["title"])) : _createCommentVNode("v-if", true),
          $setup.loading ? (_openBlock(), _createBlock(_component_el_skeleton, {
            key: 1,
            rows: 3,
            animated: ""
          })) : $setup.appState.floatingMenuState.activeTab === "qa" ? (_openBlock(), _createElementBlock("section", _hoisted_4, [
            _createVNode(_component_el_input, {
              modelValue: $setup.question,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.question = $event),
              type: "textarea",
              rows: 3,
              placeholder: "问一个当前知识点问题",
              "aria-label": "浮窗问题"
            }, null, 8, ["modelValue"]),
            _createVNode(_component_el_button, {
              type: "primary",
              loading: $setup.loading,
              disabled: !$setup.question.trim(),
              onClick: $setup.ask
            }, {
              default: _withCtx(() => [..._cache[8] || (_cache[8] = [
                _createTextVNode(
                  "发送问题",
                  -1
                  /* CACHED */
                )
              ])]),
              _: 1
              /* STABLE */
            }, 8, ["loading", "disabled"]),
            $setup.answer ? (_openBlock(), _createElementBlock(
              "p",
              _hoisted_5,
              _toDisplayString($setup.answer),
              1
              /* TEXT */
            )) : _createCommentVNode("v-if", true)
          ])) : $setup.appState.floatingMenuState.activeTab === "note" ? (_openBlock(), _createElementBlock("section", _hoisted_6, [
            _createVNode(_component_el_input, {
              modelValue: $setup.noteTitle,
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.noteTitle = $event),
              placeholder: "笔记标题",
              "aria-label": "笔记标题"
            }, null, 8, ["modelValue"]),
            _createVNode(_component_el_input, {
              modelValue: $setup.noteContent,
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.noteContent = $event),
              type: "textarea",
              rows: 3,
              placeholder: "记录当前疑问或结论",
              "aria-label": "笔记内容"
            }, null, 8, ["modelValue"]),
            _createVNode(_component_el_button, {
              type: "primary",
              loading: $setup.loading,
              disabled: !$setup.noteTitle.trim() || !$setup.noteContent.trim(),
              onClick: $setup.saveNote
            }, {
              default: _withCtx(() => [..._cache[9] || (_cache[9] = [
                _createTextVNode(
                  "保存笔记",
                  -1
                  /* CACHED */
                )
              ])]),
              _: 1
              /* STABLE */
            }, 8, ["loading", "disabled"]),
            (_openBlock(true), _createElementBlock(
              _Fragment,
              null,
              _renderList($setup.notes, (note) => {
                return _openBlock(), _createElementBlock("article", {
                  key: note.id,
                  class: "mini-list-item"
                }, [
                  _createElementVNode(
                    "strong",
                    null,
                    _toDisplayString(note.title),
                    1
                    /* TEXT */
                  ),
                  _createElementVNode(
                    "span",
                    null,
                    _toDisplayString(note.content),
                    1
                    /* TEXT */
                  )
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])) : $setup.appState.floatingMenuState.activeTab === "wrong_book" ? (_openBlock(), _createElementBlock("section", _hoisted_7, [
            !$setup.wrongQuestions.length ? (_openBlock(), _createBlock(_component_el_empty, {
              key: 0,
              description: "暂无错题"
            })) : _createCommentVNode("v-if", true),
            (_openBlock(true), _createElementBlock(
              _Fragment,
              null,
              _renderList($setup.wrongQuestions, (item) => {
                return _openBlock(), _createElementBlock("article", {
                  key: item.id,
                  class: "mini-list-item"
                }, [
                  _createElementVNode(
                    "strong",
                    null,
                    _toDisplayString(item.title),
                    1
                    /* TEXT */
                  ),
                  _createElementVNode(
                    "span",
                    null,
                    _toDisplayString(item.difficulty) + " · " + _toDisplayString(item.questionType),
                    1
                    /* TEXT */
                  )
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])) : (_openBlock(), _createElementBlock("section", _hoisted_8, [
            !$setup.recommendations.length ? (_openBlock(), _createBlock(_component_el_empty, {
              key: 0,
              description: "暂无推荐资源"
            })) : _createCommentVNode("v-if", true),
            (_openBlock(true), _createElementBlock(
              _Fragment,
              null,
              _renderList($setup.recommendations, (item) => {
                return _openBlock(), _createElementBlock("article", {
                  key: item.id,
                  class: "mini-list-item"
                }, [
                  _createElementVNode(
                    "strong",
                    null,
                    _toDisplayString(item.title),
                    1
                    /* TEXT */
                  ),
                  _createElementVNode(
                    "span",
                    null,
                    _toDisplayString(item.reason),
                    1
                    /* TEXT */
                  )
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ]))
        ],
        4
        /* STYLE */
      )) : _createCommentVNode("v-if", true)
    ],
    64
    /* STABLE_FRAGMENT */
  );
}
_sfc_main.__hmrId = "63bc5343";
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
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/components/FloatingMenu.vue"]]);

//# sourceMappingURL=data:application/json;base64,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QUEsMEJBSGMsdUJBQWMsQ0FBdEIsU0FBSTtxQ0FBcEIsb0JBR1U7QUFBQSxrQkFIK0IsS0FBSyxLQUFLO0FBQUEsa0JBQUksT0FBTTtBQUFBO2tCQUMzRDtBQUFBLG9CQUFpQztBQUFBO0FBQUEscUNBQXRCLEtBQUssS0FBSztBQUFBO0FBQUE7QUFBQTtBQUFBLGtCQUNyQjtBQUFBLG9CQUE0RDtBQUFBO0FBQUEscUNBQW5ELEtBQUssVUFBVSxJQUFHLFFBQUcsaUJBQUcsS0FBSyxZQUFZO0FBQUE7QUFBQTtBQUFBO0FBQUE7Ozs7OytCQUl0RCxvQkFNVSxXQU5WLFlBTVU7QUFBQSxhQUxTLHVCQUFnQix3QkFBakMsYUFBZ0U7QUFBQTtjQUF2QixhQUFZO0FBQUE7K0JBQ3JEO0FBQUEsY0FHVTtBQUFBO0FBQUEsMEJBSGMsd0JBQWUsQ0FBdkIsU0FBSTtxQ0FBcEIsb0JBR1U7QUFBQSxrQkFIZ0MsS0FBSyxLQUFLO0FBQUEsa0JBQUksT0FBTTtBQUFBO2tCQUM1RDtBQUFBLG9CQUFpQztBQUFBO0FBQUEscUNBQXRCLEtBQUssS0FBSztBQUFBO0FBQUE7QUFBQTtBQUFBLGtCQUNyQjtBQUFBLG9CQUE4QjtBQUFBO0FBQUEscUNBQXJCLEtBQUssTUFBTTtBQUFBO0FBQUE7QUFBQTtBQUFBIiwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJGbG9hdGluZ01lbnUudnVlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQgc2V0dXAgbGFuZz1cInRzXCI+XHJcbmltcG9ydCB7IGNvbXB1dGVkLCBvbk1vdW50ZWQsIHJlZiB9IGZyb20gXCJ2dWVcIjtcclxuaW1wb3J0IHsgQ2xvc2UsIE5vdGVib29rLCBQb3NpdGlvbiB9IGZyb20gXCJAZWxlbWVudC1wbHVzL2ljb25zLXZ1ZVwiO1xyXG5pbXBvcnQgeyBjaGF0QXBpIH0gZnJvbSBcIkAvYXBpL21vZHVsZXMvY2hhdFwiO1xyXG5pbXBvcnQgeyBub3RlQXBpIH0gZnJvbSBcIkAvYXBpL21vZHVsZXMvbm90ZVwiO1xyXG5pbXBvcnQgeyBwcmFjdGljZUFwaSB9IGZyb20gXCJAL2FwaS9tb2R1bGVzL3ByYWN0aWNlXCI7XHJcbmltcG9ydCB7IHJlY29tbWVuZGF0aW9uc0FwaSB9IGZyb20gXCJAL2FwaS9tb2R1bGVzL3JlY29tbWVuZGF0aW9uc1wiO1xyXG5pbXBvcnQgeyBnZXRFcnJvck1lc3NhZ2UgfSBmcm9tIFwiQC9hcGkvY2xpZW50XCI7XHJcbmltcG9ydCB7XHJcbiAgYXBwU3RhdGUsXHJcbiAgY2xvc2VGbG9hdGluZ01lbnUsXHJcbiAgb3BlbkZsb2F0aW5nTWVudSxcclxuICBzd2l0Y2hGbG9hdGluZ1RhYixcclxuICB0b2dnbGVGbG9hdGluZ01lbnUsXHJcbiAgdXBkYXRlRmxvYXRpbmdQb3NpdGlvblxyXG59IGZyb20gXCJAL3N0b3Jlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE5vdGUgfSBmcm9tIFwiQC90eXBlcy9ub3RlXCI7XHJcbmltcG9ydCB0eXBlIHsgUHJhY3RpY2VRdWVzdGlvbiB9IGZyb20gXCJAL3R5cGVzL3ByYWN0aWNlXCI7XHJcbmltcG9ydCB0eXBlIHsgUmVzb3VyY2VSZWNvbW1lbmRhdGlvbiB9IGZyb20gXCJAL3R5cGVzL3Jlc291cmNlXCI7XHJcblxyXG5jb25zdCB1c2VySWQgPSBjb21wdXRlZCgoKSA9PiBhcHBTdGF0ZS5jdXJyZW50VXNlcj8uaWQgPz8gXCJ1c2VyX2RlbW9fMDAxXCIpO1xyXG5jb25zdCBjb3Vyc2VJZCA9IGNvbXB1dGVkKCgpID0+IGFwcFN0YXRlLmN1cnJlbnRDb3Vyc2U/LmlkID8/IFwiY291cnNlX2RzXzAwMVwiKTtcclxuY29uc3QgcXVlc3Rpb24gPSByZWYoXCJcIik7XHJcbmNvbnN0IGFuc3dlciA9IHJlZihcIlwiKTtcclxuY29uc3Qgbm90ZVRpdGxlID0gcmVmKFwiXCIpO1xyXG5jb25zdCBub3RlQ29udGVudCA9IHJlZihcIlwiKTtcclxuY29uc3Qgbm90ZXMgPSByZWY8Tm90ZVtdPihbXSk7XHJcbmNvbnN0IHdyb25nUXVlc3Rpb25zID0gcmVmPFByYWN0aWNlUXVlc3Rpb25bXT4oW10pO1xyXG5jb25zdCByZWNvbW1lbmRhdGlvbnMgPSByZWY8UmVzb3VyY2VSZWNvbW1lbmRhdGlvbltdPihbXSk7XHJcbmNvbnN0IGxvYWRpbmcgPSByZWYoZmFsc2UpO1xyXG5jb25zdCBlcnJvck1lc3NhZ2UgPSByZWYoXCJcIik7XHJcblxyXG5jb25zdCBwYW5lbFN0eWxlID0gY29tcHV0ZWQoKCkgPT4gKHtcclxuICByaWdodDogXCIyNHB4XCIsXHJcbiAgYm90dG9tOiBcIjg4cHhcIixcclxuICB3aWR0aDogYCR7YXBwU3RhdGUuZmxvYXRpbmdNZW51U3RhdGUud2lkdGh9cHhgLFxyXG4gIG1heFdpZHRoOiBcImNhbGMoMTAwdncgLSAzMnB4KVwiXHJcbn0pKTtcclxuXHJcbm9uTW91bnRlZCgoKSA9PiB7XHJcbiAgdm9pZCBsb2FkVGFiRGF0YSgpO1xyXG59KTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGxvYWRUYWJEYXRhKCkge1xyXG4gIGlmICghYXBwU3RhdGUuZmxvYXRpbmdNZW51U3RhdGUudmlzaWJsZSkgcmV0dXJuO1xyXG4gIGxvYWRpbmcudmFsdWUgPSB0cnVlO1xyXG4gIGVycm9yTWVzc2FnZS52YWx1ZSA9IFwiXCI7XHJcbiAgdHJ5IHtcclxuICAgIGlmIChhcHBTdGF0ZS5mbG9hdGluZ01lbnVTdGF0ZS5hY3RpdmVUYWIgPT09IFwibm90ZVwiKSB7XHJcbiAgICAgIG5vdGVzLnZhbHVlID0gKGF3YWl0IG5vdGVBcGkuZ2V0VXNlck5vdGVzKHVzZXJJZC52YWx1ZSkpLmRhdGE7XHJcbiAgICB9IGVsc2UgaWYgKGFwcFN0YXRlLmZsb2F0aW5nTWVudVN0YXRlLmFjdGl2ZVRhYiA9PT0gXCJ3cm9uZ19ib29rXCIpIHtcclxuICAgICAgd3JvbmdRdWVzdGlvbnMudmFsdWUgPSAoYXdhaXQgcHJhY3RpY2VBcGkuZ2V0V3JvbmdRdWVzdGlvbnModXNlcklkLnZhbHVlKSkuZGF0YTtcclxuICAgIH0gZWxzZSBpZiAoYXBwU3RhdGUuZmxvYXRpbmdNZW51U3RhdGUuYWN0aXZlVGFiID09PSBcInJlc291cmNlXCIpIHtcclxuICAgICAgcmVjb21tZW5kYXRpb25zLnZhbHVlID0gKGF3YWl0IHJlY29tbWVuZGF0aW9uc0FwaS5nZXRVc2VyUmVjb21tZW5kYXRpb25zKHVzZXJJZC52YWx1ZSkpLmRhdGE7XHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGVycm9yTWVzc2FnZS52YWx1ZSA9IGdldEVycm9yTWVzc2FnZShlcnJvcik7XHJcbiAgfSBmaW5hbGx5IHtcclxuICAgIGxvYWRpbmcudmFsdWUgPSBmYWxzZTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGFzaygpIHtcclxuICBjb25zdCBtZXNzYWdlID0gcXVlc3Rpb24udmFsdWUudHJpbSgpO1xyXG4gIGlmICghbWVzc2FnZSkgcmV0dXJuO1xyXG4gIGxvYWRpbmcudmFsdWUgPSB0cnVlO1xyXG4gIGVycm9yTWVzc2FnZS52YWx1ZSA9IFwiXCI7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY2hhdEFwaS5zZW5kTWVzc2FnZSh7XHJcbiAgICAgIHVzZXJJZDogdXNlcklkLnZhbHVlLFxyXG4gICAgICBjb3Vyc2VJZDogY291cnNlSWQudmFsdWUsXHJcbiAgICAgIG5vZGVJZDogYXBwU3RhdGUuc2VsZWN0ZWROb2RlSWQgPz8gdW5kZWZpbmVkLFxyXG4gICAgICBtZXNzYWdlLFxyXG4gICAgICB1c2VSYWc6IHRydWUsXHJcbiAgICAgIHVzZVByb2ZpbGU6IHRydWVcclxuICAgIH0pO1xyXG4gICAgYW5zd2VyLnZhbHVlID0gcmVzcG9uc2UuZGF0YS5hbnN3ZXI7XHJcbiAgICBxdWVzdGlvbi52YWx1ZSA9IFwiXCI7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGVycm9yTWVzc2FnZS52YWx1ZSA9IGdldEVycm9yTWVzc2FnZShlcnJvcik7XHJcbiAgfSBmaW5hbGx5IHtcclxuICAgIGxvYWRpbmcudmFsdWUgPSBmYWxzZTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHNhdmVOb3RlKCkge1xyXG4gIGlmICghbm90ZVRpdGxlLnZhbHVlLnRyaW0oKSB8fCAhbm90ZUNvbnRlbnQudmFsdWUudHJpbSgpKSByZXR1cm47XHJcbiAgbG9hZGluZy52YWx1ZSA9IHRydWU7XHJcbiAgZXJyb3JNZXNzYWdlLnZhbHVlID0gXCJcIjtcclxuICB0cnkge1xyXG4gICAgYXdhaXQgbm90ZUFwaS5jcmVhdGVOb3RlKHtcclxuICAgICAgdXNlcklkOiB1c2VySWQudmFsdWUsXHJcbiAgICAgIGNvdXJzZUlkOiBjb3Vyc2VJZC52YWx1ZSxcclxuICAgICAgbm9kZUlkOiBhcHBTdGF0ZS5zZWxlY3RlZE5vZGVJZCA/PyB1bmRlZmluZWQsXHJcbiAgICAgIHRpdGxlOiBub3RlVGl0bGUudmFsdWUudHJpbSgpLFxyXG4gICAgICBjb250ZW50OiBub3RlQ29udGVudC52YWx1ZS50cmltKCksXHJcbiAgICAgIHRhZ3M6IFtcImZsb2F0aW5nXCJdXHJcbiAgICB9KTtcclxuICAgIG5vdGVUaXRsZS52YWx1ZSA9IFwiXCI7XHJcbiAgICBub3RlQ29udGVudC52YWx1ZSA9IFwiXCI7XHJcbiAgICBub3Rlcy52YWx1ZSA9IChhd2FpdCBub3RlQXBpLmdldFVzZXJOb3Rlcyh1c2VySWQudmFsdWUpKS5kYXRhO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBlcnJvck1lc3NhZ2UudmFsdWUgPSBnZXRFcnJvck1lc3NhZ2UoZXJyb3IpO1xyXG4gIH0gZmluYWxseSB7XHJcbiAgICBsb2FkaW5nLnZhbHVlID0gZmFsc2U7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjaGFuZ2VUYWIodGFiOiB0eXBlb2YgYXBwU3RhdGUuZmxvYXRpbmdNZW51U3RhdGUuYWN0aXZlVGFiKSB7XHJcbiAgc3dpdGNoRmxvYXRpbmdUYWIodGFiKTtcclxuICB2b2lkIGxvYWRUYWJEYXRhKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVQYW5lbCgpIHtcclxuICB1cGRhdGVGbG9hdGluZ1Bvc2l0aW9uKGFwcFN0YXRlLmZsb2F0aW5nTWVudVN0YXRlLnBvc2l0aW9uWCwgYXBwU3RhdGUuZmxvYXRpbmdNZW51U3RhdGUucG9zaXRpb25ZKTtcclxufVxyXG48L3NjcmlwdD5cclxuXHJcbjx0ZW1wbGF0ZT5cclxuICA8YnV0dG9uIGNsYXNzPVwiZmxvYXRpbmctdHJpZ2dlclwiIHR5cGU9XCJidXR0b25cIiBAY2xpY2s9XCJ0b2dnbGVGbG9hdGluZ01lbnVcIj5cclxuICAgIDxlbC1pY29uPjxOb3RlYm9vayAvPjwvZWwtaWNvbj5cclxuICAgIOWtpuS5oOS+p+agj1xyXG4gIDwvYnV0dG9uPlxyXG5cclxuICA8c2VjdGlvbiB2LWlmPVwiYXBwU3RhdGUuZmxvYXRpbmdNZW51U3RhdGUudmlzaWJsZVwiIGNsYXNzPVwiZmxvYXRpbmctcGFuZWxcIiA6c3R5bGU9XCJwYW5lbFN0eWxlXCI+XHJcbiAgICA8aGVhZGVyIGNsYXNzPVwiZmxvYXRpbmctaGVhZGVyXCI+XHJcbiAgICAgIDxzdHJvbmc+5a2m5Lmg5rWu56qXPC9zdHJvbmc+XHJcbiAgICAgIDxkaXY+XHJcbiAgICAgICAgPGVsLWJ1dHRvbiBzaXplPVwic21hbGxcIiB0ZXh0IDppY29uPVwiUG9zaXRpb25cIiBAY2xpY2s9XCJtb3ZlUGFuZWxcIj7lrprkvY08L2VsLWJ1dHRvbj5cclxuICAgICAgICA8ZWwtYnV0dG9uIHNpemU9XCJzbWFsbFwiIHRleHQgOmljb249XCJDbG9zZVwiIEBjbGljaz1cImNsb3NlRmxvYXRpbmdNZW51XCI+5YWz6ZetPC9lbC1idXR0b24+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgPC9oZWFkZXI+XHJcblxyXG4gICAgPG5hdiBjbGFzcz1cImZsb2F0aW5nLXRhYnNcIiBhcmlhLWxhYmVsPVwi5rWu56qX5qCH562+XCI+XHJcbiAgICAgIDxidXR0b25cclxuICAgICAgICB2LWZvcj1cInRhYiBpbiBbXHJcbiAgICAgICAgICB7IGtleTogJ3FhJywgbGFiZWw6ICfmj5Dpl64nIH0sXHJcbiAgICAgICAgICB7IGtleTogJ25vdGUnLCBsYWJlbDogJ+eslOiusCcgfSxcclxuICAgICAgICAgIHsga2V5OiAnd3JvbmdfYm9vaycsIGxhYmVsOiAn6ZSZ6aKYJyB9LFxyXG4gICAgICAgICAgeyBrZXk6ICdyZXNvdXJjZScsIGxhYmVsOiAn6LWE5rqQJyB9XHJcbiAgICAgICAgXVwiXHJcbiAgICAgICAgOmtleT1cInRhYi5rZXlcIlxyXG4gICAgICAgIHR5cGU9XCJidXR0b25cIlxyXG4gICAgICAgIDpjbGFzcz1cInsgYWN0aXZlOiBhcHBTdGF0ZS5mbG9hdGluZ01lbnVTdGF0ZS5hY3RpdmVUYWIgPT09IHRhYi5rZXkgfVwiXHJcbiAgICAgICAgQGNsaWNrPVwiY2hhbmdlVGFiKHRhYi5rZXkgYXMgdHlwZW9mIGFwcFN0YXRlLmZsb2F0aW5nTWVudVN0YXRlLmFjdGl2ZVRhYilcIlxyXG4gICAgICA+XHJcbiAgICAgICAge3sgdGFiLmxhYmVsIH19XHJcbiAgICAgIDwvYnV0dG9uPlxyXG4gICAgPC9uYXY+XHJcblxyXG4gICAgPGVsLWFsZXJ0IHYtaWY9XCJlcnJvck1lc3NhZ2VcIiA6dGl0bGU9XCJlcnJvck1lc3NhZ2VcIiB0eXBlPVwiZXJyb3JcIiBzaG93LWljb24gOmNsb3NhYmxlPVwiZmFsc2VcIiAvPlxyXG4gICAgPGVsLXNrZWxldG9uIHYtaWY9XCJsb2FkaW5nXCIgOnJvd3M9XCIzXCIgYW5pbWF0ZWQgLz5cclxuXHJcbiAgICA8c2VjdGlvbiB2LWVsc2UtaWY9XCJhcHBTdGF0ZS5mbG9hdGluZ01lbnVTdGF0ZS5hY3RpdmVUYWIgPT09ICdxYSdcIiBjbGFzcz1cImZsb2F0aW5nLWJvZHlcIj5cclxuICAgICAgPGVsLWlucHV0IHYtbW9kZWw9XCJxdWVzdGlvblwiIHR5cGU9XCJ0ZXh0YXJlYVwiIDpyb3dzPVwiM1wiIHBsYWNlaG9sZGVyPVwi6Zeu5LiA5Liq5b2T5YmN55+l6K+G54K56Zeu6aKYXCIgYXJpYS1sYWJlbD1cIua1rueql+mXrumimFwiIC8+XHJcbiAgICAgIDxlbC1idXR0b24gdHlwZT1cInByaW1hcnlcIiA6bG9hZGluZz1cImxvYWRpbmdcIiA6ZGlzYWJsZWQ9XCIhcXVlc3Rpb24udHJpbSgpXCIgQGNsaWNrPVwiYXNrXCI+5Y+R6YCB6Zeu6aKYPC9lbC1idXR0b24+XHJcbiAgICAgIDxwIHYtaWY9XCJhbnN3ZXJcIiBjbGFzcz1cImZsb2F0aW5nLWFuc3dlclwiPnt7IGFuc3dlciB9fTwvcD5cclxuICAgIDwvc2VjdGlvbj5cclxuXHJcbiAgICA8c2VjdGlvbiB2LWVsc2UtaWY9XCJhcHBTdGF0ZS5mbG9hdGluZ01lbnVTdGF0ZS5hY3RpdmVUYWIgPT09ICdub3RlJ1wiIGNsYXNzPVwiZmxvYXRpbmctYm9keVwiPlxyXG4gICAgICA8ZWwtaW5wdXQgdi1tb2RlbD1cIm5vdGVUaXRsZVwiIHBsYWNlaG9sZGVyPVwi56yU6K6w5qCH6aKYXCIgYXJpYS1sYWJlbD1cIueslOiusOagh+mimFwiIC8+XHJcbiAgICAgIDxlbC1pbnB1dCB2LW1vZGVsPVwibm90ZUNvbnRlbnRcIiB0eXBlPVwidGV4dGFyZWFcIiA6cm93cz1cIjNcIiBwbGFjZWhvbGRlcj1cIuiusOW9leW9k+WJjeeWkemXruaIlue7k+iuulwiIGFyaWEtbGFiZWw9XCLnrJTorrDlhoXlrrlcIiAvPlxyXG4gICAgICA8ZWwtYnV0dG9uIHR5cGU9XCJwcmltYXJ5XCIgOmxvYWRpbmc9XCJsb2FkaW5nXCIgOmRpc2FibGVkPVwiIW5vdGVUaXRsZS50cmltKCkgfHwgIW5vdGVDb250ZW50LnRyaW0oKVwiIEBjbGljaz1cInNhdmVOb3RlXCI+5L+d5a2Y56yU6K6wPC9lbC1idXR0b24+XHJcbiAgICAgIDxhcnRpY2xlIHYtZm9yPVwibm90ZSBpbiBub3Rlc1wiIDprZXk9XCJub3RlLmlkXCIgY2xhc3M9XCJtaW5pLWxpc3QtaXRlbVwiPlxyXG4gICAgICAgIDxzdHJvbmc+e3sgbm90ZS50aXRsZSB9fTwvc3Ryb25nPlxyXG4gICAgICAgIDxzcGFuPnt7IG5vdGUuY29udGVudCB9fTwvc3Bhbj5cclxuICAgICAgPC9hcnRpY2xlPlxyXG4gICAgPC9zZWN0aW9uPlxyXG5cclxuICAgIDxzZWN0aW9uIHYtZWxzZS1pZj1cImFwcFN0YXRlLmZsb2F0aW5nTWVudVN0YXRlLmFjdGl2ZVRhYiA9PT0gJ3dyb25nX2Jvb2snXCIgY2xhc3M9XCJmbG9hdGluZy1ib2R5XCI+XHJcbiAgICAgIDxlbC1lbXB0eSB2LWlmPVwiIXdyb25nUXVlc3Rpb25zLmxlbmd0aFwiIGRlc2NyaXB0aW9uPVwi5pqC5peg6ZSZ6aKYXCIgLz5cclxuICAgICAgPGFydGljbGUgdi1mb3I9XCJpdGVtIGluIHdyb25nUXVlc3Rpb25zXCIgOmtleT1cIml0ZW0uaWRcIiBjbGFzcz1cIm1pbmktbGlzdC1pdGVtXCI+XHJcbiAgICAgICAgPHN0cm9uZz57eyBpdGVtLnRpdGxlIH19PC9zdHJvbmc+XHJcbiAgICAgICAgPHNwYW4+e3sgaXRlbS5kaWZmaWN1bHR5IH19IMK3IHt7IGl0ZW0ucXVlc3Rpb25UeXBlIH19PC9zcGFuPlxyXG4gICAgICA8L2FydGljbGU+XHJcbiAgICA8L3NlY3Rpb24+XHJcblxyXG4gICAgPHNlY3Rpb24gdi1lbHNlIGNsYXNzPVwiZmxvYXRpbmctYm9keVwiPlxyXG4gICAgICA8ZWwtZW1wdHkgdi1pZj1cIiFyZWNvbW1lbmRhdGlvbnMubGVuZ3RoXCIgZGVzY3JpcHRpb249XCLmmoLml6DmjqjojZDotYTmupBcIiAvPlxyXG4gICAgICA8YXJ0aWNsZSB2LWZvcj1cIml0ZW0gaW4gcmVjb21tZW5kYXRpb25zXCIgOmtleT1cIml0ZW0uaWRcIiBjbGFzcz1cIm1pbmktbGlzdC1pdGVtXCI+XHJcbiAgICAgICAgPHN0cm9uZz57eyBpdGVtLnRpdGxlIH19PC9zdHJvbmc+XHJcbiAgICAgICAgPHNwYW4+e3sgaXRlbS5yZWFzb24gfX08L3NwYW4+XHJcbiAgICAgIDwvYXJ0aWNsZT5cclxuICAgIDwvc2VjdGlvbj5cclxuICA8L3NlY3Rpb24+XHJcbjwvdGVtcGxhdGU+XHJcbiJdLCJmaWxlIjoiRDovZmlyc3Rtb25leS9ub2RlbGVhcm4tYWkvZnJvbnRlbmQvc3JjL2NvbXBvbmVudHMvRmxvYXRpbmdNZW51LnZ1ZSJ9