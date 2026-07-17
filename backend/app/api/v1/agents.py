from collections.abc import Iterator

from fastapi import APIRouter, Path, Query
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.response import error_response, page_result, success_response
from app.agents.workflow import MultiAgentWorkflowRunner, get_task_events, get_task_result
from app.schemas.agent import (
    AgentRunRequest,
    ChatRequest,
    ChatStreamEvent,
    MultiAgentWorkflowRequest,
    MultiAgentWorkflowResult,
)
from app.schemas.common import AgentType, TaskStatus
from app.services.agent_service import AgentService
from app.services.chat_service import ChatService

router = APIRouter()

agent_service = AgentService()
workflow_runner = MultiAgentWorkflowRunner(agent_service)
chat_service = ChatService()


def mock_workflow(task_id: str = "workflow_task_demo_001") -> MultiAgentWorkflowResult:
    return MultiAgentWorkflowResult(task_id=task_id, workflow_type="qa", status=TaskStatus.failed, steps=[], final_output={})


@router.post("/chat/sessions")
def create_chat_session(payload: dict):
    return success_response(chat_service.create_session(payload))


@router.get("/chat/sessions")
def list_chat_sessions(page: int = 1, page_size: int = Query(10, alias="pageSize"), user_id: str | None = Query(None, alias="userId"), keyword: str | None = None, sort_by: str | None = Query(None, alias="sortBy"), sort_order: str | None = Query(None, alias="sortOrder")):
    items, total = chat_service.list_sessions(page=page, page_size=page_size, user_id=user_id, keyword=keyword)
    return success_response(page_result(items, total, page, page_size))


@router.get("/chat/sessions/{sessionId}")
def get_chat_session(session_id: str = Path(alias="sessionId")):
    session = chat_service.get_session(session_id)
    if session is None:
        return error_response("问答会话不存在", code=404)
    return success_response(session)


@router.get("/chat/sessions/{sessionId}/messages")
def list_chat_messages(session_id: str = Path(alias="sessionId")):
    if chat_service.get_session(session_id) is None:
        return error_response("问答会话不存在", code=404)
    return success_response(chat_service.list_messages(session_id))


@router.post("/chat/send")
async def send_chat(payload: ChatRequest):
    try:
        result = await chat_service.send(payload)
    except Exception as exc:
        return error_response(f"chat completion failed: {exc}")
    return success_response(result)


@router.get("/chat/stream")
def stream_chat(session_id: str = Query(alias="sessionId")):
    event = ChatStreamEvent(session_id=session_id, event_type="done")

    def generate() -> Iterator[str]:
        yield f"data: {event.model_dump_json(by_alias=True, exclude_none=True)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/agents/run")
async def run_agent(payload: AgentRunRequest):
    result = await agent_service.run_agent(payload)
    return success_response(result)


@router.post("/agents/workflows/run")
async def run_workflow(payload: MultiAgentWorkflowRequest):
    try:
        result = await workflow_runner.run(payload)
    except Exception as exc:
        return error_response(f"workflow failed: {exc}")
    return success_response(result)


@router.get("/agents/tasks/{taskId}")
def get_agent_task(task_id: str = Path(alias="taskId")):
    result = get_task_result(task_id)
    if result is not None:
        return success_response(result)
    if not settings.enable_mock:
        return error_response(f"agent task not found: {task_id}", code=404)
    return success_response(mock_workflow(task_id))


@router.get("/agents/tasks/{taskId}/events")
def list_agent_events(task_id: str = Path(alias="taskId")):
    return success_response(get_task_events(task_id))
