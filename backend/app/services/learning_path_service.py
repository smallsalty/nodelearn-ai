import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from app.core.config import settings
from app.repositories.learning_path_repository import LearningPathRepository, default_learning_path_repository
from app.repositories.profile_repository import ProfileRepository, default_profile_repository
from app.schemas.common import AuditStatus, TaskStatus
from app.schemas.course import KnowledgeNode
from app.schemas.learning_path import LearningPath, LearningPathGenerateRequest, LearningTask, LearningTaskStatusUpdateRequest
from app.schemas.profile import StudentProfile
from app.services.audit_service import AuditService
from app.services.llm_service import LLMService


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
        llm_service: LLMService | None = None,
        audit_service: AuditService | None = None,
    ) -> None:
        self.repository = repository or default_learning_path_repository
        self.profile_repository = profile_repository or default_profile_repository
        self.llm_service = llm_service or LLMService()
        self.audit_service = audit_service or AuditService()

    async def generate_learning_path(
        self,
        payload: LearningPathGenerateRequest,
        profile: StudentProfile | None = None,
    ) -> LearningPathPlan:
        profile = profile or self.profile_repository.get_by_user_id(payload.user_id)
        weak_node_ids = self.repository.normalize_node_ids(
            self._unique(payload.weak_node_ids or profile.weak_node_ids),
            payload.course_id,
        )
        target_goal = payload.target_goal or profile.learning_goal or "完成数据结构学习"
        time_budget = payload.time_budget or profile.available_study_time or "每天三十分钟"
        additional_requirements = payload.additional_requirements or ""
        nodes = {node.id: node for node in self.repository.list_nodes(payload.course_id)}
        planned_node_ids = self._plan_node_ids(nodes, weak_node_ids, time_budget, target_goal)
        if not planned_node_ids:
            raise RuntimeError("没有可用于规划的知识节点")

        candidate_nodes = [nodes[node_id] for node_id in planned_node_ids if node_id in nodes]
        mock_plan = self._mock_plan(candidate_nodes, target_goal, time_budget)
        ai_plan = await self.llm_service.generate_json(
            self._build_planning_prompt(
                profile=profile,
                target_goal=target_goal,
                time_budget=time_budget,
                additional_requirements=additional_requirements,
                candidate_nodes=candidate_nodes,
            ),
            mock_data=mock_plan,
        )

        requested_order = ai_plan.get("nodeOrder") if isinstance(ai_plan.get("nodeOrder"), list) else []
        selected_node_ids = [node_id for node_id in requested_order if node_id in planned_node_ids]
        for node_id in planned_node_ids:
            if node_id not in selected_node_ids:
                selected_node_ids.append(node_id)
        ordered_node_ids: list[str] = []
        for node_id in selected_node_ids:
            self._append_with_prerequisites(node_id, nodes, ordered_node_ids)

        created_at = datetime.now(ZoneInfo("Asia/Shanghai"))
        path_id = f"path_{uuid4().hex[:12]}" if not settings.enable_mock else f"path_mock_{uuid4().hex[:8]}"
        path = LearningPath(
            id=path_id,
            user_id=payload.user_id,
            course_id=payload.course_id,
            title=self._visible_chinese(ai_plan.get("title"), "数据结构个性化学习路径"),
            description=self._visible_chinese(
                ai_plan.get("description"),
                f"依据学生画像和知识依赖，将{time_budget}拆分为可执行任务，并为每一步推荐学习工具。",
            ),
            current_stage=self._visible_chinese(
                ai_plan.get("currentStage"),
                "基础补强阶段" if weak_node_ids else "稳步提升阶段",
            ),
            target_goal=target_goal,
            path_node_ids=ordered_node_ids,
            current_node_id=ordered_node_ids[0] if ordered_node_ids else None,
            status=TaskStatus.pending,
            created_at=created_at.isoformat(),
            updated_at=created_at.isoformat(),
        )
        task_specs = ai_plan.get("tasks") if isinstance(ai_plan.get("tasks"), list) else []
        tasks = self._build_tasks(path, nodes, target_goal, time_budget, task_specs, created_at)
        planning_reason = self._visible_chinese(
            ai_plan.get("planningReason"),
            "先补齐未掌握的前置知识，再集中突破薄弱点，并把复习、练习和学习工具安排到每天的可用时间中。",
        )

        audit_text = "\n".join(
            [path.title, path.description or "", path.current_stage, planning_reason]
            + [task.title for task in tasks]
        )
        audit = await self.audit_service.check_content(
            audit_text,
            target_type="resource",
            target_id=path.id,
        )
        if audit.audit_status != AuditStatus.passed:
            raise RuntimeError("学习路径未通过安全校验")

        self.repository.save_path(path, tasks)
        return LearningPathPlan(
            learning_path=path,
            learning_tasks=tasks,
            planning_reason=planning_reason,
            next_agent_input={
                "forResourceAgent": {
                    "courseId": path.course_id,
                    "nodeIds": path.path_node_ids,
                    "targetGoal": path.target_goal,
                    "timeBudget": time_budget,
                    "additionalRequirements": additional_requirements,
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

    def _build_planning_prompt(
        self,
        *,
        profile: StudentProfile,
        target_goal: str,
        time_budget: str,
        additional_requirements: str,
        candidate_nodes: list[KnowledgeNode],
    ) -> str:
        node_lines = []
        for node in candidate_nodes:
            prerequisite_ids = "、".join(node.prerequisite_node_ids) or "无"
            node_lines.append(
                f"- 节点编号：{node.id}；名称：{node.name}；前置节点：{prerequisite_ids}；"
                f"掌握分数：{node.mastery_score if node.mastery_score is not None else '未知'}"
            )
        return "\n".join(
            [
                "你是高校数据结构课程的个性化学习规划师。请生成真正可执行的学习路径。",
                "所有面向学生展示的文本必须使用简体中文，不得出现英文任务类型、内部节点编号或模型术语。",
                "必须把时间预算落实到每日任务顺序；每个节点都要生成一个任务，并为后续学习工具使用留下明确目标。",
                "仅返回 JSON 对象，结构为：",
                '{"title":"中文标题","description":"中文说明","currentStage":"中文阶段","nodeOrder":["节点编号"],"tasks":[{"nodeId":"节点编号","taskType":"learn|practice|review|project","title":"中文任务标题"}],"planningReason":"中文规划理由"}',
                f"学习目标：{target_goal}",
                f"时间预算：{time_budget}",
                f"补充要求：{additional_requirements or '无'}",
                f"画像摘要：{profile.profile_summary or '暂无'}",
                f"常见错因：{'、'.join(profile.common_mistakes) or '暂无'}",
                "候选节点：",
                *node_lines,
            ]
        )

    def _mock_plan(self, nodes: list[KnowledgeNode], target_goal: str, time_budget: str) -> dict:
        return {
            "title": "数据结构个性化学习路径",
            "description": f"按照{time_budget}安排基础复习、重点练习和阶段回顾。",
            "currentStage": "基础补强阶段" if "考试" in target_goal else "稳步提升阶段",
            "nodeOrder": [node.id for node in nodes],
            "tasks": [
                {
                    "nodeId": node.id,
                    "taskType": self._task_type(node, target_goal),
                    "title": f"掌握{node.name}并完成检验",
                }
                for node in nodes
            ],
            "planningReason": "先复习前置知识，再练习薄弱内容，最后通过问答和测评检查掌握情况。",
        }

    def _plan_node_ids(
        self,
        nodes: dict[str, KnowledgeNode],
        weak_node_ids: list[str],
        time_budget: str,
        target_goal: str,
    ) -> list[str]:
        planned: list[str] = []
        goal_node_ids = self._goal_node_ids(nodes, target_goal)
        target_node_ids = self._unique(weak_node_ids + goal_node_ids)
        if not target_node_ids:
            target_node_ids = [node.id for node in nodes.values() if (node.mastery_score or 0) < 80]
        if "30分钟" not in time_budget and "30 分钟" not in time_budget and "三十分钟" not in time_budget:
            target_node_ids = self._unique(target_node_ids + [node_id for node_id in nodes if node_id not in target_node_ids])
        for node_id in target_node_ids:
            self._append_with_prerequisites(node_id, nodes, planned)
        return planned

    def _goal_node_ids(self, nodes: dict[str, KnowledgeNode], target_goal: str) -> list[str]:
        normalized_goal = re.sub(r"\s+", "", target_goal)
        matched: list[str] = []
        for node in nodes.values():
            visible_name = re.sub(r"^\d+(?:\.\d+)*\s*", "", node.name).strip()
            if visible_name and visible_name in normalized_goal and node.id not in matched:
                matched.append(node.id)
        return matched

    def _append_with_prerequisites(self, node_id: str, nodes: dict[str, KnowledgeNode], planned: list[str]) -> None:
        node = nodes.get(node_id)
        if node is None:
            return
        for prerequisite_id in node.prerequisite_node_ids:
            prerequisite = nodes.get(prerequisite_id)
            if prerequisite and (prerequisite.mastery_score is None or prerequisite.mastery_score < 80):
                self._append_with_prerequisites(prerequisite_id, nodes, planned)
        if node_id not in planned:
            planned.append(node_id)

    def _build_tasks(
        self,
        path: LearningPath,
        nodes: dict[str, KnowledgeNode],
        target_goal: str,
        time_budget: str,
        task_specs: list,
        created_at: datetime,
    ) -> list[LearningTask]:
        task_by_node = {
            item.get("nodeId"): item
            for item in task_specs
            if isinstance(item, dict) and item.get("nodeId") in path.path_node_ids
        }
        hour, minute = self._study_clock(time_budget)
        tasks: list[LearningTask] = []
        for index, node_id in enumerate(path.path_node_ids, start=1):
            node = nodes[node_id]
            spec = task_by_node.get(node_id, {})
            task_type = spec.get("taskType") if spec.get("taskType") in {"learn", "practice", "review", "project"} else self._task_type(node, target_goal)
            due_date = (created_at + timedelta(days=index)).replace(hour=hour, minute=minute, second=0, microsecond=0)
            tasks.append(
                LearningTask(
                    id=f"learning_task_{uuid4().hex[:12]}",
                    path_id=path.id,
                    user_id=path.user_id,
                    course_id=path.course_id,
                    node_id=node.id,
                    title=self._visible_chinese(spec.get("title"), f"{node.name}{self._task_title_suffix(task_type)}"),
                    task_type=task_type,
                    resource_ids=node.resource_ids,
                    order_index=index,
                    status=TaskStatus.pending,
                    due_at=due_date.isoformat(),
                    completed_at=None,
                    created_at=created_at.isoformat(),
                    updated_at=created_at.isoformat(),
                )
            )
        return tasks

    def _study_clock(self, time_budget: str) -> tuple[int, int]:
        if "早" in time_budget:
            return 7, 30
        if "中午" in time_budget or "午间" in time_budget:
            return 12, 30
        if "晚" in time_budget:
            return 20, 0
        return 19, 30

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
            "learn": "概念学习",
            "practice": "专项练习",
            "review": "重点复习",
            "project": "项目应用",
        }[task_type]

    def _visible_chinese(self, value, fallback: str) -> str:
        if not isinstance(value, str) or not value.strip() or re.search(r"[A-Za-z_]", value):
            return fallback
        return value.strip()

    def _unique(self, values: list[str]) -> list[str]:
        result = []
        for value in values:
            if value not in result:
                result.append(value)
        return result
