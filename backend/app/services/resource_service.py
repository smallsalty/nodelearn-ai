from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import json
import logging
from typing import Any

import re

from sqlalchemy import case, func, or_, select

from app.core.config import settings
from app.db.session import session_context
from app.models import GeneratedResourceModel, KnowledgeBuildTaskModel, UploadedFileModel
from app.repositories.learning_path_repository import (
    LearningPathRepository,
    default_learning_path_repository,
)
from app.repositories.profile_repository import ProfileRepository, default_profile_repository
from app.repositories.resource_repository import DEMO_TIME, ResourceRepository, default_resource_repository
from app.schemas.common import AuditStatus, CognitiveStyle, DifficultyLevel, PracticePreference, ResourceType, TaskStatus
from app.schemas.course import KnowledgeNode
from app.schemas.learning_path import LearningPath, LearningTask
from app.schemas.profile import StudentProfile
from app.schemas.resource import (
    GeneratedResource,
    KnowledgeBuildTask,
    RecommendationRequest,
    ResourceGenerateRequest,
    ResourceGenerateResult,
    ResourcePushRecord,
    ResourceRecommendation,
    RetrievedDocument,
    UploadedFile,
)
from app.schemas.video import AnimationScriptContent
from app.agents.multimodal_skills import VideoAuditError, VideoGenerationService
from app.services.audit_service import AuditService
from app.services.llm_service import LLMService

SOURCE_USER_ID = "system"
VIDEO_RESOURCE_TYPES = {ResourceType.video_script, ResourceType.animation_script}
logger = logging.getLogger(__name__)


def now_utc() -> datetime:
    return datetime.now(UTC)


def as_iso(value: datetime | str | None) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return value or now_utc().isoformat()


def uploaded_file_from_model(model: UploadedFileModel) -> UploadedFile:
    return UploadedFile(
        id=model.id,
        user_id=model.user_id,
        course_id=model.course_id,
        filename=model.filename,
        file_type=model.file_type,
        file_size=model.file_size,
        file_url=model.file_url,
        parse_status=model.parse_status,
        created_at=as_iso(model.created_at),
        updated_at=as_iso(model.updated_at),
    )


def build_task_from_model(model: KnowledgeBuildTaskModel) -> KnowledgeBuildTask:
    return KnowledgeBuildTask(
        id=model.id,
        course_id=model.course_id,
        file_ids=model.file_ids or [],
        status=model.status,
        progress=model.progress,
        error_message=model.error_message,
        created_at=as_iso(model.created_at),
        updated_at=as_iso(model.updated_at),
    )


def generated_resource_from_model(model: GeneratedResourceModel) -> GeneratedResource:
    return GeneratedResource(
        id=model.id,
        user_id=model.user_id,
        course_id=model.course_id,
        node_id=model.node_id,
        title=model.title,
        resource_type=model.resource_type,
        content=model.content,
        file_url=model.file_url,
        prompt=model.prompt,
        model_name=model.model_name,
        status=model.status,
        audit_status=model.audit_status,
        created_at=as_iso(model.created_at),
        updated_at=as_iso(model.updated_at),
    )


@dataclass
class ResourceGenerationPlan:
    result: ResourceGenerateResult
    resources: list[GeneratedResource]
    recommendations: list[ResourceRecommendation]
    push_records: list[ResourcePushRecord]
    resource_plan: list[dict[str, Any]]
    error_message: str | None = None


