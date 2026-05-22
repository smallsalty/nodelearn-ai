from fastapi import APIRouter, Path

from app.core.response import success_response
from app.schemas.common import TaskStatus
from app.schemas.learning_path import LearningPath, LearningPathGenerateRequest, LearningTask, LearningTaskStatusUpdateRequest

router = APIRouter()

MOCK_TIME = "2026-05-19T10:00:00Z"


def mock_path(path_id: str = "path_demo_001", user_id: str = "user_demo_001") -> LearningPath:
    return LearningPath(
        id=path_id,
        user_id=user_id,
        course_id="course_ds_001",
        title="Mock Learning Path",
        current_stage="mock",
        target_goal="mock",
        path_node_ids=["node_array_001"],
        status=TaskStatus.running,
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


def mock_task(task_id: str = "learning_task_demo_001", path_id: str = "path_demo_001") -> LearningTask:
    return LearningTask(
        id=task_id,
        path_id=path_id,
        user_id="user_demo_001",
        course_id="course_ds_001",
        node_id="node_array_001",
        title="Mock Task",
        task_type="learn",
        resource_ids=[],
        order_index=1,
        status=TaskStatus.pending,
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


@router.post("/learning-paths/generate")
def generate_learning_path(payload: LearningPathGenerateRequest):
    return success_response(mock_path(user_id=payload.user_id))


@router.get("/users/{userId}/learning-paths")
def list_user_paths(user_id: str = Path(alias="userId")):
    return success_response([mock_path(user_id=user_id)])


@router.get("/learning-paths/{pathId}")
def get_learning_path(path_id: str = Path(alias="pathId")):
    return success_response(mock_path(path_id))


@router.put("/learning-paths/{pathId}")
def update_learning_path(payload: dict, path_id: str = Path(alias="pathId")):
    return success_response(mock_path(path_id))


@router.get("/learning-paths/{pathId}/tasks")
def list_path_tasks(path_id: str = Path(alias="pathId")):
    return success_response([mock_task(path_id=path_id)])


@router.put("/learning-tasks/{taskId}/status")
def update_task_status(payload: LearningTaskStatusUpdateRequest, task_id: str = Path(alias="taskId")):
    task = mock_task(task_id)
    task.status = payload.status
    task.completed_at = payload.completed_at
    return success_response(task)
