import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/LoginPage.vue");import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { computed, reactive, ref } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { useRoute, useRouter } from "/node_modules/.vite/deps/vue-router.js?v=d8ae4e15";
import { authApi } from "/src/api/modules/auth.ts";
import { usersApi } from "/src/api/modules/users.ts";
import { getErrorMessage } from "/src/api/client.ts";
import { setCurrentUser } from "/src/stores/index.ts";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "LoginPage",
  setup(__props, { expose: __expose }) {
    __expose();
    const router = useRouter();
    const route = useRoute();
    const loading = ref(false);
    const errorMessage = ref("");
    const form = reactive({
      username: "demo_student",
      password: "demo_password"
    });
    const canSubmit = computed(() => form.username.trim().length > 0 && form.password.trim().length > 0);
    async function login() {
      if (!canSubmit.value) return;
      loading.value = true;
      errorMessage.value = "";
      try {
        const tokenResponse = await authApi.login({
          username: form.username.trim(),
          password: form.password.trim()
        });
        localStorage.setItem("accessToken", tokenResponse.data.accessToken);
        localStorage.setItem("refreshToken", tokenResponse.data.refreshToken);
        const userResponse = await usersApi.getCurrentUser();
        setCurrentUser(userResponse.data);
        await router.push(route.query.redirect ?? "/home");
      } catch (error) {
        errorMessage.value = getErrorMessage(error);
      } finally {
        loading.value = false;
      }
    }
    function fillDemo() {
      form.username = "demo_student";
      form.password = "demo_password";
    }
    const __returned__ = { router, route, loading, errorMessage, form, canSubmit, login, fillDemo };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { createElementVNode as _createElementVNode, resolveComponent as _resolveComponent, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, createVNode as _createVNode, withCtx as _withCtx, withModifiers as _withModifiers, withKeys as _withKeys, createTextVNode as _createTextVNode, createElementBlock as _createElementBlock } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _hoisted_1 = { class: "login-page" };
const _hoisted_2 = { class: "login-hero" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_alert = _resolveComponent("el-alert");
  const _component_el_input = _resolveComponent("el-input");
  const _component_el_form_item = _resolveComponent("el-form-item");
  const _component_el_button = _resolveComponent("el-button");
  const _component_el_form = _resolveComponent("el-form");
  const _component_el_card = _resolveComponent("el-card");
  return _openBlock(), _createElementBlock("main", _hoisted_1, [
    _createElementVNode("section", _hoisted_2, [
      _cache[5] || (_cache[5] = _createElementVNode(
        "div",
        { class: "login-copy" },
        [
          _createElementVNode("h1", null, "NodeLearn"),
          _createElementVNode("p", null, "面向数据结构课程的个性化学习工作台。"),
          _createElementVNode("ul", null, [
            _createElementVNode("li", null, "真实连接后端 API，不默认使用本地 Mock。"),
            _createElementVNode("li", null, "画像、路径、资源、练习和报告全链路可演示。"),
            _createElementVNode("li", null, "后端不可用时显示明确错误状态。")
          ])
        ],
        -1
        /* CACHED */
      )),
      _createVNode(_component_el_card, {
        class: "login-card",
        shadow: "never"
      }, {
        header: _withCtx(() => [..._cache[2] || (_cache[2] = [
          _createElementVNode(
            "div",
            null,
            [
              _createElementVNode("h2", null, "登录学习空间"),
              _createElementVNode("p", null, "使用后端认证接口进入系统")
            ],
            -1
            /* CACHED */
          )
        ])]),
        default: _withCtx(() => [
          $setup.errorMessage ? (_openBlock(), _createBlock(_component_el_alert, {
            key: 0,
            title: $setup.errorMessage,
            type: "error",
            "show-icon": "",
            closable: false,
            class: "mb-16"
          }, null, 8, ["title"])) : _createCommentVNode("v-if", true),
          _createVNode(_component_el_form, {
            "label-position": "top",
            onSubmit: _withModifiers($setup.login, ["prevent"])
          }, {
            default: _withCtx(() => [
              _createVNode(_component_el_form_item, { label: "用户名" }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_input, {
                    modelValue: $setup.form.username,
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.form.username = $event),
                    modelModifiers: { trim: true },
                    autocomplete: "username",
                    placeholder: "demo_student"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_el_form_item, { label: "密码" }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_input, {
                    modelValue: $setup.form.password,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.form.password = $event),
                    modelModifiers: { trim: true },
                    autocomplete: "current-password",
                    placeholder: "demo_password",
                    "show-password": "",
                    onKeydown: _withKeys(_withModifiers($setup.login, ["prevent"]), ["enter"])
                  }, null, 8, ["modelValue", "onKeydown"])
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_el_button, {
                type: "primary",
                size: "large",
                loading: $setup.loading,
                disabled: !$setup.canSubmit,
                onClick: $setup.login
              }, {
                default: _withCtx(() => [..._cache[3] || (_cache[3] = [
                  _createTextVNode(
                    " 登录 ",
                    -1
                    /* CACHED */
                  )
                ])]),
                _: 1
                /* STABLE */
              }, 8, ["loading", "disabled"]),
              _createVNode(_component_el_button, {
                size: "large",
                plain: "",
                onClick: $setup.fillDemo
              }, {
                default: _withCtx(() => [..._cache[4] || (_cache[4] = [
                  _createTextVNode(
                    "填入演示账号",
                    -1
                    /* CACHED */
                  )
                ])]),
                _: 1
                /* STABLE */
              })
            ]),
            _: 1
            /* STABLE */
          })
        ]),
        _: 1
        /* STABLE */
      })
    ])
  ]);
}
_sfc_main.__hmrId = "b018d9b2";
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
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/pages/LoginPage.vue"]]);

