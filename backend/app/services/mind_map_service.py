from __future__ import annotations

from dataclasses import dataclass
import json
import re
from typing import Any, Literal

from app.schemas.course import KnowledgeNode, KnowledgeRelation
from app.schemas.resource import RetrievedDocument

MindMapScope = Literal["chapter", "node"]

BRANCH_TYPES = {
    "definition",
    "structure",
    "principle",
    "classification",
    "operation",
    "algorithm",
    "complexity",
    "relation",
    "application",
}
RELATION_TYPES = {"contains", "prerequisite", "related", "advanced"}
VAGUE_TITLES = {
    "其他",
    "补充",
    "总结一下",
    "相关内容",
    "更多内容",
    "注意事项集合",
    "学习建议",
    "练习建议",
    "易错点",
}
FORBIDDEN_TOP_TITLE_FRAGMENTS = {"易错点", "练习建议", "学习计划", "推荐资源", "复习方法"}
ADVICE_DESCRIPTION_FRAGMENTS = {"建议先", "建议你", "练习建议", "学习建议", "复习计划", "资源推荐"}
CJK_RE = re.compile(r"[\u4e00-\u9fff]")


@dataclass
class MindMapGenerationContext:
    course_id: str
    node_id: str | None
    node_name: str
    chapter_id: str | None
    scope: MindMapScope
    central_topic: str
    target_goal: str
    custom_requirement: str | None
    nodes: list[KnowledgeNode]
    relations: list[KnowledgeRelation]
    retrieved_documents: list[RetrievedDocument] | None = None


class MindMapValidationError(ValueError):
    def __init__(self, errors: list[str]) -> None:
        super().__init__("; ".join(errors))
        self.errors = errors


