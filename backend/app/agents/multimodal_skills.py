from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from collections.abc import Callable
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

import httpx

from app.core.config import settings
from app.schemas.common import AuditStatus, VideoAspect, VideoGenerationStage, VideoQualityPreset, VideoTheme
from app.schemas.course import KnowledgeNode
from app.schemas.practice import PracticeRecord
from app.schemas.profile import StudentProfile
from app.schemas.report import AuditResult
from app.schemas.resource import RetrievedDocument, VideoGenerateOptions
from app.schemas.video import AnimationScriptContent, VideoLessonOutput, VideoLessonScene
from app.services.llm_service import LLMService
from app.services.video_pipeline.artifacts import DebugArtifactStore
from app.services.video_pipeline.context import VideoContextBuilder
from app.services.video_pipeline.media import MediaValidator, render_dimensions
from app.services.video_pipeline.models import (
    ResolvedScenePlan,
    SceneAudio,
    TeachingStrategy,
    ValidatedStoryboard,
    VideoGenerationContext,
    VideoNarrative,
)
from app.services.video_pipeline.planning import NarrativePlanner, StoryboardPlanner, TeachingStrategyPlanner
from app.services.video_pipeline.projection import build_render_manifest, project_public_v2
from app.services.video_pipeline.registry import SceneTemplateRegistry
from app.services.video_pipeline.timeline import resolve_timeline, validate_target_duration

logger = logging.getLogger(__name__)


def _documents_text(documents: list[RetrievedDocument]) -> str:
    return "\n".join(f"- {item.title}: {item.content[:600]}" for item in documents[:3])


def _json_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _storage_url(relative_path: Path) -> str:
    suffix = relative_path.as_posix().lstrip("/")
    return f"{settings.file_storage_public_base_url.rstrip('/')}/{suffix}"


def _command_path(command: str) -> str | None:
    path = Path(command)
    if path.is_file():
        return str(path)
    return shutil.which(command)


SCENE_SEQUENCE = ["hook", "definition", "analogy", "mechanism", "comparison", "process", "example", "summary"]


def _domain_objects(node_name: str) -> list[str]:
    if "哈希" in node_name or "hash" in node_name.lower():
        return ["key", "hash 函数", "桶数组", "冲突链"]
    if "链表" in node_name:
        return ["节点", "next 指针", "头节点", "尾节点"]
    if "栈" in node_name:
        return ["栈顶", "栈底", "入栈元素", "出栈元素"]
    if "队列" in node_name:
        return ["队头", "队尾", "入队元素", "出队元素"]
    if "树" in node_name:
        return ["根节点", "子节点", "边", "路径"]
    return ["输入数据", "中间状态", "操作规则", "输出结果"]


def _component_hints(scene_type: str, node_name: str) -> list[str]:
    if "哈希" in node_name or "hash" in node_name.lower():
        if scene_type in {"definition", "mechanism", "process", "example"}:
            return ["HashFunctionPanel", "HashTableBuckets", "CodeTracePanel"]
        if scene_type == "comparison":
            return ["ComplexityCompareChart", "HashTableBuckets"]
        return ["HashTableBuckets", "CollisionChain"]
    if "链表" in node_name:
        return ["LinkedListNodes", "PointerArrow", "CodeTracePanel"]
    if "栈" in node_name:
        return ["StackBlocks", "OperationStepPanel", "CodeTracePanel"]
    if "队列" in node_name:
        return ["QueueLine", "OperationStepPanel", "CodeTracePanel"]
    if "树" in node_name:
        return ["TreeNodeGraph", "PointerArrow", "CodeTracePanel"]
    return ["ArrayCells", "OperationStepPanel", "CodeTracePanel"]


def _animation_steps(scene_type: str, node_name: str) -> list[dict[str, Any]]:
    objects = _domain_objects(node_name)
    return [
        {
            "startState": f"{objects[0]}尚未进入演示区",
            "endState": f"{objects[0]}被高亮并进入第一步",
            "visualAction": "高亮核心对象并显示输入箭头",
            "narrationSentence": f"先观察{node_name}处理输入时的第一个对象。",
            "durationSeconds": 3,
        },
        {
            "startState": f"{objects[1]}尚未触发",
            "endState": f"{objects[1]}驱动状态变化",
            "visualAction": "用箭头展示规则如何改变结构状态",
            "narrationSentence": f"关键规则会把输入转换成可操作的中间状态。",
            "durationSeconds": 4,
        },
        {
            "startState": f"{objects[2]}尚未更新",
            "endState": f"{objects[2]}完成更新并显示结果",
            "visualAction": "展示更新后的结构和结果标签",
            "narrationSentence": f"最后把变化落到具体结构上，避免只记结论。",
            "durationSeconds": 4,
        },
    ]


def _state_changes(scene_type: str, node_name: str) -> list[str]:
    objects = _domain_objects(node_name)
    return [
        f"{objects[0]}进入当前场景",
        f"{objects[1]}触发操作规则",
        f"{objects[2]}更新为新状态",
    ]


def _misconception_fix(scene_type: str, node_name: str) -> str:
    if "哈希" in node_name or "hash" in node_name.lower():
        return "哈希表不是按 key 的原始顺序存放；冲突也不是错误，而是需要冲突处理策略。"
    if "链表" in node_name:
        return "链表的插入删除不是只改数据值，关键在于正确更新 next 指针。"
    if "栈" in node_name:
        return "栈只能从栈顶操作，不能把中间元素当作普通数组随意访问。"
    if "队列" in node_name:
        return "队列的出队发生在队头，入队发生在队尾，不能混淆两端职责。"
    return f"不要只背{node_name}的定义，要把对象、规则和状态变化连起来理解。"


@dataclass(slots=True)
class SynthesizedAudio:
    path: Path
    url: str
    duration_seconds: float


@dataclass(slots=True)
class RenderedVideo:
    path: Path
    url: str


class VideoAuditError(RuntimeError):
    def __init__(self, audit_status: AuditStatus) -> None:
        self.audit_status = audit_status
        super().__init__(f"video audit rejected output: {audit_status}")


class VideoScriptSkill:
    def __init__(self, llm_service: LLMService | None = None) -> None:
        self.llm_service = llm_service or LLMService()

    async def generate(
        self,
        node: KnowledgeNode | None,
        target_goal: str,
        documents: list[RetrievedDocument],
    ) -> dict[str, Any]:
        node_name = node.name if node else "当前知识点"
        mock_data = {
            "title": f"什么是{node_name}",
            "scenes": [
                {
                    "sceneType": "hook",
                    "title": f"为什么要理解{node_name}？",
                    "narration": f"遇到复杂问题时，{node_name}为什么值得我们关注？先从一个直观问题开始。",
                    "durationSeconds": 12,
                },
                {
                    "sceneType": "definition",
                    "title": "核心定义",
                    "narration": f"{node_name}有清晰的核心定义。抓住几个关键词，就能快速建立整体认识。",
                    "durationSeconds": 16,
                },
                {
                    "sceneType": "analogy",
                    "title": "生活类比",
                    "narration": f"把{node_name}放进熟悉的生活场景里，可以更容易理解它解决问题的方式。",
                    "durationSeconds": 16,
                },
                {
                    "sceneType": "mechanism",
                    "title": "内部机制",
                    "narration": f"接下来观察{node_name}内部如何协作，每个环节怎样把输入传递到结果。",
                    "durationSeconds": 18,
                },
                {
                    "sceneType": "comparison",
                    "title": "对比理解",
                    "narration": f"通过左右对比，可以看清{node_name}和相近方案在处理方式上的不同。",
                    "durationSeconds": 16,
                },
                {
                    "sceneType": "process",
                    "title": "步骤流程",
                    "narration": f"把{node_name}拆成几个步骤后，整个运行过程会更加清晰。",
                    "durationSeconds": 16,
                },
                {
                    "sceneType": "example",
                    "title": "具体例子",
                    "narration": f"现在用一个具体输入，看看{node_name}如何逐步得到输出。",
                    "durationSeconds": 16,
                },
                {
                    "sceneType": "summary",
                    "title": "三个要点",
                    "narration": f"最后用三个要点回顾{node_name}，把定义、机制和应用场景连接起来。",
                    "durationSeconds": 14,
                },
            ],
        }
        prompt = (
            "你是 multimodal_agent 的 VideoScriptSkill。"
            "请根据知识点材料生成数据结构课程教学动画脚本，不是泛短视频营销文案。"
            "只返回 JSON 对象，结构为 title 和 scenes；"
            "scenes 必须严格按 hook、definition、analogy、mechanism、comparison、process、example、summary 排列；"
            "每个 scene 必须包含 sceneType、title、narration、durationSeconds、teachingPurpose、"
            "concreteObjects、stateChanges 和 misconceptionFix。"
            "旁白要适合 TTS，每句尽量不超过 25 个中文字，一个句子只讲一个观点；hook 不超过 8 秒。"
            "禁止使用大家好今天、本期视频我们将、颠覆你的认知、希望对你有帮助、感谢观看等模板化口播。"
            "必须引用参考材料中的知识点事实，必须解释为什么，不允许只说结论。"
            "画面设计要围绕具体数据结构对象，例如桶数组、链表节点、栈块、队列、树节点、代码追踪。"
            f"\n知识点：{node_name}\n学习目标：{target_goal}\n参考材料：\n{_documents_text(documents)}"
        )
        return await self.llm_service.generate_json(prompt, mock_data=mock_data)


