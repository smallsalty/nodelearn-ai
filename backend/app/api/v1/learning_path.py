from fastapi import APIRouter, Path

from app.core.response import success_response
from app.schemas.learning_path import LearningPathGenerateRequest, LearningTaskStatusUpdateRequest
from app.services.learning_path_service import LearningPathService

router = APIRouter()
learning_path_service = LearningPathService()


@router.post("/learning-paths/generate")
def generate_learning_path(payload: LearningPathGenerateRequest):
    plan = learning_path_service.generate_learning_path(payload)
    return success_response(plan.learning_path)


@router.get("/users/{userId}/learning-paths")
def list_user_paths(user_id: str = Path(alias="userId")):
    return success_response(learning_path_service.list_user_paths(user_id))


@router.get("/learning-paths/{pathId}")
def get_learning_path(path_id: str = Path(alias="pathId")):
    path = learning_path_service.get_learning_path(path_id)
    if path is None:
        plan = learning_path_service.generate_learning_path(LearningPathGenerateRequest(user_id="user_demo_001", course_id="course_ds_001"))
        path = plan.learning_path
    return success_response(path)


@router.put("/learning-paths/{pathId}")
def update_learning_path(payload: dict, path_id: str = Path(alias="pathId")):
    path = learning_path_service.update_learning_path(path_id, payload)
    if path is None:
        plan = learning_path_service.generate_learning_path(LearningPathGenerateRequest(user_id="user_demo_001", course_id="course_ds_001"))
        path = learning_path_service.update_learning_path(plan.learning_path.id, payload) or plan.learning_path
    return success_response(path)


@router.get("/learning-paths/{pathId}/tasks")
def list_path_tasks(path_id: str = Path(alias="pathId")):
    tasks = learning_path_service.list_path_tasks(path_id)
    if not tasks:
        learning_path_service.generate_learning_path(LearningPathGenerateRequest(user_id="user_demo_001", course_id="course_ds_001"))
        tasks = learning_path_service.list_path_tasks(path_id)
    return success_response(tasks)


@router.put("/learning-tasks/{taskId}/status")
def update_task_status(payload: LearningTaskStatusUpdateRequest, task_id: str = Path(alias="taskId")):
    task = learning_path_service.update_task_status(task_id, payload)
    if task is None:
        plan = learning_path_service.generate_learning_path(LearningPathGenerateRequest(user_id="user_demo_001", course_id="course_ds_001"))
        task = learning_path_service.update_task_status(plan.learning_tasks[0].id, payload) or plan.learning_tasks[0]
    return success_response(task)