class MindMapValidator:
    @classmethod
    def validate(cls, data: Any) -> None:
        errors = cls.validate_errors(data)
        if errors:
            raise MindMapValidationError(errors)

    @classmethod
    def validate_errors(cls, data: Any) -> list[str]:
        errors: list[str] = []
        if not isinstance(data, dict):
            return ["mind map must be a JSON object"]

        required_fields = [
            "title",
            "scope",
            "courseId",
            "chapterId",
            "nodeId",
            "centralTopic",
            "summary",
            "branches",
            "relations",
        ]
        for field in required_fields:
            if field not in data:
                errors.append(f"missing field: {field}")

        title = data.get("title")
        if not _non_empty_string(title):
            errors.append("title must be a non-empty string")
        elif cls._is_title_too_long(title):
            errors.append(f"title is too long: {title}")

        scope = data.get("scope")
        if scope not in {"chapter", "node"}:
            errors.append("scope must be chapter or node")

        for field in ("courseId", "centralTopic", "summary"):
            if not _non_empty_string(data.get(field)):
                errors.append(f"{field} must be a non-empty string")

        branches = data.get("branches")
        if not isinstance(branches, list) or not branches:
            errors.append("branches must be a non-empty list")
            branches = []

        if scope == "chapter" and not 5 <= len(branches) <= 8:
            errors.append("chapter mind map must contain 5 to 8 first-level branches")
        if scope == "node" and not 4 <= len(branches) <= 7:
            errors.append("node mind map must contain 4 to 7 first-level branches")

        node_ids: set[str] = set()
        all_nodes: list[dict[str, Any]] = []
        cls._collect_node_errors(branches, errors, node_ids, all_nodes)

        total_nodes = len(all_nodes)
        if scope == "chapter" and not 30 <= total_nodes <= 80:
            errors.append("chapter mind map must contain 30 to 80 tree nodes")
        if scope == "node" and not 18 <= total_nodes <= 45:
            errors.append("node mind map must contain 18 to 45 tree nodes")

        for branch in branches:
            if isinstance(branch, dict):
                branch_title = branch.get("title", "")
                if any(fragment in branch_title for fragment in FORBIDDEN_TOP_TITLE_FRAGMENTS):
                    errors.append(f"forbidden first-level branch title: {branch_title}")
                importance = cls._normalize_importance(branch.get("importance"))
                branch["importance"] = importance
                if importance not in {1, 2, 3, 4, 5}:
                    errors.append(f"first-level branch importance must be 1 to 5: {branch_title}")

        relations = data.get("relations")
        if not isinstance(relations, list):
            errors.append("relations must be a list")
            relations = []
        for index, relation in enumerate(relations):
            if not isinstance(relation, dict):
                errors.append(f"relation[{index}] must be an object")
                continue
            source_id = relation.get("sourceId")
            target_id = relation.get("targetId")
            relation_type = relation.get("relationType")
            if source_id not in node_ids:
                errors.append(f"relation[{index}].sourceId not found in tree: {source_id}")
            if target_id not in node_ids:
                errors.append(f"relation[{index}].targetId not found in tree: {target_id}")
            if relation_type not in RELATION_TYPES:
                errors.append(f"relation[{index}].relationType is invalid: {relation_type}")
            if not _non_empty_string(relation.get("label")):
                errors.append(f"relation[{index}].label must be a non-empty string")

        return errors

    @classmethod
    def normalize_content(cls, content: str) -> str:
        normalized = content.strip()
        if normalized.startswith("```") or normalized.startswith("mindmap"):
            raise RuntimeError("LLM mind_map output must be KnowledgeMindMap JSON, not Markdown or Mermaid")
        try:
            parsed = json.loads(normalized)
        except json.JSONDecodeError as exc:
            raise RuntimeError("LLM mind_map output must be valid JSON") from exc
        cls.validate(parsed)
        return json.dumps(parsed, ensure_ascii=False)

    @classmethod
    def _collect_node_errors(
        cls,
        nodes: list[Any],
        errors: list[str],
        node_ids: set[str],
        all_nodes: list[dict[str, Any]],
        path: str = "branches",
    ) -> None:
        for index, node in enumerate(nodes):
            node_path = f"{path}[{index}]"
            if not isinstance(node, dict):
                errors.append(f"{node_path} must be an object")
                continue

            all_nodes.append(node)
            node_id = node.get("id")
            title = node.get("title")
            branch_type = node.get("branchType")
            children = node.get("children", [])

            if not _non_empty_string(node_id):
                errors.append(f"{node_path}.id must be a non-empty string")
            elif node_id in node_ids:
                errors.append(f"duplicated node id: {node_id}")
            else:
                node_ids.add(node_id)

            if not _non_empty_string(title):
                errors.append(f"{node_path}.title must be a non-empty string")
            else:
                if cls._is_title_too_long(title):
                    errors.append(f"{node_path}.title is too long: {title}")
                if cls._is_vague_title(title):
                    errors.append(f"{node_path}.title is vague or forbidden: {title}")

            if branch_type not in BRANCH_TYPES:
                errors.append(f"{node_path}.branchType is invalid: {branch_type}")

            if not isinstance(children, list):
                errors.append(f"{node_path}.children must be a list")
                children = []

            if children:
                cls._collect_node_errors(children, errors, node_ids, all_nodes, f"{node_path}.children")
                continue

            description = node.get("description")
            if not _non_empty_string(description):
                errors.append(f"{node_path}.description is required for leaf nodes")
            elif any(fragment in description for fragment in ADVICE_DESCRIPTION_FRAGMENTS):
                errors.append(f"{node_path}.description must explain knowledge itself, not learning advice")

    @staticmethod
    def _is_title_too_long(title: str) -> bool:
        stripped = title.strip()
        cjk_count = len(CJK_RE.findall(stripped))
        if cjk_count:
            return cjk_count > 14 or len(stripped) > 32
        return len(stripped) > 32

    @staticmethod
    def _is_vague_title(title: str) -> bool:
        return title.strip() in VAGUE_TITLES

    @staticmethod
    def _normalize_importance(value: Any) -> Any:
        if isinstance(value, str) and value.strip().isdigit():
            return int(value.strip())
        return value


