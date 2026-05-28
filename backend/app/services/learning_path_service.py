from dataclasses import dataclass

from app.repositories.learning_path_repository import DEMO_TIME, LearningPathRepository, default_learning_path_repository
from app.repositories.profile_repository import ProfileRepository, default_profile_repository
from app.schemas.common import TaskStatus
from app.schemas.course import KnowledgeNode
from app.schemas.learning_path import LearningPath, LearningPathGenerateRequest, LearningTask, LearningTaskStatusUpdateRequest
from app.schemas.profile import StudentProfile


@dataclass
class LearningPathPlan:
    learning_path: LearningPath
    learning_tasks: list[LearningTask]
    planning_reason: str
    next_agent_input: dict


class LearningPathService:
    def __init__(
        self,
        repository: LearningPathRepository | None = None,
        profile_repository: ProfileRepository | None = None,
    ) -> None:
        self.repository = repository or default_learning_path_repository
        self.profile_repository = profile_repository or default_profile_repository

    def generate_learning_path(self, payload: LearningPathGenerateRequest, profile: StudentProfile | None = None) -> LearningPathPlan:
        profile = profile or self.profile_repository.get_by_user_id(payload.user_id)
        weak_node_ids = self._unique(payload.weak_node_ids or profile.weak_node_ids)
        target_goal = payload.target_goal or profile.learning_goal or "完成数据结构学习"
        time_budget = payload.time_budget or profile.available_study_time or ""
        nodes = {node.id: node for node in self.repository.list_nodes(payload.course_id)}

        planned_node_ids = self._plan_node_ids(nodes, weak_node_ids, time_budget)
        path = LearningPath(
            id=f"path_{payload.user_id}_{payload.course_id}_mock",
            user_id=payload.user_id,
            course_id=payload.course_id,
            title=f"{target_goal}学习路径",
            description="基于画像、薄弱点和知识依赖生成的模拟学习路径",
            current_stage="基础补强阶段" if "考试" in target_goal or weak_node_ids else "正常学习阶段",
            target_goal=target_goal,
            path_node_ids=planned_node_ids,
            current_node_id=planned_node_ids[0] if planned_node_ids else None,
            status=TaskStatus.pending,
            created_at=DEMO_TIME,
            updated_at=DEMO_TIME,
        )
        tasks = self._build_tasks(path, nodes, target_goal)
        self.repository.save_path(path, tasks)
        return LearningPathPlan(
            learning_path=path,
            learning_tasks=tasks,
            planning_reason="先安排未充分掌握的前置节点，再优先补强薄弱节点，并按学习目标调整任务类型。",
            next_agent_input={
                "forResourceAgent": {
                    "courseId": path.course_id,
                    "nodeIds": path.path_node_ids,
                    "targetGoal": path.target_goal,
                    "timeBudget": time_budget,
                }
            },
        )

    def list_user_paths(self, user_id: str) -> list[LearningPath]:
        return self.repository.list_paths_by_user_id(user_id)

    def get_learning_path(self, path_id: str) -> LearningPath | None:
        return self.repository.get_path(path_id)

    def update_learning_path(self, path_id: str, updates: dict) -> LearningPath | None:
        return self.repository.update_path(path_id, updates)

    def list_path_tasks(self, path_id: str) -> list[LearningTask]:
        return self.repository.list_tasks_by_path_id(path_id)

    def update_task_status(self, task_id: str, payload: LearningTaskStatusUpdateRequest) -> LearningTask | None:
        return self.repository.update_task_status(task_id, payload.status, payload.completed_at)

    def _plan_node_ids(self, nodes: dict[str, KnowledgeNode], weak_node_ids: list[str], time_budget: str) -> list[str]:
        planned: list[str] = []
        target_node_ids = weak_node_ids or [node.id for node in nodes.values() if (node.mastery_score or 0) < 80]
        if "30分钟" not in time_budget and "30 分钟" not in time_budget:
            target_node_ids = self._unique(target_node_ids + [node_id for node_id in nodes if node_id not in target_node_ids])

        for node_id in target_node_ids:
            self._append_with_prerequisites(node_id, nodes, planned)
        return planned

    def _append_with_prerequisites(self, node_id: str, nodes: dict[str, KnowledgeNode], planned: list[str]) -> None:
        node = nodes.get(node_id)
        if node is None:
            return
        for prerequisite_id in node.prerequisite_node_ids:
            prerequisite = nodes.get(prerequisite_id)
            if prerequisite and (prerequisite.mastery_score is None or prerequisite.mastery_score < 80):
                self._append_with_prerequisites(prerequisite_id, nodes, planned)
        if node_id not in planned and (node.mastery_score is None or node.mastery_score < 80 or node.prerequisite_node_ids):
            planned.append(node_id)

    def _build_tasks(self, path: LearningPath, nodes: dict[str, KnowledgeNode], target_goal: str) -> list[LearningTask]:
        tasks: list[LearningTask] = []
        for index, node_id in enumerate(path.path_node_ids, start=1):
            node = nodes[node_id]
            task_type = self._task_type(node, target_goal)
            tasks.append(
                LearningTask(
                    id=f"learning_task_{path.id}_{index}",
                    path_id=path.id,
                    user_id=path.user_id,
                    course_id=path.course_id,
                    node_id=node.id,
                    title=f"{node.name}{self._task_title_suffix(task_type)}",
                    task_type=task_type,
                    resource_ids=node.resource_ids,
                    order_index=index,
                    status=TaskStatus.pending,
                    due_at=None,
                    completed_at=None,
                    created_at=DEMO_TIME,
                    updated_at=DEMO_TIME,
                )
            )
        return tasks

    def _task_type(self, node: KnowledgeNode, target_goal: str) -> str:
        if "项目" in target_goal or "应用" in target_goal:
            return "project"
        if "考试" in target_goal or "复习" in target_goal:
            return "review" if (node.mastery_score or 0) < 60 else "practice"
        if node.mastery_score is None:
            return "learn"
        if node.mastery_score < 60:
            return "review"
        if node.mastery_score < 80:
            return "practice"
        return "learn"

    def _task_title_suffix(self, task_type: str) -> str:
        return {
            "learn": "学习",
            "practice": "练习",
            "review": "复习",
            "project": "项目应用",
        }[task_type]

    def _unique(self, values: list[str]) -> list[str]:
        result = []
        for value in values:
            if value not in result:
                result.append(value)
        return result