class ResourceService:
    """Resource, file, and knowledge-base read operations."""

    def __init__(
        self,
        repository: ResourceRepository | None = None,
        profile_repository: ProfileRepository | None = None,
        learning_path_repository: LearningPathRepository | None = None,
        llm_service: LLMService | None = None,
        audit_service: AuditService | None = None,
        video_generation_service: VideoGenerationService | None = None,
    ) -> None:
        self.repository = repository or default_resource_repository
        self.profile_repository = profile_repository or default_profile_repository
        self.learning_path_repository = learning_path_repository or default_learning_path_repository
        self.llm_service = llm_service or LLMService()
        self.audit_service = audit_service or AuditService()
        self.video_generation_service = video_generation_service or VideoGenerationService(self.llm_service)

    def get_file(self, file_id: str) -> UploadedFile | None:
        with session_context() as session:
            model = session.get(UploadedFileModel, file_id)
            return uploaded_file_from_model(model) if model else None

    def get_build_task(self, task_id: str) -> KnowledgeBuildTask | None:
        with session_context() as session:
            model = session.get(KnowledgeBuildTaskModel, task_id)
            return build_task_from_model(model) if model else None

    def get_generation_result(self, task_id: str) -> ResourceGenerateResult:
        return self.repository.ensure_generation_result(task_id)

    def get_resource(self, resource_id: str) -> GeneratedResource | None:
        resource = self.repository.get_resource(resource_id)
        if resource is not None:
            return resource
        with session_context() as session:
            model = session.get(GeneratedResourceModel, resource_id)
            return generated_resource_from_model(model) if model else None

    def list_user_resources(self, user_id: str, page: int, page_size: int, keyword: str | None = None) -> tuple[list[GeneratedResource], int]:
        in_memory_resources = self.repository.list_user_resources(user_id)
        if keyword:
            in_memory_resources = [
                resource
                for resource in in_memory_resources
                if keyword in resource.title or keyword in resource.content
            ]
        if in_memory_resources:
            total = len(in_memory_resources)
            start = (page - 1) * page_size
            return in_memory_resources[start : start + page_size], total

        with session_context() as session:
            query = select(GeneratedResourceModel).where(GeneratedResourceModel.user_id == user_id)
            count_query = select(func.count()).select_from(GeneratedResourceModel).where(GeneratedResourceModel.user_id == user_id)
            if keyword:
                pattern = f"%{keyword}%"
                filter_expr = or_(GeneratedResourceModel.title.like(pattern), GeneratedResourceModel.content.like(pattern))
                query = query.where(filter_expr)
                count_query = count_query.where(filter_expr)
            total = session.scalar(count_query) or 0
            models = session.scalars(query.order_by(GeneratedResourceModel.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
            return [generated_resource_from_model(model) for model in models], total

    def list_node_resources(self, node_id: str) -> list[GeneratedResource]:
        in_memory_resources = self.repository.list_node_resources(node_id)
        if in_memory_resources:
            return in_memory_resources

        with session_context() as session:
            query = (
                select(GeneratedResourceModel)
                .where(GeneratedResourceModel.node_id == node_id)
                .order_by(GeneratedResourceModel.created_at.desc())
            )
            return [generated_resource_from_model(model) for model in session.scalars(query).all()]

    def delete_resource(self, resource_id: str) -> bool:
        return self.repository.delete_resource(resource_id)

    async def generate_resources(
        self,
        payload: ResourceGenerateRequest,
        profile: StudentProfile | None = None,
        profile_analysis: dict[str, Any] | None = None,
        learning_path: LearningPath | None = None,
        learning_tasks: list[LearningTask] | None = None,
        retrieved_documents: list[RetrievedDocument] | None = None,
    ) -> ResourceGenerationPlan:
        profile = profile or self.profile_repository.get_by_user_id(payload.user_id)
        profile_analysis = profile_analysis or {}
        node = self._resolve_node(payload.node_id, profile, learning_path, learning_tasks)
        target_goal = self._target_goal(payload, profile, profile_analysis)
        if not settings.enable_mock and not retrieved_documents:
            retrieved_documents = self.search_knowledge_base(
                course_id=payload.course_id,
                query_text=payload.custom_requirement or target_goal or (node.name if node else "数据结构"),
                node_id=node.id if node else payload.node_id,
                top_k=3,
            )
            if not retrieved_documents:
                raise RuntimeError("Hello Algo knowledge base returned no source documents for resource generation")
        resource_types = self._select_resource_types(payload.resource_types, profile, profile_analysis, node, target_goal)
        video_requested = any(resource_type in VIDEO_RESOURCE_TYPES for resource_type in payload.resource_types)
        resource_types = [resource_type for resource_type in resource_types if resource_type not in VIDEO_RESOURCE_TYPES]

        task_id = self.repository.next_task_id()
        resources: list[GeneratedResource] = []
        recommendations: list[ResourceRecommendation] = []
        push_records: list[ResourcePushRecord] = []
        resource_plan: list[dict[str, Any]] = []
        error_message: str | None = None

        if video_requested:
            video_resources, video_error = await self._generate_video_resources(
                task_id=task_id,
                payload=payload,
                profile=profile,
                node=node,
                target_goal=target_goal,
                retrieved_documents=retrieved_documents,
            )
            resources.extend(video_resources)
            error_message = video_error
            for resource in video_resources:
                resource_plan.append(self._resource_plan_item(len(resource_plan) + 1, resource))
                if resource.status == TaskStatus.success and resource.audit_status == AuditStatus.passed:
                    recommendation = self._build_recommendation(resource, profile, node)
                    push_record = self._build_push_record(resource, recommendation.reason)
                    recommendations.append(self.repository.save_recommendation(recommendation))
                    push_records.append(self.repository.save_push_record(push_record))

        for order_index, resource_type in enumerate(resource_types, start=1):
            resource_id = self.repository.next_resource_id(resource_type.value)
            title = self._resource_title(node, resource_type)
            prompt = self._resource_prompt(
                profile,
                node,
                resource_type,
                target_goal,
                payload.custom_requirement,
                retrieved_documents,
            )
            template_content = self._render_template(
                resource_type,
                node,
                target_goal,
                profile,
                retrieved_documents,
            )
            content = await self.llm_service.generate_text(prompt, mock_text=template_content)
            content = self._normalize_generated_content(resource_type, content)
            if payload.custom_requirement and resource_type != ResourceType.mind_map:
                content = f"{content}\n\n{payload.custom_requirement}"

            audit_result = await self.audit_service.check_content(
                content=content,
                target_type="resource",
                target_id=resource_id,
            )
            audit_status = AuditStatus(audit_result.audit_status)
            status = TaskStatus.success if audit_status == AuditStatus.passed else TaskStatus.failed

            resource = GeneratedResource(
                id=resource_id,
                user_id=payload.user_id,
                course_id=payload.course_id,
                node_id=node.id if node else payload.node_id,
                title=title,
                resource_type=resource_type,
                content=content,
                file_url=None,
                prompt=prompt,
                model_name=self.llm_service.model_name,
                status=status,
                audit_status=audit_status,
                created_at=DEMO_TIME,
                updated_at=DEMO_TIME,
            )
            if not settings.enable_mock:
                self._persist_generated_resource(resource)
            resources.append(self.repository.save_resource(resource))
            resource_plan.append(self._resource_plan_item(len(resource_plan) + 1, resource))

            if audit_status == AuditStatus.passed:
                recommendation = self._build_recommendation(resource, profile, node)
                push_record = self._build_push_record(resource, recommendation.reason)
                recommendations.append(self.repository.save_recommendation(recommendation))
                push_records.append(self.repository.save_push_record(push_record))

        result_status = TaskStatus.success if resources and all(resource.status == TaskStatus.success for resource in resources) else TaskStatus.failed
        result = self.repository.save_generation_result(
            ResourceGenerateResult(
                task_id=task_id,
                resource_ids=[resource.id for resource in resources],
                status=result_status,
            )
        )
        return ResourceGenerationPlan(
            result=result,
            resources=resources,
            recommendations=recommendations,
            push_records=push_records,
            resource_plan=resource_plan,
            error_message=error_message,
        )

    async def _generate_video_resources(
        self,
        task_id: str,
        payload: ResourceGenerateRequest,
        profile: StudentProfile,
        node: KnowledgeNode | None,
        target_goal: str,
        retrieved_documents: list[RetrievedDocument] | None,
    ) -> tuple[list[GeneratedResource], str | None]:
        node_name = node.name if node else "当前知识点"
        placeholder = AnimationScriptContent(title=f"{node_name}图解讲解", duration_seconds=0)
        placeholder_content = json.dumps(placeholder.model_dump(by_alias=True, mode="json"), ensure_ascii=False)
        resources = [
            GeneratedResource(
                id=self.repository.next_resource_id(resource_type.value),
                user_id=payload.user_id,
                course_id=payload.course_id,
                node_id=node.id if node else payload.node_id,
                title=self._resource_title(node, resource_type),
                resource_type=resource_type,
                content=placeholder_content,
                file_url=None,
                prompt=f"生成{node_name}知识点讲解视频",
                model_name=self.llm_service.model_name,
                status=TaskStatus.running,
                audit_status=AuditStatus.unchecked,
                created_at=DEMO_TIME,
                updated_at=DEMO_TIME,
            )
            for resource_type in (ResourceType.video_script, ResourceType.animation_script)
        ]
        for resource in resources:
            self._save_generated_resource(resource)

        try:
            documents = retrieved_documents or []
            if not documents and not settings.enable_mock:
                documents = self.search_knowledge_base(
                    course_id=payload.course_id,
                    query_text=node_name,
                    node_id=node.id if node else payload.node_id,
                    top_k=3,
                )
            lesson = await self.video_generation_service.generate(
                task_id=task_id,
                target_id=resources[0].id,
                user_id=payload.user_id,
                course_id=payload.course_id,
                node=node,
                target_goal=target_goal,
                documents=documents,
            )
            content = json.dumps(lesson.model_dump(by_alias=True, mode="json"), ensure_ascii=False)
            resources = [
                resource.model_copy(
                    update={
                        "content": content,
                        "file_url": lesson.output.video_url,
                        "status": TaskStatus.success,
                        "audit_status": AuditStatus.passed,
                        "updated_at": as_iso(None),
                    }
                )
                for resource in resources
            ]
            for resource in resources:
                self._save_generated_resource(resource)
            return resources, None
        except Exception as exc:
            audit_status = exc.audit_status if isinstance(exc, VideoAuditError) else AuditStatus.unchecked
            message = str(exc)
            logger.error(
                json.dumps(
                    {
                        "event": "video_generation_failed",
                        "taskId": task_id,
                        "userId": payload.user_id,
                        "courseId": payload.course_id,
                        "nodeId": node.id if node else payload.node_id,
                        "errorMessage": message,
                    },
                    ensure_ascii=False,
                )
            )
            resources = [
                resource.model_copy(
                    update={
                        "file_url": None,
                        "status": TaskStatus.failed,
                        "audit_status": audit_status,
                        "updated_at": as_iso(None),
                    }
                )
                for resource in resources
            ]
            for resource in resources:
                self._save_generated_resource(resource)
            return resources, message

    def _save_generated_resource(self, resource: GeneratedResource) -> GeneratedResource:
        if not settings.enable_mock:
            self._persist_generated_resource(resource)
        return self.repository.save_resource(resource)

    def _resource_plan_item(self, order_index: int, resource: GeneratedResource) -> dict[str, Any]:
        return {
            "orderIndex": order_index,
            "nodeId": resource.node_id,
            "resourceType": ResourceType(resource.resource_type).value,
            "title": resource.title,
            "auditStatus": AuditStatus(resource.audit_status).value,
            "status": TaskStatus(resource.status).value,
        }

    async def recommend_resources(self, payload: RecommendationRequest) -> list[ResourceRecommendation]:
        existing = self.repository.list_recommendations(
            user_id=payload.user_id,
            course_id=payload.course_id,
            node_id=payload.node_id,
            limit=payload.limit,
        )
        if existing:
            return existing

        profile = self.profile_repository.get_by_user_id(payload.user_id)
        generate_result = await self.generate_resources(
            ResourceGenerateRequest(
                user_id=payload.user_id,
                course_id=payload.course_id,
                node_id=payload.node_id,
                resource_types=[],
                learning_goal=profile.learning_goal,
            ),
            profile=profile,
        )
        recommendations = generate_result.recommendations
        return recommendations[: payload.limit] if payload.limit else recommendations

    def list_user_recommendations(self, user_id: str) -> list[ResourceRecommendation]:
        return self.repository.list_recommendations(user_id=user_id)

    def mark_recommendation_viewed(self, recommendation_id: str) -> bool:
        return self.repository.mark_recommendation_viewed(recommendation_id)

    def list_push_records(self, user_id: str) -> list[ResourcePushRecord]:
        return self.repository.list_push_records(user_id)

    def search_knowledge_base(self, course_id: str, query_text: str, node_id: str | None = None, top_k: int | None = None) -> list[RetrievedDocument]:
        limit = top_k or 5
        resolved_node_id = self.learning_path_repository.resolve_node_id(node_id, course_id) if node_id else None
        with session_context() as session:
            base_query = select(GeneratedResourceModel).where(
                GeneratedResourceModel.course_id == course_id,
                GeneratedResourceModel.user_id == SOURCE_USER_ID,
            )
            terms = self._search_terms(query_text)
            models = []
            if resolved_node_id:
                resource_type_order = case((GeneratedResourceModel.resource_type == ResourceType.reading_material.value, 0), else_=1)
                models = session.scalars(
                    base_query.where(GeneratedResourceModel.node_id == resolved_node_id)
                    .order_by(resource_type_order, GeneratedResourceModel.created_at.desc())
                    .limit(limit)
                ).all()
            if not models and terms:
                filters = []
                for term in terms:
                    pattern = f"%{term}%"
                    filters.extend([GeneratedResourceModel.title.like(pattern), GeneratedResourceModel.content.like(pattern)])
                models = session.scalars(base_query.where(or_(*filters)).order_by(GeneratedResourceModel.created_at.desc()).limit(limit)).all()
            if not models:
                models = session.scalars(base_query.order_by(GeneratedResourceModel.created_at.desc()).limit(limit)).all()
            return [
                RetrievedDocument(
                    id=model.id,
                    source_id=model.file_url or model.id,
                    title=model.title,
                    content=model.content[:1000],
                    score=1.0,
                    metadata={"resourceId": model.id, "nodeId": model.node_id},
                )
                for model in models
            ]

    def _search_terms(self, query_text: str) -> list[str]:
        terms = [item for item in re.split(r"[\s，。；、,;：:！？!?]+", query_text.strip()) if len(item) >= 2]
        return list(dict.fromkeys(terms))[:5]

    def _resolve_node(
        self,
        node_id: str | None,
        profile: StudentProfile,
        learning_path: LearningPath | None,
        learning_tasks: list[LearningTask] | None,
    ) -> KnowledgeNode | None:
        candidate_node_ids: list[str] = []
        if node_id:
            candidate_node_ids.append(node_id)
        if learning_path and learning_path.current_node_id:
            candidate_node_ids.append(learning_path.current_node_id)
        if learning_path:
            candidate_node_ids.extend(learning_path.path_node_ids)
        if learning_tasks:
            candidate_node_ids.extend(task.node_id for task in learning_tasks)
        candidate_node_ids.extend(profile.weak_node_ids)
        candidate_node_ids.append("node_linked_list_001")

        for candidate_id in self._unique_strings(candidate_node_ids):
            node = self.learning_path_repository.get_node(candidate_id)
            if node is not None:
                return node
        return None

    def _target_goal(
        self,
        payload: ResourceGenerateRequest,
        profile: StudentProfile,
        profile_analysis: dict[str, Any],
    ) -> str:
        planning_hints = profile_analysis.get("planningHints", {})
        return payload.learning_goal or planning_hints.get("targetGoal") or profile.learning_goal or "完成当前知识点学习"

    def _select_resource_types(
        self,
        requested_types: list[ResourceType],
        profile: StudentProfile,
        profile_analysis: dict[str, Any],
        node: KnowledgeNode | None,
        target_goal: str,
    ) -> list[ResourceType]:
        if requested_types:
            return self._unique_resource_types(requested_types)

        selected: list[ResourceType] = []
        selected.extend(self._parse_resource_types(profile_analysis.get("preferredResourceTypes") or []))

        if profile.knowledge_base_level == DifficultyLevel.easy:
            selected.extend([ResourceType.lecture_doc, ResourceType.mind_map, ResourceType.practice_question])
        if profile.cognitive_style == CognitiveStyle.diagram:
            selected.extend([ResourceType.mind_map, ResourceType.video_script, ResourceType.animation_script])
        if profile.practice_preference == PracticePreference.coding:
            selected.extend([ResourceType.code_case, ResourceType.practice_question, ResourceType.project_task])
        if "考试" in target_goal or "复习" in target_goal:
            selected.extend([ResourceType.summary_note, ResourceType.practice_question, ResourceType.lecture_doc])
        if "项目" in target_goal or "应用" in target_goal:
            selected.extend([ResourceType.code_case, ResourceType.project_task, ResourceType.reading_material])

        mastery_score = node.mastery_score if node else None
        if mastery_score is not None and mastery_score < 60:
            selected.extend([ResourceType.lecture_doc, ResourceType.mind_map, ResourceType.practice_question, ResourceType.code_case])
        if mastery_score is not None and mastery_score > 80:
            selected.extend([ResourceType.reading_material, ResourceType.project_task, ResourceType.code_case])

        selected.extend(profile.resource_preference)
        return self._unique_resource_types(selected) or [
            ResourceType.lecture_doc,
            ResourceType.mind_map,
            ResourceType.practice_question,
        ]

    def _parse_resource_types(self, values: list[Any]) -> list[ResourceType]:
        parsed: list[ResourceType] = []
        for value in values:
            try:
                parsed.append(ResourceType(value))
            except ValueError:
                continue
        return parsed

    def _unique_resource_types(self, values: list[ResourceType]) -> list[ResourceType]:
        result: list[ResourceType] = []
        for value in values:
            resource_type = ResourceType(value)
            if resource_type not in result:
                result.append(resource_type)
        return result

    def _unique_strings(self, values: list[str | None]) -> list[str]:
        result: list[str] = []
        for value in values:
            if value and value not in result:
                result.append(value)
        return result

    def _resource_title(self, node: KnowledgeNode | None, resource_type: ResourceType) -> str:
        node_name = node.name if node else "当前知识点"
        labels = {
            ResourceType.lecture_doc: "讲解文档",
            ResourceType.mind_map: "思维导图",
            ResourceType.practice_question: "练习题生成任务",
            ResourceType.reading_material: "拓展阅读",
            ResourceType.code_case: "代码实操案例",
            ResourceType.video_script: "视频脚本",
            ResourceType.animation_script: "动画脚本",
            ResourceType.project_task: "项目任务",
            ResourceType.summary_note: "复习摘要",
        }
        return f"{node_name}{labels[resource_type]}"

    def _resource_prompt(
        self,
        profile: StudentProfile,
        node: KnowledgeNode | None,
        resource_type: ResourceType,
        target_goal: str,
        custom_requirement: str | None,
        retrieved_documents: list[RetrievedDocument] | None,
    ) -> str:
        node_name = node.name if node else "当前知识点"
        requirement = custom_requirement or "无"
        source_section = self._retrieved_document_section(retrieved_documents)
        format_requirement = ""
        if resource_type == ResourceType.mind_map:
            format_requirement = "只输出以 mindmap 开头的 Mermaid 思维导图源码，不要使用 Markdown 代码围栏。"
        return (
            f"为用户 {profile.user_id} 生成 {resource_type.value}。"
            f"知识点：{node_name}。学习目标：{target_goal}。额外要求：{requirement}。"
            f"{format_requirement}"
            f"{source_section}"
        )

    @staticmethod
    def _normalize_generated_content(resource_type: ResourceType, content: str) -> str:
        normalized = content.strip()
        if resource_type != ResourceType.mind_map:
            return normalized

        if normalized.startswith("```"):
            lines = normalized.splitlines()
            if lines and lines[0].strip() in {"```", "```mermaid"}:
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            normalized = "\n".join(lines).strip()

        if not normalized.startswith("mindmap"):
            raise RuntimeError("LLM mind_map output must start with Mermaid mindmap syntax")
        punctuation_map = str.maketrans({"(": "（", ")": "）", "[": "【", "]": "】", "{": "｛", "}": "｝"})
        lines = []
        for index, line in enumerate(normalized.splitlines()):
            stripped = line.strip()
            if stripped.startswith("::icon("):
                continue
            if index == 0 or not stripped or stripped.startswith("root("):
                lines.append(line)
                continue
            indentation = line[: len(line) - len(line.lstrip())]
            lines.append(f"{indentation}{stripped.translate(punctuation_map)}")
        return "\n".join(lines)

    def _render_template(
        self,
        resource_type: ResourceType,
        node: KnowledgeNode | None,
        target_goal: str,
        profile: StudentProfile | None = None,
        retrieved_documents: list[RetrievedDocument] | None = None,
    ) -> str:
        node_name = node.name if node else "当前知识点"
        common_mistakes = "、".join(node.common_mistakes) if node and node.common_mistakes else "注意概念边界和步骤顺序"
        weak_hint = self._weak_node_hint(profile, node)
        easy_hint = self._easy_level_hint(profile)
        example_hint = self._example_style_hint(profile, node_name)
        code_hint = self._code_preference_hint(profile)
        document_section = self._retrieved_document_section(retrieved_documents)
        templates = {
            ResourceType.lecture_doc: (
                f"# {node_name}讲解文档\n"
                "## 学习目标\n"
                f"- 面向目标：{target_goal}\n"
                f"{easy_hint}"
                "## 核心概念\n"
                f"- 理解{node_name}的定义、适用场景和关键操作。\n"
                "## 示例讲解\n"
                f"- 使用数据结构课程中的典型例子讲解{node_name}。\n"
                f"{example_hint}"
                "## 常见错误\n"
                f"- {common_mistakes}\n"
                f"{weak_hint}"
                "## 小结\n"
                f"- 先掌握{node_name}的基本结构，再完成对应练习。"
                f"{document_section}"
            ),
            ResourceType.mind_map: (
                "mindmap\n"
                f"  root(({node_name}))\n"
                "    基本概念\n"
                "    存储结构\n"
                "    插入操作\n"
                "    删除操作\n"
                "    常见错误\n"
                "    补弱提示"
            ),
            ResourceType.practice_question: (
                f"# {node_name}练习题生成任务说明\n"
                "本资源只描述练习题生成任务，正式题目由 practice_agent 生成。\n"
                f"- 目标：围绕{node_name}生成选择题、简答题和编码题。\n"
                f"- 易错点：{common_mistakes}"
            ),
            ResourceType.code_case: (
                "# 代码实操案例\n"
                "## 任务目标\n"
                f"实现并验证{node_name}的核心操作。\n"
                "## 前置知识\n"
                f"先理解{node_name}的基本概念和边界条件。\n"
                "## 示例代码\n"
                "```python\n"
                "def demo():\n"
                "    return \"mock code case\"\n"
                "```\n"
                "## 运行步骤\n"
                "使用 Python 运行示例并观察输出。\n"
                "## 测试输入\n"
                "正常输入、边界输入和易错场景。\n"
                "## 预期输出\n"
                f"能够解释{node_name}的关键变化。\n"
                "## 拓展任务\n"
                "尝试加入异常输入和边界条件测试。"
                f"{code_hint}"
            ),
            ResourceType.reading_material: (
                "# 拓展阅读\n"
                "## 推荐阅读方向\n"
                f"阅读{node_name}的应用场景和延伸内容。\n"
                "## 阅读目标\n"
                "理解当前知识点如何连接后续学习。\n"
                "## 适合人群\n"
                "适合已经掌握基础概念的学生。\n"
                "## 阅读后练习\n"
                "完成一个简短总结并尝试应用到项目任务。"
            ),
            ResourceType.video_script: (
                f"# 视频标题\n{node_name}图解讲解\n"
                "## 适合对象\n"
                f"适合正在围绕“{target_goal}”学习且需要可视化理解的学生。\n"
                "## 时长建议\n"
                "5-8 分钟。\n"
                "## 分镜脚本\n"
                f"1. 展示{node_name}的整体结构。\n2. 演示关键操作。\n3. 对比常见错误。\n"
                "## 旁白内容\n"
                f"用低术语密度解释{node_name}，先讲直观含义，再讲操作步骤。\n"
                "## 屏幕元素\n"
                "节点、箭头、关键变量、错误标记。\n"
                "## 互动提问\n"
                f"如果{node_name}操作中断开了关键连接，会发生什么？\n"
                "## 总结\n"
                f"复盘{node_name}的基本概念、操作步骤和常见错误。"
                f"{weak_hint}"
            ),
            ResourceType.animation_script: (
                f"# 动画标题\n{node_name}操作过程动画\n"
                "## 场景目标\n"
                f"用动画展示{node_name}从初始状态到完成操作的变化。\n"
                "## 数据结构初始状态\n"
                "展示初始节点、连接关系和关键变量。\n"
                "## 动画步骤\n"
                "1. 标记当前节点。\n2. 执行核心操作。\n3. 更新结构关系。\n"
                "## 每一步的画面变化\n"
                "用高亮、箭头移动和颜色变化表示状态转移。\n"
                "## 旁白说明\n"
                f"解释每一步为什么改变{node_name}的结构。\n"
                "## 常见误区提示\n"
                f"{common_mistakes}。"
                f"{weak_hint}"
            ),
            ResourceType.project_task: (
                f"# {node_name}项目任务\n"
                "## 任务目标\n"
                f"在小项目中应用{node_name}。\n"
                "## 交付物\n"
                "代码、运行结果和简短说明。\n"
                "## 验收标准\n"
                "功能正确、边界场景可运行、说明清晰。"
            ),
            ResourceType.summary_note: (
                "# 复习卡片\n"
                "## 必背概念\n"
                f"{node_name}的定义、结构特征和核心操作。\n"
                "## 高频考点\n"
                "定义、操作流程、复杂度和典型错误。\n"
                "## 常见错误\n"
                f"{common_mistakes}\n"
                "## 练习建议\n"
                "先看摘要，再做练习题和代码案例。"
                f"{weak_hint}"
            ),
        }
        return templates[resource_type]

    def _weak_node_hint(self, profile: StudentProfile | None, node: KnowledgeNode | None) -> str:
        if profile is None or node is None or node.id not in profile.weak_node_ids:
            return ""
        return "\n## 补弱提示\n当前知识点属于薄弱节点，建议先看图解，再完成一个短代码练习。\n"

    def _easy_level_hint(self, profile: StudentProfile | None) -> str:
        if profile is None or profile.knowledge_base_level != DifficultyLevel.easy:
            return ""
        return "- 说明会优先使用基础解释，减少抽象术语。\n"

    def _example_style_hint(self, profile: StudentProfile | None, node_name: str) -> str:
        if profile is None or profile.cognitive_style != CognitiveStyle.example:
            return ""
        return f"- 类比：把{node_name}看作生活中的步骤清单，先看整体，再看每一步变化。\n"

    def _code_preference_hint(self, profile: StudentProfile | None) -> str:
        if profile is None or profile.practice_preference != PracticePreference.coding:
            return ""
        return "\n## 代码练习提示\n建议补充一个可运行函数和两个边界测试。\n"

    def _retrieved_document_section(self, retrieved_documents: list[RetrievedDocument] | None) -> str:
        if not retrieved_documents:
            return ""
        lines = ["\n## 参考材料补充"]
        for document in retrieved_documents[:3]:
            lines.append(f"- {document.title}: {document.content[:80]}")
        return "\n" + "\n".join(lines) + "\n"

    def _build_recommendation(
        self,
        resource: GeneratedResource,
        profile: StudentProfile,
        node: KnowledgeNode | None,
    ) -> ResourceRecommendation:
        node_name = node.name if node else "当前知识点"
        reason = f"根据{profile.cognitive_style}认知风格、{profile.practice_preference}练习偏好和{node_name}掌握状态推荐。"
        return ResourceRecommendation(
            id=self.repository.next_recommendation_id(),
            user_id=resource.user_id,
            course_id=resource.course_id,
            node_id=resource.node_id,
            resource_id=resource.id,
            resource_type=resource.resource_type,
            title=resource.title,
            reason=reason,
            score=0.9,
            created_at=DEMO_TIME,
        )

    def _build_push_record(self, resource: GeneratedResource, reason: str) -> ResourcePushRecord:
        return ResourcePushRecord(
            id=self.repository.next_push_record_id(),
            user_id=resource.user_id,
            resource_id=resource.id,
            node_id=resource.node_id,
            reason=reason,
            viewed=False,
            viewed_at=None,
            created_at=DEMO_TIME,
            updated_at=DEMO_TIME,
        )

    def _persist_generated_resource(self, resource: GeneratedResource) -> None:
        now = now_utc()
        with session_context() as session:
            session.merge(
                GeneratedResourceModel(
                    id=resource.id,
                    user_id=resource.user_id,
                    course_id=resource.course_id,
                    node_id=resource.node_id,
                    title=resource.title,
                    resource_type=self._enum_value(resource.resource_type),
                    content=resource.content,
                    file_url=resource.file_url,
                    prompt=resource.prompt,
                    model_name=resource.model_name,
                    status=self._enum_value(resource.status),
                    audit_status=self._enum_value(resource.audit_status),
                    created_at=now,
                    updated_at=now,
                )
            )

    def _enum_value(self, value: Any) -> Any:
        return value.value if hasattr(value, "value") else value