def build_mind_map_prompt(
    context: MindMapGenerationContext,
    validation_errors: list[str] | None = None,
) -> str:
    schema = {
        "title": "string",
        "scope": "chapter | node",
        "courseId": context.course_id,
        "chapterId": context.chapter_id,
        "nodeId": context.node_id,
        "centralTopic": "string",
        "summary": "string",
        "branches": [
            {
                "id": "string",
                "title": "string",
                "branchType": "definition | structure | principle | classification | operation | algorithm | complexity | relation | application",
                "importance": "1 | 2 | 3 | 4 | 5",
                "children": [
                    {
                        "id": "string",
                        "title": "string",
                        "branchType": "definition | structure | principle | classification | operation | algorithm | complexity | relation | application",
                        "knowledgePoint": "string",
                        "description": "string",
                        "children": [],
                    }
                ],
            }
        ],
        "relations": [
            {
                "sourceId": "string",
                "targetId": "string",
                "relationType": "contains | prerequisite | related | advanced",
                "label": "string",
            }
        ],
    }
    context_payload = {
        "scope": context.scope,
        "courseId": context.course_id,
        "chapterId": context.chapter_id,
        "nodeId": context.node_id,
        "centralTopic": context.central_topic,
        "targetGoal": context.target_goal,
        "customRequirement": context.custom_requirement,
        "knowledgeNodes": [_node_payload(node) for node in context.nodes[:20]],
        "knowledgeRelations": [_relation_payload(relation) for relation in context.relations[:30]],
        "retrievedDocuments": [_document_payload(document) for document in (context.retrieved_documents or [])[:3]],
    }
    branch_rule = (
        "章节级导图必须选择 5 到 8 个一级分支，总节点数 30 到 80 个。"
        if context.scope == "chapter"
        else "知识点级导图必须选择 4 到 7 个一级分支，总节点数 18 到 45 个。"
    )
    retry_section = ""
    if validation_errors:
        retry_section = (
            "\n上次输出未通过 MindMapValidator，请只修正 JSON 后重试。校验错误：\n"
            + "\n".join(f"- {error}" for error in validation_errors[:12])
            + "\n"
        )

    return (
        "你是 NodeLearn AI 的知识点思维导图生成智能体。你的任务是根据课程知识库、章节内容、"
        "知识节点和 RAG 检索结果，生成章节或知识点内部的 KnowledgeMindMap JSON。\n"
        "生成目标：展示知识点本身的结构，展示概念、定义、结构、原理、分类、算法、复杂度和关系，"
        "帮助学生理解这一章节讲了哪些知识、这些知识怎么组织、彼此有什么关系。\n"
        "严格禁止：不要把易错点、练习建议、学习建议、学习计划、资源推荐作为一级分支；"
        "不要生成题目、复习计划、Markdown、Mermaid、前端坐标或解释文字；只输出合法 JSON。\n"
        "内容依据：优先使用 RAG 检索结果，其次使用 KnowledgeNode 和 KnowledgeRelation，"
        "信息不足时生成保守、基础、可信的知识结构。\n"
        f"{branch_rule}\n"
        "叶子节点 description 必须解释知识本身，不能写成学习建议。一级分支标题优先从基本概念、结构组成、"
        "核心原理、主要分类、基本操作、算法流程、复杂度分析、适用场景、前后置关系中选择。\n"
        f"必须输出的 JSON 结构：\n{json.dumps(schema, ensure_ascii=False, indent=2)}\n"
        f"课程上下文：\n{json.dumps(context_payload, ensure_ascii=False, indent=2)}\n"
        f"{retry_section}"
        "最终回答只能是 JSON 对象，不能包含 Markdown 代码块或任何解释文字。"
    )