class StoryboardSkill:
    def __init__(self, llm_service: LLMService | None = None) -> None:
        self.llm_service = llm_service or LLMService()

    async def generate(self, node: KnowledgeNode | None, script: dict[str, Any]) -> dict[str, Any]:
        node_name = node.name if node else "当前知识点"
        script_scenes = script.get("scenes", [])
        narrations = {
            scene.get("sceneType"): scene.get("narration", "")
            for scene in script_scenes
            if isinstance(scene, dict)
        }
        def narration(scene_type: str, fallback: str) -> str:
            return str(narrations.get(scene_type) or fallback)

        mock_scenes = [
            self._scene("scene_001", "hook", f"为什么需要{node_name}？", narration("hook", f"{node_name}解决了什么问题？"), 12, "center_focus", [
                {"type": "text", "content": f"为什么需要{node_name}？", "animation": "pop_in"},
                {"type": "icon", "name": "search", "animation": "float"},
            ]),
            self._scene("scene_002", "definition", "抓住三个关键词", narration("definition", f"用三个关键词理解{node_name}。"), 16, "center_focus", [
                {"type": "keyword", "content": "结构", "animation": "pop_in"},
                {"type": "keyword", "content": "规则", "animation": "pop_in"},
                {"type": "keyword", "content": "效率", "animation": "pop_in"},
            ]),
            self._scene("scene_003", "analogy", "像文件夹一样归类", narration("analogy", f"用熟悉的文件夹类比{node_name}。"), 16, "left_right", [
                {"type": "card", "content": "输入信息", "animation": "slide_in_left"},
                {"type": "arrow", "label": "归类定位", "animation": "draw"},
                {"type": "card", "content": "目标位置", "animation": "slide_in_right"},
            ]),
            self._scene("scene_004", "mechanism", "内部如何协作", narration("mechanism", f"观察{node_name}内部的处理机制。"), 18, "pipeline", [
                {"type": "card", "content": "输入", "animation": "stagger_in"},
                {"type": "arrow", "label": "处理", "animation": "draw"},
                {"type": "circle", "label": "规则", "animation": "zoom_in"},
                {"type": "arrow", "label": "定位", "animation": "draw"},
                {"type": "card", "content": "结果", "animation": "stagger_in"},
            ]),
            self._scene("scene_005", "comparison", "不同方案的差异", narration("comparison", f"对比{node_name}和常规方案。"), 16, "comparison", [
                {"type": "card", "content": "常规方案：逐步查找", "animation": "slide_in_left"},
                {"type": "card", "content": f"{node_name}：快速定位", "animation": "slide_in_right"},
            ]),
            self._scene("scene_006", "process", "四步理解流程", narration("process", f"把{node_name}拆成四个步骤。"), 16, "timeline", [
                {"type": "timeline", "items": ["接收输入", "应用规则", "找到位置", "返回结果"], "animation": "stagger_in"},
            ]),
            self._scene("scene_007", "example", "从输入到输出", narration("example", f"用一个具体例子理解{node_name}。"), 16, "left_right", [
                {"type": "card", "content": "输入：示例 key", "animation": "slide_in_left"},
                {"type": "arrow", "label": "处理", "animation": "draw"},
                {"type": "card", "content": "输出：示例 value", "animation": "slide_in_right"},
            ]),
            self._scene("scene_008", "summary", "三个要点", narration("summary", f"回顾{node_name}的三个要点。"), 14, "summary_cards", [
                {"type": "card", "content": "1. 明确定义", "animation": "stagger_in"},
                {"type": "card", "content": "2. 理解机制", "animation": "stagger_in"},
                {"type": "card", "content": "3. 结合场景", "animation": "stagger_in"},
            ]),
        ]
        mock_data = {
            "title": script.get("title", f"什么是{node_name}"),
            "style": "clean_motion_graphics",
            "durationSeconds": sum(float(item.get("durationSeconds", 0)) for item in mock_scenes),
            "aspectRatio": "16:9",
            "scenes": mock_scenes,
            "output": {"videoUrl": "", "audioUrls": []},
        }
        prompt = (
            "你是 multimodal_agent 的 StoryboardSkill。"
            "请将讲解脚本改写为 clean_motion_graphics 风格的通用知识解释动画 JSON。只返回 JSON 对象。"
            "顶层必须包含 title、style、durationSeconds、aspectRatio、scenes、output。"
            "每个 scene 必须包含 sceneId、sceneType、title、narration、durationSeconds 和 visualIntent。"
            "每个 scene 还必须包含 teachingPurpose、concreteObjects、animationSteps、stateChanges、screenText、"
            "misconceptionFix、componentHints 和 auditChecklist。"
            "每个 scene 至少 3 个 animationSteps；每个 animationStep 必须包含 startState、endState、visualAction、narrationSentence。"
            "scenes 必须严格按 hook、definition、analogy、mechanism、comparison、process、example、summary 排列。"
            "visualIntent 只描述关系类型、具体对象、状态变化和屏幕短句，不得生成 visualPlan 或具体组件字段；"
            "后续 Visual Director 会确定性选择数据结构组件并补齐严格字段。"
            "画面必须有具体数据结构对象和状态变化，禁止纯标题页、纯图标页、纯概念卡。"
            "画面只展示关键词、短句和标签，每屏文字不超过 80 个中文字，不得复制整段 narration。"
            "definition 使用 1-3 个 keyword；summary 使用 3 个 card；imageUrl 只能使用 HTTPS。"
            f"\n知识点：{node_name}\n脚本：{_json_text(script)}"
        )
        return await self.llm_service.generate_json(prompt, mock_data=mock_data)

    def _scene(
        self,
        scene_id: str,
        scene_type: str,
        title: str,
        narration: str,
        duration_seconds: float,
        layout: str,
        elements: list[dict[str, Any]],
    ) -> dict[str, Any]:
        node_name = title.replace("为什么需要", "").replace("？", "") or "当前知识点"
        return {
            "sceneId": scene_id,
            "sceneType": scene_type,
            "title": title,
            "narration": narration,
            "durationSeconds": duration_seconds,
            "teachingPurpose": f"帮助学习者用具体对象理解{title}",
            "concreteObjects": _domain_objects(node_name),
            "animationSteps": _animation_steps(scene_type, node_name),
            "stateChanges": _state_changes(scene_type, node_name),
            "screenText": [title],
            "misconceptionFix": _misconception_fix(scene_type, node_name),
            "componentHints": _component_hints(scene_type, node_name),
            "auditChecklist": ["hasConcreteObjects", "hasStateChanges", "hasAnimationSteps"],
            "visualPlan": {"layout": layout, "elements": elements},
            "audioUrl": "",
        }


