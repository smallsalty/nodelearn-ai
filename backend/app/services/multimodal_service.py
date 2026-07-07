from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.core.config import settings
from app.repositories.learning_path_repository import DEMO_COURSE_ID, LearningPathRepository, default_learning_path_repository
from app.repositories.profile_repository import ProfileRepository, default_profile_repository
from app.repositories.resource_repository import DEMO_TIME
from app.schemas.agent import ChatMessage
from app.schemas.common import AgentType, AuditStatus, ResourceType, TaskStatus, VideoGenerationStage
from app.schemas.multimodal import (
    DigitalHumanCallbackRequest,
    DigitalHumanChatRequest,
    DigitalHumanChatResult,
    DigitalHumanExplainRequest,
    DigitalHumanExplainResult,
    MultimodalStreamEvent,
    MultimodalTaskEvent,
    MultimodalTaskResult,
    MultimodalVideoGenerateRequest,
)
from app.schemas.resource import GeneratedResource, ResourceGenerateResult, RetrievedDocument, VideoGenerateOptions
from app.services.audit_service import AuditService
from app.services.providers.iflytek import (
    IflytekChatRequest,
    IflytekDigitalHumanProvider,
    IflytekDigitalHumanRequest,
    IflytekSparkProvider,
    IflytekTtsProvider,
)
from app.services.resource_service import ResourceService


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


class MultimodalRepository:
    def __init__(self) -> None:
        self._tasks: dict[str, MultimodalTaskResult] = {}
        self._events: dict[str, list[MultimodalTaskEvent]] = {}
        self._sessions: dict[str, dict[str, Any]] = {}
        self._messages: dict[str, list[ChatMessage]] = {}
        self._task_counter = 0
        self._message_counter = 0

    def next_task_id(self, prefix: str = "multimodal_task") -> str:
        self._task_counter += 1
        if settings.enable_mock:
            return f"{prefix}_mock_{self._task_counter:03d}"
        return f"{prefix}_{uuid4().hex[:12]}"

    def next_message_id(self) -> str:
        self._message_counter += 1
        return f"digital_human_message_mock_{self._message_counter:03d}" if settings.enable_mock else f"digital_human_message_{uuid4().hex[:12]}"

    def save_task(self, task: MultimodalTaskResult) -> MultimodalTaskResult:
        self._tasks[task.task_id] = task.model_copy(deep=True)
        return task.model_copy(deep=True)

    def get_task(self, task_id: str) -> MultimodalTaskResult:
        task = self._tasks.get(task_id)
        if task is not None:
            return task.model_copy(deep=True)
        timestamp = DEMO_TIME if settings.enable_mock else now_iso()
        return self.save_task(
            MultimodalTaskResult(
                task_id=task_id,
                status=TaskStatus.pending,
                progress=0,
                current_step="queued",
                created_at=timestamp,
                updated_at=timestamp,
            )
        )

    def update_task(self, task_id: str, **updates: Any) -> MultimodalTaskResult:
        task = self.get_task(task_id)
        normalized = {key: value for key, value in updates.items() if value is not None}
        normalized["updated_at"] = DEMO_TIME if settings.enable_mock else now_iso()
        if "progress" in normalized:
            normalized["progress"] = max(0, min(100, float(normalized["progress"])))
        return self.save_task(task.model_copy(update=normalized))

    def add_event(
        self,
        task_id: str,
        *,
        event_type: str,
        step_name: str,
        progress: float,
        message: str,
        payload: dict[str, Any] | None = None,
    ) -> MultimodalTaskEvent:
        event = MultimodalTaskEvent(
            task_id=task_id,
            event_type=event_type,
            step_name=step_name,
            progress=max(0, min(100, progress)),
            message=message,
            payload=payload,
            created_at=DEMO_TIME if settings.enable_mock else now_iso(),
        )
        self._events.setdefault(task_id, []).append(event.model_copy(deep=True))
        return event

    def list_events(self, task_id: str) -> list[MultimodalTaskEvent]:
        return [event.model_copy(deep=True) for event in self._events.get(task_id, [])]

    def ensure_session(self, session_id: str | None, *, user_id: str, course_id: str | None, node_id: str | None) -> str:
        actual_id = session_id or (f"digital_human_session_mock_{len(self._sessions) + 1:03d}" if settings.enable_mock else f"digital_human_session_{uuid4().hex[:12]}")
        self._sessions.setdefault(
            actual_id,
            {
                "id": actual_id,
                "userId": user_id,
                "courseId": course_id,
                "nodeId": node_id,
                "sessionType": "digital_human",
            },
        )
        return actual_id

    def add_message(self, message: ChatMessage) -> ChatMessage:
        self._messages.setdefault(message.session_id, []).append(message.model_copy(deep=True))
        return message.model_copy(deep=True)

    def list_messages(self, session_id: str) -> list[ChatMessage]:
        return [message.model_copy(deep=True) for message in self._messages.get(session_id, [])]


