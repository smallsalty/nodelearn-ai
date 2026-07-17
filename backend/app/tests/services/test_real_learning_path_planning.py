import asyncio

from app.core.config import settings
from app.repositories.learning_path_repository import LearningPathRepository
from app.schemas.learning_path import LearningPathGenerateRequest
from app.schemas.profile import StudentProfile
from app.services.learning_path_service import LearningPathService


class InMemoryLearningPathRepository(LearningPathRepository):
    def list_nodes(self, course_id: str):
        return [node.model_copy(deep=True) for node in self._nodes.values() if node.course_id == course_id]

    def normalize_node_ids(self, values: list[str], course_id: str = "course_ds_001") -> list[str]:
        return [value for value in values if value in self._nodes and self._nodes[value].course_id == course_id]


class StubDeepSeekService:
    async def generate_json(self, prompt: str, mock_data: dict):
        assert "补充要求" in prompt
        assert "时间预算" in prompt
        return {
            "title": "期末冲刺学习路径",
            "description": "按照每天三十分钟安排复习、练习和自检。",
            "currentStage": "重点补强阶段",
            "nodeOrder": ["node_array_001", "node_linked_list_001"],
            "tasks": [
                {"nodeId": "node_array_001", "taskType": "review", "title": "复习数组访问与边界"},
                {"nodeId": "node_linked_list_001", "taskType": "practice", "title": "练习链表指针操作"},
            ],
            "planningReason": "先复习前置知识，再练习薄弱内容。",
        }


def run(coro):
    return asyncio.run(coro)


def test_real_planning_uses_deepseek_shape_chinese_text_and_due_schedule(monkeypatch):
    monkeypatch.setattr(settings, "enable_mock", False)
    repository = InMemoryLearningPathRepository()
    profile = StudentProfile(
        id="profile_real_plan_001",
        user_id="user_real_plan_001",
        current_course_id="course_ds_001",
        weak_node_ids=["node_linked_list_001"],
        cognitive_style="diagram",
        practice_preference="coding",
        resource_preference=[],
        common_mistakes=["链表指针断链"],
        confidence_score=1,
        last_updated_by="manual",
        created_at="2026-07-17T00:00:00+08:00",
        updated_at="2026-07-17T00:00:00+08:00",
    )
    service = LearningPathService(repository=repository, llm_service=StubDeepSeekService())

    plan = run(
        service.generate_learning_path(
            LearningPathGenerateRequest(
                user_id="user_real_plan_001",
                course_id="course_ds_001",
                target_goal="准备数据结构期末考试",
                time_budget="每天晚上三十分钟",
                weak_node_ids=["node_linked_list_001"],
                additional_requirements="每项任务写明时间，并推荐学习工具。",
            ),
            profile=profile,
        )
    )

    assert plan.learning_path.id.startswith("path_")
    assert "mock" not in plan.learning_path.id
    assert plan.learning_path.title == "期末冲刺学习路径"
    assert all(task.due_at is not None and "T20:00:00" in task.due_at for task in plan.learning_tasks)
    assert [task.title for task in plan.learning_tasks] == ["复习数组访问与边界", "练习链表指针操作"]


def test_goal_mentions_are_included_alongside_profile_weak_nodes():
    repository = InMemoryLearningPathRepository()
    service = LearningPathService(repository=repository)
    nodes = {node.id: node for node in repository.list_nodes("course_ds_001")}

    planned = service._plan_node_ids(
        nodes,
        ["node_linked_list_001"],
        "每天晚上30分钟",
        "准备考试，重点补强栈和递归",
    )

    assert "node_linked_list_001" in planned
    assert "node_stack_001" in planned
    assert "node_recursion_001" in planned
    assert planned.index("node_linked_list_001") < planned.index("node_stack_001")