class AnimationSpecSkill:
    def normalize(
        self,
        node: KnowledgeNode | None,
        storyboard: dict[str, Any],
        *,
        schema_version: str = "1.0",
        documents: list[RetrievedDocument] | None = None,
        theme: VideoTheme = VideoTheme.warm_academic,
        target_duration_seconds: float | None = None,
        subtitle_enabled: bool = True,
    ) -> AnimationScriptContent:
        if schema_version == "2.0":
            return self._normalize_v2(
                node,
                storyboard,
                documents=documents or [],
                theme=theme,
                target_duration_seconds=target_duration_seconds,
                subtitle_enabled=subtitle_enabled,
            )
        node_name = node.name if node else "当前知识点"
        raw_scenes = storyboard.get("scenes")
        if not isinstance(raw_scenes, list) or not raw_scenes:
            raise RuntimeError("storyboard returned no scenes")
        payload = {
            **storyboard,
            "title": str(storyboard.get("title") or f"什么是{node_name}"),
            "style": "clean_motion_graphics",
            "durationSeconds": sum(float(item.get("durationSeconds") or 0) for item in raw_scenes if isinstance(item, dict)),
            "aspectRatio": "16:9",
            "scenes": [
                self._normalize_scene(item, index, node_name)
                for index, item in enumerate(raw_scenes, start=1)
                if isinstance(item, dict)
            ],
            "output": {"videoUrl": "", "audioUrls": []},
        }
        return AnimationScriptContent.model_validate(payload)

    def _normalize_v2(
        self,
        node: KnowledgeNode | None,
        storyboard: dict[str, Any],
        *,
        documents: list[RetrievedDocument],
        theme: VideoTheme,
        target_duration_seconds: float | None,
        subtitle_enabled: bool,
    ) -> AnimationScriptContent:
        node_name = node.name if node else "当前知识点"
        raw_scenes = storyboard.get("scenes")
        if not isinstance(raw_scenes, list) or not raw_scenes:
            raise RuntimeError("storyboard returned no scenes")
        source_refs = [
            {"id": item.id, "title": item.title, "sourceId": item.source_id}
            for item in documents[:5]
        ]
        if not source_refs and node is not None:
            source_refs = [{"id": node.id, "title": node.name, "sourceId": node.id}]
        source_ids = [item["id"] for item in source_refs]
        scenes = [
            self._normalize_v2_scene(item, index, node_name, source_ids)
            for index, item in enumerate(raw_scenes, start=1)
            if isinstance(item, dict)
        ]
        payload = {
            "schemaVersion": "2.0",
            "title": str(storyboard.get("title") or f"什么是{node_name}"),
            "style": "clean_motion_graphics",
            "theme": theme.value if hasattr(theme, "value") else str(theme),
            "durationSeconds": sum(float(item["durationSeconds"]) for item in scenes),
            "targetDurationSeconds": target_duration_seconds,
            "aspectRatio": "16:9",
            "subtitleEnabled": subtitle_enabled,
            "sources": source_refs,
            "scenes": scenes,
            "output": {"videoUrl": "", "audioUrls": []},
        }
        return AnimationScriptContent.model_validate(payload)

    def _normalize_v2_scene(
        self,
        scene: dict[str, Any],
        index: int,
        node_name: str,
        source_ids: list[str],
    ) -> dict[str, Any]:
        scene_type = str(scene.get("sceneType") or scene.get("scene_type") or SCENE_SEQUENCE[min(index - 1, len(SCENE_SEQUENCE) - 1)])
        title = str(scene.get("title") or f"{node_name}场景 {index}")
        narration = str(scene.get("narration") or f"用具体变化理解{node_name}。")
        chunks = self._narration_chunks(narration)
        if scene_type == "hook":
            chunks = chunks[:2]
        beats = []
        for beat_index, chunk in enumerate(chunks, start=1):
            duration = max(3.0, min(10.0, round(len(chunk) / 4, 1)))
            if scene_type == "hook":
                duration = min(duration, 4.0)
            screen_text = self._screen_text(scene, title, chunk, beat_index, scene_type)
            beats.append(
                {
                    "beatId": f"scene_{index:03d}_beat_{beat_index:02d}",
                    "narration": chunk,
                    "durationSeconds": duration,
                    "screenText": screen_text,
                    "claims": [chunk] if source_ids else [],
                    "sourceIds": source_ids,
                    "visualPlan": self._v2_visual_plan(
                        scene_type,
                        node_name,
                        screen_text,
                        beat_index,
                        narration_context=narration,
                    ),
                    "audioUrl": "",
                }
            )
        return {
            "sceneId": str(scene.get("sceneId") or scene.get("scene_id") or f"scene_{index:03d}"),
            "sceneType": scene_type,
            "title": title,
            "durationSeconds": sum(float(item["durationSeconds"]) for item in beats),
            "teachingPurpose": str(scene.get("teachingPurpose") or f"帮助学习者理解{node_name}的{scene_type}环节"),
            "misconceptionFix": str(scene.get("misconceptionFix") or _misconception_fix(scene_type, node_name)),
            "componentHints": _component_hints(scene_type, node_name),
            "auditChecklist": ["oneIdeaPerBeat", "groundedClaims", "contentDrivenVisual"],
            "beats": beats,
        }

    def _narration_chunks(self, narration: str) -> list[str]:
        chunks = [part.strip() for part in re.split(r"(?<=[。！？!?])", narration) if part.strip()]
        if not chunks:
            return [narration.strip() or "继续观察这个知识点的状态变化。"]
        return chunks[:3]

    def _screen_text(self, scene: dict[str, Any], title: str, narration: str, beat_index: int, scene_type: str) -> list[str]:
        raw = scene.get("screenText")
        candidates = [str(item).strip() for item in raw if str(item).strip()] if isinstance(raw, list) else []
        candidates.extend(self._narration_screen_phrases(narration))
        if not candidates:
            candidates = [title]
        start = min(beat_index - 1, len(candidates) - 1)
        ordered = candidates[start:] + candidates[:start]
        max_items = 2 if scene_type == "hook" else 3
        result = self._compact_screen_text(ordered, max_items=max_items)
        return result or [self._clean_screen_phrase(narration)[:16] or title[:16]]

    def _narration_screen_phrases(self, narration: str) -> list[str]:
        normalized = re.sub(r"\s+", "", narration)
        parts = [part for part in re.split(r"[，,；;。！？!?：:]", normalized) if part]
        phrases = []
        for part in parts:
            part = re.sub(r"^(先|再|然后|接着|观察|通过|我们|可以|如果|当)", "", part)
            part = re.sub(r"(这个|一个|一种)", "", part)
            if len(part) >= 3:
                phrases.append(part)
        return phrases[:4]

    def _compact_screen_text(
        self,
        candidates: list[str],
        max_items: int = 3,
        per_item_limit: int = 16,
        total_limit: int = 40,
    ) -> list[str]:
        result: list[str] = []
        total = 0
        seen: set[str] = set()
        for candidate in candidates:
            phrase = self._clean_screen_phrase(candidate)[:per_item_limit]
            if not phrase or phrase in seen:
                continue
            if total + len(phrase) > total_limit:
                continue
            result.append(phrase)
            seen.add(phrase)
            total += len(phrase)
            if len(result) >= max_items:
                break
        return result

    def _clean_screen_phrase(self, value: str) -> str:
        compact = re.sub(r"\s+", "", str(value))
        compact = compact.strip("。！？!?，,；;：:、 ")
        return compact

    def _v2_visual_plan(
        self,
        scene_type: str,
        node_name: str,
        screen_text: list[str],
        beat_index: int,
        narration_context: str = "",
    ) -> dict[str, Any]:
        label = screen_text[0][:16] if screen_text else "观察状态变化"
        if scene_type == "hook":
            icon_name = "hash" if "哈希" in node_name or "hash" in node_name.lower() else "search"
            focus_label = screen_text[1][:16] if len(screen_text) > 1 else "抓住关键关系"
            elements = [{"type": "icon", "name": icon_name, "animation": "zoom_in"}]
            elements = self._fit_visual_elements(
                elements,
                [{"type": "keyword", "content": focus_label, "animation": "pop_in"}],
            )
            return {
                "layout": "center_focus",
                "elements": elements,
            }
        if scene_type == "summary":
            labels = self._compact_screen_text(
                screen_text + ["定位规则", "平均成本", "冲突处理"],
                max_items=3,
                per_item_limit=12,
            )
            for fallback in ("定位规则", "平均成本", "冲突处理"):
                if len(labels) >= 3:
                    break
                if fallback not in labels:
                    labels.append(fallback)
            return {
                "layout": "summary_cards",
                "elements": [
                    {"type": "card", "content": label[:12], "animation": "stagger_in"}
                    for label in labels
                ],
            }
        domain = self._domain_visual_element(
            scene_type,
            node_name,
            screen_label=screen_text[0] if screen_text else "",
            narration_context=narration_context,
        )
        domain["animation"] = self._scene_animation(scene_type, beat_index)
        support: list[dict[str, Any]] = []
        layout = "grid_focus"
        if scene_type == "definition":
            layout = "left_right"
            support = [{"type": "keyword", "content": label, "animation": "fade_in"}]
        elif scene_type == "analogy":
            layout = "pipeline"
            support = [
                {"type": "arrow", "label": "映射", "animation": "draw"},
                {"type": "keyword", "content": label, "animation": "fade_in"},
            ]
        elif scene_type == "comparison":
            layout = "comparison"
            support = [{"type": "card", "content": label[:12], "animation": "slide_in_right"}]
        elif scene_type == "process":
            layout = "timeline"
            support = [
                {
                    "type": "timeline",
                    "items": self._process_step_labels(node_name, screen_text),
                    "animation": "stagger_in",
                }
            ]
        elif scene_type == "example":
            layout = "left_right" if beat_index % 2 else "grid_focus"
            support = [{"type": "keyword", "content": label, "animation": "fade_in"}]
        else:
            layout = "grid_focus" if beat_index % 2 else "left_right"
            support = [{"type": "keyword", "content": label, "animation": "fade_in"}]
        elements = self._fit_visual_elements([domain], support)
        return {"layout": layout, "elements": elements}

    def _scene_animation(self, scene_type: str, beat_index: int) -> str:
        by_scene = {
            "definition": ["draw", "highlight"],
            "analogy": ["slide_in_left", "draw"],
            "mechanism": ["highlight", "draw"],
            "comparison": ["highlight", "slide_in_right"],
            "process": ["stagger_in", "draw"],
            "example": ["slide_in_right", "highlight"],
        }
        choices = by_scene.get(scene_type, ["draw", "highlight", "slide_in_right"])
        return choices[(beat_index - 1) % len(choices)]

    def _process_step_labels(self, node_name: str, screen_text: list[str]) -> list[str]:
        fallbacks = ["取键", "算桶", "查链"] if "哈希" in node_name or "hash" in node_name.lower() else ["对象", "规则", "变化"]
        return self._compact_screen_text(
            screen_text + fallbacks,
            max_items=3,
            per_item_limit=6,
            total_limit=18,
        ) or fallbacks

    def _fit_visual_elements(self, base: list[dict[str, Any]], optional: list[dict[str, Any]]) -> list[dict[str, Any]]:
        elements = list(base)
        for element in optional:
            visible_text = "".join(self._element_visible_text(item) for item in [*elements, element])
            if len(visible_text) <= 40:
                elements.append(element)
        return elements

    def _element_visible_text(self, element: dict[str, Any]) -> str:
        values = []
        for key in ("content", "name", "label", "keyLabel", "expression", "operation", "address", "value"):
            if element.get(key) is not None:
                values.append(str(element[key]))
        for key in ("items", "nodes", "buckets"):
            if isinstance(element.get(key), list):
                values.extend(str(item) for item in element[key])
        return "".join(values)

    def _normalize_scene(self, scene: dict[str, Any], index: int, node_name: str) -> dict[str, Any]:
        normalized = {**scene, "audioUrl": ""}
        scene_id = normalized.get("sceneId") or normalized.get("scene_id")
        normalized["sceneId"] = scene_id if isinstance(scene_id, str) and scene_id.strip() else f"scene_{index:03d}"
        scene_type = str(normalized.get("sceneType") or normalized.get("scene_type") or SCENE_SEQUENCE[min(index - 1, len(SCENE_SEQUENCE) - 1)])
        normalized["sceneType"] = scene_type
        normalized.setdefault("title", f"{node_name}场景 {index}")
        normalized.setdefault("teachingPurpose", f"用具体对象解释{node_name}的{scene_type}环节")
        normalized["concreteObjects"] = self._string_list(normalized.get("concreteObjects"), _domain_objects(node_name))
        normalized["animationSteps"] = self._normalize_animation_steps(normalized.get("animationSteps"), scene_type, node_name)
        normalized["stateChanges"] = self._string_list(normalized.get("stateChanges"), _state_changes(scene_type, node_name))
        normalized["screenText"] = self._string_list(normalized.get("screenText"), [str(normalized.get("title") or node_name)])
        normalized.setdefault("misconceptionFix", _misconception_fix(scene_type, node_name))
        normalized["componentHints"] = self._string_list(normalized.get("componentHints"), _component_hints(scene_type, node_name))
        normalized["auditChecklist"] = self._string_list(
            normalized.get("auditChecklist"),
            ["hasConcreteObjects", "hasStateChanges", "hasAnimationSteps"],
        )
        visual_plan = scene.get("visualPlan")
        if not isinstance(visual_plan, dict):
            normalized["visualPlan"] = self._default_visual_plan(scene_type, node_name)
            return normalized
        elements = visual_plan.get("elements")
        if not isinstance(elements, list):
            normalized["visualPlan"] = self._default_visual_plan(scene_type, node_name)
            return normalized
        normalized_elements = [
            self._normalize_element(element, str(scene.get("title") or "知识点图解"))
            for element in elements
            if isinstance(element, dict)
        ]
        if not normalized_elements:
            normalized["visualPlan"] = self._default_visual_plan(scene_type, node_name)
            return normalized
        if not any(str(element.get("type")) in self._domain_element_types() for element in normalized_elements):
            normalized_elements.insert(0, self._domain_visual_element(scene_type, node_name))
        normalized["visualPlan"] = {
            **visual_plan,
            "elements": normalized_elements,
        }
        return normalized

    def _normalize_animation_steps(self, value: Any, scene_type: str, node_name: str) -> list[dict[str, Any]]:
        if not isinstance(value, list):
            return _animation_steps(scene_type, node_name)
        steps = []
        for item in value:
            if not isinstance(item, dict):
                continue
            steps.append(
                {
                    "startState": str(item.get("startState") or item.get("start_state") or "开始状态"),
                    "endState": str(item.get("endState") or item.get("end_state") or "结束状态"),
                    "visualAction": str(item.get("visualAction") or item.get("visual_action") or "高亮状态变化"),
                    "narrationSentence": str(item.get("narrationSentence") or item.get("narration_sentence") or item.get("narration") or "解释这一步为什么发生。"),
                    "durationSeconds": item.get("durationSeconds") or item.get("duration_seconds") or 3,
                }
            )
        while len(steps) < 3:
            steps.append(_animation_steps(scene_type, node_name)[len(steps)])
        return steps[:6]

    def _string_list(self, value: Any, fallback: list[str]) -> list[str]:
        if not isinstance(value, list):
            return fallback
        result = [str(item).strip() for item in value if str(item).strip()]
        return result or fallback

    def _domain_element_types(self) -> set[str]:
        return {
            "hash_table_buckets",
            "hash_function_panel",
            "collision_chain",
            "array_cells",
            "linked_list_nodes",
            "stack_blocks",
            "queue_line",
            "tree_node_graph",
            "code_trace_panel",
            "pointer_arrow",
            "memory_box",
            "complexity_chart",
        }

    def _default_visual_plan(self, scene_type: str, node_name: str) -> dict[str, Any]:
        if scene_type == "definition":
            return {
                "layout": "center_focus",
                "elements": [
                    {"type": "keyword", "content": "对象", "animation": "pop_in"},
                    {"type": "keyword", "content": "规则", "animation": "pop_in"},
                    {"type": "keyword", "content": "状态", "animation": "pop_in"},
                ],
            }
        if scene_type == "summary":
            return {
                "layout": "summary_cards",
                "elements": [
                    {"type": "card", "content": "看对象", "animation": "stagger_in"},
                    {"type": "card", "content": "看规则", "animation": "stagger_in"},
                    {"type": "card", "content": "看变化", "animation": "stagger_in"},
                ],
            }
        return {"layout": "grid_focus", "elements": [self._domain_visual_element(scene_type, node_name)]}

    def _domain_visual_element(
        self,
        scene_type: str,
        node_name: str,
        screen_label: str = "",
        narration_context: str = "",
    ) -> dict[str, Any]:
        is_hash_topic = "hash" in node_name.lower() or any(
            marker in node_name for marker in ("\u54c8\u5e0c", "\u6563\u5217")
        )
        if is_hash_topic and scene_type == "comparison":
            return {
                "type": "complexity_chart",
                "label": "\u67e5\u627e\u6210\u672c",
                "items": ["\u6570\u7ec4\u7d22\u5f15 O(1)", "\u94fe\u8868\u67e5\u627e O(n)", "\u54c8\u5e0c\u8868\u5e73\u5747 O(1)"],
                "activeIndex": 2,
                "animation": "highlight",
            }
        if is_hash_topic and scene_type == "mechanism":
            numbers = [int(value) for value in re.findall(r"\d+", narration_context)]
            bucket_index = numbers[-1] if numbers else 2
            input_key = numbers[0] if numbers else "key"
            return {
                "type": "hash_table_buckets",
                "buckets": [str(bucket_index + offset) for offset in (-2, -1, 0, 1)],
                "activeIndex": 2,
                "keyLabel": str(input_key),
                "collisionIndices": [],
                "animation": "highlight",
            }
        if is_hash_topic and scene_type in {"process", "example"}:
            numbers = [int(value) for value in re.findall(r"\d+", f"{screen_label} {narration_context}")]
            bucket_index = (numbers[-1] % 100) if numbers else 2
            node_labels = [str(value) for value in numbers[:3] if value != bucket_index]
            for fallback in ("keyA", "keyB"):
                if len(node_labels) >= 2:
                    break
                node_labels.append(fallback)
            return {
                "type": "collision_chain",
                "bucketIndex": bucket_index,
                "nodes": node_labels[:2],
                "activeNodeIndex": 1,
                "animation": "stagger_in",
            }
        if "哈希" in node_name or "hash" in node_name.lower():
            if scene_type == "definition":
                return {"type": "hash_function_panel", "inputKey": "key", "expression": "hash(key)%m", "outputIndex": 2, "animation": "highlight"}
            if scene_type == "comparison":
                return {"type": "complexity_chart", "label": "查找成本", "items": ["数组 O(n)", "哈希表 O(1)"], "activeIndex": 1, "animation": "highlight"}
            if scene_type == "example":
                return {"type": "collision_chain", "bucketIndex": 2, "nodes": ["keyA", "keyB"], "activeNodeIndex": 1, "animation": "stagger_in"}
            return {"type": "hash_table_buckets", "buckets": ["0", "1", "2", "3"], "activeIndex": 2, "keyLabel": "key", "collisionIndices": [2], "animation": "highlight"}
        if "链表" in node_name:
            return {"type": "linked_list_nodes", "nodes": ["head", "node", "tail"], "activeIndex": 1, "pointerLabel": "next", "animation": "stagger_in"}
        if "栈" in node_name:
            return {"type": "stack_blocks", "items": ["A", "B", "C"], "activeIndex": 2, "operation": "pop", "animation": "stagger_in"}
        if "队列" in node_name:
            return {"type": "queue_line", "items": ["A", "B", "C"], "headIndex": 0, "tailIndex": 2, "operation": "dequeue", "animation": "stagger_in"}
        if "树" in node_name:
            return {"type": "tree_node_graph", "nodes": ["root", "left", "right"], "edges": [["root", "left"], ["root", "right"]], "activePath": ["root", "left"], "animation": "highlight"}
        return {"type": "array_cells", "items": ["0", "1", "2", "3"], "activeIndices": [1], "pointerLabels": {"1": "active"}, "animation": "highlight"}

    def _normalize_element(self, element: dict[str, Any], scene_title: str) -> dict[str, Any]:
        normalized = dict(element)
        if normalized.get("type") in {"text", "keyword", "card", "formula", "code"} and "content" not in normalized:
            for alias in ("title", "text", "label"):
                if normalized.get(alias):
                    normalized["content"] = str(normalized[alias])
                    break
        if normalized.get("type") == "icon" and isinstance(normalized.get("imageUrl"), str):
            normalized = {
                "type": "image",
                "imageUrl": normalized["imageUrl"],
                "alt": str(normalized.get("alt") or scene_title),
                "animation": normalized.get("animation"),
            }
        if normalized.get("type") == "arrow":
            normalized["label"] = str(normalized.get("label") or "")
        if normalized.get("type") == "image":
            normalized["alt"] = str(normalized.get("alt") or scene_title)
            host = urlparse(str(normalized.get("imageUrl") or "")).hostname or ""
            if host in {"example.com", "www.example.com"}:
                normalized = {
                    "type": "icon",
                    "name": "route",
                    "animation": normalized.get("animation"),
                }
        if normalized.get("type") in {"grid", "timeline"} and isinstance(normalized.get("items"), list):
            normalized["items"] = [str(item) for item in normalized["items"]]
        if normalized.get("type") in {"hash_table_buckets", "array_cells", "complexity_chart"} and isinstance(normalized.get("items"), list):
            normalized["items"] = [str(item) for item in normalized["items"]]
        if normalized.get("type") in {"collision_chain", "linked_list_nodes", "tree_node_graph"} and isinstance(normalized.get("nodes"), list):
            normalized["nodes"] = [str(item) for item in normalized["nodes"]]
        if normalized.get("type") == "hash_table_buckets" and isinstance(normalized.get("buckets"), list):
            normalized["buckets"] = [str(item) for item in normalized["buckets"]]
        if normalized.get("type") == "code_trace_panel" and isinstance(normalized.get("codeLines"), list):
            normalized["codeLines"] = [str(item) for item in normalized["codeLines"]]
        return normalized