def build_mock_mind_map(context: MindMapGenerationContext) -> dict[str, Any]:
    topic = _short_title(context.central_topic or context.node_name or "当前知识点")
    branches = [
        _branch(
            "basic",
            "基本概念",
            "definition",
            5,
            [
                ("definition", "定义边界", "definition", f"说明{topic}的含义、对象范围和与相近概念的区别。"),
                ("abstract", "抽象特征", "definition", f"概括{topic}在数据结构中的核心抽象和表达目标。"),
                ("storage", "存储特征", "structure", f"描述{topic}在内存或逻辑结构上的基本组织方式。"),
                ("goal", "使用目标", "application", f"解释{topic}解决的主要问题和适合承载的数据关系。"),
            ],
        ),
        _branch(
            "structure",
            "结构组成",
            "structure",
            5,
            [
                ("head", "头部入口", "structure", f"表示访问{topic}结构时定位起点或入口的关键位置。"),
                ("data", "数据单元", "structure", f"表示{topic}中保存实际元素值或业务对象的基本单元。"),
                ("link", "连接关系", "structure", f"说明单元之间通过索引、引用或逻辑次序形成的组织关系。"),
                ("boundary", "边界状态", "structure", f"描述空结构、首尾位置和终止条件等边界组成。"),
            ],
        ),
        _branch(
            "principle",
            "核心原理",
            "principle",
            5,
            [
                ("order", "逻辑次序", "principle", f"说明{topic}如何保持元素之间的先后或层级关系。"),
                ("access", "访问机制", "principle", f"解释读取目标元素时依赖的定位路径和访问方式。"),
                ("update", "局部修改", "principle", f"说明插入、删除或更新如何改变局部结构关系。"),
                ("invariant", "结构不变式", "principle", f"描述操作前后必须保持成立的结构约束。"),
            ],
        ),
        _branch(
            "operation",
            "基本操作",
            "operation",
            4,
            [
                ("create", "创建初始化", "operation", f"说明建立{topic}初始状态时需要准备的元素和边界。"),
                ("insert", "插入过程", "operation", f"解释新元素进入{topic}时需要调整的连接和位置。"),
                ("delete", "删除过程", "operation", f"解释移除元素时如何保持剩余结构仍然连贯。"),
                ("traverse", "遍历查找", "operation", f"说明按结构关系访问所有或目标元素的基本过程。"),
            ],
        ),
        _branch(
            "complexity",
            "复杂度分析",
            "complexity",
            4,
            [
                ("access_cost", "访问代价", "complexity", f"说明定位单个元素时可能产生的时间开销。"),
                ("update_cost", "更新代价", "complexity", f"说明插入或删除操作在典型情况下的时间开销。"),
                ("space_cost", "空间开销", "complexity", f"说明保存数据单元和辅助连接信息所需的空间。"),
                ("condition", "适用条件", "application", f"解释{topic}在数据规模、访问模式和更新频率下的适用条件。"),
            ],
        ),
    ]
    if context.scope == "chapter":
        branches.append(
            _branch(
                "relation",
                "前后置关系",
                "relation",
                4,
                [
                    ("pre", "前置基础", "relation", f"说明理解{topic}前需要掌握的基础概念。"),
                    ("next", "后续扩展", "relation", f"说明{topic}可支撑的后续数据结构或算法主题。"),
                    ("compare", "概念对比", "relation", f"比较{topic}与相邻结构在组织方式上的差异。"),
                    ("scenario", "应用场景", "application", f"说明{topic}适合处理的数据组织和操作需求。"),
                ],
            )
        )

    return {
        "title": f"{topic}知识结构导图",
        "scope": context.scope,
        "courseId": context.course_id,
        "chapterId": context.chapter_id,
        "nodeId": context.node_id,
        "centralTopic": topic,
        "summary": f"围绕{topic}梳理定义、结构、原理、操作、复杂度和关联关系。",
        "branches": branches,
        "relations": [
            {
                "sourceId": "basic_definition",
                "targetId": "structure_data",
                "relationType": "contains",
                "label": "概念落实为组成",
            },
            {
                "sourceId": "principle_access",
                "targetId": "operation_traverse",
                "relationType": "related",
                "label": "访问依赖遍历",
            },
            {
                "sourceId": "operation_insert",
                "targetId": "complexity_update_cost",
                "relationType": "related",
                "label": "操作影响代价",
            },
        ],
    }


def validation_failure_content(errors: list[str], raw_output: Any) -> str:
    return json.dumps(
        {
            "error": "mind_map_validation_failed",
            "validationErrors": errors,
            "rawOutput": raw_output,
        },
        ensure_ascii=False,
    )


def _branch(
    branch_id: str,
    title: str,
    branch_type: str,
    importance: int,
    children: list[tuple[str, str, str, str]],
) -> dict[str, Any]:
    return {
        "id": f"{branch_id}_branch",
        "title": title,
        "branchType": branch_type,
        "importance": importance,
        "children": [
            {
                "id": f"{branch_id}_{child_id}",
                "title": child_title,
                "branchType": child_type,
                "knowledgePoint": child_title,
                "description": description,
                "children": [],
            }
            for child_id, child_title, child_type, description in children
        ],
    }


def _node_payload(node: KnowledgeNode) -> dict[str, Any]:
    return {
        "id": node.id,
        "name": node.name,
        "chapterId": node.chapter_id,
        "nodeType": _enum_value(node.node_type),
        "description": node.description,
        "difficulty": _enum_value(node.difficulty),
        "prerequisiteNodeIds": node.prerequisite_node_ids,
        "nextNodeIds": node.next_node_ids,
    }


def _relation_payload(relation: KnowledgeRelation) -> dict[str, Any]:
    return {
        "sourceNodeId": relation.source_node_id,
        "targetNodeId": relation.target_node_id,
        "relationType": relation.relation_type,
        "weight": relation.weight,
    }


def _document_payload(document: RetrievedDocument) -> dict[str, Any]:
    return {
        "title": document.title,
        "content": document.content[:600],
        "score": document.score,
        "metadata": document.metadata,
    }


def _enum_value(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def _non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _short_title(value: str) -> str:
    stripped = value.strip() or "当前知识点"
    if len(CJK_RE.findall(stripped)) > 8 or len(stripped) > 16:
        return "核心主题"
    return stripped
