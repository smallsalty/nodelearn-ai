from fastapi import APIRouter, Path

from app.core.response import error_response, success_response
from app.schemas.learning_path import LearningPathGenerateRequest, LearningTaskStatusUpdateRequest
from app.services.learning_path_service import LearningPathService

router = APIRouter()
learning_path_service = LearningPathService()


@router.post("/learning-paths/generate")
async def generate_learning_path(payload: LearningPathGenerateRequest):
    try:
        plan = await learning_path_service.generate_learning_path(payload)
    except Exception as exc:
        return error_response(f"学习路径生成失败：{exc}")
    return success_response(plan.learning_path)


@router.get("/users/{userId}/learning-paths")
def list_user_paths(user_id: str = Path(alias="userId")):
    return success_response(learning_path_service.list_user_paths(user_id))


@router.get("/learning-paths/{pathId}")
def get_learning_path(path_id: str = Path(alias="pathId")):
    path = learning_path_service.get_learning_path(path_id)
    if path is None:
        return error_response("学习路径不存在", code=404)
    return success_response(path)


@router.put("/learning-paths/{pathId}")
def update_learning_path(payload: dict, path_id: str = Path(alias="pathId")):
    path = learning_path_service.update_learning_path(path_id, payload)
    if path is None:
        return error_response("学习路径不存在", code=404)
    return success_response(path)


@router.get("/learning-paths/{pathId}/tasks")
def list_path_tasks(path_id: str = Path(alias="pathId")):
    tasks = learning_path_service.list_path_tasks(path_id)
    return success_response(tasks)


@router.put("/learning-tasks/{taskId}/status")
def update_task_status(payload: LearningTaskStatusUpdateRequest, task_id: str = Path(alias="taskId")):
    task = learning_path_service.update_task_status(task_id, payload)
    if task is None:
        return error_response("学习任务不存在", code=404)
    return success_response(task)
