from app.schemas.common import DifficultyLevel, MasteryStatus, NodeType, TaskStatus
from app.schemas.course import KnowledgeNode, KnowledgeRelation
from app.schemas.learning_path import LearningPath, LearningTask

DEMO_TIME = "2026-05-28T10:00:00Z"
DEMO_COURSE_ID = "course_ds_001"


def demo_knowledge_nodes() -> list[KnowledgeNode]:
    return [
        KnowledgeNode(
            id="node_array_001",
            course_id=DEMO_COURSE_ID,
            name="数组",
            node_type=NodeType.concept,
            difficulty=DifficultyLevel.easy,
            learning_value=80,
            prerequisite_node_ids=[],
            next_node_ids=["node_linked_list_001", "node_recursion_001"],
            resource_ids=[],
            common_mistakes=["数组下标越界"],
            recommended_practice_ids=[],
            mastery_status=MasteryStatus.basic,
            mastery_score=70,
            created_at=DEMO_TIME,
            updated_at=DEMO_TIME,
        ),
        KnowledgeNode(
            id="node_linked_list_001",
            course_id=DEMO_COURSE_ID,
            name="链表",
            node_type=NodeType.concept,
            difficulty=DifficultyLevel.medium,
            learning_value=90,
            prerequisite_node_ids=["node_array_001"],
            next_node_ids=["node_stack_001"],
            resource_ids=[],
            common_mistakes=["指针断链", "头节点处理错误"],
            recommended_practice_ids=[],
            mastery_status=MasteryStatus.learning,
            mastery_score=45,
            created_at=DEMO_TIME,
            updated_at=DEMO_TIME,
        ),
        KnowledgeNode(
            id="node_recursion_001",
            course_id=DEMO_COURSE_ID,
            name="递归",
            node_type=NodeType.algorithm,
            difficulty=DifficultyLevel.medium,
            learning_value=85,
            prerequisite_node_ids=["node_array_001"],
            next_node_ids=[],
            resource_ids=[],
            common_mistakes=["递归终止条件错误"],
            recommended_practice_ids=[],
            mastery_status=MasteryStatus.weak,
            mastery_score=40,
            created_at=DEMO_TIME,
            updated_at=DEMO_TIME,
        ),
        KnowledgeNode(
            id="node_stack_001",
            course_id=DEMO_COURSE_ID,
            name="栈",
            node_type=NodeType.concept,
            difficulty=DifficultyLevel.medium,
            learning_value=88,
            prerequisite_node_ids=["node_linked_list_001"],
            next_node_ids=[],
            resource_ids=[],
            common_mistakes=[],
            recommended_practice_ids=[],
            mastery_status=MasteryStatus.mastered,
            mastery_score=85,
            created_at=DEMO_TIME,
            updated_at=DEMO_TIME,
        ),
    ]


def demo_knowledge_relations() -> list[KnowledgeRelation]:
    return [
        KnowledgeRelation(
            id="relation_array_linked_list_001",
            course_id=DEMO_COURSE_ID,
            source_node_id="node_array_001",
            target_node_id="node_linked_list_001",
            relation_type="prerequisite",
            weight=1,
            created_at=DEMO_TIME,
            updated_at=DEMO_TIME,
        ),
        KnowledgeRelation(
            id="relation_array_recursion_001",
            course_id=DEMO_COURSE_ID,
            source_node_id="node_array_001",
            target_node_id="node_recursion_001",
            relation_type="prerequisite",
            weight=1,
            created_at=DEMO_TIME,
            updated_at=DEMO_TIME,
        ),
        KnowledgeRelation(
            id="relation_linked_list_stack_001",
            course_id=DEMO_COURSE_ID,
            source_node_id="node_linked_list_001",
            target_node_id="node_stack_001",
            relation_type="prerequisite",
            weight=1,
            created_at=DEMO_TIME,
            updated_at=DEMO_TIME,
        ),
    ]


class LearningPathRepository:
    def __init__(self) -> None:
        self._nodes: dict[str, KnowledgeNode] = {node.id: node for node in demo_knowledge_nodes()}
        self._relations: list[KnowledgeRelation] = demo_knowledge_relations()
        self._paths: dict[str, LearningPath] = {}
        self._tasks_by_path_id: dict[str, list[LearningTask]] = {}
        self._task_to_path_id: dict[str, str] = {}

    def list_nodes(self, course_id: str) -> list[KnowledgeNode]:
        return [node.model_copy(deep=True) for node in self._nodes.values() if node.course_id == course_id]

    def list_relations(self, course_id: str) -> list[KnowledgeRelation]:
        return [relation.model_copy(deep=True) for relation in self._relations if relation.course_id == course_id]

    def get_node(self, node_id: str) -> KnowledgeNode | None:
        node = self._nodes.get(node_id)
        return node.model_copy(deep=True) if node is not None else None

    def save_path(self, path: LearningPath, tasks: list[LearningTask]) -> None:
        self._paths[path.id] = path.model_copy(deep=True)
        self._tasks_by_path_id[path.id] = [task.model_copy(deep=True) for task in tasks]
        for task in tasks:
            self._task_to_path_id[task.id] = path.id

    def list_paths_by_user_id(self, user_id: str) -> list[LearningPath]:
        return [path.model_copy(deep=True) for path in self._paths.values() if path.user_id == user_id]

    def get_path(self, path_id: str) -> LearningPath | None:
        path = self._paths.get(path_id)
        return path.model_copy(deep=True) if path is not None else None

    def update_path(self, path_id: str, updates: dict) -> LearningPath | None:
        path = self._paths.get(path_id)
        if path is None:
            return None
        payload = path.model_dump(by_alias=True)
        payload.update(updates)
        payload["id"] = path_id
        payload["updatedAt"] = DEMO_TIME
        updated = LearningPath(**payload)
        self._paths[path_id] = updated
        return updated.model_copy(deep=True)

    def list_tasks_by_path_id(self, path_id: str) -> list[LearningTask]:
        return [task.model_copy(deep=True) for task in self._tasks_by_path_id.get(path_id, [])]

    def update_task_status(self, task_id: str, status: TaskStatus, completed_at: str | None) -> LearningTask | None:
        path_id = self._task_to_path_id.get(task_id)
        if path_id is None:
            return None
        tasks = self._tasks_by_path_id.get(path_id, [])
        for index, task in enumerate(tasks):
            if task.id == task_id:
                updated = task.model_copy(update={"status": status, "completed_at": completed_at, "updated_at": DEMO_TIME})
                tasks[index] = updated
                return updated.model_copy(deep=True)
        return None


default_learning_path_repository = LearningPathRepository()