class MultimodalService:
    def __init__(
        self,
        repository: MultimodalRepository | None = None,
        resource_service: ResourceService | None = None,
        profile_repository: ProfileRepository | None = None,
        learning_path_repository: LearningPathRepository | None = None,
        audit_service: AuditService | None = None,
        spark_provider: IflytekSparkProvider | None = None,
        tts_provider: IflytekTtsProvider | None = None,
        digital_human_provider: IflytekDigitalHumanProvider | None = None,
    ) -> None:
        self.repository = repository or default_multimodal_repository
        self.resource_service = resource_service or ResourceService()
        self.profile_repository = profile_repository or default_profile_repository
        self.learning_path_repository = learning_path_repository or default_learning_path_repository
        self.audit_service = audit_service or AuditService()
        self.spark_provider = spark_provider or IflytekSparkProvider()
        self.tts_provider = tts_provider or IflytekTtsProvider()
        self.digital_human_provider = digital_human_provider or IflytekDigitalHumanProvider()

    def create_video_task(self, payload: MultimodalVideoGenerateRequest, task_id: str | None = None) -> MultimodalTaskResult:
        timestamp = DEMO_TIME if settings.enable_mock else now_iso()
        actual_task_id = task_id or self.repository.next_task_id("multimodal_video_task")
        task = MultimodalTaskResult(
            task_id=actual_task_id,
            status=TaskStatus.running,
            progress=0,
            current_step="queued",
            created_at=timestamp,
            updated_at=timestamp,
        )
        self.repository.save_task(task)
        self.repository.add_event(actual_task_id, event_type="start", step_name="queued", progress=0, message="任务已创建")
        return task

    async def run_video_task(self, task_id: str, payload: MultimodalVideoGenerateRequest) -> MultimodalTaskResult:
        try:
            return await self._complete_video_task(task_id, payload, resource_type=ResourceType.knowledge_video)
        except Exception as exc:
            return self._fail_task(task_id, str(exc) or exc.__class__.__name__)

    async def explain(self, payload: DigitalHumanExplainRequest) -> DigitalHumanExplainResult:
        request = MultimodalVideoGenerateRequest(
            user_id=payload.user_id,
            course_id=payload.course_id,
            node_id=payload.node_id,
            title="数字人讲解",
            learning_goal=payload.custom_requirement or "用数字人口播讲清当前知识点",
            use_digital_human=True,
            use_rag=payload.use_rag,
            custom_requirement=payload.custom_requirement,
        )
        task = self.create_video_task(request, task_id=self.repository.next_task_id("digital_human_task"))
        task = await self._complete_video_task(
            task.task_id,
            request,
            resource_type=ResourceType.digital_human_video,
            avatar_id=payload.avatar_id,
            voice_id=payload.voice_id,
        )
        return DigitalHumanExplainResult(
            task_id=task.task_id,
            status=task.status,
            resource_id=task.resource_id,
            video_url=task.video_url,
            script=task.script,
            progress=task.progress,
        )

    def get_task(self, task_id: str) -> MultimodalTaskResult:
        return self.repository.get_task(task_id)

    def list_task_events(self, task_id: str) -> list[MultimodalTaskEvent]:
        return self.repository.list_events(task_id)

    def get_stream_event(self, task_id: str) -> MultimodalStreamEvent:
        events = self.repository.list_events(task_id)
        if events:
            event = events[-1]
            return MultimodalStreamEvent(
                task_id=task_id,
                event_type=event.event_type,
                progress=event.progress,
                step_name=event.step_name,
                message=event.message,
                error_message=event.message if event.event_type == "error" else None,
            )
        task = self.repository.get_task(task_id)
        event_type = "done" if task.status == TaskStatus.success else "error" if task.status == TaskStatus.failed else "progress"
        return MultimodalStreamEvent(
            task_id=task_id,
            event_type=event_type,
            progress=task.progress,
            step_name=task.current_step,
            message=task.error_message,
            error_message=task.error_message,
        )

    async def chat(self, payload: DigitalHumanChatRequest) -> DigitalHumanChatResult:
        profile = self.profile_repository.get_by_user_id(payload.user_id)
        course_id = payload.course_id or profile.current_course_id or DEMO_COURSE_ID
        documents = self._load_documents(course_id, payload.node_id, payload.message, payload.use_rag)
        session_id = self.repository.ensure_session(
            payload.session_id,
            user_id=payload.user_id,
            course_id=course_id,
            node_id=payload.node_id,
        )
        timestamp = DEMO_TIME if settings.enable_mock else now_iso()
        self.repository.add_message(
            ChatMessage(
                id=self.repository.next_message_id(),
                session_id=session_id,
                user_id=payload.user_id,
                role="user",
                content=payload.message,
                content_type="text",
                agent_type=AgentType.digital_human_agent,
                created_at=timestamp,
            )
        )
        spark_result = await self.spark_provider.chat(
            IflytekChatRequest(
                user_id=payload.user_id,
                course_id=course_id,
                node_id=payload.node_id,
                message=payload.message,
                profile_summary=profile.profile_summary if payload.use_profile else None,
                documents=documents,
                avatar_id=payload.avatar_id,
                voice_id=payload.voice_id,
            )
        )
        audit = await self.audit_service.check_content(
            content=spark_result.text or "",
            target_type="answer",
            target_id=spark_result.provider_task_id or session_id,
        )
        if audit.audit_status != AuditStatus.passed:
            answer = audit.reason or "回答未通过安全校验"
            status = TaskStatus.failed
            audio_url = None
            video_url = None
            provider_task_id = spark_result.provider_task_id
        else:
            answer = spark_result.text or ""
            status = TaskStatus.success
            tts_result = await self.tts_provider.synthesize(answer, user_id=payload.user_id, voice_id=payload.voice_id)
            video_result = await self.digital_human_provider.create_explanation(
                IflytekDigitalHumanRequest(
                    user_id=payload.user_id,
                    course_id=course_id,
                    node_id=payload.node_id,
                    title="数字人对话回答",
                    script=answer,
                    avatar_id=payload.avatar_id,
                    voice_id=payload.voice_id,
                    callback_url=settings.iflytek_digital_human_callback_url,
                )
            )
            audio_url = tts_result.audio_url
            video_url = video_result.video_url
            provider_task_id = video_result.provider_task_id or spark_result.provider_task_id
        message_id = self.repository.next_message_id()
        self.repository.add_message(
            ChatMessage(
                id=message_id,
                session_id=session_id,
                user_id=payload.user_id,
                role="assistant",
                content=answer,
                content_type="text",
                agent_type=AgentType.digital_human_agent,
                audio_url=audio_url,
                video_url=video_url,
                provider_task_id=provider_task_id,
                used_documents=documents or None,
                created_at=timestamp,
            )
        )
        return DigitalHumanChatResult(
            session_id=session_id,
            message_id=message_id,
            answer=answer,
            audio_url=audio_url,
            video_url=video_url,
            provider_task_id=provider_task_id,
            used_documents=documents or None,
            status=status,
        )

    def list_digital_human_messages(self, session_id: str) -> list[ChatMessage]:
        return self.repository.list_messages(session_id)

    def apply_callback(self, payload: DigitalHumanCallbackRequest) -> MultimodalTaskResult:
        if settings.iflytek_callback_token and payload.token != settings.iflytek_callback_token:
            raise ValueError("invalid iflytek callback token")
        task = self.repository.update_task(
            payload.task_id,
            status=payload.status,
            progress=100 if payload.status in {TaskStatus.success, TaskStatus.failed} else None,
            current_step="callback",
            file_url=payload.file_url,
            video_url=payload.video_url,
            error_message=payload.error_message,
        )
        event_type = "done" if payload.status == TaskStatus.success else "error" if payload.status == TaskStatus.failed else "progress"
        self.repository.add_event(
            payload.task_id,
            event_type=event_type,
            step_name="callback",
            progress=task.progress,
            message=payload.error_message or "讯飞回调已处理",
            payload=payload.payload,
        )
        return task

    async def run_resource_bridge(
        self,
        task_id: str,
        *,
        user_id: str,
        course_id: str,
        node_id: str | None,
        resource_type: ResourceType,
        learning_goal: str | None = None,
        custom_requirement: str | None = None,
    ) -> ResourceGenerateResult:
        if resource_type == ResourceType.digital_human_video:
            result = await self.explain(
                DigitalHumanExplainRequest(
                    user_id=user_id,
                    course_id=course_id,
                    node_id=node_id or "",
                    use_rag=True,
                    custom_requirement=custom_requirement or learning_goal,
                )
            )
            task = self.get_task(result.task_id)
        else:
            payload = MultimodalVideoGenerateRequest(
                user_id=user_id,
                course_id=course_id,
                node_id=node_id or "",
                learning_goal=learning_goal,
                use_rag=True,
                custom_requirement=custom_requirement,
            )
            self.create_video_task(payload, task_id=task_id)
            task = await self.run_video_task(task_id, payload)
        stage = VideoGenerationStage.done if task.status == TaskStatus.success else VideoGenerationStage.error
        return ResourceGenerateResult(
            task_id=task_id,
            resource_ids=[task.resource_id] if task.resource_id else [],
            status=task.status,
            progress=task.progress,
            current_stage=stage,
            error_message=task.error_message,
        )

    async def _complete_video_task(
        self,
        task_id: str,
        payload: MultimodalVideoGenerateRequest,
        *,
        resource_type: ResourceType,
        avatar_id: str | None = None,
        voice_id: str | None = None,
    ) -> MultimodalTaskResult:
        node = self.learning_path_repository.get_node(payload.node_id) if payload.node_id else None
        node_name = node.name if node else payload.node_id or "当前知识点"
        profile = self.profile_repository.get_by_user_id(payload.user_id)
        documents = self._load_documents(payload.course_id, payload.node_id, payload.custom_requirement or node_name, payload.use_rag)

        self._step(task_id, "load_context", 10, "已读取知识点、学生画像和参考材料")
        teaching_plan = f"面向{profile.profile_summary or '当前学习者'}，用分步骤方式讲解{node_name}。"
        self._step(task_id, "generate_teaching_plan", 20, "已生成教学目标和讲解结构")
        script = self._build_script(node_name, payload.learning_goal or teaching_plan, documents, profile.profile_summary)
        self._step(task_id, "generate_script", 35, "已生成结构化讲解脚本", {"script": script})
        storyboard = self._build_storyboard(node_name, script, payload.duration_seconds)
        self._step(task_id, "generate_storyboard", 50, "已生成分镜结构", {"storyboard": storyboard})
        self._step(task_id, "validate_script", 60, "脚本与分镜已通过基础校验")
        subtitle_text = "\n".join(item["narration"] for item in storyboard)
        content_payload = {
            "title": payload.title or f"{node_name}教学视频",
            "script": script,
            "storyboard": storyboard,
            "narrationText": subtitle_text,
            "subtitleText": subtitle_text,
            "provider": "iflytek" if resource_type == ResourceType.digital_human_video else "nodelearn-video-workflow",
            "mock": self._is_mock_provider(),
        }
        audit = await self.audit_service.check_content(
            content=json.dumps(content_payload, ensure_ascii=False),
            target_type="resource",
            target_id=task_id,
        )
        if audit.audit_status != AuditStatus.passed:
            raise RuntimeError(audit.reason or "multimodal content audit failed")
        if resource_type == ResourceType.digital_human_video:
            provider_result = await self.digital_human_provider.create_explanation(
                IflytekDigitalHumanRequest(
                    user_id=payload.user_id,
                    course_id=payload.course_id,
                    node_id=payload.node_id,
                    title=payload.title or f"{node_name}数字人讲解",
                    script=script,
                    avatar_id=avatar_id or settings.iflytek_digital_human_avatar_id,
                    voice_id=voice_id or settings.iflytek_digital_human_voice_id,
                    callback_url=settings.iflytek_digital_human_callback_url,
                )
            )
            self._step(task_id, "synthesize_audio", 70, "已创建数字人口播任务", {"providerTaskId": provider_result.provider_task_id})
            video_url = provider_result.video_url
        else:
            self._step(task_id, "synthesize_audio", 70, "mock 模式已生成字幕和脚本；真实模式复用 Remotion 链路")
            self._step(task_id, "render_video", 82, "已生成教学视频任务结果")
            video_url = f"{settings.file_storage_public_base_url.rstrip('/')}/mock/knowledge-video.mp4"
        content_payload["videoUrl"] = video_url
        content_payload["fileUrl"] = video_url
        resource = self._save_resource(
            payload=payload,
            resource_type=resource_type,
            title=payload.title or (f"{node_name}数字人讲解" if resource_type == ResourceType.digital_human_video else f"{node_name}知识点教学视频"),
            content=json.dumps(content_payload, ensure_ascii=False),
            file_url=video_url,
            audit_status=AuditStatus.passed,
            status=TaskStatus.success,
        )
        self._step(task_id, "audit_resource", 90, "资源已通过安全校验")
        self._step(task_id, "persist_resource", 96, "资源已保存", {"resourceId": resource.id})
        task = self.repository.update_task(
            task_id,
            status=TaskStatus.success,
            progress=100,
            current_step="done",
            resource_id=resource.id,
            file_url=video_url,
            video_url=video_url,
            script=script,
            storyboard=storyboard,
            subtitle_text=subtitle_text,
        )
        self.repository.add_event(task_id, event_type="done", step_name="done", progress=100, message="任务完成")
        return task

    def _step(self, task_id: str, step_name: str, progress: float, message: str, payload: dict[str, Any] | None = None) -> None:
        self.repository.update_task(task_id, status=TaskStatus.running, progress=progress, current_step=step_name)
        self.repository.add_event(task_id, event_type="step", step_name=step_name, progress=progress, message=message, payload=payload)

    def _fail_task(self, task_id: str, message: str) -> MultimodalTaskResult:
        task = self.repository.update_task(task_id, status=TaskStatus.failed, progress=100, current_step="error", error_message=message)
        self.repository.add_event(task_id, event_type="error", step_name="error", progress=100, message=message)
        return task

    def _load_documents(self, course_id: str, node_id: str | None, query: str, use_rag: bool) -> list[RetrievedDocument]:
        if not use_rag:
            return []
        if settings.enable_mock:
            return [
                RetrievedDocument(
                    id="doc_multimodal_mock_001",
                    source_id="mock",
                    title="数据结构课程参考材料",
                    content=f"围绕 {node_id or query} 的课程材料片段，用于生成讲解和回答。",
                    score=1.0,
                )
            ]
        return self.resource_service.search_knowledge_base(course_id=course_id, query_text=query, node_id=node_id, top_k=3)

    def _build_script(self, node_name: str, learning_goal: str, documents: list[RetrievedDocument], profile_summary: str | None) -> str:
        source = "；".join(document.title for document in documents[:3]) or "课程默认材料"
        profile = profile_summary or "暂无画像摘要"
        return (
            f"标题：{node_name}教学讲解\n"
            f"学习目标：{learning_goal}\n"
            f"学生画像：{profile}\n"
            f"参考材料：{source}\n"
            "讲解脚本：先用一句话解释定义，再拆解关键步骤，随后给出常见误区和一个检查问题。"
        )

    def _build_storyboard(self, node_name: str, script: str, duration_seconds: int | None) -> list[dict[str, Any]]:
        total = duration_seconds or 120
        scenes = [
            ("title", "标题导入", f"今天我们用一个学习场景理解{node_name}。"),
            ("concept_card", "核心定义", f"{node_name}的关键是看清对象、规则和状态变化。"),
            ("diagram", "结构关系", f"把{node_name}拆成输入、处理和输出三个部分。"),
            ("example", "例子演示", f"用一个小例子观察{node_name}如何一步步运行。"),
            ("quiz_prompt", "自检问题", f"如果关键步骤出错，{node_name}会出现什么问题？"),
            ("summary", "总结回顾", f"最后复盘{node_name}的定义、流程和易错点。"),
        ]
        per_scene = max(8, int(total / len(scenes)))
        return [
            {
                "sceneIndex": index,
                "durationSeconds": per_scene,
                "narration": narration,
                "visualType": visual_type,
                "visualDescription": title,
                "onScreenText": title,
                "animationHint": "fade_in",
                "scriptExcerpt": script[:120],
            }
            for index, (visual_type, title, narration) in enumerate(scenes, start=1)
        ]

    def _save_resource(
        self,
        *,
        payload: MultimodalVideoGenerateRequest,
        resource_type: ResourceType,
        title: str,
        content: str,
        file_url: str | None,
        status: TaskStatus,
        audit_status: AuditStatus,
    ) -> GeneratedResource:
        resource = GeneratedResource(
            id=self.resource_service.repository.next_resource_id(resource_type.value),
            user_id=payload.user_id,
            course_id=payload.course_id,
            node_id=payload.node_id,
            title=title,
            resource_type=resource_type,
            content=content,
            file_url=file_url,
            prompt=payload.custom_requirement,
            model_name="iflytek-mock" if self._is_mock_provider() else "iflytek",
            status=status,
            audit_status=audit_status,
            created_at=DEMO_TIME if settings.enable_mock else now_iso(),
            updated_at=DEMO_TIME if settings.enable_mock else now_iso(),
        )
        return self.resource_service._save_generated_resource(resource)

    def _is_mock_provider(self) -> bool:
        return settings.enable_mock or settings.iflytek_enable_mock or not settings.iflytek_api_key


default_multimodal_repository = MultimodalRepository()
default_multimodal_service = MultimodalService(default_multimodal_repository)
