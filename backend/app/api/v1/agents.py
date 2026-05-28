from fastapi import APIRouter, Path, Query

from app.core.response import page_result, success_response
from app.agents.workflow import MultiAgentWorkflowRunner, get_task_events, get_task_result
from app.schemas.agent import (
    AgentRunRequest,
    ChatMessage,
    ChatRequest,
    ChatResult,
    ChatSession,
    MultiAgentWorkflowRequest,
    MultiAgentWorkflowResult,
)
from app.schemas.common import AgentType, TaskStatus
from app.services.agent_service import AgentService

router = APIRouter()

MOCK_TIME = "2026-05-19T10:00:00Z"
agent_service = AgentService()
workflow_runner = MultiAgentWorkflowRunner(agent_service)


def mock_session(session_id: str = "session_demo_001") -> ChatSession:
    return ChatSession(id=session_id, user_id="user_demo_001", title="Demo Session", session_type="qa", created_at=MOCK_TIME, updated_at=MOCK_TIME)


def mock_workflow(task_id: str = "workflow_task_demo_001") -> MultiAgentWorkflowResult:
    return MultiAgentWorkflowResult(task_id=task_id, workflow_type="qa", status=TaskStatus.failed, steps=[], final_output={})


@router.post("/chat/sessions")
def create_chat_session(payload: dict):
    return success_response(mock_session())


@router.get("/chat/sessions")
def list_chat_sessions(page: int = 1, page_size: int = Query(10, alias="pageSize"), keyword: str | None = None, sort_by: str | None = Query(None, alias="sortBy"), sort_order: str | None = Query(None, alias="sortOrder")):
    items = [mock_session()]
    return success_response(page_result(items, len(items), page, page_size))


@router.get("/chat/sessions/{sessionId}")
def get_chat_session(session_id: str = Path(alias="sessionId")):
    return success_response(mock_session(session_id))


@router.get("/chat/sessions/{sessionId}/messages")
def list_chat_messages(session_id: str = Path(alias="sessionId")):
    message = ChatMessage(id="message_demo_001", session_id=session_id, user_id="user_demo_001", role="assistant", content="mock", content_type="text", created_at=MOCK_TIME)
    return success_response([message])


@router.post("/chat/send")
def send_chat(payload: ChatRequest):
    result = ChatResult(session_id=payload.session_id or "session_demo_001", message_id="message_demo_001", answer="mock", used_agent_types=[AgentType.resource_agent])
    return success_response(result)


@router.get("/chat/stream")
def stream_chat(session_id: str = Query(alias="sessionId")):
    return success_response({"sessionId": session_id, "eventType": "done"})


@router.post("/agents/run")
async def run_agent(payload: AgentRunRequest):
    result = await agent_service.run_agent(payload)
    return success_response(result)


@router.post("/agents/workflows/run")
async def run_workflow(payload: MultiAgentWorkflowRequest):
    result = await workflow_runner.run(payload)
    return success_response(result)


@router.get("/agents/tasks/{taskId}")
def get_agent_task(task_id: str = Path(alias="taskId")):
    return success_response(get_task_result(task_id) or mock_workflow(task_id))


@router.get("/agents/tasks/{taskId}/events")
def list_agent_events(task_id: str = Path(alias="taskId")):
    return success_response(get_task_events(task_id))
