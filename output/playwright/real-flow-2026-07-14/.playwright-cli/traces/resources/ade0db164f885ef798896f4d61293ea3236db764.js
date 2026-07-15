import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/dev/AgentFlowTestPage.vue");import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false, "VITE_API_BASE_URL": "http://localhost:8000/api/v1", "VITE_APP_NAME": "NodeLearn AI", "VITE_ENABLE_MOCK": "false", "VITE_ENABLE_STREAM": "true", "VITE_GRAPH_RENDERER": "echarts"};import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { computed, ref } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { agentApi } from "/src/api/modules/agent.ts";
import { practiceApi } from "/src/api/modules/practice.ts";
import MindMapViewer from "/src/components/mind-map/MindMapViewer.vue";
import VideoLessonPlayer from "/src/components/VideoLessonPlayer.vue";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "AgentFlowTestPage",
  setup(__props, { expose: __expose }) {
    __expose();
    const testConfig = {
      userId: "user_demo_001",
      courseId: "course_ds_001",
      nodeId: "node_stack_001"
    };
    const demoProfile = {
      id: "profile_demo_001",
      userId: "user_demo_001",
      major: "计算机科学与技术",
      grade: "大二",
      currentCourseId: "course_ds_001",
      learningGoal: "准备数据结构期末考试",
      knowledgeBaseLevel: "easy",
      learningProgress: "数组和链表已学完，正在复习栈",
      weakNodeIds: ["node_stack_001", "node_recursion_001"],
      cognitiveStyle: "diagram",
      practicePreference: "coding",
      resourcePreference: ["lecture_doc", "mind_map", "practice_question", "code_case"],
      commonMistakes: ["栈顶边界判断遗漏", "递归终止条件错误", "数组下标越界"],
      availableStudyTime: "每天晚上30分钟",
      profileSummary: "学生具备基础编程能力，正在补强栈和递归，偏好图解和代码练习。",
      confidenceScore: 0.82,
      lastUpdatedBy: "manual",
      createdAt: "2026-05-28T10:00:00Z",
      updatedAt: "2026-05-28T10:00:00Z"
    };
    const taskStatuses = ["pending", "running", "success", "failed", "cancelled"];
    const agentTypes = [
      "profile_agent",
      "planner_agent",
      "qa_agent",
      "resource_agent",
      "practice_agent",
      "multimodal_agent",
      "safety_agent"
    ];
    const callStatus = ref("idle");
    const errorMessage = ref("");
    const currentTitle = ref("等待测试");
    const currentRequest = ref(null);
    const currentResponse = ref(null);
    const currentAgentResult = ref(null);
    const currentChatResult = ref(null);
    const currentWorkflowResult = ref(null);
    const testLogs = ref([]);
    const answers = ref({});
    const submittedRecords = ref({});
    const naturalLanguageMessage = ref(
      "我是计算机专业大二学生，正在复习数据结构。请结合 Hello 算法材料解释栈为什么后进先出，并生成三道题、思维导图和讲解视频。"
    );
    const mockEnabled = computed(() => import.meta.env.VITE_ENABLE_MOCK === "true");
    const practiceQuestions = computed(() => {
      const questions = currentAgentResult.value?.output?.questions;
      return Array.isArray(questions) ? questions : [];
    });
    const workflowQuestions = computed(() => {
      const questions = currentWorkflowResult.value?.finalOutput?.questions;
      return Array.isArray(questions) ? questions : [];
    });
    const workflowResources = computed(() => {
      const resources = currentWorkflowResult.value?.finalOutput?.generatedResources;
      return Array.isArray(resources) ? resources : [];
    });
    const workflowMindMaps = computed(
      () => workflowResources.value.filter((resource) => resource.resourceType === "mind_map")
    );
    const workflowVideos = computed(() => workflowResources.value.filter(isVideoResource));
    function asRecord(value) {
      return value && typeof value === "object" ? value : {};
    }
    function formatJson(value) {
      return JSON.stringify(value ?? null, null, 2);
    }
    function addLog(log) {
      testLogs.value.unshift({
        ...log,
        id: `log_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    function validateApiResponse(response) {
      const value = response;
      if (typeof value.code === "undefined" || typeof value.message === "undefined" || typeof value.data === "undefined" || typeof value.traceId === "undefined" || typeof value.timestamp === "undefined") {
        return "返回结构不符合 ApiResponse<T> 或 AgentRunResult";
      }
      return null;
    }
    function validateAgentResponse(response, agentType) {
      const baseError = validateApiResponse(response);
      if (baseError) return baseError;
      if (response.data.agentType !== agentType || !taskStatuses.includes(response.data.status)) {
        return "返回结构不符合 ApiResponse<T> 或 AgentRunResult";
      }
      return null;
    }
    function validateWorkflowResponse(response) {
      const baseError = validateApiResponse(response);
      if (baseError) return baseError;
      if (!taskStatuses.includes(response.data.status)) {
        return "返回结构不符合 ApiResponse<T> 或 AgentRunResult";
      }
      return null;
    }
    function buildAgentRequest(agentType) {
      const base = {
        userId: testConfig.userId,
        courseId: testConfig.courseId,
        nodeId: testConfig.nodeId,
        agentType,
        context: {
          profile: demoProfile
        }
      };
      if (agentType === "profile_agent") {
        return {
          ...base,
          input: {
            mode: "analyze_profile",
            message: naturalLanguageMessage.value
          }
        };
      }
      if (agentType === "planner_agent") {
        return {
          ...base,
          input: {
            targetGoal: "准备数据结构期末考试",
            timeBudget: "每天30分钟",
            weakNodeIds: ["node_stack_001", "node_recursion_001"],
            profileAnalysis: {
              learningStage: "基础补强阶段",
              riskLevel: "medium",
              preferredResourceTypes: ["mind_map", "code_case", "practice_question"]
            }
          }
        };
      }
      if (agentType === "qa_agent") {
        return {
          ...base,
          input: {
            message: naturalLanguageMessage.value,
            useRag: true,
            useProfile: true
          }
        };
      }
      if (agentType === "resource_agent") {
        return {
          ...base,
          input: {
            resourceTypes: ["lecture_doc", "mind_map", "practice_question", "code_case"],
            difficulty: "medium",
            learningGoal: "准备数据结构期末考试",
            customRequirement: "偏图解和代码案例，适合每天30分钟学习"
          }
        };
      }
      if (agentType === "multimodal_agent") {
        return {
          ...base,
          input: {
            resourceTypes: ["mind_map"],
            topic: "栈",
            difficulty: "medium"
          }
        };
      }
      if (agentType === "safety_agent") {
        return {
          ...base,
          input: {
            targetType: "resource",
            targetId: "resource_stack_demo_001",
            content: "栈遵循后进先出原则，入栈和出栈都在栈顶进行。"
          }
        };
      }
      return {
        ...base,
        input: {
          mode: "generate",
          questionTypes: ["single_choice", "short_answer", "coding"],
          difficulty: "medium",
          count: 3
        }
      };
    }
    function buildWorkflowRequest() {
      return {
        userId: testConfig.userId,
        courseId: testConfig.courseId,
        nodeId: testConfig.nodeId,
        workflowType: "resource_generate",
        input: {
          profile: demoProfile,
          message: naturalLanguageMessage.value,
          targetGoal: "准备数据结构期末考试",
          timeBudget: "每天30分钟",
          weakNodeIds: ["node_stack_001", "node_recursion_001"],
          resourceTypes: ["lecture_doc"],
          questionTypes: ["single_choice", "short_answer", "coding"],
          difficulty: "medium",
          count: 3,
          multimodalResourceTypes: ["mind_map", "video_script", "animation_script"]
        }
      };
    }
    async function runSingleAgent(agentType) {
      const request = buildAgentRequest(agentType);
      callStatus.value = "loading";
      errorMessage.value = "";
      currentTitle.value = `测试 ${agentType}`;
      currentRequest.value = request;
      currentResponse.value = null;
      currentAgentResult.value = null;
      currentChatResult.value = null;
      currentWorkflowResult.value = null;
      try {
        const response = await agentApi.runAgent(request);
        const validationError = validateAgentResponse(response, agentType);
        currentResponse.value = response;
        currentAgentResult.value = response.data;
        callStatus.value = validationError ? "failed" : "success";
        errorMessage.value = validationError ?? "";
        addLog({
          title: currentTitle.value,
          agentType,
          status: validationError ? "failed" : "success",
          request,
          response,
          errorMessage: validationError ?? void 0
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "接口调用失败";
        callStatus.value = "failed";
        errorMessage.value = message;
        addLog({
          title: currentTitle.value,
          agentType,
          status: "failed",
          request,
          errorMessage: message
        });
      }
    }
    async function runWorkflow() {
      const request = buildWorkflowRequest();
      callStatus.value = "loading";
      errorMessage.value = "";
      currentTitle.value = "一键测试完整链路";
      currentRequest.value = request;
      currentResponse.value = null;
      currentAgentResult.value = null;
      currentChatResult.value = null;
      currentWorkflowResult.value = null;
      try {
        const response = await agentApi.runWorkflow(request);
        const validationError = validateWorkflowResponse(response);
        currentResponse.value = response;
        currentWorkflowResult.value = response.data;
        callStatus.value = validationError ? "failed" : "success";
        errorMessage.value = validationError ?? "";
        addLog({
          title: currentTitle.value,
          status: validationError ? "failed" : "success",
          request,
          response,
          errorMessage: validationError ?? void 0
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "接口调用失败";
        callStatus.value = "failed";
        errorMessage.value = message;
        addLog({
          title: currentTitle.value,
          status: "failed",
          request,
          errorMessage: message
        });
      }
    }
    async function runRagChat() {
      const request = {
        userId: testConfig.userId,
        courseId: testConfig.courseId,
        nodeId: testConfig.nodeId,
        message: naturalLanguageMessage.value,
        useRag: true,
        useProfile: true
      };
      callStatus.value = "loading";
      errorMessage.value = "";
      currentTitle.value = "真实 RAG 问答";
      currentRequest.value = request;
      currentResponse.value = null;
      currentAgentResult.value = null;
      currentChatResult.value = null;
      currentWorkflowResult.value = null;
      try {
        const response = await agentApi.sendChat(request);
        const validationError = validateApiResponse(response);
        currentResponse.value = response;
        currentChatResult.value = response.data;
        callStatus.value = validationError ? "failed" : "success";
        errorMessage.value = validationError ?? "";
        addLog({
          title: currentTitle.value,
          status: validationError ? "failed" : "success",
          request,
          response,
          errorMessage: validationError ?? void 0
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "RAG 问答失败";
        callStatus.value = "failed";
        errorMessage.value = message;
        addLog({
          title: currentTitle.value,
          status: "failed",
          request,
          errorMessage: message
        });
      }
    }
    async function submitPracticeAnswer(question) {
      const payload = {
        userId: testConfig.userId,
        questionId: question.id,
        userAnswer: answers.value[question.id] || question.answer,
        durationSeconds: 30
      };
      callStatus.value = "loading";
      errorMessage.value = "";
      currentTitle.value = `模拟提交答案：${question.title}`;
      currentRequest.value = payload;
      try {
        const response = await practiceApi.submitAnswer(payload);
        const validationError = validateApiResponse(response);
        currentResponse.value = response;
        submittedRecords.value[question.id] = response.data;
        callStatus.value = validationError ? "failed" : "success";
        errorMessage.value = validationError ?? "";
        addLog({
          title: currentTitle.value,
          status: validationError ? "failed" : "success",
          request: payload,
          response,
          errorMessage: validationError ?? void 0
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "提交答案失败";
        callStatus.value = "failed";
        errorMessage.value = message;
        addLog({
          title: currentTitle.value,
          status: "failed",
          request: payload,
          errorMessage: message
        });
      }
    }
    function outputValue(key) {
      return asRecord(currentAgentResult.value?.output)[key];
    }
    function isVideoResource(resource) {
      return resource.resourceType === "video_script" || resource.resourceType === "animation_script";
    }
    const __returned__ = { testConfig, demoProfile, taskStatuses, agentTypes, callStatus, errorMessage, currentTitle, currentRequest, currentResponse, currentAgentResult, currentChatResult, currentWorkflowResult, testLogs, answers, submittedRecords, naturalLanguageMessage, mockEnabled, practiceQuestions, workflowQuestions, workflowResources, workflowMindMaps, workflowVideos, asRecord, formatJson, addLog, validateApiResponse, validateAgentResponse, validateWorkflowResponse, buildAgentRequest, buildWorkflowRequest, runSingleAgent, runWorkflow, runRagChat, submitPracticeAnswer, outputValue, isVideoResource, MindMapViewer, VideoLessonPlayer };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _hoisted_1 = { class: "agent-test-page" };
const _hoisted_2 = { class: "agent-test-header" };
const _hoisted_3 = { class: "agent-test-layout" };
const _hoisted_4 = { class: "left-column" };
const _hoisted_5 = { class: "json-block" };
const _hoisted_6 = { class: "action-row" };
const _hoisted_7 = { class: "button-grid" };
const _hoisted_8 = { class: "right-column" };
const _hoisted_9 = { class: "card-header" };
const _hoisted_10 = { class: "split-panel" };
const _hoisted_11 = { class: "json-block" };
const _hoisted_12 = { class: "json-block" };
const _hoisted_13 = {
  key: 0,
  class: "summary-section"
};
const _hoisted_14 = { class: "inline-json" };
const _hoisted_15 = { class: "json-block compact" };
const _hoisted_16 = { class: "inline-json" };
const _hoisted_17 = { class: "json-block compact" };
const _hoisted_18 = { class: "json-block compact" };
const _hoisted_19 = { class: "json-block compact" };
const _hoisted_20 = { class: "json-block compact" };
const _hoisted_21 = ["src"];
const _hoisted_22 = {
  key: 2,
  class: "json-block compact"
};
const _hoisted_23 = { class: "json-block compact" };
const _hoisted_24 = { class: "answer-row" };
const _hoisted_25 = {
  key: 0,
  class: "json-block compact"
};
const _hoisted_26 = { class: "json-block compact" };
const _hoisted_27 = { class: "json-block compact" };
const _hoisted_28 = {
  key: 1,
  class: "summary-section"
};
const _hoisted_29 = { class: "json-block compact" };
const _hoisted_30 = {
  key: 2,
  class: "summary-section"
};
const _hoisted_31 = { class: "inline-json" };
const _hoisted_32 = { class: "workflow-grid" };
const _hoisted_33 = { class: "card-header" };
const _hoisted_34 = {
  key: 0,
  class: "error-text"
};
const _hoisted_35 = { class: "json-block compact" };
const _hoisted_36 = ["src"];
const _hoisted_37 = { class: "log-section" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_tag = _resolveComponent("el-tag");
  const _component_el_descriptions_item = _resolveComponent("el-descriptions-item");
  const _component_el_descriptions = _resolveComponent("el-descriptions");
  const _component_el_card = _resolveComponent("el-card");
  const _component_el_input = _resolveComponent("el-input");
  const _component_el_button = _resolveComponent("el-button");
  const _component_el_alert = _resolveComponent("el-alert");
  const _component_el_empty = _resolveComponent("el-empty");
  const _component_el_table_column = _resolveComponent("el-table-column");
  const _component_el_table = _resolveComponent("el-table");
  return _openBlock(), _createElementBlock("main", _hoisted_1, [
    _createElementVNode("header", _hoisted_2, [
      _cache[1] || (_cache[1] = _createElementVNode(
        "div",
        null,
        [
          _createElementVNode("p", { class: "eyebrow" }, "Dev Test"),
          _createElementVNode("h1", null, "NodeLearn AI 智能体链路测试面板")
        ],
        -1
        /* CACHED */
      )),
      _createVNode(_component_el_tag, {
        type: $setup.mockEnabled ? "warning" : "success",
        size: "large"
      }, {
        default: _withCtx(() => [
          _createTextVNode(
            _toDisplayString($setup.mockEnabled ? "Mock 模式" : "真实后端"),
            1
            /* TEXT */
          )
        ]),
        _: 1
        /* STABLE */
      }, 8, ["type"])
    ]),
    _createElementVNode("section", _hoisted_3, [
      _createElementVNode("aside", _hoisted_4, [
        _createVNode(_component_el_card, { shadow: "never" }, {
          header: _withCtx(() => [..._cache[2] || (_cache[2] = [
            _createTextVNode(
              "测试配置区",
              -1
              /* CACHED */
            )
          ])]),
          default: _withCtx(() => [
            _createVNode(_component_el_descriptions, {
              column: 1,
              border: "",
              size: "small"
            }, {
              default: _withCtx(() => [
                _createVNode(_component_el_descriptions_item, { label: "userId" }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString($setup.testConfig.userId),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_el_descriptions_item, { label: "courseId" }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString($setup.testConfig.courseId),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }),
                _createVNode(_component_el_descriptions_item, { label: "nodeId" }, {
                  default: _withCtx(() => [
                    _createTextVNode(
                      _toDisplayString($setup.testConfig.nodeId),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                })
              ]),
              _: 1
              /* STABLE */
            }),
            _cache[3] || (_cache[3] = _createElementVNode(
              "h3",
              null,
              "Demo StudentProfile",
              -1
              /* CACHED */
            )),
            _createElementVNode(
              "pre",
              _hoisted_5,
              _toDisplayString($setup.formatJson($setup.demoProfile)),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        }),
        _createVNode(_component_el_card, { shadow: "never" }, {
          header: _withCtx(() => [..._cache[4] || (_cache[4] = [
            _createTextVNode(
              "自然语言入口",
              -1
              /* CACHED */
            )
          ])]),
          default: _withCtx(() => [
            _createVNode(_component_el_input, {
              modelValue: $setup.naturalLanguageMessage,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.naturalLanguageMessage = $event),
              type: "textarea",
              rows: 6
            }, null, 8, ["modelValue"]),
            _createElementVNode("div", _hoisted_6, [
              _createVNode(_component_el_button, {
                type: "primary",
                loading: $setup.callStatus === "loading",
                onClick: $setup.runRagChat
              }, {
                default: _withCtx(() => [..._cache[5] || (_cache[5] = [
                  _createTextVNode(
                    " 真实 RAG 问答 ",
                    -1
                    /* CACHED */
                  )
                ])]),
                _: 1
                /* STABLE */
              }, 8, ["loading"])
            ])
          ]),
          _: 1
          /* STABLE */
        }),
        _createVNode(_component_el_card, { shadow: "never" }, {
          header: _withCtx(() => [..._cache[6] || (_cache[6] = [
            _createTextVNode(
              "单智能体测试区",
              -1
              /* CACHED */
            )
          ])]),
          default: _withCtx(() => [
            _createElementVNode("div", _hoisted_7, [
              (_openBlock(), _createElementBlock(
                _Fragment,
                null,
                _renderList($setup.agentTypes, (agentType) => {
                  return _createVNode(_component_el_button, {
                    key: agentType,
                    type: "primary",
                    loading: $setup.callStatus === "loading",
                    onClick: ($event) => $setup.runSingleAgent(agentType)
                  }, {
                    default: _withCtx(() => [
                      _createTextVNode(
                        " 测试 " + _toDisplayString(agentType),
                        1
                        /* TEXT */
                      )
                    ]),
                    _: 2
                    /* DYNAMIC */
                  }, 1032, ["loading", "onClick"]);
                }),
                64
                /* STABLE_FRAGMENT */
              ))
            ])
          ]),
          _: 1
          /* STABLE */
        }),
        _createVNode(_component_el_card, { shadow: "never" }, {
          header: _withCtx(() => [..._cache[7] || (_cache[7] = [
            _createTextVNode(
              "多智能体工作流测试区",
              -1
              /* CACHED */
            )
          ])]),
          default: _withCtx(() => [
            _createVNode(_component_el_button, {
              type: "success",
              loading: $setup.callStatus === "loading",
              onClick: $setup.runWorkflow
            }, {
              default: _withCtx(() => [..._cache[8] || (_cache[8] = [
                _createTextVNode(
                  " 自然语言完整工作流 ",
                  -1
                  /* CACHED */
                )
              ])]),
              _: 1
              /* STABLE */
            }, 8, ["loading"])
          ]),
          _: 1
          /* STABLE */
        })
      ]),
      _createElementVNode("section", _hoisted_8, [
        _createVNode(_component_el_card, { shadow: "never" }, {
          header: _withCtx(() => [
            _createElementVNode("div", _hoisted_9, [
              _cache[9] || (_cache[9] = _createElementVNode(
                "span",
                null,
                "结果展示区",
                -1
                /* CACHED */
              )),
              _createVNode(_component_el_tag, null, {
                default: _withCtx(() => [
                  _createTextVNode(
                    _toDisplayString($setup.callStatus),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })
            ])
          ]),
          default: _withCtx(() => [
            _createElementVNode(
              "h2",
              null,
              _toDisplayString($setup.currentTitle),
              1
              /* TEXT */
            ),
            _createElementVNode("div", _hoisted_10, [
              _createElementVNode("section", null, [
                _cache[10] || (_cache[10] = _createElementVNode(
                  "h3",
                  null,
                  "请求 JSON",
                  -1
                  /* CACHED */
                )),
                _createElementVNode(
                  "pre",
                  _hoisted_11,
                  _toDisplayString($setup.formatJson($setup.currentRequest)),
                  1
                  /* TEXT */
                )
              ]),
              _createElementVNode("section", null, [
                _cache[11] || (_cache[11] = _createElementVNode(
                  "h3",
                  null,
                  "响应 JSON",
                  -1
                  /* CACHED */
                )),
                _createElementVNode(
                  "pre",
                  _hoisted_12,
                  _toDisplayString($setup.formatJson($setup.currentResponse)),
                  1
                  /* TEXT */
                )
              ])
            ]),
            $setup.currentAgentResult ? (_openBlock(), _createElementBlock("section", _hoisted_13, [
              _cache[27] || (_cache[27] = _createElementVNode(
                "h3",
                null,
                "智能体输出摘要",
                -1
                /* CACHED */
              )),
              $setup.currentAgentResult.agentType === "profile_agent" ? (_openBlock(), _createBlock(_component_el_card, {
                key: 0,
                shadow: "never"
              }, {
                header: _withCtx(() => [..._cache[12] || (_cache[12] = [
                  _createTextVNode(
                    "画像分析卡片",
                    -1
                    /* CACHED */
                  )
                ])]),
                default: _withCtx(() => [
                  _createVNode(_component_el_descriptions, {
                    column: 1,
                    border: "",
                    size: "small"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_el_descriptions_item, { label: "学习阶段" }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString($setup.outputValue("learningStage")),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      _createVNode(_component_el_descriptions_item, { label: "风险等级" }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString($setup.outputValue("riskLevel")),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      _createVNode(_component_el_descriptions_item, { label: "薄弱点总结" }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString($setup.outputValue("weakNodeSummary")),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      _createVNode(_component_el_descriptions_item, { label: "推荐资源类型" }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString($setup.formatJson($setup.outputValue("preferredResourceTypes"))),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      _createVNode(_component_el_descriptions_item, { label: "推荐题型" }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString($setup.formatJson($setup.outputValue("recommendedQuestionTypes"))),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      _createVNode(_component_el_descriptions_item, { label: "给 planner_agent 的 nextAgentInput" }, {
                        default: _withCtx(() => [
                          _createElementVNode(
                            "pre",
                            _hoisted_14,
                            _toDisplayString($setup.formatJson($setup.outputValue("nextAgentInput"))),
                            1
                            /* TEXT */
                          )
                        ]),
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
              })) : _createCommentVNode("v-if", true),
              $setup.currentAgentResult.agentType === "planner_agent" ? (_openBlock(), _createBlock(_component_el_card, {
                key: 1,
                shadow: "never"
              }, {
                header: _withCtx(() => [..._cache[13] || (_cache[13] = [
                  _createTextVNode(
                    "学习路径卡片",
                    -1
                    /* CACHED */
                  )
                ])]),
                default: _withCtx(() => [
                  _createVNode(_component_el_descriptions, {
                    column: 1,
                    border: "",
                    size: "small"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_el_descriptions_item, { label: "LearningPath.title" }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString($setup.outputValue("learningPath")?.title),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      _createVNode(_component_el_descriptions_item, { label: "LearningPath.currentStage" }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString($setup.outputValue("learningPath")?.currentStage),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      _createVNode(_component_el_descriptions_item, { label: "LearningPath.targetGoal" }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString($setup.outputValue("learningPath")?.targetGoal),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      _createVNode(_component_el_descriptions_item, { label: "LearningPath.pathNodeIds" }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString($setup.formatJson($setup.outputValue("learningPath")?.pathNodeIds)),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      _createVNode(_component_el_descriptions_item, { label: "planningReason" }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString($setup.outputValue("planningReason")),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      })
                    ]),
                    _: 1
                    /* STABLE */
                  }),
                  _cache[14] || (_cache[14] = _createElementVNode(
                    "h4",
                    null,
                    "LearningTask 列表",
                    -1
                    /* CACHED */
                  )),
                  _createElementVNode(
                    "pre",
                    _hoisted_15,
                    _toDisplayString($setup.formatJson($setup.outputValue("learningTasks"))),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : _createCommentVNode("v-if", true),
              $setup.currentAgentResult.agentType === "resource_agent" ? (_openBlock(), _createBlock(_component_el_card, {
                key: 2,
                shadow: "never"
              }, {
                header: _withCtx(() => [..._cache[15] || (_cache[15] = [
                  _createTextVNode(
                    "资源推荐卡片",
                    -1
                    /* CACHED */
                  )
                ])]),
                default: _withCtx(() => [
                  _createVNode(_component_el_descriptions, {
                    column: 1,
                    border: "",
                    size: "small"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_el_descriptions_item, { label: "resourcePlan" }, {
                        default: _withCtx(() => [
                          _createElementVNode(
                            "pre",
                            _hoisted_16,
                            _toDisplayString($setup.formatJson($setup.outputValue("resourcePlan"))),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      _createVNode(_component_el_descriptions_item, { label: "resourceIds" }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString($setup.formatJson($setup.outputValue("resourceIds"))),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      _createVNode(_component_el_descriptions_item, { label: "auditStatus" }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString($setup.outputValue("auditStatus")),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 1
                        /* STABLE */
                      })
                    ]),
                    _: 1
                    /* STABLE */
                  }),
                  _cache[16] || (_cache[16] = _createElementVNode(
                    "h4",
                    null,
                    "recommendations",
                    -1
                    /* CACHED */
                  )),
                  _createElementVNode(
                    "pre",
                    _hoisted_17,
                    _toDisplayString($setup.formatJson($setup.outputValue("recommendations"))),
                    1
                    /* TEXT */
                  ),
                  _cache[17] || (_cache[17] = _createElementVNode(
                    "h4",
                    null,
                    "pushRecords",
                    -1
                    /* CACHED */
                  )),
                  _createElementVNode(
                    "pre",
                    _hoisted_18,
                    _toDisplayString($setup.formatJson($setup.outputValue("pushRecords"))),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : _createCommentVNode("v-if", true),
              $setup.currentAgentResult.agentType === "qa_agent" ? (_openBlock(), _createBlock(_component_el_card, {
                key: 3,
                shadow: "never"
              }, {
                header: _withCtx(() => [..._cache[18] || (_cache[18] = [
                  _createTextVNode(
                    "问答智能体结果",
                    -1
                    /* CACHED */
                  )
                ])]),
                default: _withCtx(() => [
                  _createElementVNode(
                    "p",
                    null,
                    _toDisplayString($setup.outputValue("answer")),
                    1
                    /* TEXT */
                  ),
                  _cache[19] || (_cache[19] = _createElementVNode(
                    "h4",
                    null,
                    "usedAgentTypes",
                    -1
                    /* CACHED */
                  )),
                  _createElementVNode(
                    "pre",
                    _hoisted_19,
                    _toDisplayString($setup.formatJson($setup.outputValue("usedAgentTypes"))),
                    1
                    /* TEXT */
                  ),
                  _cache[20] || (_cache[20] = _createElementVNode(
                    "h4",
                    null,
                    "retrievedDocuments",
                    -1
                    /* CACHED */
                  )),
                  _createElementVNode(
                    "pre",
                    _hoisted_20,
                    _toDisplayString($setup.formatJson($setup.outputValue("retrievedDocuments"))),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : _createCommentVNode("v-if", true),
              $setup.currentAgentResult.agentType === "multimodal_agent" ? (_openBlock(), _createBlock(_component_el_card, {
                key: 4,
                shadow: "never"
              }, {
                header: _withCtx(() => [..._cache[21] || (_cache[21] = [
                  _createTextVNode(
                    "多模态资源卡片",
                    -1
                    /* CACHED */
                  )
                ])]),
                default: _withCtx(() => [
                  (_openBlock(true), _createElementBlock(
                    _Fragment,
                    null,
                    _renderList($setup.outputValue("generatedResources") || [], (resource) => {
                      return _openBlock(), _createElementBlock("div", {
                        key: resource.id,
                        class: "resource-preview"
                      }, [
                        _createElementVNode(
                          "h4",
                          null,
                          _toDisplayString(resource.title) + " / " + _toDisplayString(resource.resourceType),
                          1
                          /* TEXT */
                        ),
                        resource.resourceType === "mind_map" ? (_openBlock(), _createBlock($setup["MindMapViewer"], {
                          key: 0,
                          content: resource.content
                        }, null, 8, ["content"])) : $setup.isVideoResource(resource) ? (_openBlock(), _createElementBlock(
                          _Fragment,
                          { key: 1 },
                          [
                            resource.fileUrl ? (_openBlock(), _createElementBlock("video", {
                              key: 0,
                              class: "mp4-player",
                              src: resource.fileUrl,
                              controls: ""
                            }, null, 8, _hoisted_21)) : _createCommentVNode("v-if", true),
                            _createVNode($setup["VideoLessonPlayer"], {
                              content: resource.content
                            }, null, 8, ["content"])
                          ],
                          64
                          /* STABLE_FRAGMENT */
                        )) : (_openBlock(), _createElementBlock(
                          "pre",
                          _hoisted_22,
                          _toDisplayString(resource.content),
                          1
                          /* TEXT */
                        )),
                        _createVNode(
                          _component_el_tag,
                          null,
                          {
                            default: _withCtx(() => [
                              _createTextVNode(
                                _toDisplayString(resource.auditStatus),
                                1
                                /* TEXT */
                              )
                            ]),
                            _: 2
                            /* DYNAMIC */
                          },
                          1024
                          /* DYNAMIC_SLOTS */
                        )
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  )),
                  _cache[22] || (_cache[22] = _createElementVNode(
                    "h4",
                    null,
                    "renderHints",
                    -1
                    /* CACHED */
                  )),
                  _createElementVNode(
                    "pre",
                    _hoisted_23,
                    _toDisplayString($setup.formatJson($setup.outputValue("renderHints"))),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : _createCommentVNode("v-if", true),
              $setup.currentAgentResult.agentType === "practice_agent" ? (_openBlock(), _createBlock(_component_el_card, {
                key: 5,
                shadow: "never"
              }, {
                header: _withCtx(() => [..._cache[23] || (_cache[23] = [
                  _createTextVNode(
                    "练习题卡片",
                    -1
                    /* CACHED */
                  )
                ])]),
                default: _withCtx(() => [
                  _createVNode(_component_el_alert, {
                    title: "masteryUpdatePreview / profileUpdatePreview 为智能体解释信息，只存在于 AgentRunResult.output，不属于 PracticeRecord 字段。",
                    type: "warning",
                    "show-icon": "",
                    closable: false
                  }),
                  (_openBlock(true), _createElementBlock(
                    _Fragment,
                    null,
                    _renderList($setup.practiceQuestions, (question) => {
                      return _openBlock(), _createElementBlock("div", {
                        key: question.id,
                        class: "question-card"
                      }, [
                        _createElementVNode(
                          "h4",
                          null,
                          _toDisplayString(question.title),
                          1
                          /* TEXT */
                        ),
                        _createVNode(
                          _component_el_descriptions,
                          {
                            column: 1,
                            border: "",
                            size: "small"
                          },
                          {
                            default: _withCtx(() => [
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "questionType" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString(question.questionType),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              ),
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "content" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString(question.content),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              ),
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "options" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString($setup.formatJson(question.options)),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              ),
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "answer" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString(question.answer),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              ),
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "explanation" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString(question.explanation),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              ),
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "difficulty" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString(question.difficulty),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              ),
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "tags" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString($setup.formatJson(question.tags)),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              )
                            ]),
                            _: 2
                            /* DYNAMIC */
                          },
                          1024
                          /* DYNAMIC_SLOTS */
                        ),
                        _createElementVNode("div", _hoisted_24, [
                          _createVNode(_component_el_input, {
                            modelValue: $setup.answers[question.id],
                            "onUpdate:modelValue": ($event) => $setup.answers[question.id] = $event,
                            placeholder: "模拟答案，不填则使用正确答案"
                          }, null, 8, ["modelValue", "onUpdate:modelValue"]),
                          _createVNode(_component_el_button, {
                            type: "primary",
                            onClick: ($event) => $setup.submitPracticeAnswer(question)
                          }, {
                            default: _withCtx(() => [..._cache[24] || (_cache[24] = [
                              _createTextVNode(
                                "模拟提交答案",
                                -1
                                /* CACHED */
                              )
                            ])]),
                            _: 1
                            /* STABLE */
                          }, 8, ["onClick"])
                        ]),
                        $setup.submittedRecords[question.id] ? (_openBlock(), _createElementBlock(
                          "pre",
                          _hoisted_25,
                          "" + _toDisplayString($setup.formatJson($setup.submittedRecords[question.id])) + "\n                ",
                          1
                          /* TEXT */
                        )) : _createCommentVNode("v-if", true)
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  )),
                  _cache[25] || (_cache[25] = _createElementVNode(
                    "h4",
                    null,
                    "masteryUpdatePreview",
                    -1
                    /* CACHED */
                  )),
                  _createElementVNode(
                    "pre",
                    _hoisted_26,
                    _toDisplayString($setup.formatJson($setup.outputValue("masteryUpdatePreview"))),
                    1
                    /* TEXT */
                  ),
                  _cache[26] || (_cache[26] = _createElementVNode(
                    "h4",
                    null,
                    "profileUpdatePreview",
                    -1
                    /* CACHED */
                  )),
                  _createElementVNode(
                    "pre",
                    _hoisted_27,
                    _toDisplayString($setup.formatJson($setup.outputValue("profileUpdatePreview"))),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : _createCommentVNode("v-if", true)
            ])) : _createCommentVNode("v-if", true),
            $setup.currentChatResult ? (_openBlock(), _createElementBlock("section", _hoisted_28, [
              _cache[30] || (_cache[30] = _createElementVNode(
                "h3",
                null,
                "真实 RAG 问答结果",
                -1
                /* CACHED */
              )),
              _createVNode(_component_el_card, { shadow: "never" }, {
                header: _withCtx(() => [..._cache[28] || (_cache[28] = [
                  _createTextVNode(
                    "回答",
                    -1
                    /* CACHED */
                  )
                ])]),
                default: _withCtx(() => [
                  _createElementVNode(
                    "p",
                    null,
                    _toDisplayString($setup.currentChatResult.answer),
                    1
                    /* TEXT */
                  ),
                  _cache[29] || (_cache[29] = _createElementVNode(
                    "h4",
                    null,
                    "retrievedDocuments",
                    -1
                    /* CACHED */
                  )),
                  _createElementVNode(
                    "pre",
                    _hoisted_29,
                    _toDisplayString($setup.formatJson($setup.currentChatResult.retrievedDocuments)),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })
            ])) : _createCommentVNode("v-if", true),
            $setup.currentWorkflowResult ? (_openBlock(), _createElementBlock("section", _hoisted_30, [
              _cache[35] || (_cache[35] = _createElementVNode(
                "h3",
                null,
                "工作流步骤卡片",
                -1
                /* CACHED */
              )),
              _createVNode(_component_el_descriptions, {
                column: 1,
                border: "",
                size: "small"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_el_descriptions_item, { label: "taskId" }, {
                    default: _withCtx(() => [
                      _createTextVNode(
                        _toDisplayString($setup.currentWorkflowResult.taskId),
                        1
                        /* TEXT */
                      )
                    ]),
                    _: 1
                    /* STABLE */
                  }),
                  _createVNode(_component_el_descriptions_item, { label: "workflowType" }, {
                    default: _withCtx(() => [
                      _createTextVNode(
                        _toDisplayString($setup.currentWorkflowResult.workflowType),
                        1
                        /* TEXT */
                      )
                    ]),
                    _: 1
                    /* STABLE */
                  }),
                  _createVNode(_component_el_descriptions_item, { label: "status" }, {
                    default: _withCtx(() => [
                      _createTextVNode(
                        _toDisplayString($setup.currentWorkflowResult.status),
                        1
                        /* TEXT */
                      )
                    ]),
                    _: 1
                    /* STABLE */
                  }),
                  _createVNode(_component_el_descriptions_item, { label: "finalOutput" }, {
                    default: _withCtx(() => [
                      _createElementVNode(
                        "pre",
                        _hoisted_31,
                        _toDisplayString($setup.formatJson($setup.currentWorkflowResult.finalOutput)),
                        1
                        /* TEXT */
                      )
                    ]),
                    _: 1
                    /* STABLE */
                  })
                ]),
                _: 1
                /* STABLE */
              }),
              _createElementVNode("div", _hoisted_32, [
                (_openBlock(true), _createElementBlock(
                  _Fragment,
                  null,
                  _renderList($setup.currentWorkflowResult.steps, (step) => {
                    return _openBlock(), _createBlock(
                      _component_el_card,
                      {
                        key: step.taskId,
                        shadow: "never"
                      },
                      {
                        header: _withCtx(() => [
                          _createElementVNode("div", _hoisted_33, [
                            _createElementVNode(
                              "span",
                              null,
                              _toDisplayString(step.agentType),
                              1
                              /* TEXT */
                            ),
                            _createVNode(
                              _component_el_tag,
                              null,
                              {
                                default: _withCtx(() => [
                                  _createTextVNode(
                                    _toDisplayString(step.status),
                                    1
                                    /* TEXT */
                                  )
                                ]),
                                _: 2
                                /* DYNAMIC */
                              },
                              1024
                              /* DYNAMIC_SLOTS */
                            )
                          ])
                        ]),
                        default: _withCtx(() => [
                          step.errorMessage ? (_openBlock(), _createElementBlock(
                            "p",
                            _hoisted_34,
                            _toDisplayString(step.errorMessage),
                            1
                            /* TEXT */
                          )) : _createCommentVNode("v-if", true),
                          _createElementVNode(
                            "pre",
                            _hoisted_35,
                            _toDisplayString($setup.formatJson(step.output)),
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
              ]),
              _createVNode(_component_el_card, { shadow: "never" }, {
                header: _withCtx(() => [..._cache[31] || (_cache[31] = [
                  _createTextVNode(
                    "自然语言回答",
                    -1
                    /* CACHED */
                  )
                ])]),
                default: _withCtx(() => [
                  _createElementVNode(
                    "p",
                    null,
                    _toDisplayString($setup.currentWorkflowResult.finalOutput.answer),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_el_card, { shadow: "never" }, {
                header: _withCtx(() => [..._cache[32] || (_cache[32] = [
                  _createTextVNode(
                    "完整题目",
                    -1
                    /* CACHED */
                  )
                ])]),
                default: _withCtx(() => [
                  (_openBlock(true), _createElementBlock(
                    _Fragment,
                    null,
                    _renderList($setup.workflowQuestions, (question) => {
                      return _openBlock(), _createElementBlock("div", {
                        key: question.id,
                        class: "question-card"
                      }, [
                        _createElementVNode(
                          "h4",
                          null,
                          _toDisplayString(question.title),
                          1
                          /* TEXT */
                        ),
                        _createVNode(
                          _component_el_descriptions,
                          {
                            column: 1,
                            border: "",
                            size: "small"
                          },
                          {
                            default: _withCtx(() => [
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "questionType" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString(question.questionType),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              ),
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "content" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString(question.content),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              ),
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "options" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString($setup.formatJson(question.options)),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              ),
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "answer" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString(question.answer),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              ),
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "explanation" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString(question.explanation),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              ),
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "difficulty" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString(question.difficulty),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              ),
                              _createVNode(
                                _component_el_descriptions_item,
                                { label: "tags" },
                                {
                                  default: _withCtx(() => [
                                    _createTextVNode(
                                      _toDisplayString($setup.formatJson(question.tags)),
                                      1
                                      /* TEXT */
                                    )
                                  ]),
                                  _: 2
                                  /* DYNAMIC */
                                },
                                1024
                                /* DYNAMIC_SLOTS */
                              )
                            ]),
                            _: 2
                            /* DYNAMIC */
                          },
                          1024
                          /* DYNAMIC_SLOTS */
                        )
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_el_card, { shadow: "never" }, {
                header: _withCtx(() => [..._cache[33] || (_cache[33] = [
                  _createTextVNode(
                    "思维导图",
                    -1
                    /* CACHED */
                  )
                ])]),
                default: _withCtx(() => [
                  (_openBlock(true), _createElementBlock(
                    _Fragment,
                    null,
                    _renderList($setup.workflowMindMaps, (resource) => {
                      return _openBlock(), _createBlock($setup["MindMapViewer"], {
                        key: resource.id,
                        content: resource.content
                      }, null, 8, ["content"]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]),
                _: 1
                /* STABLE */
              }),
              _createVNode(_component_el_card, { shadow: "never" }, {
                header: _withCtx(() => [..._cache[34] || (_cache[34] = [
                  _createTextVNode(
                    "视频资源",
                    -1
                    /* CACHED */
                  )
                ])]),
                default: _withCtx(() => [
                  (_openBlock(true), _createElementBlock(
                    _Fragment,
                    null,
                    _renderList($setup.workflowVideos, (resource) => {
                      return _openBlock(), _createElementBlock("div", {
                        key: resource.id,
                        class: "resource-preview"
                      }, [
                        _createElementVNode(
                          "h4",
                          null,
                          _toDisplayString(resource.title) + " / " + _toDisplayString(resource.resourceType),
                          1
                          /* TEXT */
                        ),
                        resource.fileUrl ? (_openBlock(), _createElementBlock("video", {
                          key: 0,
                          class: "mp4-player",
                          src: resource.fileUrl,
                          controls: ""
                        }, null, 8, _hoisted_36)) : _createCommentVNode("v-if", true),
                        _createVNode($setup["VideoLessonPlayer"], {
                          content: resource.content
                        }, null, 8, ["content"]),
                        _createVNode(_component_el_tag, {
                          type: resource.auditStatus === "passed" ? "success" : "warning"
                        }, {
                          default: _withCtx(() => [
                            _createTextVNode(
                              _toDisplayString(resource.auditStatus),
                              1
                              /* TEXT */
                            )
                          ]),
                          _: 2
                          /* DYNAMIC */
                        }, 1032, ["type"])
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]),
                _: 1
                /* STABLE */
              })
            ])) : _createCommentVNode("v-if", true)
          ]),
          _: 1
          /* STABLE */
        }),
        _createVNode(_component_el_card, { shadow: "never" }, {
          header: _withCtx(() => [..._cache[36] || (_cache[36] = [
            _createTextVNode(
              "错误信息区",
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
              closable: false
            }, null, 8, ["title"])) : (_openBlock(), _createBlock(_component_el_empty, {
              key: 1,
              description: "暂无错误"
            }))
          ]),
          _: 1
          /* STABLE */
        })
      ])
    ]),
    _createElementVNode("section", _hoisted_37, [
      _createVNode(_component_el_card, { shadow: "never" }, {
        header: _withCtx(() => [..._cache[37] || (_cache[37] = [
          _createTextVNode(
            "测试日志",
            -1
            /* CACHED */
          )
        ])]),
        default: _withCtx(() => [
          _createVNode(_component_el_table, {
            data: $setup.testLogs,
            border: ""
          }, {
            default: _withCtx(() => [
              _createVNode(_component_el_table_column, {
                prop: "createdAt",
                label: "createdAt",
                "min-width": "180"
              }),
              _createVNode(_component_el_table_column, {
                prop: "title",
                label: "title",
                "min-width": "200"
              }),
              _createVNode(_component_el_table_column, {
                prop: "agentType",
                label: "agentType",
                "min-width": "150"
              }),
              _createVNode(_component_el_table_column, {
                prop: "status",
                label: "status",
                "min-width": "100"
              }),
              _createVNode(_component_el_table_column, {
                prop: "errorMessage",
                label: "errorMessage",
                "min-width": "240"
              })
            ]),
            _: 1
            /* STABLE */
          }, 8, ["data"])
        ]),
        _: 1
        /* STABLE */
      })
    ])
  ]);
}
import "/src/pages/dev/AgentFlowTestPage.vue?vue&type=style&index=0&scoped=3630d638&lang.css";
_sfc_main.__hmrId = "3630d638";
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
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-3630d638"], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/pages/dev/AgentFlowTestPage.vue"]]);

//# sourceMappingURL=data:application/json;base64,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QUFnRTtBQUFBLGdCQUEvQyxNQUFLO0FBQUEsZ0JBQVMsT0FBTTtBQUFBLGdCQUFTLGFBQVU7QUFBQTtjQUN4RCxhQUE0RTtBQUFBLGdCQUEzRCxNQUFLO0FBQUEsZ0JBQWUsT0FBTTtBQUFBLGdCQUFlLGFBQVU7QUFBQSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQWdlbnRGbG93VGVzdFBhZ2UudnVlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQgc2V0dXAgbGFuZz1cInRzXCI+XHJcbmltcG9ydCB7IGNvbXB1dGVkLCByZWYgfSBmcm9tIFwidnVlXCI7XG5pbXBvcnQgeyBhZ2VudEFwaSB9IGZyb20gXCJAL2FwaS9tb2R1bGVzL2FnZW50XCI7XG5pbXBvcnQgeyBwcmFjdGljZUFwaSB9IGZyb20gXCJAL2FwaS9tb2R1bGVzL3ByYWN0aWNlXCI7XG5pbXBvcnQgTWluZE1hcFZpZXdlciBmcm9tIFwiQC9jb21wb25lbnRzL21pbmQtbWFwL01pbmRNYXBWaWV3ZXIudnVlXCI7XG5pbXBvcnQgVmlkZW9MZXNzb25QbGF5ZXIgZnJvbSBcIkAvY29tcG9uZW50cy9WaWRlb0xlc3NvblBsYXllci52dWVcIjtcbmltcG9ydCB0eXBlIHsgQXBpUmVzcG9uc2UsIEFnZW50VHlwZSwgVGFza1N0YXR1cyB9IGZyb20gXCJAL3R5cGVzL2NvbnRyYWN0c1wiO1xyXG5pbXBvcnQgdHlwZSB7XHJcbiAgQWdlbnRSdW5SZXF1ZXN0LFxyXG4gIEFnZW50UnVuUmVzdWx0LFxyXG4gIENoYXRSZXN1bHQsXHJcbiAgTXVsdGlBZ2VudFdvcmtmbG93UmVxdWVzdCxcclxuICBNdWx0aUFnZW50V29ya2Zsb3dSZXN1bHRcclxufSBmcm9tIFwiQC90eXBlcy9hZ2VudFwiO1xyXG5pbXBvcnQgdHlwZSB7IFByYWN0aWNlUXVlc3Rpb24sIFByYWN0aWNlUmVjb3JkLCBQcmFjdGljZVN1Ym1pdFJlcXVlc3QgfSBmcm9tIFwiQC90eXBlcy9wcmFjdGljZVwiO1xyXG5pbXBvcnQgdHlwZSB7IFN0dWRlbnRQcm9maWxlIH0gZnJvbSBcIkAvdHlwZXMvcHJvZmlsZVwiO1xyXG5pbXBvcnQgdHlwZSB7IEdlbmVyYXRlZFJlc291cmNlIH0gZnJvbSBcIkAvdHlwZXMvcmVzb3VyY2VcIjtcclxuXHJcbnR5cGUgQ2FsbFN0YXR1cyA9IFwiaWRsZVwiIHwgXCJsb2FkaW5nXCIgfCBcInN1Y2Nlc3NcIiB8IFwiZmFpbGVkXCI7XHJcblxyXG5pbnRlcmZhY2UgVGVzdExvZyB7XHJcbiAgaWQ6IHN0cmluZztcclxuICB0aXRsZTogc3RyaW5nO1xyXG4gIGFnZW50VHlwZT86IEFnZW50VHlwZTtcclxuICBzdGF0dXM6IFwic3VjY2Vzc1wiIHwgXCJmYWlsZWRcIjtcclxuICByZXF1ZXN0OiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG4gIHJlc3BvbnNlPzogUmVjb3JkPHN0cmluZywgYW55PjtcclxuICBlcnJvck1lc3NhZ2U/OiBzdHJpbmc7XHJcbiAgY3JlYXRlZEF0OiBzdHJpbmc7XHJcbn1cclxuXHJcbmNvbnN0IHRlc3RDb25maWcgPSB7XHJcbiAgdXNlcklkOiBcInVzZXJfZGVtb18wMDFcIixcclxuICBjb3Vyc2VJZDogXCJjb3Vyc2VfZHNfMDAxXCIsXHJcbiAgbm9kZUlkOiBcIm5vZGVfc3RhY2tfMDAxXCJcclxufTtcclxuXHJcbmNvbnN0IGRlbW9Qcm9maWxlOiBTdHVkZW50UHJvZmlsZSA9IHtcclxuICBpZDogXCJwcm9maWxlX2RlbW9fMDAxXCIsXHJcbiAgdXNlcklkOiBcInVzZXJfZGVtb18wMDFcIixcclxuICBtYWpvcjogXCLorqHnrpfmnLrnp5HlrabkuI7mioDmnK9cIixcclxuICBncmFkZTogXCLlpKfkuoxcIixcclxuICBjdXJyZW50Q291cnNlSWQ6IFwiY291cnNlX2RzXzAwMVwiLFxyXG4gIGxlYXJuaW5nR29hbDogXCLlh4blpIfmlbDmja7nu5PmnoTmnJ/mnKvogIPor5VcIixcclxuICBrbm93bGVkZ2VCYXNlTGV2ZWw6IFwiZWFzeVwiLFxyXG4gIGxlYXJuaW5nUHJvZ3Jlc3M6IFwi5pWw57uE5ZKM6ZO+6KGo5bey5a2m5a6M77yM5q2j5Zyo5aSN5Lmg5qCIXCIsXHJcbiAgd2Vha05vZGVJZHM6IFtcIm5vZGVfc3RhY2tfMDAxXCIsIFwibm9kZV9yZWN1cnNpb25fMDAxXCJdLFxyXG4gIGNvZ25pdGl2ZVN0eWxlOiBcImRpYWdyYW1cIixcclxuICBwcmFjdGljZVByZWZlcmVuY2U6IFwiY29kaW5nXCIsXHJcbiAgcmVzb3VyY2VQcmVmZXJlbmNlOiBbXCJsZWN0dXJlX2RvY1wiLCBcIm1pbmRfbWFwXCIsIFwicHJhY3RpY2VfcXVlc3Rpb25cIiwgXCJjb2RlX2Nhc2VcIl0sXHJcbiAgY29tbW9uTWlzdGFrZXM6IFtcIuagiOmhtui+ueeVjOWIpOaWremBl+a8j1wiLCBcIumAkuW9kue7iOatouadoeS7tumUmeivr1wiLCBcIuaVsOe7hOS4i+agh+i2iueVjFwiXSxcclxuICBhdmFpbGFibGVTdHVkeVRpbWU6IFwi5q+P5aSp5pma5LiKMzDliIbpkp9cIixcclxuICBwcm9maWxlU3VtbWFyeTogXCLlrabnlJ/lhbflpIfln7rnoYDnvJbnqIvog73lipvvvIzmraPlnKjooaXlvLrmoIjlkozpgJLlvZLvvIzlgY/lpb3lm77op6Plkozku6PnoIHnu4PkuaDjgIJcIixcclxuICBjb25maWRlbmNlU2NvcmU6IDAuODIsXHJcbiAgbGFzdFVwZGF0ZWRCeTogXCJtYW51YWxcIixcclxuICBjcmVhdGVkQXQ6IFwiMjAyNi0wNS0yOFQxMDowMDowMFpcIixcclxuICB1cGRhdGVkQXQ6IFwiMjAyNi0wNS0yOFQxMDowMDowMFpcIlxyXG59O1xyXG5cclxuY29uc3QgdGFza1N0YXR1c2VzOiBUYXNrU3RhdHVzW10gPSBbXCJwZW5kaW5nXCIsIFwicnVubmluZ1wiLCBcInN1Y2Nlc3NcIiwgXCJmYWlsZWRcIiwgXCJjYW5jZWxsZWRcIl07XHJcbmNvbnN0IGFnZW50VHlwZXM6IEFnZW50VHlwZVtdID0gW1xyXG4gIFwicHJvZmlsZV9hZ2VudFwiLFxyXG4gIFwicGxhbm5lcl9hZ2VudFwiLFxyXG4gIFwicWFfYWdlbnRcIixcclxuICBcInJlc291cmNlX2FnZW50XCIsXHJcbiAgXCJwcmFjdGljZV9hZ2VudFwiLFxyXG4gIFwibXVsdGltb2RhbF9hZ2VudFwiLFxyXG4gIFwic2FmZXR5X2FnZW50XCJcclxuXTtcclxuXHJcbmNvbnN0IGNhbGxTdGF0dXMgPSByZWY8Q2FsbFN0YXR1cz4oXCJpZGxlXCIpO1xyXG5jb25zdCBlcnJvck1lc3NhZ2UgPSByZWYoXCJcIik7XHJcbmNvbnN0IGN1cnJlbnRUaXRsZSA9IHJlZihcIuetieW+hea1i+ivlVwiKTtcclxuY29uc3QgY3VycmVudFJlcXVlc3QgPSByZWY8UmVjb3JkPHN0cmluZywgYW55PiB8IG51bGw+KG51bGwpO1xyXG5jb25zdCBjdXJyZW50UmVzcG9uc2UgPSByZWY8UmVjb3JkPHN0cmluZywgYW55PiB8IG51bGw+KG51bGwpO1xyXG5jb25zdCBjdXJyZW50QWdlbnRSZXN1bHQgPSByZWY8QWdlbnRSdW5SZXN1bHQgfCBudWxsPihudWxsKTtcclxuY29uc3QgY3VycmVudENoYXRSZXN1bHQgPSByZWY8Q2hhdFJlc3VsdCB8IG51bGw+KG51bGwpO1xyXG5jb25zdCBjdXJyZW50V29ya2Zsb3dSZXN1bHQgPSByZWY8TXVsdGlBZ2VudFdvcmtmbG93UmVzdWx0IHwgbnVsbD4obnVsbCk7XHJcbmNvbnN0IHRlc3RMb2dzID0gcmVmPFRlc3RMb2dbXT4oW10pO1xyXG5jb25zdCBhbnN3ZXJzID0gcmVmPFJlY29yZDxzdHJpbmcsIHN0cmluZz4+KHt9KTtcclxuY29uc3Qgc3VibWl0dGVkUmVjb3JkcyA9IHJlZjxSZWNvcmQ8c3RyaW5nLCBQcmFjdGljZVJlY29yZD4+KHt9KTtcclxuY29uc3QgbmF0dXJhbExhbmd1YWdlTWVzc2FnZSA9IHJlZihcclxuICBcIuaIkeaYr+iuoeeul+acuuS4k+S4muWkp+S6jOWtpueUn++8jOato+WcqOWkjeS5oOaVsOaNrue7k+aehOOAguivt+e7k+WQiCBIZWxsbyDnrpfms5XmnZDmlpnop6Pph4rmoIjkuLrku4DkuYjlkI7ov5vlhYjlh7rvvIzlubbnlJ/miJDkuInpgZPpopjjgIHmgJ3nu7Tlr7zlm77lkozorrLop6Pop4bpopHjgIJcIlxyXG4pO1xyXG5cclxuY29uc3QgbW9ja0VuYWJsZWQgPSBjb21wdXRlZCgoKSA9PiBpbXBvcnQubWV0YS5lbnYuVklURV9FTkFCTEVfTU9DSyA9PT0gXCJ0cnVlXCIpO1xyXG5jb25zdCBwcmFjdGljZVF1ZXN0aW9ucyA9IGNvbXB1dGVkPFByYWN0aWNlUXVlc3Rpb25bXT4oKCkgPT4ge1xyXG4gIGNvbnN0IHF1ZXN0aW9ucyA9IGN1cnJlbnRBZ2VudFJlc3VsdC52YWx1ZT8ub3V0cHV0Py5xdWVzdGlvbnM7XHJcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkocXVlc3Rpb25zKSA/IHF1ZXN0aW9ucyA6IFtdO1xyXG59KTtcclxuY29uc3Qgd29ya2Zsb3dRdWVzdGlvbnMgPSBjb21wdXRlZDxQcmFjdGljZVF1ZXN0aW9uW10+KCgpID0+IHtcclxuICBjb25zdCBxdWVzdGlvbnMgPSBjdXJyZW50V29ya2Zsb3dSZXN1bHQudmFsdWU/LmZpbmFsT3V0cHV0Py5xdWVzdGlvbnM7XHJcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkocXVlc3Rpb25zKSA/IChxdWVzdGlvbnMgYXMgUHJhY3RpY2VRdWVzdGlvbltdKSA6IFtdO1xyXG59KTtcclxuY29uc3Qgd29ya2Zsb3dSZXNvdXJjZXMgPSBjb21wdXRlZDxHZW5lcmF0ZWRSZXNvdXJjZVtdPigoKSA9PiB7XHJcbiAgY29uc3QgcmVzb3VyY2VzID0gY3VycmVudFdvcmtmbG93UmVzdWx0LnZhbHVlPy5maW5hbE91dHB1dD8uZ2VuZXJhdGVkUmVzb3VyY2VzO1xyXG4gIHJldHVybiBBcnJheS5pc0FycmF5KHJlc291cmNlcykgPyAocmVzb3VyY2VzIGFzIEdlbmVyYXRlZFJlc291cmNlW10pIDogW107XHJcbn0pO1xyXG5jb25zdCB3b3JrZmxvd01pbmRNYXBzID0gY29tcHV0ZWQoKCkgPT5cclxuICB3b3JrZmxvd1Jlc291cmNlcy52YWx1ZS5maWx0ZXIoKHJlc291cmNlKSA9PiByZXNvdXJjZS5yZXNvdXJjZVR5cGUgPT09IFwibWluZF9tYXBcIilcclxuKTtcclxuY29uc3Qgd29ya2Zsb3dWaWRlb3MgPSBjb21wdXRlZCgoKSA9PiB3b3JrZmxvd1Jlc291cmNlcy52YWx1ZS5maWx0ZXIoaXNWaWRlb1Jlc291cmNlKSk7XHJcblxyXG5mdW5jdGlvbiBhc1JlY29yZCh2YWx1ZTogdW5rbm93bik6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xyXG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgPyAodmFsdWUgYXMgUmVjb3JkPHN0cmluZywgYW55PikgOiB7fTtcclxufVxyXG5cclxuZnVuY3Rpb24gZm9ybWF0SnNvbih2YWx1ZTogdW5rbm93bik6IHN0cmluZyB7XHJcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbHVlID8/IG51bGwsIG51bGwsIDIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRMb2cobG9nOiBPbWl0PFRlc3RMb2csIFwiaWRcIiB8IFwiY3JlYXRlZEF0XCI+KSB7XHJcbiAgdGVzdExvZ3MudmFsdWUudW5zaGlmdCh7XHJcbiAgICAuLi5sb2csXHJcbiAgICBpZDogYGxvZ18ke0RhdGUubm93KCl9XyR7TWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc2xpY2UoMil9YCxcclxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHZhbGlkYXRlQXBpUmVzcG9uc2U8VD4ocmVzcG9uc2U6IEFwaVJlc3BvbnNlPFQ+KTogc3RyaW5nIHwgbnVsbCB7XHJcbiAgY29uc3QgdmFsdWUgPSByZXNwb25zZSBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG4gIGlmIChcclxuICAgIHR5cGVvZiB2YWx1ZS5jb2RlID09PSBcInVuZGVmaW5lZFwiIHx8XHJcbiAgICB0eXBlb2YgdmFsdWUubWVzc2FnZSA9PT0gXCJ1bmRlZmluZWRcIiB8fFxyXG4gICAgdHlwZW9mIHZhbHVlLmRhdGEgPT09IFwidW5kZWZpbmVkXCIgfHxcclxuICAgIHR5cGVvZiB2YWx1ZS50cmFjZUlkID09PSBcInVuZGVmaW5lZFwiIHx8XHJcbiAgICB0eXBlb2YgdmFsdWUudGltZXN0YW1wID09PSBcInVuZGVmaW5lZFwiXHJcbiAgKSB7XHJcbiAgICByZXR1cm4gXCLov5Tlm57nu5PmnoTkuI3nrKblkIggQXBpUmVzcG9uc2U8VD4g5oiWIEFnZW50UnVuUmVzdWx0XCI7XHJcbiAgfVxyXG4gIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiB2YWxpZGF0ZUFnZW50UmVzcG9uc2UocmVzcG9uc2U6IEFwaVJlc3BvbnNlPEFnZW50UnVuUmVzdWx0PiwgYWdlbnRUeXBlOiBBZ2VudFR5cGUpOiBzdHJpbmcgfCBudWxsIHtcclxuICBjb25zdCBiYXNlRXJyb3IgPSB2YWxpZGF0ZUFwaVJlc3BvbnNlKHJlc3BvbnNlKTtcclxuICBpZiAoYmFzZUVycm9yKSByZXR1cm4gYmFzZUVycm9yO1xyXG4gIGlmIChyZXNwb25zZS5kYXRhLmFnZW50VHlwZSAhPT0gYWdlbnRUeXBlIHx8ICF0YXNrU3RhdHVzZXMuaW5jbHVkZXMocmVzcG9uc2UuZGF0YS5zdGF0dXMpKSB7XHJcbiAgICByZXR1cm4gXCLov5Tlm57nu5PmnoTkuI3nrKblkIggQXBpUmVzcG9uc2U8VD4g5oiWIEFnZW50UnVuUmVzdWx0XCI7XHJcbiAgfVxyXG4gIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiB2YWxpZGF0ZVdvcmtmbG93UmVzcG9uc2UocmVzcG9uc2U6IEFwaVJlc3BvbnNlPE11bHRpQWdlbnRXb3JrZmxvd1Jlc3VsdD4pOiBzdHJpbmcgfCBudWxsIHtcclxuICBjb25zdCBiYXNlRXJyb3IgPSB2YWxpZGF0ZUFwaVJlc3BvbnNlKHJlc3BvbnNlKTtcclxuICBpZiAoYmFzZUVycm9yKSByZXR1cm4gYmFzZUVycm9yO1xyXG4gIGlmICghdGFza1N0YXR1c2VzLmluY2x1ZGVzKHJlc3BvbnNlLmRhdGEuc3RhdHVzKSkge1xyXG4gICAgcmV0dXJuIFwi6L+U5Zue57uT5p6E5LiN56ym5ZCIIEFwaVJlc3BvbnNlPFQ+IOaIliBBZ2VudFJ1blJlc3VsdFwiO1xyXG4gIH1cclxuICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuZnVuY3Rpb24gYnVpbGRBZ2VudFJlcXVlc3QoYWdlbnRUeXBlOiBBZ2VudFR5cGUpOiBBZ2VudFJ1blJlcXVlc3Qge1xyXG4gIGNvbnN0IGJhc2UgPSB7XHJcbiAgICB1c2VySWQ6IHRlc3RDb25maWcudXNlcklkLFxyXG4gICAgY291cnNlSWQ6IHRlc3RDb25maWcuY291cnNlSWQsXHJcbiAgICBub2RlSWQ6IHRlc3RDb25maWcubm9kZUlkLFxyXG4gICAgYWdlbnRUeXBlLFxyXG4gICAgY29udGV4dDoge1xyXG4gICAgICBwcm9maWxlOiBkZW1vUHJvZmlsZVxyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGlmIChhZ2VudFR5cGUgPT09IFwicHJvZmlsZV9hZ2VudFwiKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAuLi5iYXNlLFxyXG4gICAgICBpbnB1dDoge1xyXG4gICAgICAgIG1vZGU6IFwiYW5hbHl6ZV9wcm9maWxlXCIsXHJcbiAgICAgICAgbWVzc2FnZTogbmF0dXJhbExhbmd1YWdlTWVzc2FnZS52YWx1ZVxyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgaWYgKGFnZW50VHlwZSA9PT0gXCJwbGFubmVyX2FnZW50XCIpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIC4uLmJhc2UsXHJcbiAgICAgIGlucHV0OiB7XHJcbiAgICAgICAgdGFyZ2V0R29hbDogXCLlh4blpIfmlbDmja7nu5PmnoTmnJ/mnKvogIPor5VcIixcclxuICAgICAgICB0aW1lQnVkZ2V0OiBcIuavj+WkqTMw5YiG6ZKfXCIsXHJcbiAgICAgICAgd2Vha05vZGVJZHM6IFtcIm5vZGVfc3RhY2tfMDAxXCIsIFwibm9kZV9yZWN1cnNpb25fMDAxXCJdLFxyXG4gICAgICAgIHByb2ZpbGVBbmFseXNpczoge1xyXG4gICAgICAgICAgbGVhcm5pbmdTdGFnZTogXCLln7rnoYDooaXlvLrpmLbmrrVcIixcclxuICAgICAgICAgIHJpc2tMZXZlbDogXCJtZWRpdW1cIixcclxuICAgICAgICAgIHByZWZlcnJlZFJlc291cmNlVHlwZXM6IFtcIm1pbmRfbWFwXCIsIFwiY29kZV9jYXNlXCIsIFwicHJhY3RpY2VfcXVlc3Rpb25cIl1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBpZiAoYWdlbnRUeXBlID09PSBcInFhX2FnZW50XCIpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIC4uLmJhc2UsXHJcbiAgICAgIGlucHV0OiB7XHJcbiAgICAgICAgbWVzc2FnZTogbmF0dXJhbExhbmd1YWdlTWVzc2FnZS52YWx1ZSxcclxuICAgICAgICB1c2VSYWc6IHRydWUsXHJcbiAgICAgICAgdXNlUHJvZmlsZTogdHJ1ZVxyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgaWYgKGFnZW50VHlwZSA9PT0gXCJyZXNvdXJjZV9hZ2VudFwiKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAuLi5iYXNlLFxyXG4gICAgICBpbnB1dDoge1xyXG4gICAgICAgIHJlc291cmNlVHlwZXM6IFtcImxlY3R1cmVfZG9jXCIsIFwibWluZF9tYXBcIiwgXCJwcmFjdGljZV9xdWVzdGlvblwiLCBcImNvZGVfY2FzZVwiXSxcclxuICAgICAgICBkaWZmaWN1bHR5OiBcIm1lZGl1bVwiLFxyXG4gICAgICAgIGxlYXJuaW5nR29hbDogXCLlh4blpIfmlbDmja7nu5PmnoTmnJ/mnKvogIPor5VcIixcclxuICAgICAgICBjdXN0b21SZXF1aXJlbWVudDogXCLlgY/lm77op6Plkozku6PnoIHmoYjkvovvvIzpgILlkIjmr4/lpKkzMOWIhumSn+WtpuS5oFwiXHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBpZiAoYWdlbnRUeXBlID09PSBcIm11bHRpbW9kYWxfYWdlbnRcIikge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgLi4uYmFzZSxcclxuICAgICAgaW5wdXQ6IHtcclxuICAgICAgICByZXNvdXJjZVR5cGVzOiBbXCJtaW5kX21hcFwiXSxcclxuICAgICAgICB0b3BpYzogXCLmoIhcIixcclxuICAgICAgICBkaWZmaWN1bHR5OiBcIm1lZGl1bVwiXHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBpZiAoYWdlbnRUeXBlID09PSBcInNhZmV0eV9hZ2VudFwiKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAuLi5iYXNlLFxyXG4gICAgICBpbnB1dDoge1xyXG4gICAgICAgIHRhcmdldFR5cGU6IFwicmVzb3VyY2VcIixcclxuICAgICAgICB0YXJnZXRJZDogXCJyZXNvdXJjZV9zdGFja19kZW1vXzAwMVwiLFxyXG4gICAgICAgIGNvbnRlbnQ6IFwi5qCI6YG15b6q5ZCO6L+b5YWI5Ye65Y6f5YiZ77yM5YWl5qCI5ZKM5Ye65qCI6YO95Zyo5qCI6aG26L+b6KGM44CCXCJcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICAuLi5iYXNlLFxyXG4gICAgaW5wdXQ6IHtcclxuICAgICAgbW9kZTogXCJnZW5lcmF0ZVwiLFxyXG4gICAgICBxdWVzdGlvblR5cGVzOiBbXCJzaW5nbGVfY2hvaWNlXCIsIFwic2hvcnRfYW5zd2VyXCIsIFwiY29kaW5nXCJdLFxyXG4gICAgICBkaWZmaWN1bHR5OiBcIm1lZGl1bVwiLFxyXG4gICAgICBjb3VudDogM1xyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJ1aWxkV29ya2Zsb3dSZXF1ZXN0KCk6IE11bHRpQWdlbnRXb3JrZmxvd1JlcXVlc3Qge1xyXG4gIHJldHVybiB7XHJcbiAgICB1c2VySWQ6IHRlc3RDb25maWcudXNlcklkLFxyXG4gICAgY291cnNlSWQ6IHRlc3RDb25maWcuY291cnNlSWQsXHJcbiAgICBub2RlSWQ6IHRlc3RDb25maWcubm9kZUlkLFxyXG4gICAgd29ya2Zsb3dUeXBlOiBcInJlc291cmNlX2dlbmVyYXRlXCIsXHJcbiAgICBpbnB1dDoge1xyXG4gICAgICBwcm9maWxlOiBkZW1vUHJvZmlsZSxcclxuICAgICAgbWVzc2FnZTogbmF0dXJhbExhbmd1YWdlTWVzc2FnZS52YWx1ZSxcclxuICAgICAgdGFyZ2V0R29hbDogXCLlh4blpIfmlbDmja7nu5PmnoTmnJ/mnKvogIPor5VcIixcclxuICAgICAgdGltZUJ1ZGdldDogXCLmr4/lpKkzMOWIhumSn1wiLFxyXG4gICAgICB3ZWFrTm9kZUlkczogW1wibm9kZV9zdGFja18wMDFcIiwgXCJub2RlX3JlY3Vyc2lvbl8wMDFcIl0sXHJcbiAgICAgIHJlc291cmNlVHlwZXM6IFtcImxlY3R1cmVfZG9jXCJdLFxyXG4gICAgICBxdWVzdGlvblR5cGVzOiBbXCJzaW5nbGVfY2hvaWNlXCIsIFwic2hvcnRfYW5zd2VyXCIsIFwiY29kaW5nXCJdLFxyXG4gICAgICBkaWZmaWN1bHR5OiBcIm1lZGl1bVwiLFxyXG4gICAgICBjb3VudDogMyxcclxuICAgICAgbXVsdGltb2RhbFJlc291cmNlVHlwZXM6IFtcIm1pbmRfbWFwXCIsIFwidmlkZW9fc2NyaXB0XCIsIFwiYW5pbWF0aW9uX3NjcmlwdFwiXVxyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHJ1blNpbmdsZUFnZW50KGFnZW50VHlwZTogQWdlbnRUeXBlKSB7XHJcbiAgY29uc3QgcmVxdWVzdCA9IGJ1aWxkQWdlbnRSZXF1ZXN0KGFnZW50VHlwZSk7XHJcbiAgY2FsbFN0YXR1cy52YWx1ZSA9IFwibG9hZGluZ1wiO1xyXG4gIGVycm9yTWVzc2FnZS52YWx1ZSA9IFwiXCI7XHJcbiAgY3VycmVudFRpdGxlLnZhbHVlID0gYOa1i+ivlSAke2FnZW50VHlwZX1gO1xyXG4gIGN1cnJlbnRSZXF1ZXN0LnZhbHVlID0gcmVxdWVzdDtcclxuICBjdXJyZW50UmVzcG9uc2UudmFsdWUgPSBudWxsO1xyXG4gIGN1cnJlbnRBZ2VudFJlc3VsdC52YWx1ZSA9IG51bGw7XHJcbiAgY3VycmVudENoYXRSZXN1bHQudmFsdWUgPSBudWxsO1xyXG4gIGN1cnJlbnRXb3JrZmxvd1Jlc3VsdC52YWx1ZSA9IG51bGw7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGFnZW50QXBpLnJ1bkFnZW50KHJlcXVlc3QpO1xyXG4gICAgY29uc3QgdmFsaWRhdGlvbkVycm9yID0gdmFsaWRhdGVBZ2VudFJlc3BvbnNlKHJlc3BvbnNlLCBhZ2VudFR5cGUpO1xyXG4gICAgY3VycmVudFJlc3BvbnNlLnZhbHVlID0gcmVzcG9uc2UgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG4gICAgY3VycmVudEFnZW50UmVzdWx0LnZhbHVlID0gcmVzcG9uc2UuZGF0YTtcclxuICAgIGNhbGxTdGF0dXMudmFsdWUgPSB2YWxpZGF0aW9uRXJyb3IgPyBcImZhaWxlZFwiIDogXCJzdWNjZXNzXCI7XHJcbiAgICBlcnJvck1lc3NhZ2UudmFsdWUgPSB2YWxpZGF0aW9uRXJyb3IgPz8gXCJcIjtcclxuICAgIGFkZExvZyh7XHJcbiAgICAgIHRpdGxlOiBjdXJyZW50VGl0bGUudmFsdWUsXHJcbiAgICAgIGFnZW50VHlwZSxcclxuICAgICAgc3RhdHVzOiB2YWxpZGF0aW9uRXJyb3IgPyBcImZhaWxlZFwiIDogXCJzdWNjZXNzXCIsXHJcbiAgICAgIHJlcXVlc3QsXHJcbiAgICAgIHJlc3BvbnNlOiByZXNwb25zZSBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIGFueT4sXHJcbiAgICAgIGVycm9yTWVzc2FnZTogdmFsaWRhdGlvbkVycm9yID8/IHVuZGVmaW5lZFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwi5o6l5Y+j6LCD55So5aSx6LSlXCI7XHJcbiAgICBjYWxsU3RhdHVzLnZhbHVlID0gXCJmYWlsZWRcIjtcclxuICAgIGVycm9yTWVzc2FnZS52YWx1ZSA9IG1lc3NhZ2U7XHJcbiAgICBhZGRMb2coe1xyXG4gICAgICB0aXRsZTogY3VycmVudFRpdGxlLnZhbHVlLFxyXG4gICAgICBhZ2VudFR5cGUsXHJcbiAgICAgIHN0YXR1czogXCJmYWlsZWRcIixcclxuICAgICAgcmVxdWVzdCxcclxuICAgICAgZXJyb3JNZXNzYWdlOiBtZXNzYWdlXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHJ1bldvcmtmbG93KCkge1xyXG4gIGNvbnN0IHJlcXVlc3QgPSBidWlsZFdvcmtmbG93UmVxdWVzdCgpO1xyXG4gIGNhbGxTdGF0dXMudmFsdWUgPSBcImxvYWRpbmdcIjtcclxuICBlcnJvck1lc3NhZ2UudmFsdWUgPSBcIlwiO1xyXG4gIGN1cnJlbnRUaXRsZS52YWx1ZSA9IFwi5LiA6ZSu5rWL6K+V5a6M5pW06ZO+6LevXCI7XHJcbiAgY3VycmVudFJlcXVlc3QudmFsdWUgPSByZXF1ZXN0O1xyXG4gIGN1cnJlbnRSZXNwb25zZS52YWx1ZSA9IG51bGw7XHJcbiAgY3VycmVudEFnZW50UmVzdWx0LnZhbHVlID0gbnVsbDtcclxuICBjdXJyZW50Q2hhdFJlc3VsdC52YWx1ZSA9IG51bGw7XHJcbiAgY3VycmVudFdvcmtmbG93UmVzdWx0LnZhbHVlID0gbnVsbDtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYWdlbnRBcGkucnVuV29ya2Zsb3cocmVxdWVzdCk7XHJcbiAgICBjb25zdCB2YWxpZGF0aW9uRXJyb3IgPSB2YWxpZGF0ZVdvcmtmbG93UmVzcG9uc2UocmVzcG9uc2UpO1xyXG4gICAgY3VycmVudFJlc3BvbnNlLnZhbHVlID0gcmVzcG9uc2UgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG4gICAgY3VycmVudFdvcmtmbG93UmVzdWx0LnZhbHVlID0gcmVzcG9uc2UuZGF0YTtcclxuICAgIGNhbGxTdGF0dXMudmFsdWUgPSB2YWxpZGF0aW9uRXJyb3IgPyBcImZhaWxlZFwiIDogXCJzdWNjZXNzXCI7XHJcbiAgICBlcnJvck1lc3NhZ2UudmFsdWUgPSB2YWxpZGF0aW9uRXJyb3IgPz8gXCJcIjtcclxuICAgIGFkZExvZyh7XHJcbiAgICAgIHRpdGxlOiBjdXJyZW50VGl0bGUudmFsdWUsXHJcbiAgICAgIHN0YXR1czogdmFsaWRhdGlvbkVycm9yID8gXCJmYWlsZWRcIiA6IFwic3VjY2Vzc1wiLFxyXG4gICAgICByZXF1ZXN0LFxyXG4gICAgICByZXNwb25zZTogcmVzcG9uc2UgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxyXG4gICAgICBlcnJvck1lc3NhZ2U6IHZhbGlkYXRpb25FcnJvciA/PyB1bmRlZmluZWRcclxuICAgIH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIuaOpeWPo+iwg+eUqOWksei0pVwiO1xyXG4gICAgY2FsbFN0YXR1cy52YWx1ZSA9IFwiZmFpbGVkXCI7XHJcbiAgICBlcnJvck1lc3NhZ2UudmFsdWUgPSBtZXNzYWdlO1xyXG4gICAgYWRkTG9nKHtcclxuICAgICAgdGl0bGU6IGN1cnJlbnRUaXRsZS52YWx1ZSxcclxuICAgICAgc3RhdHVzOiBcImZhaWxlZFwiLFxyXG4gICAgICByZXF1ZXN0LFxyXG4gICAgICBlcnJvck1lc3NhZ2U6IG1lc3NhZ2VcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gcnVuUmFnQ2hhdCgpIHtcclxuICBjb25zdCByZXF1ZXN0ID0ge1xyXG4gICAgdXNlcklkOiB0ZXN0Q29uZmlnLnVzZXJJZCxcclxuICAgIGNvdXJzZUlkOiB0ZXN0Q29uZmlnLmNvdXJzZUlkLFxyXG4gICAgbm9kZUlkOiB0ZXN0Q29uZmlnLm5vZGVJZCxcclxuICAgIG1lc3NhZ2U6IG5hdHVyYWxMYW5ndWFnZU1lc3NhZ2UudmFsdWUsXHJcbiAgICB1c2VSYWc6IHRydWUsXHJcbiAgICB1c2VQcm9maWxlOiB0cnVlXHJcbiAgfTtcclxuICBjYWxsU3RhdHVzLnZhbHVlID0gXCJsb2FkaW5nXCI7XHJcbiAgZXJyb3JNZXNzYWdlLnZhbHVlID0gXCJcIjtcclxuICBjdXJyZW50VGl0bGUudmFsdWUgPSBcIuecn+WuniBSQUcg6Zeu562UXCI7XHJcbiAgY3VycmVudFJlcXVlc3QudmFsdWUgPSByZXF1ZXN0O1xyXG4gIGN1cnJlbnRSZXNwb25zZS52YWx1ZSA9IG51bGw7XHJcbiAgY3VycmVudEFnZW50UmVzdWx0LnZhbHVlID0gbnVsbDtcclxuICBjdXJyZW50Q2hhdFJlc3VsdC52YWx1ZSA9IG51bGw7XHJcbiAgY3VycmVudFdvcmtmbG93UmVzdWx0LnZhbHVlID0gbnVsbDtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYWdlbnRBcGkuc2VuZENoYXQocmVxdWVzdCk7XHJcbiAgICBjb25zdCB2YWxpZGF0aW9uRXJyb3IgPSB2YWxpZGF0ZUFwaVJlc3BvbnNlKHJlc3BvbnNlKTtcclxuICAgIGN1cnJlbnRSZXNwb25zZS52YWx1ZSA9IHJlc3BvbnNlIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgYW55PjtcclxuICAgIGN1cnJlbnRDaGF0UmVzdWx0LnZhbHVlID0gcmVzcG9uc2UuZGF0YTtcclxuICAgIGNhbGxTdGF0dXMudmFsdWUgPSB2YWxpZGF0aW9uRXJyb3IgPyBcImZhaWxlZFwiIDogXCJzdWNjZXNzXCI7XHJcbiAgICBlcnJvck1lc3NhZ2UudmFsdWUgPSB2YWxpZGF0aW9uRXJyb3IgPz8gXCJcIjtcclxuICAgIGFkZExvZyh7XHJcbiAgICAgIHRpdGxlOiBjdXJyZW50VGl0bGUudmFsdWUsXHJcbiAgICAgIHN0YXR1czogdmFsaWRhdGlvbkVycm9yID8gXCJmYWlsZWRcIiA6IFwic3VjY2Vzc1wiLFxyXG4gICAgICByZXF1ZXN0LFxyXG4gICAgICByZXNwb25zZTogcmVzcG9uc2UgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxyXG4gICAgICBlcnJvck1lc3NhZ2U6IHZhbGlkYXRpb25FcnJvciA/PyB1bmRlZmluZWRcclxuICAgIH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlJBRyDpl67nrZTlpLHotKVcIjtcclxuICAgIGNhbGxTdGF0dXMudmFsdWUgPSBcImZhaWxlZFwiO1xyXG4gICAgZXJyb3JNZXNzYWdlLnZhbHVlID0gbWVzc2FnZTtcclxuICAgIGFkZExvZyh7XHJcbiAgICAgIHRpdGxlOiBjdXJyZW50VGl0bGUudmFsdWUsXHJcbiAgICAgIHN0YXR1czogXCJmYWlsZWRcIixcclxuICAgICAgcmVxdWVzdCxcclxuICAgICAgZXJyb3JNZXNzYWdlOiBtZXNzYWdlXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHN1Ym1pdFByYWN0aWNlQW5zd2VyKHF1ZXN0aW9uOiBQcmFjdGljZVF1ZXN0aW9uKSB7XHJcbiAgY29uc3QgcGF5bG9hZDogUHJhY3RpY2VTdWJtaXRSZXF1ZXN0ID0ge1xyXG4gICAgdXNlcklkOiB0ZXN0Q29uZmlnLnVzZXJJZCxcclxuICAgIHF1ZXN0aW9uSWQ6IHF1ZXN0aW9uLmlkLFxyXG4gICAgdXNlckFuc3dlcjogYW5zd2Vycy52YWx1ZVtxdWVzdGlvbi5pZF0gfHwgcXVlc3Rpb24uYW5zd2VyLFxyXG4gICAgZHVyYXRpb25TZWNvbmRzOiAzMFxyXG4gIH07XHJcblxyXG4gIGNhbGxTdGF0dXMudmFsdWUgPSBcImxvYWRpbmdcIjtcclxuICBlcnJvck1lc3NhZ2UudmFsdWUgPSBcIlwiO1xyXG4gIGN1cnJlbnRUaXRsZS52YWx1ZSA9IGDmqKHmi5/mj5DkuqTnrZTmoYjvvJoke3F1ZXN0aW9uLnRpdGxlfWA7XHJcbiAgY3VycmVudFJlcXVlc3QudmFsdWUgPSBwYXlsb2FkIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgYW55PjtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcHJhY3RpY2VBcGkuc3VibWl0QW5zd2VyKHBheWxvYWQpO1xyXG4gICAgY29uc3QgdmFsaWRhdGlvbkVycm9yID0gdmFsaWRhdGVBcGlSZXNwb25zZShyZXNwb25zZSk7XHJcbiAgICBjdXJyZW50UmVzcG9uc2UudmFsdWUgPSByZXNwb25zZSBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIGFueT47XHJcbiAgICBzdWJtaXR0ZWRSZWNvcmRzLnZhbHVlW3F1ZXN0aW9uLmlkXSA9IHJlc3BvbnNlLmRhdGE7XHJcbiAgICBjYWxsU3RhdHVzLnZhbHVlID0gdmFsaWRhdGlvbkVycm9yID8gXCJmYWlsZWRcIiA6IFwic3VjY2Vzc1wiO1xyXG4gICAgZXJyb3JNZXNzYWdlLnZhbHVlID0gdmFsaWRhdGlvbkVycm9yID8/IFwiXCI7XHJcbiAgICBhZGRMb2coe1xyXG4gICAgICB0aXRsZTogY3VycmVudFRpdGxlLnZhbHVlLFxyXG4gICAgICBzdGF0dXM6IHZhbGlkYXRpb25FcnJvciA/IFwiZmFpbGVkXCIgOiBcInN1Y2Nlc3NcIixcclxuICAgICAgcmVxdWVzdDogcGF5bG9hZCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIGFueT4sXHJcbiAgICAgIHJlc3BvbnNlOiByZXNwb25zZSBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIGFueT4sXHJcbiAgICAgIGVycm9yTWVzc2FnZTogdmFsaWRhdGlvbkVycm9yID8/IHVuZGVmaW5lZFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwi5o+Q5Lqk562U5qGI5aSx6LSlXCI7XHJcbiAgICBjYWxsU3RhdHVzLnZhbHVlID0gXCJmYWlsZWRcIjtcclxuICAgIGVycm9yTWVzc2FnZS52YWx1ZSA9IG1lc3NhZ2U7XHJcbiAgICBhZGRMb2coe1xyXG4gICAgICB0aXRsZTogY3VycmVudFRpdGxlLnZhbHVlLFxyXG4gICAgICBzdGF0dXM6IFwiZmFpbGVkXCIsXHJcbiAgICAgIHJlcXVlc3Q6IHBheWxvYWQgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxyXG4gICAgICBlcnJvck1lc3NhZ2U6IG1lc3NhZ2VcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gb3V0cHV0VmFsdWUoa2V5OiBzdHJpbmcpIHtcclxuICByZXR1cm4gYXNSZWNvcmQoY3VycmVudEFnZW50UmVzdWx0LnZhbHVlPy5vdXRwdXQpW2tleV07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVmlkZW9SZXNvdXJjZShyZXNvdXJjZTogR2VuZXJhdGVkUmVzb3VyY2UpIHtcbiAgcmV0dXJuIHJlc291cmNlLnJlc291cmNlVHlwZSA9PT0gXCJ2aWRlb19zY3JpcHRcIiB8fCByZXNvdXJjZS5yZXNvdXJjZVR5cGUgPT09IFwiYW5pbWF0aW9uX3NjcmlwdFwiO1xufVxuPC9zY3JpcHQ+XHJcblxyXG48dGVtcGxhdGU+XHJcbiAgPG1haW4gY2xhc3M9XCJhZ2VudC10ZXN0LXBhZ2VcIj5cclxuICAgIDxoZWFkZXIgY2xhc3M9XCJhZ2VudC10ZXN0LWhlYWRlclwiPlxyXG4gICAgICA8ZGl2PlxyXG4gICAgICAgIDxwIGNsYXNzPVwiZXllYnJvd1wiPkRldiBUZXN0PC9wPlxyXG4gICAgICAgIDxoMT5Ob2RlTGVhcm4gQUkg5pm66IO95L2T6ZO+6Lev5rWL6K+V6Z2i5p2/PC9oMT5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDxlbC10YWcgOnR5cGU9XCJtb2NrRW5hYmxlZCA/ICd3YXJuaW5nJyA6ICdzdWNjZXNzJ1wiIHNpemU9XCJsYXJnZVwiPlxyXG4gICAgICAgIHt7IG1vY2tFbmFibGVkID8gXCJNb2NrIOaooeW8j1wiIDogXCLnnJ/lrp7lkI7nq69cIiB9fVxyXG4gICAgICA8L2VsLXRhZz5cclxuICAgIDwvaGVhZGVyPlxyXG5cclxuICAgIDxzZWN0aW9uIGNsYXNzPVwiYWdlbnQtdGVzdC1sYXlvdXRcIj5cclxuICAgICAgPGFzaWRlIGNsYXNzPVwibGVmdC1jb2x1bW5cIj5cclxuICAgICAgICA8ZWwtY2FyZCBzaGFkb3c9XCJuZXZlclwiPlxyXG4gICAgICAgICAgPHRlbXBsYXRlICNoZWFkZXI+5rWL6K+V6YWN572u5Yy6PC90ZW1wbGF0ZT5cclxuICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMgOmNvbHVtbj1cIjFcIiBib3JkZXIgc2l6ZT1cInNtYWxsXCI+XHJcbiAgICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMtaXRlbSBsYWJlbD1cInVzZXJJZFwiPnt7IHRlc3RDb25maWcudXNlcklkIH19PC9lbC1kZXNjcmlwdGlvbnMtaXRlbT5cclxuICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwiY291cnNlSWRcIj57eyB0ZXN0Q29uZmlnLmNvdXJzZUlkIH19PC9lbC1kZXNjcmlwdGlvbnMtaXRlbT5cclxuICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwibm9kZUlkXCI+e3sgdGVzdENvbmZpZy5ub2RlSWQgfX08L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgPC9lbC1kZXNjcmlwdGlvbnM+XHJcbiAgICAgICAgICA8aDM+RGVtbyBTdHVkZW50UHJvZmlsZTwvaDM+XHJcbiAgICAgICAgICA8cHJlIGNsYXNzPVwianNvbi1ibG9ja1wiPnt7IGZvcm1hdEpzb24oZGVtb1Byb2ZpbGUpIH19PC9wcmU+XHJcbiAgICAgICAgPC9lbC1jYXJkPlxyXG5cclxuICAgICAgICA8ZWwtY2FyZCBzaGFkb3c9XCJuZXZlclwiPlxyXG4gICAgICAgICAgPHRlbXBsYXRlICNoZWFkZXI+6Ieq54S26K+t6KiA5YWl5Y+jPC90ZW1wbGF0ZT5cclxuICAgICAgICAgIDxlbC1pbnB1dCB2LW1vZGVsPVwibmF0dXJhbExhbmd1YWdlTWVzc2FnZVwiIHR5cGU9XCJ0ZXh0YXJlYVwiIDpyb3dzPVwiNlwiIC8+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWN0aW9uLXJvd1wiPlxyXG4gICAgICAgICAgICA8ZWwtYnV0dG9uIHR5cGU9XCJwcmltYXJ5XCIgOmxvYWRpbmc9XCJjYWxsU3RhdHVzID09PSAnbG9hZGluZydcIiBAY2xpY2s9XCJydW5SYWdDaGF0XCI+XHJcbiAgICAgICAgICAgICAg55yf5a6eIFJBRyDpl67nrZRcclxuICAgICAgICAgICAgPC9lbC1idXR0b24+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2VsLWNhcmQ+XHJcblxyXG4gICAgICAgIDxlbC1jYXJkIHNoYWRvdz1cIm5ldmVyXCI+XHJcbiAgICAgICAgICA8dGVtcGxhdGUgI2hlYWRlcj7ljZXmmbrog73kvZPmtYvor5XljLo8L3RlbXBsYXRlPlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cImJ1dHRvbi1ncmlkXCI+XHJcbiAgICAgICAgICAgIDxlbC1idXR0b25cclxuICAgICAgICAgICAgICB2LWZvcj1cImFnZW50VHlwZSBpbiBhZ2VudFR5cGVzXCJcclxuICAgICAgICAgICAgICA6a2V5PVwiYWdlbnRUeXBlXCJcclxuICAgICAgICAgICAgICB0eXBlPVwicHJpbWFyeVwiXHJcbiAgICAgICAgICAgICAgOmxvYWRpbmc9XCJjYWxsU3RhdHVzID09PSAnbG9hZGluZydcIlxyXG4gICAgICAgICAgICAgIEBjbGljaz1cInJ1blNpbmdsZUFnZW50KGFnZW50VHlwZSlcIlxyXG4gICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAg5rWL6K+VIHt7IGFnZW50VHlwZSB9fVxyXG4gICAgICAgICAgICA8L2VsLWJ1dHRvbj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZWwtY2FyZD5cclxuXHJcbiAgICAgICAgPGVsLWNhcmQgc2hhZG93PVwibmV2ZXJcIj5cclxuICAgICAgICAgIDx0ZW1wbGF0ZSAjaGVhZGVyPuWkmuaZuuiDveS9k+W3peS9nOa1gea1i+ivleWMujwvdGVtcGxhdGU+XHJcbiAgICAgICAgICA8ZWwtYnV0dG9uIHR5cGU9XCJzdWNjZXNzXCIgOmxvYWRpbmc9XCJjYWxsU3RhdHVzID09PSAnbG9hZGluZydcIiBAY2xpY2s9XCJydW5Xb3JrZmxvd1wiPlxyXG4gICAgICAgICAgICDoh6rnhLbor63oqIDlrozmlbTlt6XkvZzmtYFcclxuICAgICAgICAgIDwvZWwtYnV0dG9uPlxyXG4gICAgICAgIDwvZWwtY2FyZD5cclxuICAgICAgPC9hc2lkZT5cclxuXHJcbiAgICAgIDxzZWN0aW9uIGNsYXNzPVwicmlnaHQtY29sdW1uXCI+XHJcbiAgICAgICAgPGVsLWNhcmQgc2hhZG93PVwibmV2ZXJcIj5cclxuICAgICAgICAgIDx0ZW1wbGF0ZSAjaGVhZGVyPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2FyZC1oZWFkZXJcIj5cclxuICAgICAgICAgICAgICA8c3Bhbj7nu5PmnpzlsZXnpLrljLo8L3NwYW4+XHJcbiAgICAgICAgICAgICAgPGVsLXRhZz57eyBjYWxsU3RhdHVzIH19PC9lbC10YWc+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgPC90ZW1wbGF0ZT5cclxuXHJcbiAgICAgICAgICA8aDI+e3sgY3VycmVudFRpdGxlIH19PC9oMj5cclxuXHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwic3BsaXQtcGFuZWxcIj5cclxuICAgICAgICAgICAgPHNlY3Rpb24+XHJcbiAgICAgICAgICAgICAgPGgzPuivt+axgiBKU09OPC9oMz5cclxuICAgICAgICAgICAgICA8cHJlIGNsYXNzPVwianNvbi1ibG9ja1wiPnt7IGZvcm1hdEpzb24oY3VycmVudFJlcXVlc3QpIH19PC9wcmU+XHJcbiAgICAgICAgICAgIDwvc2VjdGlvbj5cclxuICAgICAgICAgICAgPHNlY3Rpb24+XHJcbiAgICAgICAgICAgICAgPGgzPuWTjeW6lCBKU09OPC9oMz5cclxuICAgICAgICAgICAgICA8cHJlIGNsYXNzPVwianNvbi1ibG9ja1wiPnt7IGZvcm1hdEpzb24oY3VycmVudFJlc3BvbnNlKSB9fTwvcHJlPlxyXG4gICAgICAgICAgICA8L3NlY3Rpb24+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICA8c2VjdGlvbiB2LWlmPVwiY3VycmVudEFnZW50UmVzdWx0XCIgY2xhc3M9XCJzdW1tYXJ5LXNlY3Rpb25cIj5cclxuICAgICAgICAgICAgPGgzPuaZuuiDveS9k+i+k+WHuuaRmOimgTwvaDM+XHJcblxyXG4gICAgICAgICAgICA8ZWwtY2FyZCB2LWlmPVwiY3VycmVudEFnZW50UmVzdWx0LmFnZW50VHlwZSA9PT0gJ3Byb2ZpbGVfYWdlbnQnXCIgc2hhZG93PVwibmV2ZXJcIj5cclxuICAgICAgICAgICAgICA8dGVtcGxhdGUgI2hlYWRlcj7nlLvlg4/liIbmnpDljaHniYc8L3RlbXBsYXRlPlxyXG4gICAgICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMgOmNvbHVtbj1cIjFcIiBib3JkZXIgc2l6ZT1cInNtYWxsXCI+XHJcbiAgICAgICAgICAgICAgICA8ZWwtZGVzY3JpcHRpb25zLWl0ZW0gbGFiZWw9XCLlrabkuaDpmLbmrrVcIj57eyBvdXRwdXRWYWx1ZShcImxlYXJuaW5nU3RhZ2VcIikgfX08L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwi6aOO6Zmp562J57qnXCI+e3sgb3V0cHV0VmFsdWUoXCJyaXNrTGV2ZWxcIikgfX08L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwi6JaE5byx54K55oC757uTXCI+e3sgb3V0cHV0VmFsdWUoXCJ3ZWFrTm9kZVN1bW1hcnlcIikgfX08L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwi5o6o6I2Q6LWE5rqQ57G75Z6LXCI+XHJcbiAgICAgICAgICAgICAgICAgIHt7IGZvcm1hdEpzb24ob3V0cHV0VmFsdWUoXCJwcmVmZXJyZWRSZXNvdXJjZVR5cGVzXCIpKSB9fVxyXG4gICAgICAgICAgICAgICAgPC9lbC1kZXNjcmlwdGlvbnMtaXRlbT5cclxuICAgICAgICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMtaXRlbSBsYWJlbD1cIuaOqOiNkOmimOWei1wiPlxyXG4gICAgICAgICAgICAgICAgICB7eyBmb3JtYXRKc29uKG91dHB1dFZhbHVlKFwicmVjb21tZW5kZWRRdWVzdGlvblR5cGVzXCIpKSB9fVxyXG4gICAgICAgICAgICAgICAgPC9lbC1kZXNjcmlwdGlvbnMtaXRlbT5cclxuICAgICAgICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMtaXRlbSBsYWJlbD1cIue7mSBwbGFubmVyX2FnZW50IOeahCBuZXh0QWdlbnRJbnB1dFwiPlxyXG4gICAgICAgICAgICAgICAgICA8cHJlIGNsYXNzPVwiaW5saW5lLWpzb25cIj57eyBmb3JtYXRKc29uKG91dHB1dFZhbHVlKFwibmV4dEFnZW50SW5wdXRcIikpIH19PC9wcmU+XHJcbiAgICAgICAgICAgICAgICA8L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgICAgIDwvZWwtZGVzY3JpcHRpb25zPlxyXG4gICAgICAgICAgICA8L2VsLWNhcmQ+XHJcblxyXG4gICAgICAgICAgICA8ZWwtY2FyZCB2LWlmPVwiY3VycmVudEFnZW50UmVzdWx0LmFnZW50VHlwZSA9PT0gJ3BsYW5uZXJfYWdlbnQnXCIgc2hhZG93PVwibmV2ZXJcIj5cclxuICAgICAgICAgICAgICA8dGVtcGxhdGUgI2hlYWRlcj7lrabkuaDot6/lvoTljaHniYc8L3RlbXBsYXRlPlxyXG4gICAgICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMgOmNvbHVtbj1cIjFcIiBib3JkZXIgc2l6ZT1cInNtYWxsXCI+XHJcbiAgICAgICAgICAgICAgICA8ZWwtZGVzY3JpcHRpb25zLWl0ZW0gbGFiZWw9XCJMZWFybmluZ1BhdGgudGl0bGVcIj5cclxuICAgICAgICAgICAgICAgICAge3sgb3V0cHV0VmFsdWUoXCJsZWFybmluZ1BhdGhcIik/LnRpdGxlIH19XHJcbiAgICAgICAgICAgICAgICA8L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwiTGVhcm5pbmdQYXRoLmN1cnJlbnRTdGFnZVwiPlxyXG4gICAgICAgICAgICAgICAgICB7eyBvdXRwdXRWYWx1ZShcImxlYXJuaW5nUGF0aFwiKT8uY3VycmVudFN0YWdlIH19XHJcbiAgICAgICAgICAgICAgICA8L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwiTGVhcm5pbmdQYXRoLnRhcmdldEdvYWxcIj5cclxuICAgICAgICAgICAgICAgICAge3sgb3V0cHV0VmFsdWUoXCJsZWFybmluZ1BhdGhcIik/LnRhcmdldEdvYWwgfX1cclxuICAgICAgICAgICAgICAgIDwvZWwtZGVzY3JpcHRpb25zLWl0ZW0+XHJcbiAgICAgICAgICAgICAgICA8ZWwtZGVzY3JpcHRpb25zLWl0ZW0gbGFiZWw9XCJMZWFybmluZ1BhdGgucGF0aE5vZGVJZHNcIj5cclxuICAgICAgICAgICAgICAgICAge3sgZm9ybWF0SnNvbihvdXRwdXRWYWx1ZShcImxlYXJuaW5nUGF0aFwiKT8ucGF0aE5vZGVJZHMpIH19XHJcbiAgICAgICAgICAgICAgICA8L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwicGxhbm5pbmdSZWFzb25cIj5cclxuICAgICAgICAgICAgICAgICAge3sgb3V0cHV0VmFsdWUoXCJwbGFubmluZ1JlYXNvblwiKSB9fVxyXG4gICAgICAgICAgICAgICAgPC9lbC1kZXNjcmlwdGlvbnMtaXRlbT5cclxuICAgICAgICAgICAgICA8L2VsLWRlc2NyaXB0aW9ucz5cclxuICAgICAgICAgICAgICA8aDQ+TGVhcm5pbmdUYXNrIOWIl+ihqDwvaDQ+XHJcbiAgICAgICAgICAgICAgPHByZSBjbGFzcz1cImpzb24tYmxvY2sgY29tcGFjdFwiPnt7IGZvcm1hdEpzb24ob3V0cHV0VmFsdWUoXCJsZWFybmluZ1Rhc2tzXCIpKSB9fTwvcHJlPlxyXG4gICAgICAgICAgICA8L2VsLWNhcmQ+XHJcblxyXG4gICAgICAgICAgICA8ZWwtY2FyZCB2LWlmPVwiY3VycmVudEFnZW50UmVzdWx0LmFnZW50VHlwZSA9PT0gJ3Jlc291cmNlX2FnZW50J1wiIHNoYWRvdz1cIm5ldmVyXCI+XHJcbiAgICAgICAgICAgICAgPHRlbXBsYXRlICNoZWFkZXI+6LWE5rqQ5o6o6I2Q5Y2h54mHPC90ZW1wbGF0ZT5cclxuICAgICAgICAgICAgICA8ZWwtZGVzY3JpcHRpb25zIDpjb2x1bW49XCIxXCIgYm9yZGVyIHNpemU9XCJzbWFsbFwiPlxyXG4gICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwicmVzb3VyY2VQbGFuXCI+XHJcbiAgICAgICAgICAgICAgICAgIDxwcmUgY2xhc3M9XCJpbmxpbmUtanNvblwiPnt7IGZvcm1hdEpzb24ob3V0cHV0VmFsdWUoXCJyZXNvdXJjZVBsYW5cIikpIH19PC9wcmU+XHJcbiAgICAgICAgICAgICAgICA8L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwicmVzb3VyY2VJZHNcIj5cclxuICAgICAgICAgICAgICAgICAge3sgZm9ybWF0SnNvbihvdXRwdXRWYWx1ZShcInJlc291cmNlSWRzXCIpKSB9fVxyXG4gICAgICAgICAgICAgICAgPC9lbC1kZXNjcmlwdGlvbnMtaXRlbT5cclxuICAgICAgICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMtaXRlbSBsYWJlbD1cImF1ZGl0U3RhdHVzXCI+e3sgb3V0cHV0VmFsdWUoXCJhdWRpdFN0YXR1c1wiKSB9fTwvZWwtZGVzY3JpcHRpb25zLWl0ZW0+XHJcbiAgICAgICAgICAgICAgPC9lbC1kZXNjcmlwdGlvbnM+XHJcbiAgICAgICAgICAgICAgPGg0PnJlY29tbWVuZGF0aW9uczwvaDQ+XHJcbiAgICAgICAgICAgICAgPHByZSBjbGFzcz1cImpzb24tYmxvY2sgY29tcGFjdFwiPnt7IGZvcm1hdEpzb24ob3V0cHV0VmFsdWUoXCJyZWNvbW1lbmRhdGlvbnNcIikpIH19PC9wcmU+XHJcbiAgICAgICAgICAgICAgPGg0PnB1c2hSZWNvcmRzPC9oND5cclxuICAgICAgICAgICAgICA8cHJlIGNsYXNzPVwianNvbi1ibG9jayBjb21wYWN0XCI+e3sgZm9ybWF0SnNvbihvdXRwdXRWYWx1ZShcInB1c2hSZWNvcmRzXCIpKSB9fTwvcHJlPlxyXG4gICAgICAgICAgICA8L2VsLWNhcmQ+XHJcblxyXG4gICAgICAgICAgICA8ZWwtY2FyZCB2LWlmPVwiY3VycmVudEFnZW50UmVzdWx0LmFnZW50VHlwZSA9PT0gJ3FhX2FnZW50J1wiIHNoYWRvdz1cIm5ldmVyXCI+XHJcbiAgICAgICAgICAgICAgPHRlbXBsYXRlICNoZWFkZXI+6Zeu562U5pm66IO95L2T57uT5p6cPC90ZW1wbGF0ZT5cclxuICAgICAgICAgICAgICA8cD57eyBvdXRwdXRWYWx1ZShcImFuc3dlclwiKSB9fTwvcD5cclxuICAgICAgICAgICAgICA8aDQ+dXNlZEFnZW50VHlwZXM8L2g0PlxyXG4gICAgICAgICAgICAgIDxwcmUgY2xhc3M9XCJqc29uLWJsb2NrIGNvbXBhY3RcIj57eyBmb3JtYXRKc29uKG91dHB1dFZhbHVlKFwidXNlZEFnZW50VHlwZXNcIikpIH19PC9wcmU+XHJcbiAgICAgICAgICAgICAgPGg0PnJldHJpZXZlZERvY3VtZW50czwvaDQ+XHJcbiAgICAgICAgICAgICAgPHByZSBjbGFzcz1cImpzb24tYmxvY2sgY29tcGFjdFwiPnt7IGZvcm1hdEpzb24ob3V0cHV0VmFsdWUoXCJyZXRyaWV2ZWREb2N1bWVudHNcIikpIH19PC9wcmU+XHJcbiAgICAgICAgICAgIDwvZWwtY2FyZD5cclxuXHJcbiAgICAgICAgICAgIDxlbC1jYXJkIHYtaWY9XCJjdXJyZW50QWdlbnRSZXN1bHQuYWdlbnRUeXBlID09PSAnbXVsdGltb2RhbF9hZ2VudCdcIiBzaGFkb3c9XCJuZXZlclwiPlxyXG4gICAgICAgICAgICAgIDx0ZW1wbGF0ZSAjaGVhZGVyPuWkmuaooeaAgei1hOa6kOWNoeeJhzwvdGVtcGxhdGU+XHJcbiAgICAgICAgICAgICAgPGRpdlxyXG4gICAgICAgICAgICAgICAgdi1mb3I9XCJyZXNvdXJjZSBpbiBvdXRwdXRWYWx1ZSgnZ2VuZXJhdGVkUmVzb3VyY2VzJykgfHwgW11cIlxyXG4gICAgICAgICAgICAgICAgOmtleT1cInJlc291cmNlLmlkXCJcclxuICAgICAgICAgICAgICAgIGNsYXNzPVwicmVzb3VyY2UtcHJldmlld1wiXHJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxoND57eyByZXNvdXJjZS50aXRsZSB9fSAvIHt7IHJlc291cmNlLnJlc291cmNlVHlwZSB9fTwvaDQ+XG4gICAgICAgICAgICAgICAgPE1pbmRNYXBWaWV3ZXIgdi1pZj1cInJlc291cmNlLnJlc291cmNlVHlwZSA9PT0gJ21pbmRfbWFwJ1wiIDpjb250ZW50PVwicmVzb3VyY2UuY29udGVudFwiIC8+XG4gICAgICAgICAgICAgICAgPHRlbXBsYXRlIHYtZWxzZS1pZj1cImlzVmlkZW9SZXNvdXJjZShyZXNvdXJjZSlcIj5cbiAgICAgICAgICAgICAgICAgIDx2aWRlbyB2LWlmPVwicmVzb3VyY2UuZmlsZVVybFwiIGNsYXNzPVwibXA0LXBsYXllclwiIDpzcmM9XCJyZXNvdXJjZS5maWxlVXJsXCIgY29udHJvbHMgLz5cbiAgICAgICAgICAgICAgICAgIDxWaWRlb0xlc3NvblBsYXllciA6Y29udGVudD1cInJlc291cmNlLmNvbnRlbnRcIiAvPlxuICAgICAgICAgICAgICAgIDwvdGVtcGxhdGU+XHJcbiAgICAgICAgICAgICAgICA8cHJlIHYtZWxzZSBjbGFzcz1cImpzb24tYmxvY2sgY29tcGFjdFwiPnt7IHJlc291cmNlLmNvbnRlbnQgfX08L3ByZT5cclxuICAgICAgICAgICAgICAgIDxlbC10YWc+e3sgcmVzb3VyY2UuYXVkaXRTdGF0dXMgfX08L2VsLXRhZz5cclxuICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICA8aDQ+cmVuZGVySGludHM8L2g0PlxyXG4gICAgICAgICAgICAgIDxwcmUgY2xhc3M9XCJqc29uLWJsb2NrIGNvbXBhY3RcIj57eyBmb3JtYXRKc29uKG91dHB1dFZhbHVlKFwicmVuZGVySGludHNcIikpIH19PC9wcmU+XHJcbiAgICAgICAgICAgIDwvZWwtY2FyZD5cclxuXHJcbiAgICAgICAgICAgIDxlbC1jYXJkIHYtaWY9XCJjdXJyZW50QWdlbnRSZXN1bHQuYWdlbnRUeXBlID09PSAncHJhY3RpY2VfYWdlbnQnXCIgc2hhZG93PVwibmV2ZXJcIj5cclxuICAgICAgICAgICAgICA8dGVtcGxhdGUgI2hlYWRlcj7nu4PkuaDpopjljaHniYc8L3RlbXBsYXRlPlxyXG4gICAgICAgICAgICAgIDxlbC1hbGVydFxyXG4gICAgICAgICAgICAgICAgdGl0bGU9XCJtYXN0ZXJ5VXBkYXRlUHJldmlldyAvIHByb2ZpbGVVcGRhdGVQcmV2aWV3IOS4uuaZuuiDveS9k+ino+mHiuS/oeaBr++8jOWPquWtmOWcqOS6jiBBZ2VudFJ1blJlc3VsdC5vdXRwdXTvvIzkuI3lsZ7kuo4gUHJhY3RpY2VSZWNvcmQg5a2X5q6144CCXCJcclxuICAgICAgICAgICAgICAgIHR5cGU9XCJ3YXJuaW5nXCJcclxuICAgICAgICAgICAgICAgIHNob3ctaWNvblxyXG4gICAgICAgICAgICAgICAgOmNsb3NhYmxlPVwiZmFsc2VcIlxyXG4gICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgICAgPGRpdiB2LWZvcj1cInF1ZXN0aW9uIGluIHByYWN0aWNlUXVlc3Rpb25zXCIgOmtleT1cInF1ZXN0aW9uLmlkXCIgY2xhc3M9XCJxdWVzdGlvbi1jYXJkXCI+XHJcbiAgICAgICAgICAgICAgICA8aDQ+e3sgcXVlc3Rpb24udGl0bGUgfX08L2g0PlxyXG4gICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucyA6Y29sdW1uPVwiMVwiIGJvcmRlciBzaXplPVwic21hbGxcIj5cclxuICAgICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwicXVlc3Rpb25UeXBlXCI+e3sgcXVlc3Rpb24ucXVlc3Rpb25UeXBlIH19PC9lbC1kZXNjcmlwdGlvbnMtaXRlbT5cclxuICAgICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwiY29udGVudFwiPnt7IHF1ZXN0aW9uLmNvbnRlbnQgfX08L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgICAgICAgICA8ZWwtZGVzY3JpcHRpb25zLWl0ZW0gbGFiZWw9XCJvcHRpb25zXCI+e3sgZm9ybWF0SnNvbihxdWVzdGlvbi5vcHRpb25zKSB9fTwvZWwtZGVzY3JpcHRpb25zLWl0ZW0+XHJcbiAgICAgICAgICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMtaXRlbSBsYWJlbD1cImFuc3dlclwiPnt7IHF1ZXN0aW9uLmFuc3dlciB9fTwvZWwtZGVzY3JpcHRpb25zLWl0ZW0+XHJcbiAgICAgICAgICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMtaXRlbSBsYWJlbD1cImV4cGxhbmF0aW9uXCI+e3sgcXVlc3Rpb24uZXhwbGFuYXRpb24gfX08L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgICAgICAgICA8ZWwtZGVzY3JpcHRpb25zLWl0ZW0gbGFiZWw9XCJkaWZmaWN1bHR5XCI+e3sgcXVlc3Rpb24uZGlmZmljdWx0eSB9fTwvZWwtZGVzY3JpcHRpb25zLWl0ZW0+XHJcbiAgICAgICAgICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMtaXRlbSBsYWJlbD1cInRhZ3NcIj57eyBmb3JtYXRKc29uKHF1ZXN0aW9uLnRhZ3MpIH19PC9lbC1kZXNjcmlwdGlvbnMtaXRlbT5cclxuICAgICAgICAgICAgICAgIDwvZWwtZGVzY3JpcHRpb25zPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFuc3dlci1yb3dcIj5cclxuICAgICAgICAgICAgICAgICAgPGVsLWlucHV0IHYtbW9kZWw9XCJhbnN3ZXJzW3F1ZXN0aW9uLmlkXVwiIHBsYWNlaG9sZGVyPVwi5qih5ouf562U5qGI77yM5LiN5aGr5YiZ5L2/55So5q2j56Gu562U5qGIXCIgLz5cclxuICAgICAgICAgICAgICAgICAgPGVsLWJ1dHRvbiB0eXBlPVwicHJpbWFyeVwiIEBjbGljaz1cInN1Ym1pdFByYWN0aWNlQW5zd2VyKHF1ZXN0aW9uKVwiPuaooeaLn+aPkOS6pOetlOahiDwvZWwtYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8cHJlIHYtaWY9XCJzdWJtaXR0ZWRSZWNvcmRzW3F1ZXN0aW9uLmlkXVwiIGNsYXNzPVwianNvbi1ibG9jayBjb21wYWN0XCI+XHJcbnt7IGZvcm1hdEpzb24oc3VibWl0dGVkUmVjb3Jkc1txdWVzdGlvbi5pZF0pIH19XHJcbiAgICAgICAgICAgICAgICA8L3ByZT5cclxuICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICA8aDQ+bWFzdGVyeVVwZGF0ZVByZXZpZXc8L2g0PlxyXG4gICAgICAgICAgICAgIDxwcmUgY2xhc3M9XCJqc29uLWJsb2NrIGNvbXBhY3RcIj57eyBmb3JtYXRKc29uKG91dHB1dFZhbHVlKFwibWFzdGVyeVVwZGF0ZVByZXZpZXdcIikpIH19PC9wcmU+XHJcbiAgICAgICAgICAgICAgPGg0PnByb2ZpbGVVcGRhdGVQcmV2aWV3PC9oND5cclxuICAgICAgICAgICAgICA8cHJlIGNsYXNzPVwianNvbi1ibG9jayBjb21wYWN0XCI+e3sgZm9ybWF0SnNvbihvdXRwdXRWYWx1ZShcInByb2ZpbGVVcGRhdGVQcmV2aWV3XCIpKSB9fTwvcHJlPlxyXG4gICAgICAgICAgICA8L2VsLWNhcmQ+XHJcbiAgICAgICAgICA8L3NlY3Rpb24+XHJcblxyXG4gICAgICAgICAgPHNlY3Rpb24gdi1pZj1cImN1cnJlbnRDaGF0UmVzdWx0XCIgY2xhc3M9XCJzdW1tYXJ5LXNlY3Rpb25cIj5cclxuICAgICAgICAgICAgPGgzPuecn+WuniBSQUcg6Zeu562U57uT5p6cPC9oMz5cclxuICAgICAgICAgICAgPGVsLWNhcmQgc2hhZG93PVwibmV2ZXJcIj5cclxuICAgICAgICAgICAgICA8dGVtcGxhdGUgI2hlYWRlcj7lm57nrZQ8L3RlbXBsYXRlPlxyXG4gICAgICAgICAgICAgIDxwPnt7IGN1cnJlbnRDaGF0UmVzdWx0LmFuc3dlciB9fTwvcD5cclxuICAgICAgICAgICAgICA8aDQ+cmV0cmlldmVkRG9jdW1lbnRzPC9oND5cclxuICAgICAgICAgICAgICA8cHJlIGNsYXNzPVwianNvbi1ibG9jayBjb21wYWN0XCI+e3sgZm9ybWF0SnNvbihjdXJyZW50Q2hhdFJlc3VsdC5yZXRyaWV2ZWREb2N1bWVudHMpIH19PC9wcmU+XHJcbiAgICAgICAgICAgIDwvZWwtY2FyZD5cclxuICAgICAgICAgIDwvc2VjdGlvbj5cclxuXHJcbiAgICAgICAgICA8c2VjdGlvbiB2LWlmPVwiY3VycmVudFdvcmtmbG93UmVzdWx0XCIgY2xhc3M9XCJzdW1tYXJ5LXNlY3Rpb25cIj5cclxuICAgICAgICAgICAgPGgzPuW3peS9nOa1geatpemqpOWNoeeJhzwvaDM+XHJcbiAgICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMgOmNvbHVtbj1cIjFcIiBib3JkZXIgc2l6ZT1cInNtYWxsXCI+XHJcbiAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwidGFza0lkXCI+e3sgY3VycmVudFdvcmtmbG93UmVzdWx0LnRhc2tJZCB9fTwvZWwtZGVzY3JpcHRpb25zLWl0ZW0+XHJcbiAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwid29ya2Zsb3dUeXBlXCI+e3sgY3VycmVudFdvcmtmbG93UmVzdWx0LndvcmtmbG93VHlwZSB9fTwvZWwtZGVzY3JpcHRpb25zLWl0ZW0+XHJcbiAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwic3RhdHVzXCI+e3sgY3VycmVudFdvcmtmbG93UmVzdWx0LnN0YXR1cyB9fTwvZWwtZGVzY3JpcHRpb25zLWl0ZW0+XHJcbiAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwiZmluYWxPdXRwdXRcIj5cclxuICAgICAgICAgICAgICAgIDxwcmUgY2xhc3M9XCJpbmxpbmUtanNvblwiPnt7IGZvcm1hdEpzb24oY3VycmVudFdvcmtmbG93UmVzdWx0LmZpbmFsT3V0cHV0KSB9fTwvcHJlPlxyXG4gICAgICAgICAgICAgIDwvZWwtZGVzY3JpcHRpb25zLWl0ZW0+XHJcbiAgICAgICAgICAgIDwvZWwtZGVzY3JpcHRpb25zPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwid29ya2Zsb3ctZ3JpZFwiPlxyXG4gICAgICAgICAgICAgIDxlbC1jYXJkIHYtZm9yPVwic3RlcCBpbiBjdXJyZW50V29ya2Zsb3dSZXN1bHQuc3RlcHNcIiA6a2V5PVwic3RlcC50YXNrSWRcIiBzaGFkb3c9XCJuZXZlclwiPlxyXG4gICAgICAgICAgICAgICAgPHRlbXBsYXRlICNoZWFkZXI+XHJcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjYXJkLWhlYWRlclwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPnt7IHN0ZXAuYWdlbnRUeXBlIH19PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgIDxlbC10YWc+e3sgc3RlcC5zdGF0dXMgfX08L2VsLXRhZz5cclxuICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8L3RlbXBsYXRlPlxyXG4gICAgICAgICAgICAgICAgPHAgdi1pZj1cInN0ZXAuZXJyb3JNZXNzYWdlXCIgY2xhc3M9XCJlcnJvci10ZXh0XCI+e3sgc3RlcC5lcnJvck1lc3NhZ2UgfX08L3A+XHJcbiAgICAgICAgICAgICAgICA8cHJlIGNsYXNzPVwianNvbi1ibG9jayBjb21wYWN0XCI+e3sgZm9ybWF0SnNvbihzdGVwLm91dHB1dCkgfX08L3ByZT5cclxuICAgICAgICAgICAgICA8L2VsLWNhcmQ+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgPGVsLWNhcmQgc2hhZG93PVwibmV2ZXJcIj5cclxuICAgICAgICAgICAgICA8dGVtcGxhdGUgI2hlYWRlcj7oh6rnhLbor63oqIDlm57nrZQ8L3RlbXBsYXRlPlxyXG4gICAgICAgICAgICAgIDxwPnt7IGN1cnJlbnRXb3JrZmxvd1Jlc3VsdC5maW5hbE91dHB1dC5hbnN3ZXIgfX08L3A+XHJcbiAgICAgICAgICAgIDwvZWwtY2FyZD5cclxuXHJcbiAgICAgICAgICAgIDxlbC1jYXJkIHNoYWRvdz1cIm5ldmVyXCI+XHJcbiAgICAgICAgICAgICAgPHRlbXBsYXRlICNoZWFkZXI+5a6M5pW06aKY55uuPC90ZW1wbGF0ZT5cclxuICAgICAgICAgICAgICA8ZGl2IHYtZm9yPVwicXVlc3Rpb24gaW4gd29ya2Zsb3dRdWVzdGlvbnNcIiA6a2V5PVwicXVlc3Rpb24uaWRcIiBjbGFzcz1cInF1ZXN0aW9uLWNhcmRcIj5cclxuICAgICAgICAgICAgICAgIDxoND57eyBxdWVzdGlvbi50aXRsZSB9fTwvaDQ+XHJcbiAgICAgICAgICAgICAgICA8ZWwtZGVzY3JpcHRpb25zIDpjb2x1bW49XCIxXCIgYm9yZGVyIHNpemU9XCJzbWFsbFwiPlxyXG4gICAgICAgICAgICAgICAgICA8ZWwtZGVzY3JpcHRpb25zLWl0ZW0gbGFiZWw9XCJxdWVzdGlvblR5cGVcIj57eyBxdWVzdGlvbi5xdWVzdGlvblR5cGUgfX08L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgICAgICAgICA8ZWwtZGVzY3JpcHRpb25zLWl0ZW0gbGFiZWw9XCJjb250ZW50XCI+e3sgcXVlc3Rpb24uY29udGVudCB9fTwvZWwtZGVzY3JpcHRpb25zLWl0ZW0+XHJcbiAgICAgICAgICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMtaXRlbSBsYWJlbD1cIm9wdGlvbnNcIj57eyBmb3JtYXRKc29uKHF1ZXN0aW9uLm9wdGlvbnMpIH19PC9lbC1kZXNjcmlwdGlvbnMtaXRlbT5cclxuICAgICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwiYW5zd2VyXCI+e3sgcXVlc3Rpb24uYW5zd2VyIH19PC9lbC1kZXNjcmlwdGlvbnMtaXRlbT5cclxuICAgICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwiZXhwbGFuYXRpb25cIj57eyBxdWVzdGlvbi5leHBsYW5hdGlvbiB9fTwvZWwtZGVzY3JpcHRpb25zLWl0ZW0+XHJcbiAgICAgICAgICAgICAgICAgIDxlbC1kZXNjcmlwdGlvbnMtaXRlbSBsYWJlbD1cImRpZmZpY3VsdHlcIj57eyBxdWVzdGlvbi5kaWZmaWN1bHR5IH19PC9lbC1kZXNjcmlwdGlvbnMtaXRlbT5cclxuICAgICAgICAgICAgICAgICAgPGVsLWRlc2NyaXB0aW9ucy1pdGVtIGxhYmVsPVwidGFnc1wiPnt7IGZvcm1hdEpzb24ocXVlc3Rpb24udGFncykgfX08L2VsLWRlc2NyaXB0aW9ucy1pdGVtPlxyXG4gICAgICAgICAgICAgICAgPC9lbC1kZXNjcmlwdGlvbnM+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZWwtY2FyZD5cclxuXG4gICAgICAgICAgICA8ZWwtY2FyZCBzaGFkb3c9XCJuZXZlclwiPlxuICAgICAgICAgICAgICA8dGVtcGxhdGUgI2hlYWRlcj7mgJ3nu7Tlr7zlm748L3RlbXBsYXRlPlxuICAgICAgICAgICAgICA8TWluZE1hcFZpZXdlciB2LWZvcj1cInJlc291cmNlIGluIHdvcmtmbG93TWluZE1hcHNcIiA6a2V5PVwicmVzb3VyY2UuaWRcIiA6Y29udGVudD1cInJlc291cmNlLmNvbnRlbnRcIiAvPlxuICAgICAgICAgICAgPC9lbC1jYXJkPlxuXHJcbiAgICAgICAgICAgIDxlbC1jYXJkIHNoYWRvdz1cIm5ldmVyXCI+XHJcbiAgICAgICAgICAgICAgPHRlbXBsYXRlICNoZWFkZXI+6KeG6aKR6LWE5rqQPC90ZW1wbGF0ZT5cclxuICAgICAgICAgICAgICA8ZGl2IHYtZm9yPVwicmVzb3VyY2UgaW4gd29ya2Zsb3dWaWRlb3NcIiA6a2V5PVwicmVzb3VyY2UuaWRcIiBjbGFzcz1cInJlc291cmNlLXByZXZpZXdcIj5cclxuICAgICAgICAgICAgICAgIDxoND57eyByZXNvdXJjZS50aXRsZSB9fSAvIHt7IHJlc291cmNlLnJlc291cmNlVHlwZSB9fTwvaDQ+XHJcbiAgICAgICAgICAgICAgICA8dmlkZW8gdi1pZj1cInJlc291cmNlLmZpbGVVcmxcIiBjbGFzcz1cIm1wNC1wbGF5ZXJcIiA6c3JjPVwicmVzb3VyY2UuZmlsZVVybFwiIGNvbnRyb2xzIC8+XHJcbiAgICAgICAgICAgICAgICA8VmlkZW9MZXNzb25QbGF5ZXIgOmNvbnRlbnQ9XCJyZXNvdXJjZS5jb250ZW50XCIgLz5cclxuICAgICAgICAgICAgICAgIDxlbC10YWcgOnR5cGU9XCJyZXNvdXJjZS5hdWRpdFN0YXR1cyA9PT0gJ3Bhc3NlZCcgPyAnc3VjY2VzcycgOiAnd2FybmluZydcIj5cclxuICAgICAgICAgICAgICAgICAge3sgcmVzb3VyY2UuYXVkaXRTdGF0dXMgfX1cclxuICAgICAgICAgICAgICAgIDwvZWwtdGFnPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2VsLWNhcmQ+XHJcbiAgICAgICAgICA8L3NlY3Rpb24+XHJcbiAgICAgICAgPC9lbC1jYXJkPlxyXG5cclxuICAgICAgICA8ZWwtY2FyZCBzaGFkb3c9XCJuZXZlclwiPlxyXG4gICAgICAgICAgPHRlbXBsYXRlICNoZWFkZXI+6ZSZ6K+v5L+h5oGv5Yy6PC90ZW1wbGF0ZT5cclxuICAgICAgICAgIDxlbC1hbGVydFxyXG4gICAgICAgICAgICB2LWlmPVwiZXJyb3JNZXNzYWdlXCJcclxuICAgICAgICAgICAgOnRpdGxlPVwiZXJyb3JNZXNzYWdlXCJcclxuICAgICAgICAgICAgdHlwZT1cImVycm9yXCJcclxuICAgICAgICAgICAgc2hvdy1pY29uXHJcbiAgICAgICAgICAgIDpjbG9zYWJsZT1cImZhbHNlXCJcclxuICAgICAgICAgIC8+XHJcbiAgICAgICAgICA8ZWwtZW1wdHkgdi1lbHNlIGRlc2NyaXB0aW9uPVwi5pqC5peg6ZSZ6K+vXCIgLz5cclxuICAgICAgICA8L2VsLWNhcmQ+XHJcbiAgICAgIDwvc2VjdGlvbj5cclxuICAgIDwvc2VjdGlvbj5cclxuXHJcbiAgICA8c2VjdGlvbiBjbGFzcz1cImxvZy1zZWN0aW9uXCI+XHJcbiAgICAgIDxlbC1jYXJkIHNoYWRvdz1cIm5ldmVyXCI+XHJcbiAgICAgICAgPHRlbXBsYXRlICNoZWFkZXI+5rWL6K+V5pel5b+XPC90ZW1wbGF0ZT5cclxuICAgICAgICA8ZWwtdGFibGUgOmRhdGE9XCJ0ZXN0TG9nc1wiIGJvcmRlcj5cclxuICAgICAgICAgIDxlbC10YWJsZS1jb2x1bW4gcHJvcD1cImNyZWF0ZWRBdFwiIGxhYmVsPVwiY3JlYXRlZEF0XCIgbWluLXdpZHRoPVwiMTgwXCIgLz5cclxuICAgICAgICAgIDxlbC10YWJsZS1jb2x1bW4gcHJvcD1cInRpdGxlXCIgbGFiZWw9XCJ0aXRsZVwiIG1pbi13aWR0aD1cIjIwMFwiIC8+XHJcbiAgICAgICAgICA8ZWwtdGFibGUtY29sdW1uIHByb3A9XCJhZ2VudFR5cGVcIiBsYWJlbD1cImFnZW50VHlwZVwiIG1pbi13aWR0aD1cIjE1MFwiIC8+XHJcbiAgICAgICAgICA8ZWwtdGFibGUtY29sdW1uIHByb3A9XCJzdGF0dXNcIiBsYWJlbD1cInN0YXR1c1wiIG1pbi13aWR0aD1cIjEwMFwiIC8+XHJcbiAgICAgICAgICA8ZWwtdGFibGUtY29sdW1uIHByb3A9XCJlcnJvck1lc3NhZ2VcIiBsYWJlbD1cImVycm9yTWVzc2FnZVwiIG1pbi13aWR0aD1cIjI0MFwiIC8+XHJcbiAgICAgICAgPC9lbC10YWJsZT5cclxuICAgICAgPC9lbC1jYXJkPlxyXG4gICAgPC9zZWN0aW9uPlxyXG4gIDwvbWFpbj5cclxuPC90ZW1wbGF0ZT5cclxuXHJcbjxzdHlsZSBzY29wZWQ+XHJcbi5hZ2VudC10ZXN0LXBhZ2Uge1xyXG4gIG1pbi1oZWlnaHQ6IDEwMHZoO1xyXG4gIHBhZGRpbmc6IDI0cHg7XHJcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcclxuICBiYWNrZ3JvdW5kOiAjZjVmN2ZiO1xyXG59XHJcblxyXG4uYWdlbnQtdGVzdC1oZWFkZXIge1xyXG4gIGRpc3BsYXk6IGZsZXg7XHJcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xyXG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgbWF4LXdpZHRoOiAxNDgwcHg7XHJcbiAgbWFyZ2luOiAwIGF1dG8gMjBweDtcclxufVxyXG5cclxuLmFnZW50LXRlc3QtaGVhZGVyIGgxIHtcclxuICBtYXJnaW46IDA7XHJcbiAgZm9udC1zaXplOiAyOHB4O1xyXG4gIGxpbmUtaGVpZ2h0OiAxLjM7XHJcbn1cclxuXHJcbi5leWVicm93IHtcclxuICBtYXJnaW46IDAgMCA0cHg7XHJcbiAgY29sb3I6ICM2NDc0OGI7XHJcbiAgZm9udC1zaXplOiAxM3B4O1xyXG4gIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XHJcbn1cclxuXHJcbi5hZ2VudC10ZXN0LWxheW91dCB7XHJcbiAgZGlzcGxheTogZ3JpZDtcclxuICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IG1pbm1heCgzMjBweCwgNDIwcHgpIG1pbm1heCgwLCAxZnIpO1xyXG4gIGdhcDogMThweDtcclxuICBtYXgtd2lkdGg6IDE0ODBweDtcclxuICBtYXJnaW46IDAgYXV0bztcclxufVxyXG5cclxuLmxlZnQtY29sdW1uLFxyXG4ucmlnaHQtY29sdW1uIHtcclxuICBkaXNwbGF5OiBmbGV4O1xyXG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XHJcbiAgZ2FwOiAxNnB4O1xyXG4gIG1pbi13aWR0aDogMDtcclxufVxyXG5cclxuLmJ1dHRvbi1ncmlkIHtcclxuICBkaXNwbGF5OiBncmlkO1xyXG4gIGdhcDogMTBweDtcclxufVxyXG5cclxuLmFjdGlvbi1yb3cge1xyXG4gIG1hcmdpbi10b3A6IDEycHg7XHJcbn1cclxuXHJcbi5jYXJkLWhlYWRlciB7XHJcbiAgZGlzcGxheTogZmxleDtcclxuICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XHJcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICBnYXA6IDEycHg7XHJcbn1cclxuXHJcbi5zcGxpdC1wYW5lbCB7XHJcbiAgZGlzcGxheTogZ3JpZDtcclxuICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdCgyLCBtaW5tYXgoMCwgMWZyKSk7XHJcbiAgZ2FwOiAxNHB4O1xyXG59XHJcblxyXG4uanNvbi1ibG9jayxcbi5pbmxpbmUtanNvbiB7XG4gIG1hcmdpbjogMDtcclxuICBwYWRkaW5nOiAxMnB4O1xyXG4gIG92ZXJmbG93OiBhdXRvO1xyXG4gIGJvcmRlcjogMXB4IHNvbGlkICNkOWUyZWM7XHJcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xyXG4gIGJhY2tncm91bmQ6ICMwZjE3MmE7XHJcbiAgY29sb3I6ICNlMmU4ZjA7XHJcbiAgZm9udC1zaXplOiAxMnB4O1xyXG4gIGxpbmUtaGVpZ2h0OiAxLjU1O1xyXG4gIHdoaXRlLXNwYWNlOiBwcmUtd3JhcDtcclxuICB3b3JkLWJyZWFrOiBicmVhay13b3JkO1xyXG59XHJcblxyXG4uaW5saW5lLWpzb24ge1xyXG4gIG1heC1oZWlnaHQ6IDE4MHB4O1xyXG59XHJcblxyXG4uY29tcGFjdCB7XHJcbiAgbWF4LWhlaWdodDogMjYwcHg7XHJcbn1cclxuXHJcbi5zdW1tYXJ5LXNlY3Rpb24ge1xyXG4gIGRpc3BsYXk6IGdyaWQ7XHJcbiAgZ2FwOiAxNHB4O1xyXG4gIG1hcmdpbi10b3A6IDE4cHg7XHJcbn1cclxuXHJcbi5yZXNvdXJjZS1wcmV2aWV3LFxyXG4ucXVlc3Rpb24tY2FyZCB7XHJcbiAgZGlzcGxheTogZ3JpZDtcclxuICBnYXA6IDEwcHg7XHJcbiAgcGFkZGluZzogMTRweCAwO1xyXG4gIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZTVlN2ViO1xyXG59XHJcblxyXG4ubXA0LXBsYXllciB7XHJcbiAgd2lkdGg6IDEwMCU7XHJcbiAgYXNwZWN0LXJhdGlvOiAxNiAvIDk7XHJcbiAgYm9yZGVyLXJhZGl1czogMTJweDtcclxuICBiYWNrZ3JvdW5kOiAjMDcxNDI2O1xyXG59XHJcblxyXG4ucmVzb3VyY2UtcHJldmlldzpsYXN0LWNoaWxkLFxyXG4ucXVlc3Rpb24tY2FyZDpsYXN0LWNoaWxkIHtcclxuICBib3JkZXItYm90dG9tOiAwO1xyXG59XHJcblxyXG4uYW5zd2VyLXJvdyB7XG4gIGRpc3BsYXk6IGdyaWQ7XHJcbiAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiBtaW5tYXgoMCwgMWZyKSBhdXRvO1xyXG4gIGdhcDogMTBweDtcclxufVxyXG5cclxuLndvcmtmbG93LWdyaWQge1xyXG4gIGRpc3BsYXk6IGdyaWQ7XHJcbiAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoYXV0by1maXQsIG1pbm1heCgyNjBweCwgMWZyKSk7XHJcbiAgZ2FwOiAxMnB4O1xyXG4gIG1hcmdpbi10b3A6IDE0cHg7XHJcbn1cclxuXHJcbi5lcnJvci10ZXh0IHtcclxuICBjb2xvcjogI2RjMjYyNjtcclxufVxyXG5cclxuLmxvZy1zZWN0aW9uIHtcclxuICBtYXgtd2lkdGg6IDE0ODBweDtcclxuICBtYXJnaW46IDE4cHggYXV0byAwO1xyXG59XHJcblxyXG5AbWVkaWEgKG1heC13aWR0aDogOTgwcHgpIHtcclxuICAuYWdlbnQtdGVzdC1sYXlvdXQsXHJcbiAgLnNwbGl0LXBhbmVsLFxyXG4gIC5hbnN3ZXItcm93IHtcclxuICAgIGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyO1xyXG4gIH1cclxuXHJcbiAgLmFnZW50LXRlc3QtaGVhZGVyIHtcclxuICAgIGFsaWduLWl0ZW1zOiBmbGV4LXN0YXJ0O1xyXG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcclxuICAgIGdhcDogMTBweDtcclxuICB9XHJcbn1cclxuPC9zdHlsZT5cclxuIl0sImZpbGUiOiJEOi9maXJzdG1vbmV5L25vZGVsZWFybi1haS9mcm9udGVuZC9zcmMvcGFnZXMvZGV2L0FnZW50Rmxvd1Rlc3RQYWdlLnZ1ZSJ9