//# sourceMappingURL=data:application/json;base64,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TUU7QUFBQSxnQ0FMYyxZQUFLO0FBQUEsaUZBQUwsWUFBSyxXQUFRO0FBQUEsb0NBQTNCO0FBQUEsb0JBQ0EsY0FBYTtBQUFBLG9CQUNiLGFBQVk7QUFBQSxvQkFDWjtBQUFBLG9CQUNDLFdBQU8seUJBQWdCLGNBQUs7QUFBQTs7Ozs7Y0FHakMsYUFFWTtBQUFBLGdCQUZELE1BQUs7QUFBQSxnQkFBVSxNQUFLO0FBQUEsZ0JBQVMsU0FBUztBQUFBLGdCQUFVLFVBQVEsQ0FBRztBQUFBLGdCQUFZLFNBQU87QUFBQTtrQ0FBTyxNQUVoRztBQUFBO29CQUZnRztBQUFBLG9CQUVoRztBQUFBO0FBQUE7QUFBQTs7OztjQUNBLGFBQWtFO0FBQUEsZ0JBQXZELE1BQUs7QUFBQSxnQkFBUTtBQUFBLGdCQUFPLFNBQU87QUFBQTtrQ0FBVSxNQUFNO0FBQUE7b0JBQU47QUFBQSxvQkFBTTtBQUFBO0FBQUE7QUFBQSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiTG9naW5QYWdlLnZ1ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0IHNldHVwIGxhbmc9XCJ0c1wiPlxyXG5pbXBvcnQgeyBjb21wdXRlZCwgcmVhY3RpdmUsIHJlZiB9IGZyb20gXCJ2dWVcIjtcclxuaW1wb3J0IHsgdXNlUm91dGUsIHVzZVJvdXRlciB9IGZyb20gXCJ2dWUtcm91dGVyXCI7XHJcbmltcG9ydCB7IGF1dGhBcGkgfSBmcm9tIFwiQC9hcGkvbW9kdWxlcy9hdXRoXCI7XHJcbmltcG9ydCB7IHVzZXJzQXBpIH0gZnJvbSBcIkAvYXBpL21vZHVsZXMvdXNlcnNcIjtcclxuaW1wb3J0IHsgZ2V0RXJyb3JNZXNzYWdlIH0gZnJvbSBcIkAvYXBpL2NsaWVudFwiO1xyXG5pbXBvcnQgeyBzZXRDdXJyZW50VXNlciB9IGZyb20gXCJAL3N0b3Jlc1wiO1xyXG5cclxuY29uc3Qgcm91dGVyID0gdXNlUm91dGVyKCk7XHJcbmNvbnN0IHJvdXRlID0gdXNlUm91dGUoKTtcclxuY29uc3QgbG9hZGluZyA9IHJlZihmYWxzZSk7XHJcbmNvbnN0IGVycm9yTWVzc2FnZSA9IHJlZihcIlwiKTtcclxuY29uc3QgZm9ybSA9IHJlYWN0aXZlKHtcclxuICB1c2VybmFtZTogXCJkZW1vX3N0dWRlbnRcIixcclxuICBwYXNzd29yZDogXCJkZW1vX3Bhc3N3b3JkXCJcclxufSk7XHJcblxyXG5jb25zdCBjYW5TdWJtaXQgPSBjb21wdXRlZCgoKSA9PiBmb3JtLnVzZXJuYW1lLnRyaW0oKS5sZW5ndGggPiAwICYmIGZvcm0ucGFzc3dvcmQudHJpbSgpLmxlbmd0aCA+IDApO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gbG9naW4oKSB7XHJcbiAgaWYgKCFjYW5TdWJtaXQudmFsdWUpIHJldHVybjtcclxuICBsb2FkaW5nLnZhbHVlID0gdHJ1ZTtcclxuICBlcnJvck1lc3NhZ2UudmFsdWUgPSBcIlwiO1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB0b2tlblJlc3BvbnNlID0gYXdhaXQgYXV0aEFwaS5sb2dpbih7XHJcbiAgICAgIHVzZXJuYW1lOiBmb3JtLnVzZXJuYW1lLnRyaW0oKSxcclxuICAgICAgcGFzc3dvcmQ6IGZvcm0ucGFzc3dvcmQudHJpbSgpXHJcbiAgICB9KTtcclxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiYWNjZXNzVG9rZW5cIiwgdG9rZW5SZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuKTtcclxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicmVmcmVzaFRva2VuXCIsIHRva2VuUmVzcG9uc2UuZGF0YS5yZWZyZXNoVG9rZW4pO1xyXG4gICAgY29uc3QgdXNlclJlc3BvbnNlID0gYXdhaXQgdXNlcnNBcGkuZ2V0Q3VycmVudFVzZXIoKTtcclxuICAgIHNldEN1cnJlbnRVc2VyKHVzZXJSZXNwb25zZS5kYXRhKTtcclxuICAgIGF3YWl0IHJvdXRlci5wdXNoKChyb3V0ZS5xdWVyeS5yZWRpcmVjdCBhcyBzdHJpbmcgfCB1bmRlZmluZWQpID8/IFwiL2hvbWVcIik7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGVycm9yTWVzc2FnZS52YWx1ZSA9IGdldEVycm9yTWVzc2FnZShlcnJvcik7XHJcbiAgfSBmaW5hbGx5IHtcclxuICAgIGxvYWRpbmcudmFsdWUgPSBmYWxzZTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbGxEZW1vKCkge1xyXG4gIGZvcm0udXNlcm5hbWUgPSBcImRlbW9fc3R1ZGVudFwiO1xyXG4gIGZvcm0ucGFzc3dvcmQgPSBcImRlbW9fcGFzc3dvcmRcIjtcclxufVxyXG48L3NjcmlwdD5cclxuXHJcbjx0ZW1wbGF0ZT5cclxuICA8bWFpbiBjbGFzcz1cImxvZ2luLXBhZ2VcIj5cclxuICAgIDxzZWN0aW9uIGNsYXNzPVwibG9naW4taGVyb1wiPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwibG9naW4tY29weVwiPlxyXG4gICAgICAgIDxoMT5Ob2RlTGVhcm48L2gxPlxyXG4gICAgICAgIDxwPumdouWQkeaVsOaNrue7k+aehOivvueoi+eahOS4quaAp+WMluWtpuS5oOW3peS9nOWPsOOAgjwvcD5cclxuICAgICAgICA8dWw+XHJcbiAgICAgICAgICA8bGk+55yf5a6e6L+e5o6l5ZCO56uvIEFQSe+8jOS4jem7mOiupOS9v+eUqOacrOWcsCBNb2Nr44CCPC9saT5cclxuICAgICAgICAgIDxsaT7nlLvlg4/jgIHot6/lvoTjgIHotYTmupDjgIHnu4PkuaDlkozmiqXlkYrlhajpk77ot6/lj6/mvJTnpLrjgII8L2xpPlxyXG4gICAgICAgICAgPGxpPuWQjuerr+S4jeWPr+eUqOaXtuaYvuekuuaYjuehrumUmeivr+eKtuaAgeOAgjwvbGk+XHJcbiAgICAgICAgPC91bD5cclxuICAgICAgPC9kaXY+XHJcblxyXG4gICAgICA8ZWwtY2FyZCBjbGFzcz1cImxvZ2luLWNhcmRcIiBzaGFkb3c9XCJuZXZlclwiPlxyXG4gICAgICAgIDx0ZW1wbGF0ZSAjaGVhZGVyPlxyXG4gICAgICAgICAgPGRpdj5cclxuICAgICAgICAgICAgPGgyPueZu+W9leWtpuS5oOepuumXtDwvaDI+XHJcbiAgICAgICAgICAgIDxwPuS9v+eUqOWQjuerr+iupOivgeaOpeWPo+i/m+WFpeezu+e7nzwvcD5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvdGVtcGxhdGU+XHJcblxyXG4gICAgICAgIDxlbC1hbGVydFxyXG4gICAgICAgICAgdi1pZj1cImVycm9yTWVzc2FnZVwiXHJcbiAgICAgICAgICA6dGl0bGU9XCJlcnJvck1lc3NhZ2VcIlxyXG4gICAgICAgICAgdHlwZT1cImVycm9yXCJcclxuICAgICAgICAgIHNob3ctaWNvblxyXG4gICAgICAgICAgOmNsb3NhYmxlPVwiZmFsc2VcIlxyXG4gICAgICAgICAgY2xhc3M9XCJtYi0xNlwiXHJcbiAgICAgICAgLz5cclxuXHJcbiAgICAgICAgPGVsLWZvcm0gbGFiZWwtcG9zaXRpb249XCJ0b3BcIiBAc3VibWl0LnByZXZlbnQ9XCJsb2dpblwiPlxyXG4gICAgICAgICAgPGVsLWZvcm0taXRlbSBsYWJlbD1cIueUqOaIt+WQjVwiPlxyXG4gICAgICAgICAgICA8ZWwtaW5wdXQgdi1tb2RlbC50cmltPVwiZm9ybS51c2VybmFtZVwiIGF1dG9jb21wbGV0ZT1cInVzZXJuYW1lXCIgcGxhY2Vob2xkZXI9XCJkZW1vX3N0dWRlbnRcIiAvPlxyXG4gICAgICAgICAgPC9lbC1mb3JtLWl0ZW0+XHJcbiAgICAgICAgICA8ZWwtZm9ybS1pdGVtIGxhYmVsPVwi5a+G56CBXCI+XHJcbiAgICAgICAgICAgIDxlbC1pbnB1dFxyXG4gICAgICAgICAgICAgIHYtbW9kZWwudHJpbT1cImZvcm0ucGFzc3dvcmRcIlxyXG4gICAgICAgICAgICAgIGF1dG9jb21wbGV0ZT1cImN1cnJlbnQtcGFzc3dvcmRcIlxyXG4gICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiZGVtb19wYXNzd29yZFwiXHJcbiAgICAgICAgICAgICAgc2hvdy1wYXNzd29yZFxyXG4gICAgICAgICAgICAgIEBrZXlkb3duLmVudGVyLnByZXZlbnQ9XCJsb2dpblwiXHJcbiAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICA8L2VsLWZvcm0taXRlbT5cclxuICAgICAgICAgIDxlbC1idXR0b24gdHlwZT1cInByaW1hcnlcIiBzaXplPVwibGFyZ2VcIiA6bG9hZGluZz1cImxvYWRpbmdcIiA6ZGlzYWJsZWQ9XCIhY2FuU3VibWl0XCIgQGNsaWNrPVwibG9naW5cIj5cclxuICAgICAgICAgICAg55m75b2VXHJcbiAgICAgICAgICA8L2VsLWJ1dHRvbj5cclxuICAgICAgICAgIDxlbC1idXR0b24gc2l6ZT1cImxhcmdlXCIgcGxhaW4gQGNsaWNrPVwiZmlsbERlbW9cIj7loavlhaXmvJTnpLrotKblj7c8L2VsLWJ1dHRvbj5cclxuICAgICAgICA8L2VsLWZvcm0+XHJcbiAgICAgIDwvZWwtY2FyZD5cclxuICAgIDwvc2VjdGlvbj5cclxuICA8L21haW4+XHJcbjwvdGVtcGxhdGU+XHJcbiJdLCJmaWxlIjoiRDovZmlyc3Rtb25leS9ub2RlbGVhcm4tYWkvZnJvbnRlbmQvc3JjL3BhZ2VzL0xvZ2luUGFnZS52dWUifQ==