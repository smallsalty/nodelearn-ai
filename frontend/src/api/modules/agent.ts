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
      weakNodeSummary: "链表指针断链、递归终止条件和数组下标越界需要优先复习。",
      preferredResourceTypes: ["mind_map", "code_case", "practice_question"],
      recommendedQuestionTypes: ["single_choice", "short_answer", "coding"],
      nextAgentInput: {
        targetGoal: profile?.learningGoal ?? "准备数据结构期末考试",
        timeBudget: profile?.availableStudyTime ?? "每天30分钟",
        weakNodeIds: profile?.weakNodeIds ?? ["node_linked_list_001", "node_recursion_001"]
      }
    };
  }

  if (payload.agentType === "planner_agent") {
    return {
      learningPath: {
        id: "path_demo_001",
        userId: payload.userId,
        courseId: payload.courseId ?? "course_ds_001",
        title: "数据结构期末链表补强路径",
        description: "围绕链表和递归薄弱点安排讲解、练习和复习。",
        currentStage: "基础补强阶段",
        targetGoal: "准备数据结构期末考试",
        pathNodeIds: ["node_array_001", "node_linked_list_001", "node_recursion_001"],
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
          nodeId: "node_linked_list_001",
          title: "复习链表结构与指针变更",
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
      planningReason: "学生已有数组基础，当前应先补链表指针操作，再用递归题巩固边界条件。"
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
          title: "链表结构思维导图",
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
          reason: "链表薄弱点优先推送",
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
          title: "链表思维导图",
          resourceType: "mind_map",
          content: "mindmap\n  root((链表))\n    单链表\n    双链表\n    插入\n    删除\n    指针断链",
          status: "success",
          auditStatus: "passed",
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp
        },
        {
          id: "resource_video_script_001",
          userId: payload.userId,
          courseId: payload.courseId ?? "course_ds_001",
          nodeId: payload.nodeId,
          title: "链表视频脚本",
          resourceType: "video_script",
          content: "### 链表入门\n先解释节点结构，再演示插入和删除时指针如何变化。",
          status: "success",
          auditStatus: "passed",
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp
        },
        {
          id: "resource_animation_script_001",
          userId: payload.userId,
          courseId: payload.courseId ?? "course_ds_001",
          nodeId: payload.nodeId,
          title: "链表动画脚本",
          resourceType: "animation_script",
          content: "### 动画步骤\n1. 高亮前驱节点。\n2. 创建新节点。\n3. 调整 next 指针。",
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

  return {
    questions: [
      {
        id: "question_demo_001",
        courseId: payload.courseId ?? "course_ds_001",
        nodeId: payload.nodeId,
        questionType: "single_choice",
        title: "链表插入操作",
        content: "在单链表中插入新节点时，通常应先修改哪个指针？",
        options: ["新节点的 next", "头节点的 value", "尾节点的 value", "数组下标"],
        answer: "新节点的 next",
        explanation: "应先让新节点指向后继节点，再让前驱节点指向新节点。",
        difficulty: "easy",
        tags: ["链表", "指针"],
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp
      },
      {
        id: "question_demo_002",
        courseId: payload.courseId ?? "course_ds_001",
        nodeId: payload.nodeId,
        questionType: "short_answer",
        title: "指针断链原因",
        content: "简述链表删除节点时为什么可能出现指针断链。",
        answer: "没有保存或正确连接被删除节点的前驱与后继。",
        explanation: "删除前需要确保前驱节点直接指向后继节点。",
        difficulty: "easy",
        tags: ["链表", "错因"],
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp
      },
      {
        id: "question_demo_003",
        courseId: payload.courseId ?? "course_ds_001",
        nodeId: payload.nodeId,
        questionType: "coding",
        title: "实现链表查找",
        content: "编写函数查找单链表中第一个值等于 target 的节点。",
        answer: "遍历链表，逐个比较节点值。",
        explanation: "链表不支持随机访问，需要从头节点顺序遍历。",
        difficulty: "easy",
        tags: ["链表", "代码"],
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp
      }
    ],
    practiceRecord: {
      id: "practice_record_preview_001",
      userId: payload.userId,
      questionId: "question_demo_001",
      nodeId: payload.nodeId,
      userAnswer: "新节点的 next",
      correctAnswer: "新节点的 next",
      isCorrect: true,
      score: 100,
      mistakeReason: "",
      durationSeconds: 30,
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp
    },
    masteryUpdatePreview: {
      id: payload.nodeId ?? "node_linked_list_001",
      label: "链表",
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
    "resource_agent",
    "multimodal_agent",
    "practice_agent"
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
      resourceIds: ["resource_doc_001", "resource_mind_map_001", "resource_question_001"],
      auditStatus: "passed"
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
    return request<ChatResult>({ method: "POST", url: "/chat/send", data: payload });
  },
  runAgent(payload: AgentRunRequest) {
    if (enableMock) {
      return Promise.resolve(mockAgentRun(payload));
    }
    return request<AgentRunResult>({ method: "POST", url: "/agents/run", data: payload });
  },
  runWorkflow(payload: MultiAgentWorkflowRequest) {
    if (enableMock) {
      return Promise.resolve(mockWorkflow(payload));
    }
    return request<MultiAgentWorkflowResult>({ method: "POST", url: "/agents/workflows/run", data: payload });
  },
  getAgentTask(taskId: string) {
    return request<MultiAgentWorkflowResult>({ method: "GET", url: `/agents/tasks/${taskId}` });
  },
  listAgentTaskEvents(taskId: string) {
    return request<AgentTaskEvent[]>({ method: "GET", url: `/agents/tasks/${taskId}/events` });
  }
};
