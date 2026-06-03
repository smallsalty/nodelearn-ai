import { request } from "@/api/client";
import type { ApiResponse, PageRequest, PageResult } from "@/types/contracts";
import type {
  AgentRunRequest,
  AgentRunResult,
  AgentTaskEvent,
  ChatMessage,
  ChatRequest,
  ChatResult,
  ChatSession,
  MultiAgentWorkflowRequest,
  MultiAgentWorkflowResult
} from "@/types/agent";

const enableMock = import.meta.env.VITE_ENABLE_MOCK === "true";
const mockTimestamp = "2026-05-28T10:00:00Z";
const chatTimeout = 2 * 60 * 1000;
const agentTimeout = 10 * 60 * 1000;
const workflowTimeout = 20 * 60 * 1000;
function mockResponse<T>(data: T): ApiResponse<T> {
  return {
    code: 200,
    message: "success",
    data,
    traceId: `trace_mock_${Date.now()}`,
    timestamp: new Date().toISOString()
  };
}

function createAgentOutput(payload: AgentRunRequest): Record<string, any> {
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
        },
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

function mockAgentRun(payload: AgentRunRequest): ApiResponse<AgentRunResult> {
  return mockResponse({
    taskId: `task_${payload.agentType}_mock`,
    agentType: payload.agentType,
    status: "success",
    output: createAgentOutput(payload)
  });
}

function mockWorkflow(payload: MultiAgentWorkflowRequest): ApiResponse<MultiAgentWorkflowResult> {
  const agentTypes: AgentRunRequest["agentType"][] = [
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
    status: "success" as const,
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
  createChatSession(payload: Partial<ChatSession>) {
    return request<ChatSession>({ method: "POST", url: "/chat/sessions", data: payload });
  },
  listChatSessions(params: PageRequest) {
    return request<PageResult<ChatSession>>({ method: "GET", url: "/chat/sessions", params });
  },
  getChatSession(sessionId: string) {
    return request<ChatSession>({ method: "GET", url: `/chat/sessions/${sessionId}` });
  },
  listChatMessages(sessionId: string) {
    return request<ChatMessage[]>({ method: "GET", url: `/chat/sessions/${sessionId}/messages` });
  },
  sendChat(payload: ChatRequest) {
    return request<ChatResult>({ method: "POST", url: "/chat/send", data: payload, timeout: chatTimeout });
  },
  runAgent(payload: AgentRunRequest) {
    if (enableMock) {
      return Promise.resolve(mockAgentRun(payload));
    }
    return request<AgentRunResult>({ method: "POST", url: "/agents/run", data: payload, timeout: agentTimeout });
  },
  runWorkflow(payload: MultiAgentWorkflowRequest) {
    if (enableMock) {
      return Promise.resolve(mockWorkflow(payload));
    }
    return request<MultiAgentWorkflowResult>({
      method: "POST",
      url: "/agents/workflows/run",
      data: payload,
      timeout: workflowTimeout
    });
  },
  getAgentTask(taskId: string) {
    return request<MultiAgentWorkflowResult>({ method: "GET", url: `/agents/tasks/${taskId}` });
  },
  listAgentTaskEvents(taskId: string) {
    return request<AgentTaskEvent[]>({ method: "GET", url: `/agents/tasks/${taskId}/events` });
  }
};