class QualityAuditSkill:
    _domain_element_types = {
        "hash_table_buckets",
        "hash_function_panel",
        "collision_chain",
        "array_cells",
        "linked_list_nodes",
        "stack_blocks",
        "queue_line",
        "tree_node_graph",
        "code_trace_panel",
        "pointer_arrow",
        "memory_box",
        "complexity_chart",
    }

    def audit(self, lesson: AnimationScriptContent) -> float:
        if lesson.schema_version == "2.0":
            return self._audit_v2(lesson)
        issues: list[str] = []
        expected = ["hook", "definition", "analogy", "mechanism", "comparison", "process", "example", "summary"]
        actual = [scene.scene_type for scene in lesson.scenes]
        if actual != expected:
            issues.append("sceneType sequence is incomplete")
        for scene in lesson.scenes:
            scene_label = f"{scene.scene_id}:{scene.scene_type}"
            if len(scene.concrete_objects) < 1:
                issues.append(f"{scene_label} missing concreteObjects")
            if len(scene.animation_steps) < 3:
                issues.append(f"{scene_label} missing at least 3 animationSteps")
            if not scene.state_changes:
                issues.append(f"{scene_label} missing stateChanges")
            if not scene.screen_text:
                issues.append(f"{scene_label} missing screenText")
            if not scene.misconception_fix.strip():
                issues.append(f"{scene_label} missing misconceptionFix")
            if not scene.component_hints:
                issues.append(f"{scene_label} missing componentHints")
            if not all(step.visual_action.strip() and step.start_state.strip() and step.end_state.strip() for step in scene.animation_steps):
                issues.append(f"{scene_label} has incomplete animationSteps")
            if not any(element.type in self._domain_element_types for element in scene.visual_plan.elements):
                issues.append(f"{scene_label} missing data-structure visual component")
        if issues:
            raise RuntimeError("video quality audit failed: " + "; ".join(issues[:6]))
        score = min(1.0, 0.72 + 0.02 * len(lesson.scenes))
        lesson.quality_score = score
        return score

    def _audit_v2(self, lesson: AnimationScriptContent) -> float:
        issues: list[str] = []
        forbidden_phrases = ("大家好今天", "本期视频我们将", "颠覆你的认知", "希望对你有帮助", "感谢观看")
        source_ids = {source.id for source in lesson.sources}
        motion_types: list[str] = []
        for scene in lesson.scenes:
            if not scene.beats:
                issues.append(f"{scene.scene_id} missing beats")
                continue
            for beat in scene.beats:
                label = f"{scene.scene_id}:{beat.beat_id}"
                if any(phrase in beat.narration.replace(" ", "") for phrase in forbidden_phrases):
                    issues.append(f"{label} contains formulaic narration")
                if beat.claims and (not beat.source_ids or not set(beat.source_ids) <= source_ids):
                    issues.append(f"{label} contains ungrounded claims")
                if not 1 <= len(beat.screen_text) <= 3:
                    issues.append(f"{label} must show 1-3 short texts")
                if len("".join(beat.screen_text)) > 40:
                    issues.append(f"{label} visual text is too long")
                if scene.scene_type not in {"hook", "summary"} and not any(
                    element.type in self._domain_element_types for element in beat.visual_plan.elements
                ):
                    issues.append(f"{label} missing teaching visual")
                motion_types.extend(element.animation for element in beat.visual_plan.elements[:2])
        if len(set(motion_types)) < 2:
            issues.append("video must use varied content-driven motion")
        if issues:
            raise RuntimeError("video quality audit failed: " + "; ".join(issues[:6]))
        passed_beats = sum(len(scene.beats) for scene in lesson.scenes)
        score = min(1.0, 0.78 + min(0.18, passed_beats * 0.01))
        lesson.quality_score = score
        return score


