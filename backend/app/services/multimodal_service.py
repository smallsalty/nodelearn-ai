from __future__ import annotations

import json
import re
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
    DigitalHumanLiveSessionResult,
    MultimodalStreamEvent,
    MultimodalTaskEvent,
    MultimodalTaskResult,
    MultimodalVideoGenerateRequest,
)
from app.schemas.resource import GeneratedResource, ResourceGenerateResult, RetrievedDocument, VideoGenerateOptions
from app.services.audit_service import AuditService
from app.services.digital_human_live_service import DigitalHumanLiveService
from app.services.providers.iflytek import (
    IflytekChatRequest,
    IflytekDigitalHumanProvider,
    IflytekDigitalHumanRequest,
    IflytekInterfaceServiceChatProvider,
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
        if session_id is not None and re.fullmatch(r"[A-Za-z0-9_-]{1,128}", session_id) is None:
            raise RuntimeError("invalid digital human chat session id")
        actual_id = session_id or (f"digital_human_session_mock_{len(self._sessions) + 1:03d}" if settings.enable_mock else f"digital_human_session_{uuid4().hex[:12]}")
        existing = self._sessions.get(actual_id)
        if existing is not None and existing.get("userId") != user_id:
            raise RuntimeError("digital human chat session belongs to another user")
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
        interface_chat_provider: IflytekInterfaceServiceChatProvider | None = None,
        tts_provider: IflytekTtsProvider | None = None,
        digital_human_provider: IflytekDigitalHumanProvider | None = None,
        live_service: DigitalHumanLiveService | None = None,
    ) -> None:
        self.repository = repository or default_multimodal_repository
        self.resource_service = resource_service or ResourceService()
        self.profile_repository = profile_repository or default_profile_repository
        self.learning_path_repository = learning_path_repository or default_learning_path_repository
        self.audit_service = audit_service or AuditService()
        self.interface_chat_provider = interface_chat_provider or IflytekInterfaceServiceChatProvider()
        self.tts_provider = tts_provider or IflytekTtsProvider()
        self.digital_human_provider = digital_human_provider or IflytekDigitalHumanProvider()
        self.live_service = live_service or DigitalHumanLiveService(self.digital_human_provider)

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
        chat_result = await self.interface_chat_provider.chat(
            IflytekChatRequest(
                user_id=payload.user_id,
                session_id=session_id,
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
            content=chat_result.text or "",
            target_type="answer",
            target_id=chat_result.provider_task_id or session_id,
        )
        if audit.audit_status != AuditStatus.passed:
            answer = audit.reason or "回答未通过安全校验"
            status = TaskStatus.failed
            audio_url = None
            video_url = None
            provider_task_id = chat_result.provider_task_id
            live_session = None
        else:
            answer = chat_result.text or ""
            status = TaskStatus.success
            live_session = await self.live_service.speak(
                session_id,
                user_id=payload.user_id,
                text=answer,
                avatar_id=payload.avatar_id or settings.iflytek_digital_human_avatar_id,
                voice_id=payload.voice_id or settings.iflytek_digital_human_voice_id,
            )
            audio_url = None
            video_url = live_session.video_url
            provider_task_id = chat_result.provider_task_id
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
            live_session=live_session,
        )

    def list_digital_human_messages(self, session_id: str) -> list[ChatMessage]:
        return self.repository.list_messages(session_id)

    async def get_digital_human_live_session(self, session_id: str) -> DigitalHumanLiveSessionResult:
        return await self.live_service.get_session(session_id)

    async def stop_digital_human_live_session(self, session_id: str) -> DigitalHumanLiveSessionResult:
        return await self.live_service.stop_session(session_id)

    async def shutdown(self) -> None:
        await self.live_service.shutdown()

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

        video_options = VideoGenerateOptions(theme=payload.theme)

        def progress(stage: VideoGenerationStage, value: float, error_message: str | None) -> None:
            step_names = {
                VideoGenerationStage.script: "generate_script",
                VideoGenerationStage.storyboard: "generate_storyboard",
                VideoGenerationStage.quality_audit: "audit_storyboard",
                VideoGenerationStage.tts: "synthesize_audio",
                VideoGenerationStage.render: "render_video",
                VideoGenerationStage.audit: "audit_resource",
                VideoGenerationStage.error: "error",
            }
            step_name = step_names.get(stage, stage.value)
            message = error_message or f"视频任务正在执行：{step_name}"
            self._step(task_id, step_name, min(96, value), message)

        teaching_plan = payload.learning_goal or f"面向{profile.profile_summary or '当前学习者'}讲清{node_name}。"
        detail_messages = {
            "context_building": "正在读取节点、完整画像、真实错因、练习和 RAG",
            "teaching_strategy": "正在生成确定性个性化教学策略",
            "narrative_planning": "正在规划教学叙事顺序",
            "storyboard_generation": "正在生成严格 Scene DSL",
            "storyboard_validation": "正在校验演员、动作、引用和安全约束",
            "scene_template_resolution": "正在解析场景模板、槽位与连续对象",
            "tts_generation": "正在逐场景合成讲解音频",
            "audio_duration_analysis": "正在读取逐场景真实音频时长",
            "animation_timing_resolution": "正在把动作比例解析为确定帧",
            "remotion_rendering": "正在使用 Remotion 渲染视频",
            "video_validation": "正在验证媒体参数并执行最终审核",
            "persistence": "正在发布通过审核的视频资源",
        }

        def detail(step_name: str, value: float) -> None:
            self._step(task_id, step_name, min(96, value), detail_messages[step_name])
        if resource_type == ResourceType.digital_human_video:
            lesson = await self.resource_service.video_generation_service.prepare_lesson(
                target_id=task_id,
                user_id=payload.user_id,
                course_id=payload.course_id,
                node=node,
                target_goal=teaching_plan,
                documents=documents,
                video_options=video_options,
                learner_profile_summary=profile.profile_summary,
                target_duration_seconds=payload.duration_seconds,
                run_safety_audit=False,
                profile=profile,
                practice_records=self.resource_service.practice_repository.list_records_by_user_id(payload.user_id),
                available_nodes=self.learning_path_repository.list_nodes(payload.course_id),
                custom_requirement=payload.custom_requirement,
                detail_callback=detail,
                progress_callback=progress,
            )
            lesson_audit = await self.audit_service.check_content(
                content=json.dumps(lesson.model_dump(by_alias=True, mode="json"), ensure_ascii=False),
                target_type="resource",
                target_id=task_id,
            )
            if lesson_audit.audit_status != AuditStatus.passed:
                raise RuntimeError(lesson_audit.reason or "digital human lesson audit failed")
            script = "\n".join(beat.narration for scene in lesson.scenes for beat in scene.beats)
            storyboard = [scene.model_dump(by_alias=True, mode="json") for scene in lesson.scenes]
            subtitle_text = script
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
            content_payload = {
                "lesson": lesson.model_dump(by_alias=True, mode="json"),
                "script": script,
                "storyboard": storyboard,
                "subtitleText": subtitle_text,
                "provider": "iflytek",
            }
        else:
            lesson = await self.resource_service.video_generation_service.generate(
                task_id=task_id,
                target_id=task_id,
                user_id=payload.user_id,
                course_id=payload.course_id,
                node=node,
                target_goal=teaching_plan,
                documents=documents,
                video_options=video_options,
                learner_profile_summary=profile.profile_summary,
                target_duration_seconds=payload.duration_seconds,
                profile=profile,
                practice_records=self.resource_service.practice_repository.list_records_by_user_id(payload.user_id),
                available_nodes=self.learning_path_repository.list_nodes(payload.course_id),
                custom_requirement=payload.custom_requirement,
                detail_callback=detail,
                progress_callback=progress,
            )
            video_url = lesson.output.video_url
            script = "\n".join(beat.narration for scene in lesson.scenes for beat in scene.beats)
            storyboard = [scene.model_dump(by_alias=True, mode="json") for scene in lesson.scenes]
            subtitle_text = script
            content_payload = lesson.model_dump(by_alias=True, mode="json")
        if not video_url:
            raise RuntimeError("video provider did not return a playable video URL")
        if resource_type == ResourceType.digital_human_video:
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
