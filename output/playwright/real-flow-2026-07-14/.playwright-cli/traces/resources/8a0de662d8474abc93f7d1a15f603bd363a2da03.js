import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/layout/AcademicTopbar.vue");import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { InfoFilled, Menu, SwitchButton } from "/node_modules/.vite/deps/@element-plus_icons-vue.js?v=dfeb8a9b";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "AcademicTopbar",
  props: {
    title: { type: String, required: true },
    courses: { type: Array, required: true },
    nodes: { type: Array, required: true },
    selectedCourseId: { type: String, required: false },
    selectedNodeId: { type: [String, null], required: false },
    username: { type: String, required: true },
    course: { type: [Object, null], required: false },
    node: { type: [Object, null], required: false },
    profile: { type: [Object, null], required: false },
    loading: { type: Boolean, required: false },
    error: { type: String, required: false }
  },
  emits: ["courseChange", "nodeChange", "openSidebar", "openContext", "logout"],
  setup(__props, { expose: __expose, emit: __emit }) {
    __expose();
    const emit = __emit;
    function handleCourseChange(value) {
      if (typeof value === "string") emit("courseChange", value);
    }
    function handleNodeChange(value) {
      emit("nodeChange", typeof value === "string" ? value : "");
    }
    const __returned__ = { emit, handleCourseChange, handleNodeChange, get InfoFilled() {
      return InfoFilled;
    }, get Menu() {
      return Menu;
    }, get SwitchButton() {
      return SwitchButton;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { resolveComponent as _resolveComponent, createVNode as _createVNode, createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, renderList as _renderList, Fragment as _Fragment, createElementBlock as _createElementBlock, withCtx as _withCtx, createTextVNode as _createTextVNode } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _hoisted_1 = { class: "app-topbar" };
const _hoisted_2 = { class: "topbar-heading" };
const _hoisted_3 = { class: "topbar-title" };
const _hoisted_4 = { class: "topbar-controls" };
const _hoisted_5 = { class: "user-chip" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_button = _resolveComponent("el-button");
  const _component_el_alert = _resolveComponent("el-alert");
  const _component_el_option = _resolveComponent("el-option");
  const _component_el_select = _resolveComponent("el-select");
  const _component_el_icon = _resolveComponent("el-icon");
  return _openBlock(), _createElementBlock("header", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _createVNode(_component_el_button, {
        class: "sidebar-mobile-toggle",
        plain: "",
        icon: $setup.Menu,
        "aria-label": "打开项目栏",
        onClick: _cache[0] || (_cache[0] = ($event) => $setup.emit("openSidebar"))
      }, null, 8, ["icon"]),
      _createElementVNode("div", _hoisted_3, [
        _cache[3] || (_cache[3] = _createElementVNode(
          "p",
          null,
          "NodeLearn 学习平台",
          -1
          /* CACHED */
        )),
        _createElementVNode(
          "h1",
          null,
          _toDisplayString($props.title),
          1
          /* TEXT */
        )
      ])
    ]),
    _createElementVNode("div", _hoisted_4, [
      $props.error ? (_openBlock(), _createBlock(_component_el_alert, {
        key: 0,
        title: $props.error,
        type: "warning",
        "show-icon": "",
        closable: false
      }, null, 8, ["title"])) : _createCommentVNode("v-if", true),
      _createVNode(_component_el_select, {
        class: "topbar-select",
        "model-value": $props.selectedCourseId,
        loading: $props.loading,
        filterable: "",
        placeholder: "选择课程",
        "aria-label": "选择课程",
        onChange: $setup.handleCourseChange
      }, {
        default: _withCtx(() => [
          (_openBlock(true), _createElementBlock(
            _Fragment,
            null,
            _renderList($props.courses, (course) => {
              return _openBlock(), _createBlock(_component_el_option, {
                key: course.id,
                label: course.name,
                value: course.id
              }, null, 8, ["label", "value"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ]),
        _: 1
        /* STABLE */
      }, 8, ["model-value", "loading"]),
      _createVNode(_component_el_select, {
        class: "topbar-select",
        "model-value": $props.selectedNodeId ?? void 0,
        filterable: "",
        clearable: "",
        placeholder: "选择知识点",
        "aria-label": "选择知识点",
        onChange: $setup.handleNodeChange
      }, {
        default: _withCtx(() => [
          (_openBlock(true), _createElementBlock(
            _Fragment,
            null,
            _renderList($props.nodes, (node) => {
              return _openBlock(), _createBlock(_component_el_option, {
                key: node.id,
                label: node.name,
                value: node.id
              }, null, 8, ["label", "value"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ]),
        _: 1
        /* STABLE */
      }, 8, ["model-value"]),
      _createElementVNode(
        "span",
        _hoisted_5,
        _toDisplayString($props.username),
        1
        /* TEXT */
      ),
      _createElementVNode("button", {
        type: "button",
        class: "top-context-card",
        onClick: _cache[1] || (_cache[1] = ($event) => $setup.emit("openContext"))
      }, [
        _createVNode(_component_el_icon, null, {
          default: _withCtx(() => [
            _createVNode($setup["InfoFilled"])
          ]),
          _: 1
          /* STABLE */
        }),
        _createElementVNode("span", null, [
          _createElementVNode(
            "strong",
            null,
            _toDisplayString($props.course?.name ?? "数据结构"),
            1
            /* TEXT */
          ),
          _createElementVNode(
            "small",
            null,
            _toDisplayString($props.node?.name ?? $props.profile?.learningProgress ?? "查看学习上下文"),
            1
            /* TEXT */
          )
        ])
      ]),
      _createVNode(_component_el_button, {
        plain: "",
        size: "small",
        icon: $setup.SwitchButton,
        onClick: _cache[2] || (_cache[2] = ($event) => $setup.emit("logout"))
      }, {
        default: _withCtx(() => [..._cache[4] || (_cache[4] = [
          _createTextVNode(
            "退出",
            -1
            /* CACHED */
          )
        ])]),
        _: 1
        /* STABLE */
      }, 8, ["icon"])
    ])
  ]);
}
_sfc_main.__hmrId = "a3834699";
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
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/components/layout/AcademicTopbar.vue"]]);

//# sourceMappingURL=data:application/json;base64,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ZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJBY2FkZW1pY1RvcGJhci52dWUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdCBzZXR1cCBsYW5nPVwidHNcIj5cbmltcG9ydCB7IEluZm9GaWxsZWQsIE1lbnUsIFN3aXRjaEJ1dHRvbiB9IGZyb20gXCJAZWxlbWVudC1wbHVzL2ljb25zLXZ1ZVwiO1xuaW1wb3J0IHR5cGUgeyBDb3Vyc2UsIEtub3dsZWRnZU5vZGUgfSBmcm9tIFwiQC90eXBlcy9jb3Vyc2VcIjtcbmltcG9ydCB0eXBlIHsgU3R1ZGVudFByb2ZpbGUgfSBmcm9tIFwiQC90eXBlcy9wcm9maWxlXCI7XG5cbmRlZmluZVByb3BzPHtcbiAgdGl0bGU6IHN0cmluZztcbiAgY291cnNlczogQ291cnNlW107XG4gIG5vZGVzOiBLbm93bGVkZ2VOb2RlW107XG4gIHNlbGVjdGVkQ291cnNlSWQ/OiBzdHJpbmc7XG4gIHNlbGVjdGVkTm9kZUlkPzogc3RyaW5nIHwgbnVsbDtcbiAgdXNlcm5hbWU6IHN0cmluZztcbiAgY291cnNlPzogQ291cnNlIHwgbnVsbDtcbiAgbm9kZT86IEtub3dsZWRnZU5vZGUgfCBudWxsO1xuICBwcm9maWxlPzogU3R1ZGVudFByb2ZpbGUgfCBudWxsO1xuICBsb2FkaW5nPzogYm9vbGVhbjtcbiAgZXJyb3I/OiBzdHJpbmc7XG59PigpO1xuXG5jb25zdCBlbWl0ID0gZGVmaW5lRW1pdHM8e1xuICBjb3Vyc2VDaGFuZ2U6IFtjb3Vyc2VJZDogc3RyaW5nXTtcbiAgbm9kZUNoYW5nZTogW25vZGVJZDogc3RyaW5nXTtcbiAgb3BlblNpZGViYXI6IFtdO1xuICBvcGVuQ29udGV4dDogW107XG4gIGxvZ291dDogW107XG59PigpO1xuXHJcbmZ1bmN0aW9uIGhhbmRsZUNvdXJzZUNoYW5nZSh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XHJcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgZW1pdChcImNvdXJzZUNoYW5nZVwiLCB2YWx1ZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZU5vZGVDaGFuZ2UodmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCkge1xyXG4gIGVtaXQoXCJub2RlQ2hhbmdlXCIsIHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHZhbHVlIDogXCJcIik7XHJcbn1cclxuPC9zY3JpcHQ+XHJcblxyXG48dGVtcGxhdGU+XG4gIDxoZWFkZXIgY2xhc3M9XCJhcHAtdG9wYmFyXCI+XG4gICAgPGRpdiBjbGFzcz1cInRvcGJhci1oZWFkaW5nXCI+XG4gICAgICA8ZWwtYnV0dG9uIGNsYXNzPVwic2lkZWJhci1tb2JpbGUtdG9nZ2xlXCIgcGxhaW4gOmljb249XCJNZW51XCIgYXJpYS1sYWJlbD1cIuaJk+W8gOmhueebruagj1wiIEBjbGljaz1cImVtaXQoJ29wZW5TaWRlYmFyJylcIiAvPlxuICAgICAgPGRpdiBjbGFzcz1cInRvcGJhci10aXRsZVwiPlxuICAgICAgICA8cD5Ob2RlTGVhcm4g5a2m5Lmg5bmz5Y+wPC9wPlxuICAgICAgICA8aDE+e3sgdGl0bGUgfX08L2gxPlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG5cbiAgICA8ZGl2IGNsYXNzPVwidG9wYmFyLWNvbnRyb2xzXCI+XG4gICAgICA8ZWwtYWxlcnQgdi1pZj1cImVycm9yXCIgOnRpdGxlPVwiZXJyb3JcIiB0eXBlPVwid2FybmluZ1wiIHNob3ctaWNvbiA6Y2xvc2FibGU9XCJmYWxzZVwiIC8+XG4gICAgICA8ZWwtc2VsZWN0XHJcbiAgICAgICAgY2xhc3M9XCJ0b3BiYXItc2VsZWN0XCJcclxuICAgICAgICA6bW9kZWwtdmFsdWU9XCJzZWxlY3RlZENvdXJzZUlkXCJcclxuICAgICAgICA6bG9hZGluZz1cImxvYWRpbmdcIlxyXG4gICAgICAgIGZpbHRlcmFibGVcclxuICAgICAgICBwbGFjZWhvbGRlcj1cIumAieaLqeivvueoi1wiXHJcbiAgICAgICAgYXJpYS1sYWJlbD1cIumAieaLqeivvueoi1wiXHJcbiAgICAgICAgQGNoYW5nZT1cImhhbmRsZUNvdXJzZUNoYW5nZVwiXHJcbiAgICAgID5cclxuICAgICAgICA8ZWwtb3B0aW9uIHYtZm9yPVwiY291cnNlIGluIGNvdXJzZXNcIiA6a2V5PVwiY291cnNlLmlkXCIgOmxhYmVsPVwiY291cnNlLm5hbWVcIiA6dmFsdWU9XCJjb3Vyc2UuaWRcIiAvPlxyXG4gICAgICA8L2VsLXNlbGVjdD5cclxuICAgICAgPGVsLXNlbGVjdFxyXG4gICAgICAgIGNsYXNzPVwidG9wYmFyLXNlbGVjdFwiXHJcbiAgICAgICAgOm1vZGVsLXZhbHVlPVwic2VsZWN0ZWROb2RlSWQgPz8gdW5kZWZpbmVkXCJcclxuICAgICAgICBmaWx0ZXJhYmxlXHJcbiAgICAgICAgY2xlYXJhYmxlXHJcbiAgICAgICAgcGxhY2Vob2xkZXI9XCLpgInmi6nnn6Xor4bngrlcIlxyXG4gICAgICAgIGFyaWEtbGFiZWw9XCLpgInmi6nnn6Xor4bngrlcIlxyXG4gICAgICAgIEBjaGFuZ2U9XCJoYW5kbGVOb2RlQ2hhbmdlXCJcclxuICAgICAgPlxuICAgICAgICA8ZWwtb3B0aW9uIHYtZm9yPVwibm9kZSBpbiBub2Rlc1wiIDprZXk9XCJub2RlLmlkXCIgOmxhYmVsPVwibm9kZS5uYW1lXCIgOnZhbHVlPVwibm9kZS5pZFwiIC8+XG4gICAgICA8L2VsLXNlbGVjdD5cbiAgICAgIDxzcGFuIGNsYXNzPVwidXNlci1jaGlwXCI+e3sgdXNlcm5hbWUgfX08L3NwYW4+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInRvcC1jb250ZXh0LWNhcmRcIiBAY2xpY2s9XCJlbWl0KCdvcGVuQ29udGV4dCcpXCI+XG4gICAgICAgIDxlbC1pY29uPjxJbmZvRmlsbGVkIC8+PC9lbC1pY29uPlxuICAgICAgICA8c3Bhbj5cbiAgICAgICAgICA8c3Ryb25nPnt7IGNvdXJzZT8ubmFtZSA/PyBcIuaVsOaNrue7k+aehFwiIH19PC9zdHJvbmc+XG4gICAgICAgICAgPHNtYWxsPnt7IG5vZGU/Lm5hbWUgPz8gcHJvZmlsZT8ubGVhcm5pbmdQcm9ncmVzcyA/PyBcIuafpeeci+WtpuS5oOS4iuS4i+aWh1wiIH19PC9zbWFsbD5cbiAgICAgICAgPC9zcGFuPlxuICAgICAgPC9idXR0b24+XG4gICAgICA8ZWwtYnV0dG9uIHBsYWluIHNpemU9XCJzbWFsbFwiIDppY29uPVwiU3dpdGNoQnV0dG9uXCIgQGNsaWNrPVwiZW1pdCgnbG9nb3V0JylcIj7pgIDlh7o8L2VsLWJ1dHRvbj5cbiAgICA8L2Rpdj5cbiAgPC9oZWFkZXI+XG48L3RlbXBsYXRlPlxuIl0sImZpbGUiOiJEOi9maXJzdG1vbmV5L25vZGVsZWFybi1haS9mcm9udGVuZC9zcmMvY29tcG9uZW50cy9sYXlvdXQvQWNhZGVtaWNUb3BiYXIudnVlIn0=