from fastapi import APIRouter, BackgroundTasks, Path, Query

from app.core.response import error_response, success_response
from app.schemas.multimodal import (
    DigitalHumanCallbackRequest,
    DigitalHumanChatRequest,
    DigitalHumanExplainRequest,
    MultimodalVideoGenerateRequest,
)
from app.services.multimodal_service import default_multimodal_service

router = APIRouter()


@router.post("/multimodal/videos/generate")
async def generate_multimodal_video(payload: MultimodalVideoGenerateRequest, background_tasks: BackgroundTasks):
    task = default_multimodal_service.create_video_task(payload)
    background_tasks.add_task(default_multimodal_service.run_video_task, task.task_id, payload)
    return success_response(task)


@router.get("/multimodal/videos/tasks/{taskId}")
def get_multimodal_video_task(task_id: str = Path(alias="taskId")):
    return success_response(default_multimodal_service.get_task(task_id))


@router.get("/multimodal/videos/tasks/{taskId}/events")
def list_multimodal_video_events(task_id: str = Path(alias="taskId")):
    return success_response(default_multimodal_service.list_task_events(task_id))


@router.get("/multimodal/videos/stream")
def stream_multimodal_video(task_id: str = Query(alias="taskId")):
    return success_response(default_multimodal_service.get_stream_event(task_id))


@router.post("/multimodal/digital-human/explain")
async def explain_with_digital_human(payload: DigitalHumanExplainRequest):
    try:
        return success_response(await default_multimodal_service.explain(payload))
    except Exception as exc:
        return error_response(f"digital human explain failed: {exc}")


@router.post("/multimodal/digital-human/chat")
async def chat_with_digital_human(payload: DigitalHumanChatRequest):
    try:
        return success_response(await default_multimodal_service.chat(payload))
    except Exception as exc:
        return error_response(f"digital human chat failed: {exc}")


@router.get("/multimodal/digital-human/sessions/{sessionId}/messages")
def list_digital_human_messages(session_id: str = Path(alias="sessionId")):
    return success_response(default_multimodal_service.list_digital_human_messages(session_id))


@router.get("/multimodal/digital-human/sessions/{sessionId}/live")
async def get_digital_human_live_session(session_id: str = Path(alias="sessionId")):
    try:
        return success_response(await default_multimodal_service.get_digital_human_live_session(session_id))
    except KeyError as exc:
        return error_response(str(exc), code=404)


@router.post("/multimodal/digital-human/sessions/{sessionId}/stop")
async def stop_digital_human_live_session(session_id: str = Path(alias="sessionId")):
    try:
        return success_response(await default_multimodal_service.stop_digital_human_live_session(session_id))
    except KeyError as exc:
        return error_response(str(exc), code=404)


@router.post("/multimodal/digital-human/callback")
def digital_human_callback(payload: DigitalHumanCallbackRequest):
    try:
        return success_response(default_multimodal_service.apply_callback(payload))
    except ValueError as exc:
        return error_response(str(exc), code=401)
