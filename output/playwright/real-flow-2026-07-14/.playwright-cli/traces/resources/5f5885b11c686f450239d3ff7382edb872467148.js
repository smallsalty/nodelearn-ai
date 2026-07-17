import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false, "VITE_API_BASE_URL": "http://localhost:8000/api/v1", "VITE_APP_NAME": "NodeLearn AI", "VITE_ENABLE_MOCK": "false", "VITE_ENABLE_STREAM": "true", "VITE_GRAPH_RENDERER": "echarts"};import { request } from "/src/api/client.ts";
const enableMock = import.meta.env.VITE_ENABLE_MOCK === "true";
const mockTimestamp = "2026-05-28T10:00:00Z";
const chatTimeout = 2 * 60 * 1e3;
const agentTimeout = 10 * 60 * 1e3;
const workflowTimeout = 20 * 60 * 1e3;
function mockResponse(data) {
  return {
    code: 200,
    message: "success",
    data,
    traceId: `trace_mock_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function createAgentOutput(payload) {
  const profile = payload.context?.profile;
  if (payload.agentType === "profile_agent") {
    return {
      learningStage: "基础补强阶段",
      riskLevel: "medium",
      weakNodeSummary: "栈顶边界、递归终止条件和数组下标越界需要优先复习。",
      preferredResourceTypes: ["mind_map", "code_case", "practice_question"],
      recommendedQuestionTypes: ["single_choice", "short_answer", "coding"],
      nextAgentInput: {
        targetGoal: profile?.learningGoal ?? "准备数据结构期末考试",
        timeBudget: profile?.availableStudyTime ?? "每天30分钟",
        weakNodeIds: profile?.weakNodeIds ?? ["node_stack_001", "node_recursion_001"]
      }
    };
  }
  if (payload.agentType === "planner_agent") {
    return {
      learningPath: {
        id: "path_demo_001",
        userId: payload.userId,
        courseId: payload.courseId ?? "course_ds_001",
        title: "数据结构期末栈补强路径",
        description: "围绕栈和递归薄弱点安排讲解、练习和复习。",
        currentStage: "基础补强阶段",
        targetGoal: "准备数据结构期末考试",
        pathNodeIds: ["node_array_001", "node_linked_list_001", "node_stack_001", "node_recursion_001"],
        currentNodeId: payload.nodeId,
        status: "success",
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp
      },
      learningTasks: [
        {
          id: "task_demo_001",
          pathId: "path_demo_001",
          userId: payload.userId,
          courseId: payload.courseId ?? "course_ds_001",
          nodeId: "node_stack_001",
          title: "复习栈结构与后进先出",
          taskType: "learn",
          resourceIds: ["resource_mind_map_001", "resource_code_case_001"],
          orderIndex: 1,
          status: "pending",
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp
        },
        {
          id: "task_demo_002",
          pathId: "path_demo_001",
          userId: payload.userId,
          courseId: payload.courseId ?? "course_ds_001",
          nodeId: "node_recursion_001",
          title: "练习递归终止条件题",
          taskType: "practice",
          resourceIds: ["question_demo_001"],
          orderIndex: 2,
          status: "pending",
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp
        }
      ],
      planningReason: "学生已有数组和链表基础，当前应补强栈操作，再用递归题巩固边界条件。"
    };
  }
  if (payload.agentType === "qa_agent") {
    return {
      sessionId: "session_demo_001",
      messageId: "message_demo_001",
      answer: "栈遵循后进先出原则，最后压入的元素最先从栈顶弹出。",
      usedAgentTypes: ["qa_agent", "resource_agent", "profile_agent"],
      retrievedDocuments: []
    };
  }
  if (payload.agentType === "resource_agent") {
    return {
      resourcePlan: {
        resourceTypes: ["lecture_doc", "mind_map", "practice_question", "code_case"],
        difficulty: "easy",
        learningGoal: "准备数据结构期末考试"
      },
      resourceIds: ["resource_doc_001", "resource_mind_map_001", "resource_question_001", "resource_code_001"],
      recommendations: [
        {
          id: "recommendation_demo_001",
          userId: payload.userId,
          courseId: payload.courseId ?? "course_ds_001",
          nodeId: payload.nodeId,
          resourceId: "resource_mind_map_001",
          resourceType: "mind_map",
          title: "栈结构思维导图",
          reason: "匹配图解偏好，适合先建立结构理解。",
          score: 0.91,
          createdAt: mockTimestamp
        }
      ],
      pushRecords: [
        {
          id: "push_demo_001",
          userId: payload.userId,
          resourceId: "resource_mind_map_001",
          nodeId: payload.nodeId,
          reason: "栈薄弱点优先推送",
          viewed: false,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp
        }
      ],
      auditStatus: "passed"
    };
  }
  if (payload.agentType === "multimodal_agent") {
    return {
      generatedResources: [
        {
          id: "resource_mind_map_001",
          userId: payload.userId,
          courseId: payload.courseId ?? "course_ds_001",
          nodeId: payload.nodeId,
          title: "栈思维导图",
          resourceType: "mind_map",
          content: "mindmap\n  root((栈))\n    后进先出\n    入栈 push\n    出栈 pop\n    栈顶 top\n    边界判断",
          status: "success",
          auditStatus: "passed",
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp
        }
      ],
      renderHints: {
        mindMap: "mermaid",
        videoScript: "markdown",
        animationScript: "markdown"
      },
      auditStatus: "passed"
    };
  }
  if (payload.agentType === "safety_agent") {
    return {
      id: "audit_demo_001",
      targetType: "resource",
      targetId: "resource_mind_map_001",
      auditStatus: "passed",
      riskLabels: [],
      createdAt: mockTimestamp
    };
  }
  return {
    questions: [
      {
        id: "question_demo_001",
        courseId: payload.courseId ?? "course_ds_001",
        nodeId: payload.nodeId,
        questionType: "single_choice",
        title: "栈的出栈位置",
        content: "栈执行 pop 操作时，应从哪个位置移除元素？",
        options: ["栈顶", "栈底", "任意位置", "数组中间"],
        answer: "栈顶",
        explanation: "栈遵循后进先出原则，入栈和出栈都发生在栈顶。",
        difficulty: "medium",
        tags: ["栈", "pop"],
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp
      },
      {
        id: "question_demo_002",
        courseId: payload.courseId ?? "course_ds_001",
        nodeId: payload.nodeId,
        questionType: "short_answer",
        title: "后进先出原则",
        content: "简述栈为什么被称为后进先出的数据结构。",
        answer: "最后入栈的元素位于栈顶，因此最先出栈。",
        explanation: "栈只允许在栈顶进行入栈和出栈操作。",
        difficulty: "medium",
        tags: ["栈", "后进先出"],
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp
      },
      {
        id: "question_demo_003",
        courseId: payload.courseId ?? "course_ds_001",
        nodeId: payload.nodeId,
        questionType: "coding",
        title: "实现栈操作",
        content: "使用 Python 列表实现 push 和 pop 操作，并处理空栈。",
        answer: "使用 append 入栈，非空时使用 pop 出栈。",
        explanation: "Python 列表末尾可作为栈顶。",
        difficulty: "medium",
        tags: ["栈", "代码"],
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp
      }
    ],
    practiceRecord: {
      id: "practice_record_preview_001",
      userId: payload.userId,
      questionId: "question_demo_001",
      nodeId: payload.nodeId,
      userAnswer: "栈顶",
      correctAnswer: "栈顶",
      isCorrect: true,
      score: 100,
      mistakeReason: "",
      durationSeconds: 30,
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp
    },
    masteryUpdatePreview: {
      id: payload.nodeId ?? "node_stack_001",
      label: "栈",
      nodeType: "concept",
      difficulty: "easy",
      masteryStatus: "basic",
      masteryScore: 68
    },
    profileUpdatePreview: {
      weakNodeIds: ["node_recursion_001"],
      practicePreference: "coding",
      confidenceScore: 0.84
    }
  };
}
function mockAgentRun(payload) {
  return mockResponse({
    taskId: `task_${payload.agentType}_mock`,
    agentType: payload.agentType,
    status: "success",
    output: createAgentOutput(payload)
  });
}
function mockWorkflow(payload) {
  const agentTypes = [
    "profile_agent",
    "planner_agent",
    "qa_agent",
    "resource_agent",
    "practice_agent",
    "multimodal_agent",
    "safety_agent"
  ];
  const steps = agentTypes.map((agentType) => ({
    taskId: `task_${agentType}_mock`,
    agentType,
    status: "success",
    output: createAgentOutput({
      userId: payload.userId,
      courseId: payload.courseId,
      nodeId: payload.nodeId,
      agentType,
      input: payload.input,
      context: { profile: payload.input.profile }
    })
  }));
  return mockResponse({
    taskId: "workflow_resource_generate_mock",
    workflowType: payload.workflowType,
    status: "success",
    steps,
    finalOutput: {
      answer: createAgentOutput({ userId: payload.userId, agentType: "qa_agent", input: {} }).answer,
      questions: createAgentOutput({ userId: payload.userId, agentType: "practice_agent", input: {} }).questions,
      generatedResources: createAgentOutput({
        userId: payload.userId,
        courseId: payload.courseId,
        nodeId: payload.nodeId,
        agentType: "multimodal_agent",
        input: {}
      }).generatedResources,
      safetyAudit: createAgentOutput({ userId: payload.userId, agentType: "safety_agent", input: {} })
    }
  });
}
export const agentApi = {
  createChatSession(payload) {
    return request({ method: "POST", url: "/chat/sessions", data: payload });
  },
  listChatSessions(params) {
    return request({ method: "GET", url: "/chat/sessions", params });
  },
  getChatSession(sessionId) {
    return request({ method: "GET", url: `/chat/sessions/${sessionId}` });
  },
  listChatMessages(sessionId) {
    return request({ method: "GET", url: `/chat/sessions/${sessionId}/messages` });
  },
  sendChat(payload) {
    return request({ method: "POST", url: "/chat/send", data: payload, timeout: chatTimeout });
  },
  runAgent(payload) {
    if (enableMock) {
      return Promise.resolve(mockAgentRun(payload));
    }
    return request({ method: "POST", url: "/agents/run", data: payload, timeout: agentTimeout });
  },
  runWorkflow(payload) {
    if (enableMock) {
      return Promise.resolve(mockWorkflow(payload));
    }
    return request({
      method: "POST",
      url: "/agents/workflows/run",
      data: payload,
      timeout: workflowTimeout
    });
  },
  getAgentTask(taskId) {
    return request({ method: "GET", url: `/agents/tasks/${taskId}` });
  },
  listAgentTaskEvents(taskId) {
    return request({ method: "GET", url: `/agents/tasks/${taskId}/events` });
  }
};

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFnZW50LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHJlcXVlc3QgfSBmcm9tIFwiQC9hcGkvY2xpZW50XCI7XHJcbmltcG9ydCB0eXBlIHsgQXBpUmVzcG9uc2UsIFBhZ2VSZXF1ZXN0LCBQYWdlUmVzdWx0IH0gZnJvbSBcIkAvdHlwZXMvY29udHJhY3RzXCI7XHJcbmltcG9ydCB0eXBlIHtcclxuICBBZ2VudFJ1blJlcXVlc3QsXHJcbiAgQWdlbnRSdW5SZXN1bHQsXHJcbiAgQWdlbnRUYXNrRXZlbnQsXHJcbiAgQ2hhdE1lc3NhZ2UsXHJcbiAgQ2hhdFJlcXVlc3QsXHJcbiAgQ2hhdFJlc3VsdCxcclxuICBDaGF0U2Vzc2lvbixcclxuICBNdWx0aUFnZW50V29ya2Zsb3dSZXF1ZXN0LFxyXG4gIE11bHRpQWdlbnRXb3JrZmxvd1Jlc3VsdFxyXG59IGZyb20gXCJAL3R5cGVzL2FnZW50XCI7XHJcblxyXG5jb25zdCBlbmFibGVNb2NrID0gaW1wb3J0Lm1ldGEuZW52LlZJVEVfRU5BQkxFX01PQ0sgPT09IFwidHJ1ZVwiO1xyXG5jb25zdCBtb2NrVGltZXN0YW1wID0gXCIyMDI2LTA1LTI4VDEwOjAwOjAwWlwiO1xyXG5jb25zdCBjaGF0VGltZW91dCA9IDIgKiA2MCAqIDEwMDA7XHJcbmNvbnN0IGFnZW50VGltZW91dCA9IDEwICogNjAgKiAxMDAwO1xyXG5jb25zdCB3b3JrZmxvd1RpbWVvdXQgPSAyMCAqIDYwICogMTAwMDtcclxuZnVuY3Rpb24gbW9ja1Jlc3BvbnNlPFQ+KGRhdGE6IFQpOiBBcGlSZXNwb25zZTxUPiB7XHJcbiAgcmV0dXJuIHtcclxuICAgIGNvZGU6IDIwMCxcclxuICAgIG1lc3NhZ2U6IFwic3VjY2Vzc1wiLFxyXG4gICAgZGF0YSxcclxuICAgIHRyYWNlSWQ6IGB0cmFjZV9tb2NrXyR7RGF0ZS5ub3coKX1gLFxyXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVBZ2VudE91dHB1dChwYXlsb2FkOiBBZ2VudFJ1blJlcXVlc3QpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcclxuICBjb25zdCBwcm9maWxlID0gcGF5bG9hZC5jb250ZXh0Py5wcm9maWxlO1xyXG5cclxuICBpZiAocGF5bG9hZC5hZ2VudFR5cGUgPT09IFwicHJvZmlsZV9hZ2VudFwiKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBsZWFybmluZ1N0YWdlOiBcIuWfuuehgOihpeW8uumYtuautVwiLFxyXG4gICAgICByaXNrTGV2ZWw6IFwibWVkaXVtXCIsXHJcbiAgICAgIHdlYWtOb2RlU3VtbWFyeTogXCLmoIjpobbovrnnlYzjgIHpgJLlvZLnu4jmraLmnaHku7blkozmlbDnu4TkuIvmoIfotornlYzpnIDopoHkvJjlhYjlpI3kuaDjgIJcIixcclxuICAgICAgcHJlZmVycmVkUmVzb3VyY2VUeXBlczogW1wibWluZF9tYXBcIiwgXCJjb2RlX2Nhc2VcIiwgXCJwcmFjdGljZV9xdWVzdGlvblwiXSxcclxuICAgICAgcmVjb21tZW5kZWRRdWVzdGlvblR5cGVzOiBbXCJzaW5nbGVfY2hvaWNlXCIsIFwic2hvcnRfYW5zd2VyXCIsIFwiY29kaW5nXCJdLFxyXG4gICAgICBuZXh0QWdlbnRJbnB1dDoge1xyXG4gICAgICAgIHRhcmdldEdvYWw6IHByb2ZpbGU/LmxlYXJuaW5nR29hbCA/PyBcIuWHhuWkh+aVsOaNrue7k+aehOacn+acq+iAg+ivlVwiLFxyXG4gICAgICAgIHRpbWVCdWRnZXQ6IHByb2ZpbGU/LmF2YWlsYWJsZVN0dWR5VGltZSA/PyBcIuavj+WkqTMw5YiG6ZKfXCIsXHJcbiAgICAgICAgd2Vha05vZGVJZHM6IHByb2ZpbGU/LndlYWtOb2RlSWRzID8/IFtcIm5vZGVfc3RhY2tfMDAxXCIsIFwibm9kZV9yZWN1cnNpb25fMDAxXCJdXHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBpZiAocGF5bG9hZC5hZ2VudFR5cGUgPT09IFwicGxhbm5lcl9hZ2VudFwiKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBsZWFybmluZ1BhdGg6IHtcclxuICAgICAgICBpZDogXCJwYXRoX2RlbW9fMDAxXCIsXHJcbiAgICAgICAgdXNlcklkOiBwYXlsb2FkLnVzZXJJZCxcclxuICAgICAgICBjb3Vyc2VJZDogcGF5bG9hZC5jb3Vyc2VJZCA/PyBcImNvdXJzZV9kc18wMDFcIixcclxuICAgICAgdGl0bGU6IFwi5pWw5o2u57uT5p6E5pyf5pyr5qCI6KGl5by66Lev5b6EXCIsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBcIuWbtOe7leagiOWSjOmAkuW9kuiWhOW8seeCueWuieaOkuiusuino+OAgee7g+S5oOWSjOWkjeS5oOOAglwiLFxyXG4gICAgICAgIGN1cnJlbnRTdGFnZTogXCLln7rnoYDooaXlvLrpmLbmrrVcIixcclxuICAgICAgICB0YXJnZXRHb2FsOiBcIuWHhuWkh+aVsOaNrue7k+aehOacn+acq+iAg+ivlVwiLFxyXG4gICAgICBwYXRoTm9kZUlkczogW1wibm9kZV9hcnJheV8wMDFcIiwgXCJub2RlX2xpbmtlZF9saXN0XzAwMVwiLCBcIm5vZGVfc3RhY2tfMDAxXCIsIFwibm9kZV9yZWN1cnNpb25fMDAxXCJdLFxyXG4gICAgICAgIGN1cnJlbnROb2RlSWQ6IHBheWxvYWQubm9kZUlkLFxyXG4gICAgICAgIHN0YXR1czogXCJzdWNjZXNzXCIsXHJcbiAgICAgICAgY3JlYXRlZEF0OiBtb2NrVGltZXN0YW1wLFxyXG4gICAgICAgIHVwZGF0ZWRBdDogbW9ja1RpbWVzdGFtcFxyXG4gICAgICB9LFxyXG4gICAgICBsZWFybmluZ1Rhc2tzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IFwidGFza19kZW1vXzAwMVwiLFxyXG4gICAgICAgICAgcGF0aElkOiBcInBhdGhfZGVtb18wMDFcIixcclxuICAgICAgICAgIHVzZXJJZDogcGF5bG9hZC51c2VySWQsXHJcbiAgICAgICAgICBjb3Vyc2VJZDogcGF5bG9hZC5jb3Vyc2VJZCA/PyBcImNvdXJzZV9kc18wMDFcIixcclxuICAgICAgICAgIG5vZGVJZDogXCJub2RlX3N0YWNrXzAwMVwiLFxyXG4gICAgICAgICAgdGl0bGU6IFwi5aSN5Lmg5qCI57uT5p6E5LiO5ZCO6L+b5YWI5Ye6XCIsXHJcbiAgICAgICAgICB0YXNrVHlwZTogXCJsZWFyblwiLFxyXG4gICAgICAgICAgcmVzb3VyY2VJZHM6IFtcInJlc291cmNlX21pbmRfbWFwXzAwMVwiLCBcInJlc291cmNlX2NvZGVfY2FzZV8wMDFcIl0sXHJcbiAgICAgICAgICBvcmRlckluZGV4OiAxLFxyXG4gICAgICAgICAgc3RhdHVzOiBcInBlbmRpbmdcIixcclxuICAgICAgICAgIGNyZWF0ZWRBdDogbW9ja1RpbWVzdGFtcCxcclxuICAgICAgICAgIHVwZGF0ZWRBdDogbW9ja1RpbWVzdGFtcFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IFwidGFza19kZW1vXzAwMlwiLFxyXG4gICAgICAgICAgcGF0aElkOiBcInBhdGhfZGVtb18wMDFcIixcclxuICAgICAgICAgIHVzZXJJZDogcGF5bG9hZC51c2VySWQsXHJcbiAgICAgICAgICBjb3Vyc2VJZDogcGF5bG9hZC5jb3Vyc2VJZCA/PyBcImNvdXJzZV9kc18wMDFcIixcclxuICAgICAgICAgIG5vZGVJZDogXCJub2RlX3JlY3Vyc2lvbl8wMDFcIixcclxuICAgICAgICAgIHRpdGxlOiBcIue7g+S5oOmAkuW9kue7iOatouadoeS7tumimFwiLFxyXG4gICAgICAgICAgdGFza1R5cGU6IFwicHJhY3RpY2VcIixcclxuICAgICAgICAgIHJlc291cmNlSWRzOiBbXCJxdWVzdGlvbl9kZW1vXzAwMVwiXSxcclxuICAgICAgICAgIG9yZGVySW5kZXg6IDIsXHJcbiAgICAgICAgICBzdGF0dXM6IFwicGVuZGluZ1wiLFxyXG4gICAgICAgICAgY3JlYXRlZEF0OiBtb2NrVGltZXN0YW1wLFxyXG4gICAgICAgICAgdXBkYXRlZEF0OiBtb2NrVGltZXN0YW1wXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBwbGFubmluZ1JlYXNvbjogXCLlrabnlJ/lt7LmnInmlbDnu4Tlkozpk77ooajln7rnoYDvvIzlvZPliY3lupTooaXlvLrmoIjmk43kvZzvvIzlho3nlKjpgJLlvZLpopjlt6nlm7rovrnnlYzmnaHku7bjgIJcIlxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGlmIChwYXlsb2FkLmFnZW50VHlwZSA9PT0gXCJxYV9hZ2VudFwiKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzZXNzaW9uSWQ6IFwic2Vzc2lvbl9kZW1vXzAwMVwiLFxyXG4gICAgICBtZXNzYWdlSWQ6IFwibWVzc2FnZV9kZW1vXzAwMVwiLFxyXG4gICAgICBhbnN3ZXI6IFwi5qCI6YG15b6q5ZCO6L+b5YWI5Ye65Y6f5YiZ77yM5pyA5ZCO5Y6L5YWl55qE5YWD57Sg5pyA5YWI5LuO5qCI6aG25by55Ye644CCXCIsXHJcbiAgICAgIHVzZWRBZ2VudFR5cGVzOiBbXCJxYV9hZ2VudFwiLCBcInJlc291cmNlX2FnZW50XCIsIFwicHJvZmlsZV9hZ2VudFwiXSxcclxuICAgICAgcmV0cmlldmVkRG9jdW1lbnRzOiBbXVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGlmIChwYXlsb2FkLmFnZW50VHlwZSA9PT0gXCJyZXNvdXJjZV9hZ2VudFwiKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZXNvdXJjZVBsYW46IHtcclxuICAgICAgICByZXNvdXJjZVR5cGVzOiBbXCJsZWN0dXJlX2RvY1wiLCBcIm1pbmRfbWFwXCIsIFwicHJhY3RpY2VfcXVlc3Rpb25cIiwgXCJjb2RlX2Nhc2VcIl0sXHJcbiAgICAgICAgZGlmZmljdWx0eTogXCJlYXN5XCIsXHJcbiAgICAgICAgbGVhcm5pbmdHb2FsOiBcIuWHhuWkh+aVsOaNrue7k+aehOacn+acq+iAg+ivlVwiXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc291cmNlSWRzOiBbXCJyZXNvdXJjZV9kb2NfMDAxXCIsIFwicmVzb3VyY2VfbWluZF9tYXBfMDAxXCIsIFwicmVzb3VyY2VfcXVlc3Rpb25fMDAxXCIsIFwicmVzb3VyY2VfY29kZV8wMDFcIl0sXHJcbiAgICAgIHJlY29tbWVuZGF0aW9uczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiBcInJlY29tbWVuZGF0aW9uX2RlbW9fMDAxXCIsXHJcbiAgICAgICAgICB1c2VySWQ6IHBheWxvYWQudXNlcklkLFxyXG4gICAgICAgICAgY291cnNlSWQ6IHBheWxvYWQuY291cnNlSWQgPz8gXCJjb3Vyc2VfZHNfMDAxXCIsXHJcbiAgICAgICAgICBub2RlSWQ6IHBheWxvYWQubm9kZUlkLFxyXG4gICAgICAgICAgcmVzb3VyY2VJZDogXCJyZXNvdXJjZV9taW5kX21hcF8wMDFcIixcclxuICAgICAgICAgIHJlc291cmNlVHlwZTogXCJtaW5kX21hcFwiLFxyXG4gICAgICAgICAgdGl0bGU6IFwi5qCI57uT5p6E5oCd57u05a+85Zu+XCIsXHJcbiAgICAgICAgICByZWFzb246IFwi5Yy56YWN5Zu+6Kej5YGP5aW977yM6YCC5ZCI5YWI5bu656uL57uT5p6E55CG6Kej44CCXCIsXHJcbiAgICAgICAgICBzY29yZTogMC45MSxcclxuICAgICAgICAgIGNyZWF0ZWRBdDogbW9ja1RpbWVzdGFtcFxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgcHVzaFJlY29yZHM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogXCJwdXNoX2RlbW9fMDAxXCIsXHJcbiAgICAgICAgICB1c2VySWQ6IHBheWxvYWQudXNlcklkLFxyXG4gICAgICAgICAgcmVzb3VyY2VJZDogXCJyZXNvdXJjZV9taW5kX21hcF8wMDFcIixcclxuICAgICAgICAgIG5vZGVJZDogcGF5bG9hZC5ub2RlSWQsXHJcbiAgICAgICAgICByZWFzb246IFwi5qCI6JaE5byx54K55LyY5YWI5o6o6YCBXCIsXHJcbiAgICAgICAgICB2aWV3ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgY3JlYXRlZEF0OiBtb2NrVGltZXN0YW1wLFxyXG4gICAgICAgICAgdXBkYXRlZEF0OiBtb2NrVGltZXN0YW1wXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBhdWRpdFN0YXR1czogXCJwYXNzZWRcIlxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGlmIChwYXlsb2FkLmFnZW50VHlwZSA9PT0gXCJtdWx0aW1vZGFsX2FnZW50XCIpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGdlbmVyYXRlZFJlc291cmNlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiBcInJlc291cmNlX21pbmRfbWFwXzAwMVwiLFxyXG4gICAgICAgICAgdXNlcklkOiBwYXlsb2FkLnVzZXJJZCxcclxuICAgICAgICAgIGNvdXJzZUlkOiBwYXlsb2FkLmNvdXJzZUlkID8/IFwiY291cnNlX2RzXzAwMVwiLFxyXG4gICAgICAgICAgbm9kZUlkOiBwYXlsb2FkLm5vZGVJZCxcclxuICAgICAgICAgIHRpdGxlOiBcIuagiOaAnee7tOWvvOWbvlwiLFxyXG4gICAgICAgICAgcmVzb3VyY2VUeXBlOiBcIm1pbmRfbWFwXCIsXHJcbiAgICAgICAgICBjb250ZW50OiBcIm1pbmRtYXBcXG4gIHJvb3QoKOagiCkpXFxuICAgIOWQjui/m+WFiOWHulxcbiAgICDlhaXmoIggcHVzaFxcbiAgICDlh7rmoIggcG9wXFxuICAgIOagiOmhtiB0b3BcXG4gICAg6L6555WM5Yik5patXCIsXHJcbiAgICAgICAgICBzdGF0dXM6IFwic3VjY2Vzc1wiLFxyXG4gICAgICAgICAgYXVkaXRTdGF0dXM6IFwicGFzc2VkXCIsXHJcbiAgICAgICAgICBjcmVhdGVkQXQ6IG1vY2tUaW1lc3RhbXAsXHJcbiAgICAgICAgICB1cGRhdGVkQXQ6IG1vY2tUaW1lc3RhbXBcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICByZW5kZXJIaW50czoge1xyXG4gICAgICAgIG1pbmRNYXA6IFwibWVybWFpZFwiLFxyXG4gICAgICAgIHZpZGVvU2NyaXB0OiBcIm1hcmtkb3duXCIsXHJcbiAgICAgICAgYW5pbWF0aW9uU2NyaXB0OiBcIm1hcmtkb3duXCJcclxuICAgICAgfSxcclxuICAgICAgYXVkaXRTdGF0dXM6IFwicGFzc2VkXCJcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBpZiAocGF5bG9hZC5hZ2VudFR5cGUgPT09IFwic2FmZXR5X2FnZW50XCIpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGlkOiBcImF1ZGl0X2RlbW9fMDAxXCIsXHJcbiAgICAgIHRhcmdldFR5cGU6IFwicmVzb3VyY2VcIixcclxuICAgICAgdGFyZ2V0SWQ6IFwicmVzb3VyY2VfbWluZF9tYXBfMDAxXCIsXHJcbiAgICAgIGF1ZGl0U3RhdHVzOiBcInBhc3NlZFwiLFxyXG4gICAgICByaXNrTGFiZWxzOiBbXSxcclxuICAgICAgY3JlYXRlZEF0OiBtb2NrVGltZXN0YW1wXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHF1ZXN0aW9uczogW1xyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6IFwicXVlc3Rpb25fZGVtb18wMDFcIixcclxuICAgICAgICBjb3Vyc2VJZDogcGF5bG9hZC5jb3Vyc2VJZCA/PyBcImNvdXJzZV9kc18wMDFcIixcclxuICAgICAgICBub2RlSWQ6IHBheWxvYWQubm9kZUlkLFxyXG4gICAgICAgIHF1ZXN0aW9uVHlwZTogXCJzaW5nbGVfY2hvaWNlXCIsXHJcbiAgICAgICAgdGl0bGU6IFwi5qCI55qE5Ye65qCI5L2N572uXCIsXHJcbiAgICAgICAgY29udGVudDogXCLmoIjmiafooYwgcG9wIOaTjeS9nOaXtu+8jOW6lOS7juWTquS4quS9jee9ruenu+mZpOWFg+e0oO+8n1wiLFxyXG4gICAgICAgIG9wdGlvbnM6IFtcIuagiOmhtlwiLCBcIuagiOW6lVwiLCBcIuS7u+aEj+S9jee9rlwiLCBcIuaVsOe7hOS4remXtFwiXSxcclxuICAgICAgICBhbnN3ZXI6IFwi5qCI6aG2XCIsXHJcbiAgICAgICAgZXhwbGFuYXRpb246IFwi5qCI6YG15b6q5ZCO6L+b5YWI5Ye65Y6f5YiZ77yM5YWl5qCI5ZKM5Ye65qCI6YO95Y+R55Sf5Zyo5qCI6aG244CCXCIsXHJcbiAgICAgICAgZGlmZmljdWx0eTogXCJtZWRpdW1cIixcclxuICAgICAgICB0YWdzOiBbXCLmoIhcIiwgXCJwb3BcIl0sXHJcbiAgICAgICAgY3JlYXRlZEF0OiBtb2NrVGltZXN0YW1wLFxyXG4gICAgICAgIHVwZGF0ZWRBdDogbW9ja1RpbWVzdGFtcFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6IFwicXVlc3Rpb25fZGVtb18wMDJcIixcclxuICAgICAgICBjb3Vyc2VJZDogcGF5bG9hZC5jb3Vyc2VJZCA/PyBcImNvdXJzZV9kc18wMDFcIixcclxuICAgICAgICBub2RlSWQ6IHBheWxvYWQubm9kZUlkLFxyXG4gICAgICAgIHF1ZXN0aW9uVHlwZTogXCJzaG9ydF9hbnN3ZXJcIixcclxuICAgICAgICB0aXRsZTogXCLlkI7ov5vlhYjlh7rljp/liJlcIixcclxuICAgICAgICBjb250ZW50OiBcIueugOi/sOagiOS4uuS7gOS5iOiiq+ensOS4uuWQjui/m+WFiOWHuueahOaVsOaNrue7k+aehOOAglwiLFxyXG4gICAgICAgIGFuc3dlcjogXCLmnIDlkI7lhaXmoIjnmoTlhYPntKDkvY3kuo7moIjpobbvvIzlm6DmraTmnIDlhYjlh7rmoIjjgIJcIixcclxuICAgICAgICBleHBsYW5hdGlvbjogXCLmoIjlj6rlhYHorrjlnKjmoIjpobbov5vooYzlhaXmoIjlkozlh7rmoIjmk43kvZzjgIJcIixcclxuICAgICAgICBkaWZmaWN1bHR5OiBcIm1lZGl1bVwiLFxyXG4gICAgICAgIHRhZ3M6IFtcIuagiFwiLCBcIuWQjui/m+WFiOWHulwiXSxcclxuICAgICAgICBjcmVhdGVkQXQ6IG1vY2tUaW1lc3RhbXAsXHJcbiAgICAgICAgdXBkYXRlZEF0OiBtb2NrVGltZXN0YW1wXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogXCJxdWVzdGlvbl9kZW1vXzAwM1wiLFxyXG4gICAgICAgIGNvdXJzZUlkOiBwYXlsb2FkLmNvdXJzZUlkID8/IFwiY291cnNlX2RzXzAwMVwiLFxyXG4gICAgICAgIG5vZGVJZDogcGF5bG9hZC5ub2RlSWQsXHJcbiAgICAgICAgcXVlc3Rpb25UeXBlOiBcImNvZGluZ1wiLFxyXG4gICAgICAgIHRpdGxlOiBcIuWunueOsOagiOaTjeS9nFwiLFxyXG4gICAgICAgIGNvbnRlbnQ6IFwi5L2/55SoIFB5dGhvbiDliJfooajlrp7njrAgcHVzaCDlkowgcG9wIOaTjeS9nO+8jOW5tuWkhOeQhuepuuagiOOAglwiLFxyXG4gICAgICAgIGFuc3dlcjogXCLkvb/nlKggYXBwZW5kIOWFpeagiO+8jOmdnuepuuaXtuS9v+eUqCBwb3Ag5Ye65qCI44CCXCIsXHJcbiAgICAgICAgZXhwbGFuYXRpb246IFwiUHl0aG9uIOWIl+ihqOacq+WwvuWPr+S9nOS4uuagiOmhtuOAglwiLFxyXG4gICAgICAgIGRpZmZpY3VsdHk6IFwibWVkaXVtXCIsXHJcbiAgICAgICAgdGFnczogW1wi5qCIXCIsIFwi5Luj56CBXCJdLFxyXG4gICAgICAgIGNyZWF0ZWRBdDogbW9ja1RpbWVzdGFtcCxcclxuICAgICAgICB1cGRhdGVkQXQ6IG1vY2tUaW1lc3RhbXBcclxuICAgICAgfVxyXG4gICAgXSxcclxuICAgIHByYWN0aWNlUmVjb3JkOiB7XHJcbiAgICAgIGlkOiBcInByYWN0aWNlX3JlY29yZF9wcmV2aWV3XzAwMVwiLFxyXG4gICAgICB1c2VySWQ6IHBheWxvYWQudXNlcklkLFxyXG4gICAgICBxdWVzdGlvbklkOiBcInF1ZXN0aW9uX2RlbW9fMDAxXCIsXHJcbiAgICAgIG5vZGVJZDogcGF5bG9hZC5ub2RlSWQsXHJcbiAgICAgIHVzZXJBbnN3ZXI6IFwi5qCI6aG2XCIsXHJcbiAgICAgIGNvcnJlY3RBbnN3ZXI6IFwi5qCI6aG2XCIsXHJcbiAgICAgIGlzQ29ycmVjdDogdHJ1ZSxcclxuICAgICAgc2NvcmU6IDEwMCxcclxuICAgICAgbWlzdGFrZVJlYXNvbjogXCJcIixcclxuICAgICAgZHVyYXRpb25TZWNvbmRzOiAzMCxcclxuICAgICAgY3JlYXRlZEF0OiBtb2NrVGltZXN0YW1wLFxyXG4gICAgICB1cGRhdGVkQXQ6IG1vY2tUaW1lc3RhbXBcclxuICAgIH0sXHJcbiAgICBtYXN0ZXJ5VXBkYXRlUHJldmlldzoge1xyXG4gICAgICBpZDogcGF5bG9hZC5ub2RlSWQgPz8gXCJub2RlX3N0YWNrXzAwMVwiLFxyXG4gICAgICBsYWJlbDogXCLmoIhcIixcclxuICAgICAgbm9kZVR5cGU6IFwiY29uY2VwdFwiLFxyXG4gICAgICBkaWZmaWN1bHR5OiBcImVhc3lcIixcclxuICAgICAgbWFzdGVyeVN0YXR1czogXCJiYXNpY1wiLFxyXG4gICAgICBtYXN0ZXJ5U2NvcmU6IDY4XHJcbiAgICB9LFxyXG4gICAgcHJvZmlsZVVwZGF0ZVByZXZpZXc6IHtcclxuICAgICAgd2Vha05vZGVJZHM6IFtcIm5vZGVfcmVjdXJzaW9uXzAwMVwiXSxcclxuICAgICAgcHJhY3RpY2VQcmVmZXJlbmNlOiBcImNvZGluZ1wiLFxyXG4gICAgICBjb25maWRlbmNlU2NvcmU6IDAuODRcclxuICAgIH1cclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb2NrQWdlbnRSdW4ocGF5bG9hZDogQWdlbnRSdW5SZXF1ZXN0KTogQXBpUmVzcG9uc2U8QWdlbnRSdW5SZXN1bHQ+IHtcclxuICByZXR1cm4gbW9ja1Jlc3BvbnNlKHtcclxuICAgIHRhc2tJZDogYHRhc2tfJHtwYXlsb2FkLmFnZW50VHlwZX1fbW9ja2AsXHJcbiAgICBhZ2VudFR5cGU6IHBheWxvYWQuYWdlbnRUeXBlLFxyXG4gICAgc3RhdHVzOiBcInN1Y2Nlc3NcIixcclxuICAgIG91dHB1dDogY3JlYXRlQWdlbnRPdXRwdXQocGF5bG9hZClcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gbW9ja1dvcmtmbG93KHBheWxvYWQ6IE11bHRpQWdlbnRXb3JrZmxvd1JlcXVlc3QpOiBBcGlSZXNwb25zZTxNdWx0aUFnZW50V29ya2Zsb3dSZXN1bHQ+IHtcclxuICBjb25zdCBhZ2VudFR5cGVzOiBBZ2VudFJ1blJlcXVlc3RbXCJhZ2VudFR5cGVcIl1bXSA9IFtcclxuICAgIFwicHJvZmlsZV9hZ2VudFwiLFxyXG4gICAgXCJwbGFubmVyX2FnZW50XCIsXHJcbiAgICBcInFhX2FnZW50XCIsXHJcbiAgICBcInJlc291cmNlX2FnZW50XCIsXHJcbiAgICBcInByYWN0aWNlX2FnZW50XCIsXHJcbiAgICBcIm11bHRpbW9kYWxfYWdlbnRcIixcclxuICAgIFwic2FmZXR5X2FnZW50XCJcclxuICBdO1xyXG4gIGNvbnN0IHN0ZXBzID0gYWdlbnRUeXBlcy5tYXAoKGFnZW50VHlwZSkgPT4gKHtcclxuICAgIHRhc2tJZDogYHRhc2tfJHthZ2VudFR5cGV9X21vY2tgLFxyXG4gICAgYWdlbnRUeXBlLFxyXG4gICAgc3RhdHVzOiBcInN1Y2Nlc3NcIiBhcyBjb25zdCxcclxuICAgIG91dHB1dDogY3JlYXRlQWdlbnRPdXRwdXQoe1xyXG4gICAgICB1c2VySWQ6IHBheWxvYWQudXNlcklkLFxyXG4gICAgICBjb3Vyc2VJZDogcGF5bG9hZC5jb3Vyc2VJZCxcclxuICAgICAgbm9kZUlkOiBwYXlsb2FkLm5vZGVJZCxcclxuICAgICAgYWdlbnRUeXBlLFxyXG4gICAgICBpbnB1dDogcGF5bG9hZC5pbnB1dCxcclxuICAgICAgY29udGV4dDogeyBwcm9maWxlOiBwYXlsb2FkLmlucHV0LnByb2ZpbGUgfVxyXG4gICAgfSlcclxuICB9KSk7XHJcblxyXG4gIHJldHVybiBtb2NrUmVzcG9uc2Uoe1xyXG4gICAgdGFza0lkOiBcIndvcmtmbG93X3Jlc291cmNlX2dlbmVyYXRlX21vY2tcIixcclxuICAgIHdvcmtmbG93VHlwZTogcGF5bG9hZC53b3JrZmxvd1R5cGUsXHJcbiAgICBzdGF0dXM6IFwic3VjY2Vzc1wiLFxyXG4gICAgc3RlcHMsXHJcbiAgICBmaW5hbE91dHB1dDoge1xyXG4gICAgICBhbnN3ZXI6IGNyZWF0ZUFnZW50T3V0cHV0KHsgdXNlcklkOiBwYXlsb2FkLnVzZXJJZCwgYWdlbnRUeXBlOiBcInFhX2FnZW50XCIsIGlucHV0OiB7fSB9KS5hbnN3ZXIsXHJcbiAgICAgIHF1ZXN0aW9uczogY3JlYXRlQWdlbnRPdXRwdXQoeyB1c2VySWQ6IHBheWxvYWQudXNlcklkLCBhZ2VudFR5cGU6IFwicHJhY3RpY2VfYWdlbnRcIiwgaW5wdXQ6IHt9IH0pLnF1ZXN0aW9ucyxcclxuICAgICAgZ2VuZXJhdGVkUmVzb3VyY2VzOiBjcmVhdGVBZ2VudE91dHB1dCh7XHJcbiAgICAgICAgdXNlcklkOiBwYXlsb2FkLnVzZXJJZCxcclxuICAgICAgICBjb3Vyc2VJZDogcGF5bG9hZC5jb3Vyc2VJZCxcclxuICAgICAgICBub2RlSWQ6IHBheWxvYWQubm9kZUlkLFxyXG4gICAgICAgIGFnZW50VHlwZTogXCJtdWx0aW1vZGFsX2FnZW50XCIsXHJcbiAgICAgICAgaW5wdXQ6IHt9XHJcbiAgICAgIH0pLmdlbmVyYXRlZFJlc291cmNlcyxcclxuICAgICAgc2FmZXR5QXVkaXQ6IGNyZWF0ZUFnZW50T3V0cHV0KHsgdXNlcklkOiBwYXlsb2FkLnVzZXJJZCwgYWdlbnRUeXBlOiBcInNhZmV0eV9hZ2VudFwiLCBpbnB1dDoge30gfSlcclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGFnZW50QXBpID0ge1xyXG4gIGNyZWF0ZUNoYXRTZXNzaW9uKHBheWxvYWQ6IFBhcnRpYWw8Q2hhdFNlc3Npb24+KSB7XHJcbiAgICByZXR1cm4gcmVxdWVzdDxDaGF0U2Vzc2lvbj4oeyBtZXRob2Q6IFwiUE9TVFwiLCB1cmw6IFwiL2NoYXQvc2Vzc2lvbnNcIiwgZGF0YTogcGF5bG9hZCB9KTtcclxuICB9LFxyXG4gIGxpc3RDaGF0U2Vzc2lvbnMocGFyYW1zOiBQYWdlUmVxdWVzdCkge1xyXG4gICAgcmV0dXJuIHJlcXVlc3Q8UGFnZVJlc3VsdDxDaGF0U2Vzc2lvbj4+KHsgbWV0aG9kOiBcIkdFVFwiLCB1cmw6IFwiL2NoYXQvc2Vzc2lvbnNcIiwgcGFyYW1zIH0pO1xyXG4gIH0sXHJcbiAgZ2V0Q2hhdFNlc3Npb24oc2Vzc2lvbklkOiBzdHJpbmcpIHtcclxuICAgIHJldHVybiByZXF1ZXN0PENoYXRTZXNzaW9uPih7IG1ldGhvZDogXCJHRVRcIiwgdXJsOiBgL2NoYXQvc2Vzc2lvbnMvJHtzZXNzaW9uSWR9YCB9KTtcclxuICB9LFxyXG4gIGxpc3RDaGF0TWVzc2FnZXMoc2Vzc2lvbklkOiBzdHJpbmcpIHtcclxuICAgIHJldHVybiByZXF1ZXN0PENoYXRNZXNzYWdlW10+KHsgbWV0aG9kOiBcIkdFVFwiLCB1cmw6IGAvY2hhdC9zZXNzaW9ucy8ke3Nlc3Npb25JZH0vbWVzc2FnZXNgIH0pO1xyXG4gIH0sXHJcbiAgc2VuZENoYXQocGF5bG9hZDogQ2hhdFJlcXVlc3QpIHtcclxuICAgIHJldHVybiByZXF1ZXN0PENoYXRSZXN1bHQ+KHsgbWV0aG9kOiBcIlBPU1RcIiwgdXJsOiBcIi9jaGF0L3NlbmRcIiwgZGF0YTogcGF5bG9hZCwgdGltZW91dDogY2hhdFRpbWVvdXQgfSk7XHJcbiAgfSxcclxuICBydW5BZ2VudChwYXlsb2FkOiBBZ2VudFJ1blJlcXVlc3QpIHtcclxuICAgIGlmIChlbmFibGVNb2NrKSB7XHJcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobW9ja0FnZW50UnVuKHBheWxvYWQpKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXF1ZXN0PEFnZW50UnVuUmVzdWx0Pih7IG1ldGhvZDogXCJQT1NUXCIsIHVybDogXCIvYWdlbnRzL3J1blwiLCBkYXRhOiBwYXlsb2FkLCB0aW1lb3V0OiBhZ2VudFRpbWVvdXQgfSk7XHJcbiAgfSxcclxuICBydW5Xb3JrZmxvdyhwYXlsb2FkOiBNdWx0aUFnZW50V29ya2Zsb3dSZXF1ZXN0KSB7XHJcbiAgICBpZiAoZW5hYmxlTW9jaykge1xyXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG1vY2tXb3JrZmxvdyhwYXlsb2FkKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVxdWVzdDxNdWx0aUFnZW50V29ya2Zsb3dSZXN1bHQ+KHtcclxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcclxuICAgICAgdXJsOiBcIi9hZ2VudHMvd29ya2Zsb3dzL3J1blwiLFxyXG4gICAgICBkYXRhOiBwYXlsb2FkLFxyXG4gICAgICB0aW1lb3V0OiB3b3JrZmxvd1RpbWVvdXRcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgZ2V0QWdlbnRUYXNrKHRhc2tJZDogc3RyaW5nKSB7XHJcbiAgICByZXR1cm4gcmVxdWVzdDxNdWx0aUFnZW50V29ya2Zsb3dSZXN1bHQ+KHsgbWV0aG9kOiBcIkdFVFwiLCB1cmw6IGAvYWdlbnRzL3Rhc2tzLyR7dGFza0lkfWAgfSk7XHJcbiAgfSxcclxuICBsaXN0QWdlbnRUYXNrRXZlbnRzKHRhc2tJZDogc3RyaW5nKSB7XHJcbiAgICByZXR1cm4gcmVxdWVzdDxBZ2VudFRhc2tFdmVudFtdPih7IG1ldGhvZDogXCJHRVRcIiwgdXJsOiBgL2FnZW50cy90YXNrcy8ke3Rhc2tJZH0vZXZlbnRzYCB9KTtcclxuICB9XHJcbn07XHJcbiJdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxlQUFlO0FBY3hCLE1BQU0sYUFBYSxZQUFZLElBQUkscUJBQXFCO0FBQ3hELE1BQU0sZ0JBQWdCO0FBQ3RCLE1BQU0sY0FBYyxJQUFJLEtBQUs7QUFDN0IsTUFBTSxlQUFlLEtBQUssS0FBSztBQUMvQixNQUFNLGtCQUFrQixLQUFLLEtBQUs7QUFDbEMsU0FBUyxhQUFnQixNQUF5QjtBQUNoRCxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixTQUFTO0FBQUEsSUFDVDtBQUFBLElBQ0EsU0FBUyxjQUFjLEtBQUssSUFBSSxDQUFDO0FBQUEsSUFDakMsWUFBVyxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBLEVBQ3BDO0FBQ0Y7QUFFQSxTQUFTLGtCQUFrQixTQUErQztBQUN4RSxRQUFNLFVBQVUsUUFBUSxT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