class TtsSkill:
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def synthesize(
        self,
        narration: str,
        scene_id: str,
        output_dir: Path,
        *,
        max_duration_seconds: float | None = None,
    ) -> SynthesizedAudio:
        ffprobe = self._validate_configuration()
        output_dir.mkdir(parents=True, exist_ok=True)
        path = output_dir / f"{scene_id}.{settings.tts_audio_format}"
        payload = {
            "user": {"uid": "nodelearn-ai"},
            "req_params": {
                "text": narration,
                "speaker": settings.tts_voice_name,
                "audio_params": {
                    "format": settings.tts_audio_format,
                    "sample_rate": settings.tts_sample_rate,
                },
            },
        }
        headers = {
            "X-Api-Key": settings.tts_api_key,
            "X-Api-Resource-Id": settings.tts_resource_id,
            "X-Api-Request-Id": uuid4().hex,
            "Content-Type": "application/json",
        }
        audio = await self._request_audio(headers, payload)
        if not audio:
            raise RuntimeError("Doubao TTS returned no audio data")
        path.write_bytes(audio)
        duration = await self._probe_duration(ffprobe, path)
        if max_duration_seconds is not None and duration > max_duration_seconds:
            duration = await self._normalize_audio_duration(
                ffprobe,
                path,
                duration_seconds=duration,
                max_duration_seconds=max_duration_seconds,
            )
        relative_path = path.relative_to(Path(settings.file_storage_path).resolve())
        return SynthesizedAudio(path=path, url=_storage_url(relative_path), duration_seconds=duration)

    async def _normalize_audio_duration(
        self,
        ffprobe: str,
        path: Path,
        *,
        duration_seconds: float,
        max_duration_seconds: float,
    ) -> float:
        # Keep a small margin for MP3 encoder padding and frame rounding. A
        # larger correction would make speech unnaturally fast and therefore
        # remains a hard failure instead of silently weakening the pacing gate.
        tempo = duration_seconds / max_duration_seconds * 1.02
        if tempo > 1.25:
            raise RuntimeError("TTS narration exceeds the safe tempo-normalization range")
        ffmpeg = _command_path(settings.ffmpeg_binary)
        if ffmpeg is None:
            raise RuntimeError(f"ffmpeg is not available: {settings.ffmpeg_binary}")
        normalized_path = path.with_name(f"{path.stem}.normalized{path.suffix}")
        process = await asyncio.create_subprocess_exec(
            ffmpeg,
            "-y",
            "-i",
            str(path),
            "-filter:a",
            f"atempo={tempo:.6f}",
            "-vn",
            str(normalized_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await process.communicate()
        if process.returncode != 0 or not normalized_path.exists():
            normalized_path.unlink(missing_ok=True)
            raise RuntimeError(
                f"ffmpeg failed to normalize TTS pacing: {stderr.decode(errors='replace').strip()}"
            )
        normalized_path.replace(path)
        normalized_duration = await self._probe_duration(ffprobe, path)
        if normalized_duration > max_duration_seconds + 0.05:
            raise RuntimeError("normalized TTS audio still exceeds the scene pacing limit")
        return normalized_duration

    def _validate_configuration(self) -> str:
        if settings.tts_provider != "doubao_v3_http_chunked":
            raise RuntimeError("TTS_PROVIDER must be doubao_v3_http_chunked")
        if not settings.tts_api_key:
            raise RuntimeError("TTS_API_KEY is not configured")
        if not settings.tts_base_url:
            raise RuntimeError("TTS_BASE_URL is not configured")
        if not settings.tts_resource_id:
            raise RuntimeError("TTS_RESOURCE_ID is not configured")
        if not settings.tts_voice_name:
            raise RuntimeError("TTS_VOICE_NAME is not configured")
        if settings.tts_audio_format != "mp3":
            raise RuntimeError("TTS_AUDIO_FORMAT must be mp3 in the first video version")
        ffprobe = _command_path(settings.ffprobe_binary)
        if ffprobe is None:
            raise RuntimeError(f"ffprobe is not available: {settings.ffprobe_binary}")
        return ffprobe

    async def _request_audio(self, headers: dict[str, str], payload: dict[str, Any]) -> bytes:
        last_error: httpx.TransportError | None = None
        for attempt in range(2):
            try:
                if self._client is not None:
                    return await self._stream_audio(self._client, headers, payload)
                timeout = httpx.Timeout(settings.tts_timeout_seconds)
                async with httpx.AsyncClient(timeout=timeout) as client:
                    return await self._stream_audio(client, headers, payload)
            except httpx.TransportError as exc:
                last_error = exc
                if attempt == 0:
                    await asyncio.sleep(0.5)
        assert last_error is not None
        raise RuntimeError(
            f"Doubao TTS connection failed after 2 attempts: {last_error.__class__.__name__}"
        ) from last_error

    async def _stream_audio(
        self,
        client: httpx.AsyncClient,
        headers: dict[str, str],
        payload: dict[str, Any],
    ) -> bytes:
        async with client.stream("POST", settings.tts_base_url, headers=headers, json=payload) as response:
            if not response.is_success:
                raise RuntimeError(f"Doubao TTS request failed with HTTP {response.status_code}")
            body = b"".join([chunk async for chunk in response.aiter_bytes()])
        if body.startswith((b"ID3", b"\xff\xfb", b"\xff\xf3", b"\xff\xf2")):
            return body
        return self._decode_audio_chunks(body)

    def _decode_audio_chunks(self, body: bytes) -> bytes:
        try:
            text = body.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise RuntimeError("Doubao TTS returned an unsupported response body") from exc
        chunks: list[bytes] = []
        decoder = json.JSONDecoder()
        index = 0
        while index < len(text):
            while index < len(text) and text[index].isspace():
                index += 1
            if text.startswith("data:", index):
                index += len("data:")
                continue
            if index >= len(text):
                break
            try:
                value, index = decoder.raw_decode(text, index)
            except json.JSONDecodeError:
                next_line = text.find("\n", index)
                if next_line == -1:
                    break
                index = next_line + 1
                continue
            self._collect_audio(value, chunks)
        if not chunks:
            raise RuntimeError("Doubao TTS response is missing audio chunks")
        return b"".join(chunks)

    def _collect_audio(self, value: Any, chunks: list[bytes]) -> None:
        if isinstance(value, dict):
            code = value.get("code")
            if isinstance(code, int) and code not in {0, 20000000}:
                message = str(value.get("message") or "unknown error")
                raise RuntimeError(f"Doubao TTS returned code {code}: {message}")
            for key, item in value.items():
                if key in {"data", "audio", "audio_data"} and isinstance(item, str) and item:
                    try:
                        chunks.append(base64.b64decode(item, validate=True))
                    except ValueError:
                        pass
                else:
                    self._collect_audio(item, chunks)
        elif isinstance(value, list):
            for item in value:
                self._collect_audio(item, chunks)

    async def _probe_duration(self, ffprobe: str, path: Path) -> float:
        process = await asyncio.create_subprocess_exec(
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            raise RuntimeError(f"ffprobe rejected TTS audio: {stderr.decode(errors='replace').strip()}")
        try:
            return max(0.1, float(stdout.decode().strip()))
        except ValueError as exc:
            raise RuntimeError("ffprobe returned an invalid TTS duration") from exc


class VideoRenderSkill:
    async def render(
        self,
        lesson: AnimationScriptContent,
        output_dir: Path,
        quality_preset: VideoQualityPreset | str = VideoQualityPreset.high,
        render_manifest: dict[str, Any] | None = None,
    ) -> RenderedVideo:
        quality_value = quality_preset.value if hasattr(quality_preset, "value") else str(quality_preset)
        render_input = {
            "lesson": self._validate_lesson_for_render(lesson),
            "qualityPreset": quality_value,
        }
        if render_manifest is not None:
            render_input["renderManifest"] = render_manifest
        node = self._validate_configuration()
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / "lesson.mp4"
        project_path = Path(settings.video_render_project_path).resolve()
        with tempfile.TemporaryDirectory(prefix="nodelearn-video-render-") as input_dir:
            render_input_path = Path(input_dir) / "render-input.json"
            render_input_path.write_text(json.dumps(render_input, ensure_ascii=False), encoding="utf-8")
            command = [
                node,
                str(project_path / "render.mjs"),
                "--input",
                str(render_input_path),
                "--output",
                str(output_path),
            ]
            if settings.video_render_browser_executable:
                command.extend(["--browser-executable", settings.video_render_browser_executable])
            process = await asyncio.create_subprocess_exec(
                *command,
                cwd=str(project_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=settings.video_render_timeout_seconds,
                )
            except TimeoutError as exc:
                process.kill()
                await process.communicate()
                raise RuntimeError("Remotion render timed out") from exc
        if process.returncode != 0:
            details = stderr.decode(errors="replace").strip() or stdout.decode(errors="replace").strip()
            raise RuntimeError(f"Remotion render failed: {details}")
        if not output_path.is_file() or output_path.stat().st_size == 0:
            raise RuntimeError("Remotion did not create an MP4 file")
        await self._validate_video_streams(output_path)
        try:
            relative_path = output_path.relative_to(Path(settings.file_storage_path).resolve())
            url = _storage_url(relative_path)
        except ValueError:
            url = ""
        return RenderedVideo(path=output_path, url=url)

    def _validate_lesson_for_render(self, lesson: AnimationScriptContent) -> dict[str, Any]:
        validated = AnimationScriptContent.model_validate(lesson.model_dump(by_alias=True, mode="json"))
        if not validated.scenes:
            raise RuntimeError("AnimationScriptContent must contain scenes before render")
        scene_audio_urls = (
            [beat.audio_url for scene in validated.scenes for beat in scene.beats]
            if validated.schema_version == "2.0"
            else [scene.audio_url for scene in validated.scenes]
        )
        if any(not audio_url.startswith(("http://", "https://")) for audio_url in scene_audio_urls):
            raise RuntimeError("each narration beat audioUrl must be an HTTP(S) storage URL before render")
        if validated.output.audio_urls != scene_audio_urls:
            raise RuntimeError("output.audioUrls must match scene audioUrl list before render")
        return validated.model_dump(by_alias=True, mode="json")

    def _validate_configuration(self) -> str:
        if settings.video_render_provider != "remotion":
            raise RuntimeError("VIDEO_RENDER_PROVIDER must be remotion")
        project_path = Path(settings.video_render_project_path).resolve()
        if not (project_path / "render.mjs").is_file():
            raise RuntimeError(f"Remotion renderer is missing: {project_path}")
        if not (project_path / "node_modules" / "@remotion" / "renderer").exists():
            raise RuntimeError(f"Remotion dependencies are missing: run npm install in {project_path}")
        if settings.video_render_browser_executable and not Path(settings.video_render_browser_executable).is_file():
            raise RuntimeError(f"Chromium executable is missing: {settings.video_render_browser_executable}")
        node = _command_path("node")
        if node is None:
            raise RuntimeError("Node.js is not available")
        if _command_path(settings.ffmpeg_binary) is None:
            raise RuntimeError(f"ffmpeg is not available: {settings.ffmpeg_binary}")
        if _command_path(settings.ffprobe_binary) is None:
            raise RuntimeError(f"ffprobe is not available: {settings.ffprobe_binary}")
        return node

    async def _validate_video_streams(self, output_path: Path) -> None:
        ffprobe = _command_path(settings.ffprobe_binary)
        if ffprobe is None:
            raise RuntimeError(f"ffprobe is not available: {settings.ffprobe_binary}")
        process = await asyncio.create_subprocess_exec(
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type",
            "-of",
            "json",
            str(output_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            raise RuntimeError(f"ffprobe rejected MP4 output: {stderr.decode(errors='replace').strip()}")
        parsed = json.loads(stdout.decode())
        codec_types = {item.get("codec_type") for item in parsed.get("streams", [])}
        if not {"audio", "video"} <= codec_types:
            raise RuntimeError("MP4 output must contain audio and video streams")


class SafetyAuditSkill:
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def check(
        self,
        content: str,
        target_id: str,
        user_id: str,
        course_id: str,
    ) -> AuditResult:
        if not settings.audit_api_base_url:
            raise RuntimeError("AUDIT_API_BASE_URL is not configured")
        payload = {
            "targetType": "resource",
            "targetId": target_id,
            "content": content,
            "userId": user_id,
            "courseId": course_id,
        }
        if self._client is not None:
            return await self._post(self._client, payload)
        async with httpx.AsyncClient(
            base_url=settings.audit_api_base_url,
            timeout=settings.audit_timeout_seconds,
            trust_env=False,
        ) as client:
            return await self._post(client, payload)

    async def _post(self, client: httpx.AsyncClient, payload: dict[str, Any]) -> AuditResult:
        response = await client.post("/audit/check", json=payload)
        if not response.is_success:
            raise RuntimeError(f"audit/check failed with HTTP {response.status_code}")
        parsed = response.json()
        if not isinstance(parsed, dict) or not isinstance(parsed.get("data"), dict):
            raise RuntimeError("audit/check returned an invalid ApiResponse")
        return AuditResult(**parsed["data"])


class LegacyVideoGenerationService:
    def __init__(
        self,
        llm_service: LLMService | None = None,
        video_script_skill: VideoScriptSkill | None = None,
        storyboard_skill: StoryboardSkill | None = None,
        animation_spec_skill: AnimationSpecSkill | None = None,
        quality_audit_skill: QualityAuditSkill | None = None,
        tts_skill: TtsSkill | None = None,
        video_render_skill: VideoRenderSkill | None = None,
        safety_audit_skill: SafetyAuditSkill | None = None,
    ) -> None:
        llm_service = llm_service or LLMService()
        self.video_script_skill = video_script_skill or VideoScriptSkill(llm_service)
        self.storyboard_skill = storyboard_skill or StoryboardSkill(llm_service)
        self.animation_spec_skill = animation_spec_skill or AnimationSpecSkill()
        self.quality_audit_skill = quality_audit_skill or QualityAuditSkill()
        self.tts_skill = tts_skill or TtsSkill()
        self.video_render_skill = video_render_skill or VideoRenderSkill()
        self.safety_audit_skill = safety_audit_skill or SafetyAuditSkill()

    async def prepare_lesson(
        self,
        *,
        target_id: str,
        user_id: str,
        course_id: str,
        node: KnowledgeNode | None,
        target_goal: str,
        documents: list[RetrievedDocument],
        video_options: VideoGenerateOptions | None = None,
        learner_profile_summary: str | None = None,
        target_duration_seconds: float | None = None,
        run_safety_audit: bool = True,
        progress_callback: Callable[[VideoGenerationStage, float, str | None], None] | None = None,
    ) -> AnimationScriptContent:
        options = video_options or VideoGenerateOptions()

        def emit(stage: VideoGenerationStage, progress: float) -> None:
            if progress_callback is not None:
                progress_callback(stage, progress, None)

        def build_lesson(storyboard: dict[str, Any]) -> AnimationScriptContent:
            lesson = self.animation_spec_skill.normalize(
                node,
                storyboard,
                schema_version="2.0",
                documents=documents,
                theme=options.theme or VideoTheme.warm_academic,
                target_duration_seconds=target_duration_seconds,
                subtitle_enabled=options.subtitle_enabled is not False,
            )
            lesson.course_id = course_id
            lesson.node_id = node.id if node else None
            lesson.learner_profile_summary = learner_profile_summary
            lesson.aspect_ratio = options.aspect_ratio or VideoAspect.landscape
            return lesson

        emit(VideoGenerationStage.script, 12)
        duration_requirement = f"目标总时长约 {int(target_duration_seconds)} 秒；" if target_duration_seconds else ""
        script = await self.video_script_skill.generate(node, duration_requirement + target_goal, documents)
        emit(VideoGenerationStage.storyboard, 28)
        storyboard = await self.storyboard_skill.generate(node, script)
        lesson = build_lesson(storyboard)
        emit(VideoGenerationStage.quality_audit, 42)
        try:
            self.quality_audit_skill.audit(lesson)
        except RuntimeError as first_error:
            rewrite_script = {
                **script,
                "qualityAuditError": str(first_error),
                "rewriteRequirement": "Use grounded short narration beats and concrete data-structure visual intent.",
            }
            storyboard = await self.storyboard_skill.generate(node, rewrite_script)
            lesson = build_lesson(storyboard)
            self.quality_audit_skill.audit(lesson)
        if run_safety_audit:
            preflight_content = json.dumps(lesson.model_dump(by_alias=True, mode="json"), ensure_ascii=False)
            preflight_audit = await self.safety_audit_skill.check(preflight_content, target_id, user_id, course_id)
            if preflight_audit.audit_status != AuditStatus.passed:
                raise VideoAuditError(AuditStatus(preflight_audit.audit_status))
        return lesson

    async def generate(
        self,
        task_id: str,
        target_id: str,
        user_id: str,
        course_id: str,
        node: KnowledgeNode | None,
        target_goal: str,
        documents: list[RetrievedDocument],
        video_options: VideoGenerateOptions | None = None,
        learner_profile_summary: str | None = None,
        target_duration_seconds: float | None = None,
        progress_callback: Callable[[VideoGenerationStage, float, str | None], None] | None = None,
    ) -> AnimationScriptContent:
        if settings.enable_mock:
            raise RuntimeError("video generation requires ENABLE_MOCK=false")
        storage_root = Path(settings.file_storage_path).resolve()
        output_dir = storage_root / "generated_resources" / task_id
        options = video_options or VideoGenerateOptions()
        quality_preset = options.quality_preset or VideoQualityPreset.high

        def emit(stage: VideoGenerationStage, progress: float, error_message: str | None = None) -> None:
            if progress_callback is not None:
                progress_callback(stage, progress, error_message)

        try:
            lesson = await self.prepare_lesson(
                target_id=target_id,
                user_id=user_id,
                course_id=course_id,
                node=node,
                target_goal=target_goal,
                documents=documents,
                video_options=options,
                learner_profile_summary=learner_profile_summary,
                target_duration_seconds=target_duration_seconds,
                progress_callback=progress_callback,
            )
            audio_urls: list[str] = []
            beats = [(scene, beat) for scene in lesson.scenes for beat in scene.beats]
            for index, (scene, beat) in enumerate(beats):
                emit(VideoGenerationStage.tts, 48 + (index / max(1, len(beats))) * 26)
                audio = await self.tts_skill.synthesize(beat.narration, beat.beat_id, output_dir / "audio")
                beat.audio_url = audio.url
                actual_beat_duration = audio.duration_seconds + 0.4
                if actual_beat_duration > 15:
                    raise RuntimeError(f"narration beat is too long for video pacing: {beat.beat_id}")
                beat.duration_seconds = max(beat.duration_seconds, actual_beat_duration)
                audio_urls.append(audio.url)
                scene.duration_seconds = sum(item.duration_seconds for item in scene.beats)
                scene.narration = "\n".join(item.narration for item in scene.beats)
            lesson.duration_seconds = sum(scene.duration_seconds for scene in lesson.scenes)
            lesson.output.audio_urls = audio_urls
            emit(VideoGenerationStage.render, 78)
            video = await self.video_render_skill.render(lesson, output_dir, quality_preset=quality_preset)
            lesson.output.video_url = video.url
            content = json.dumps(lesson.model_dump(by_alias=True, mode="json"), ensure_ascii=False)
            emit(VideoGenerationStage.audit, 90)
            audit = await self.safety_audit_skill.check(content, target_id, user_id, course_id)
            if audit.audit_status != AuditStatus.passed:
                raise VideoAuditError(AuditStatus(audit.audit_status))
            return lesson
        except Exception as exc:
            emit(VideoGenerationStage.error, 100, str(exc) or exc.__class__.__name__)
            shutil.rmtree(output_dir, ignore_errors=True)
            raise

@dataclass(slots=True)
class _PreparedVideoPipeline:
    context: VideoGenerationContext
    strategy: TeachingStrategy
    narrative: VideoNarrative
    validated_storyboard: ValidatedStoryboard
    scene_plans: list[ResolvedScenePlan]


class VideoGenerationService:
    """Twelve-stage Scene DSL pipeline with a v2 public compatibility projection."""

    def __init__(
        self,
        llm_service: LLMService | None = None,
        video_script_skill: VideoScriptSkill | None = None,
        storyboard_skill: StoryboardSkill | None = None,
        animation_spec_skill: AnimationSpecSkill | None = None,
        quality_audit_skill: QualityAuditSkill | None = None,
        tts_skill: TtsSkill | None = None,
        video_render_skill: VideoRenderSkill | None = None,
        safety_audit_skill: SafetyAuditSkill | None = None,
    ) -> None:
        llm_service = llm_service or LLMService()
        # Historical collaborators remain available for callers importing the
        # façade, but new tasks are planned through the strict internal DSL.
        self.video_script_skill = video_script_skill or VideoScriptSkill(llm_service)
        self.storyboard_skill = storyboard_skill or StoryboardSkill(llm_service)
        self.animation_spec_skill = animation_spec_skill or AnimationSpecSkill()
        self.quality_audit_skill = quality_audit_skill or QualityAuditSkill()
        self.context_builder = VideoContextBuilder()
        self.strategy_planner = TeachingStrategyPlanner(llm_service)
        self.narrative_planner = NarrativePlanner(llm_service)
        self.storyboard_planner = StoryboardPlanner(llm_service)
        self.scene_registry = SceneTemplateRegistry()
        self.tts_skill = tts_skill or TtsSkill()
        self.video_render_skill = video_render_skill or VideoRenderSkill()
        self.media_validator = MediaValidator()
        self.safety_audit_skill = safety_audit_skill or SafetyAuditSkill()

    async def prepare_lesson(
        self,
        *,
        target_id: str,
        user_id: str,
        course_id: str,
        node: KnowledgeNode | None,
        target_goal: str,
        documents: list[RetrievedDocument],
        video_options: VideoGenerateOptions | None = None,
        learner_profile_summary: str | None = None,
        target_duration_seconds: float | None = None,
        run_safety_audit: bool = True,
        progress_callback: Callable[[VideoGenerationStage, float, str | None], None] | None = None,
        profile: StudentProfile | None = None,
        practice_records: list[PracticeRecord] | None = None,
        available_nodes: list[KnowledgeNode] | None = None,
        course_name: str | None = None,
        custom_requirement: str | None = None,
        detail_callback: Callable[[str, float], None] | None = None,
    ) -> AnimationScriptContent:
        options = video_options or VideoGenerateOptions()
        prepared = await self._prepare_internal(
            target_id=target_id,
            user_id=user_id,
            course_id=course_id,
            node=node,
            target_goal=target_goal,
            documents=documents,
            options=options,
            learner_profile_summary=learner_profile_summary,
            run_safety_audit=run_safety_audit,
            progress_callback=progress_callback,
            profile=profile,
            practice_records=practice_records or [],
            available_nodes=available_nodes or ([node] if node else []),
            course_name=course_name,
            custom_requirement=custom_requirement,
            target_duration_seconds=target_duration_seconds,
            artifacts=None,
            detail_callback=detail_callback,
        )
        audio = self._estimated_audio(prepared)
        timeline = resolve_timeline(prepared.validated_storyboard.storyboard, audio)
        validate_target_duration(timeline.total_duration_seconds, target_duration_seconds)
        return project_public_v2(
            context=prepared.context,
            storyboard=prepared.validated_storyboard.storyboard,
            timeline=timeline,
            audio_by_scene=audio,
            theme=options.theme or VideoTheme.warm_academic,
            aspect_ratio=options.aspect_ratio or VideoAspect.landscape,
            subtitle_enabled=options.subtitle_enabled is not False,
            learner_profile_summary=learner_profile_summary,
            target_duration_seconds=target_duration_seconds,
        )

    async def generate(
        self,
        task_id: str,
        target_id: str,
        user_id: str,
        course_id: str,
        node: KnowledgeNode | None,
        target_goal: str,
        documents: list[RetrievedDocument],
        video_options: VideoGenerateOptions | None = None,
        learner_profile_summary: str | None = None,
        target_duration_seconds: float | None = None,
        progress_callback: Callable[[VideoGenerationStage, float, str | None], None] | None = None,
        profile: StudentProfile | None = None,
        practice_records: list[PracticeRecord] | None = None,
        available_nodes: list[KnowledgeNode] | None = None,
        course_name: str | None = None,
        custom_requirement: str | None = None,
        detail_callback: Callable[[str, float], None] | None = None,
    ) -> AnimationScriptContent:
        if settings.enable_mock:
            raise RuntimeError("video generation requires ENABLE_MOCK=false")

        options = video_options or VideoGenerateOptions()
        aspect = options.aspect_ratio or VideoAspect.landscape
        quality = options.quality_preset or VideoQualityPreset.high
        theme = options.theme or VideoTheme.warm_academic
        aspect_value = aspect.value if hasattr(aspect, "value") else str(aspect)
        quality_value = quality.value if hasattr(quality, "value") else str(quality)
        width, height = render_dimensions(aspect_value, quality_value)
        storage_root = Path(settings.file_storage_path).resolve()
        publication_dir = storage_root / "generated_resources" / task_id
        artifacts = DebugArtifactStore(task_id)
        temporary_staging: tempfile.TemporaryDirectory[str] | None = None
        if artifacts.enabled:
            staging_dir = artifacts.directory / "render"
        else:
            temporary_staging = tempfile.TemporaryDirectory(prefix="nodelearn-video-staging-")
            staging_dir = Path(temporary_staging.name)

        def emit(stage: VideoGenerationStage, progress: float, error: str | None = None) -> None:
            if progress_callback is not None:
                progress_callback(stage, progress, error)

        try:
            prepared = await self._prepare_internal(
                target_id=target_id,
                user_id=user_id,
                course_id=course_id,
                node=node,
                target_goal=target_goal,
                documents=documents,
                options=options,
                learner_profile_summary=learner_profile_summary,
                run_safety_audit=True,
                progress_callback=progress_callback,
                profile=profile,
                practice_records=practice_records or [],
                available_nodes=available_nodes or ([node] if node else []),
                course_name=course_name,
                custom_requirement=custom_requirement,
                target_duration_seconds=target_duration_seconds,
                artifacts=artifacts,
                detail_callback=detail_callback,
            )
            storyboard = prepared.validated_storyboard.storyboard
            audio_by_scene: dict[str, SceneAudio] = {}
            for index, scene in enumerate(storyboard.scenes):
                if detail_callback is not None:
                    detail_callback("tts_generation", 50 + index / max(1, len(storyboard.scenes)) * 16)
                emit(VideoGenerationStage.tts, 50 + index / max(1, len(storyboard.scenes)) * 16)
                synthesized = await self.tts_skill.synthesize(
                    scene.narration,
                    scene.id,
                    publication_dir / "audio",
                    max_duration_seconds=7.45 if scene.narrative_role == "hook" else 14.45,
                )
                audio_by_scene[scene.id] = SceneAudio(
                    scene_id=scene.id,
                    path=str(synthesized.path),
                    url=synthesized.url,
                    duration_seconds=synthesized.duration_seconds,
                )
            emit(VideoGenerationStage.tts, 68)
            if detail_callback is not None:
                detail_callback("audio_duration_analysis", 68)
            artifacts.write(
                "scene-durations.json",
                [item.model_dump(mode="json") for item in audio_by_scene.values()],
            )

            timeline = resolve_timeline(storyboard, audio_by_scene, fps=30)
            validate_target_duration(timeline.total_duration_seconds, target_duration_seconds)
            emit(VideoGenerationStage.tts, 72)
            if detail_callback is not None:
                detail_callback("animation_timing_resolution", 72)
            artifacts.write("resolved-timeline.json", timeline)
            lesson = project_public_v2(
                context=prepared.context,
                storyboard=storyboard,
                timeline=timeline,
                audio_by_scene=audio_by_scene,
                theme=theme,
                aspect_ratio=aspect,
                subtitle_enabled=options.subtitle_enabled is not False,
                learner_profile_summary=learner_profile_summary,
                target_duration_seconds=target_duration_seconds,
            )
            manifest = build_render_manifest(
                context=prepared.context,
                storyboard=storyboard,
                plans=prepared.scene_plans,
                timeline=timeline,
                audio_by_scene=audio_by_scene,
                theme=theme.value if hasattr(theme, "value") else str(theme),
                aspect_ratio=aspect_value,
                quality_preset=quality_value,
                width=width,
                height=height,
                subtitle_enabled=options.subtitle_enabled is not False,
            )
            artifacts.write("render-manifest.json", manifest)

            emit(VideoGenerationStage.render, 78)
            if detail_callback is not None:
                detail_callback("remotion_rendering", 78)
            rendered = await self.video_render_skill.render(
                lesson,
                staging_dir,
                quality_preset=quality,
                render_manifest=manifest,
            )
            emit(VideoGenerationStage.audit, 88)
            if detail_callback is not None:
                detail_callback("video_validation", 88)
            probe = await self.media_validator.probe_and_validate(
                rendered.path,
                timeline=timeline,
                width=width,
                height=height,
                fps=30,
            )
            artifacts.write("media-probe.json", probe)

            final_content = json.dumps(lesson.model_dump(by_alias=True, mode="json"), ensure_ascii=False)
            final_audit = await self.safety_audit_skill.check(final_content, target_id, user_id, course_id)
            if final_audit.audit_status != AuditStatus.passed:
                raise VideoAuditError(AuditStatus(final_audit.audit_status))

            emit(VideoGenerationStage.persist, 96)
            if detail_callback is not None:
                detail_callback("persistence", 96)
            publication_dir.mkdir(parents=True, exist_ok=True)
            final_path = publication_dir / "lesson.mp4"
            shutil.copy2(rendered.path, final_path)
            lesson.output.video_url = _storage_url(final_path.relative_to(storage_root))
            return lesson
        except Exception as exc:
            artifacts.write(
                "error.json",
                {"errorType": exc.__class__.__name__, "message": str(exc) or exc.__class__.__name__},
            )
            emit(VideoGenerationStage.error, 100, str(exc) or exc.__class__.__name__)
            if artifacts.enabled and publication_dir.exists():
                shutil.copytree(
                    publication_dir,
                    artifacts.directory / "failed-media",
                    dirs_exist_ok=True,
                )
            shutil.rmtree(publication_dir, ignore_errors=True)
            raise
        finally:
            if temporary_staging is not None:
                temporary_staging.cleanup()

    async def _prepare_internal(
        self,
        *,
        target_id: str,
        user_id: str,
        course_id: str,
        node: KnowledgeNode | None,
        target_goal: str,
        documents: list[RetrievedDocument],
        options: VideoGenerateOptions,
        learner_profile_summary: str | None,
        run_safety_audit: bool,
        progress_callback: Callable[[VideoGenerationStage, float, str | None], None] | None,
        profile: StudentProfile | None,
        practice_records: list[PracticeRecord],
        available_nodes: list[KnowledgeNode],
        course_name: str | None,
        custom_requirement: str | None,
        target_duration_seconds: float | None,
        artifacts: DebugArtifactStore | None,
        detail_callback: Callable[[str, float], None] | None,
    ) -> _PreparedVideoPipeline:
        def emit(stage: VideoGenerationStage, progress: float) -> None:
            if progress_callback is not None:
                progress_callback(stage, progress, None)

        emit(VideoGenerationStage.script, 5)
        if detail_callback is not None:
            detail_callback("context_building", 5)
        context = self.context_builder.build(
            course_id=course_id,
            course_name=course_name,
            node=node,
            profile=profile,
            practice_records=practice_records,
            documents=documents,
            available_nodes=available_nodes,
            learning_goal=target_goal,
            custom_requirement=custom_requirement,
        )
        if profile is None and learner_profile_summary:
            context.learner.profile_summary = learner_profile_summary
        if artifacts:
            artifacts.write("context.json", context)

        emit(VideoGenerationStage.script, 12)
        if detail_callback is not None:
            detail_callback("teaching_strategy", 12)
        strategy = await self.strategy_planner.plan(context)
        if artifacts:
            artifacts.write("teaching-strategy.json", strategy)

        emit(VideoGenerationStage.script, 20)
        if detail_callback is not None:
            detail_callback("narrative_planning", 20)
        narrative = await self.narrative_planner.plan(context, strategy)
        if artifacts:
            artifacts.write("narrative.json", narrative)

        emit(VideoGenerationStage.storyboard, 30)
        if detail_callback is not None:
            detail_callback("storyboard_generation", 30)
        raw_storyboard, validated = await self.storyboard_planner.generate(
            context,
            strategy,
            narrative,
            target_duration_seconds,
        )
        if artifacts:
            artifacts.write("storyboard-raw.json", raw_storyboard)
            artifacts.write("storyboard-validated.json", validated)

        emit(VideoGenerationStage.quality_audit, 40)
        if detail_callback is not None:
            detail_callback("storyboard_validation", 40)
        scene_plans = self.scene_registry.resolve_all(validated.storyboard.scenes)
        if artifacts:
            artifacts.write(
                "resolved-scene-plans.json",
                [item.model_dump(mode="json") for item in scene_plans],
            )
        emit(VideoGenerationStage.quality_audit, 46)
        if detail_callback is not None:
            detail_callback("scene_template_resolution", 46)

        if run_safety_audit:
            estimated_audio = self._estimated_audio(
                _PreparedVideoPipeline(context, strategy, narrative, validated, scene_plans)
            )
            estimated_timeline = resolve_timeline(validated.storyboard, estimated_audio)
            validate_target_duration(estimated_timeline.total_duration_seconds, target_duration_seconds)
            preflight = project_public_v2(
                context=context,
                storyboard=validated.storyboard,
                timeline=estimated_timeline,
                audio_by_scene=estimated_audio,
                theme=options.theme or VideoTheme.warm_academic,
                aspect_ratio=options.aspect_ratio or VideoAspect.landscape,
                subtitle_enabled=options.subtitle_enabled is not False,
                learner_profile_summary=learner_profile_summary,
                target_duration_seconds=target_duration_seconds,
            )
            audit = await self.safety_audit_skill.check(
                json.dumps(preflight.model_dump(by_alias=True, mode="json"), ensure_ascii=False),
                target_id,
                user_id,
                course_id,
            )
            if audit.audit_status != AuditStatus.passed:
                raise VideoAuditError(AuditStatus(audit.audit_status))

        return _PreparedVideoPipeline(context, strategy, narrative, validated, scene_plans)

    @staticmethod
    def _estimated_audio(prepared: _PreparedVideoPipeline) -> dict[str, SceneAudio]:
        result: dict[str, SceneAudio] = {}
        for scene in prepared.validated_storyboard.storyboard.scenes:
            estimate = max(2.8, min(14.0, len(scene.narration) / 5))
            if scene.narrative_role == "hook":
                estimate = min(7.5, estimate)
            result[scene.id] = SceneAudio(
                scene_id=scene.id,
                path="",
                url="",
                duration_seconds=estimate,
            )
        return result
