from __future__ import annotations

import asyncio
import base64
import json
import logging
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx

from app.core.config import settings
from app.schemas.common import AuditStatus
from app.schemas.course import KnowledgeNode
from app.schemas.report import AuditResult
from app.schemas.resource import RetrievedDocument
from app.schemas.video import AnimationScriptContent, VideoLessonOutput, VideoLessonScene
from app.services.llm_service import LLMService

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
            "title": f"{node_name}图解讲解",
            "scenes": [
                {
                    "title": f"{node_name}是什么",
                    "narration": f"先从直观含义开始理解{node_name}，再观察它的结构和典型操作。",
                    "codeSnippet": "",
                    "durationSeconds": 12,
                },
                {
                    "title": "关键操作",
                    "narration": f"接下来逐步演示{node_name}的关键操作，并观察每一步产生的变化。",
                    "codeSnippet": "stack.push(4);\nstack.pop();" if "栈" in node_name else "",
                    "durationSeconds": 16,
                },
                {
                    "title": "复盘",
                    "narration": f"最后复盘{node_name}的结构特征、操作顺序和常见错误。",
                    "codeSnippet": "",
                    "durationSeconds": 12,
                },
            ],
        }
        prompt = (
            "你是 multimodal_agent 的 VideoScriptSkill。"
            "请根据知识点材料生成适合网页动画讲解的视频脚本。"
            "只返回 JSON 对象，结构为 title 和 scenes；"
            "每个 scene 仅包含 title、narration、codeSnippet、durationSeconds。"
            f"\n知识点：{node_name}\n学习目标：{target_goal}\n参考材料：\n{_documents_text(documents)}"
        )
        return await self.llm_service.generate_json(prompt, mock_data=mock_data)


class StoryboardSkill:
    def __init__(self, llm_service: LLMService | None = None) -> None:
        self.llm_service = llm_service or LLMService()

    async def generate(self, node: KnowledgeNode | None, script: dict[str, Any]) -> dict[str, Any]:
        node_name = node.name if node else "当前知识点"
        is_stack = "栈" in node_name
        mock_scenes = []
        for index, scene in enumerate(script.get("scenes", []), start=1):
            if is_stack:
                visual_type = "stack_animation"
                visual_data = {
                    "items": [1, 2, 3],
                    "operations": [{"type": "push", "value": 4}, {"type": "pop"}],
                }
            else:
                visual_type = "text_slide"
                visual_data = {"bullets": [scene.get("title", ""), scene.get("narration", "")]}
            mock_scenes.append(
                {
                    "sceneId": f"scene_{index:03d}",
                    **scene,
                    "visualType": visual_type,
                    "visualData": visual_data,
                    "audioUrl": "",
                }
            )
        mock_data = {
            "title": script.get("title", f"{node_name}图解讲解"),
            "durationSeconds": sum(float(item.get("durationSeconds", 0)) for item in mock_scenes),
            "aspectRatio": "16:9",
            "scenes": mock_scenes,
            "output": {"videoUrl": "", "audioUrls": []},
        }
        prompt = (
            "你是 multimodal_agent 的 StoryboardSkill。"
            "请将讲解脚本改写为分镜动画 JSON。只返回 JSON 对象。"
            "每个 scene 必须包含 sceneId、title、narration、visualType、visualData、"
            "codeSnippet、durationSeconds、audioUrl。"
            "栈知识点使用 stack_animation 和 items/operations；其他知识点使用 text_slide 和 bullets。"
            f"\n知识点：{node_name}\n脚本：{_json_text(script)}"
        )
        return await self.llm_service.generate_json(prompt, mock_data=mock_data)


class AnimationSpecSkill:
    def normalize(self, node: KnowledgeNode | None, storyboard: dict[str, Any]) -> AnimationScriptContent:
        node_name = node.name if node else "当前知识点"
        is_stack = "栈" in node_name
        raw_scenes = storyboard.get("scenes")
        if not isinstance(raw_scenes, list) or not raw_scenes:
            raise RuntimeError("storyboard returned no scenes")

        scenes: list[VideoLessonScene] = []
        for index, item in enumerate(raw_scenes, start=1):
            if not isinstance(item, dict):
                raise RuntimeError("storyboard returned an invalid scene")
            narration = str(item.get("narration", "")).strip()
            if not narration:
                raise RuntimeError("storyboard scene narration is empty")
            visual_type = "stack_animation" if is_stack else "text_slide"
            if visual_type == "stack_animation":
                visual_data = self._stack_visual_data(item.get("visualData"))
            else:
                visual_data = self._text_visual_data(item.get("visualData"), narration)
            scenes.append(
                VideoLessonScene(
                    scene_id=str(item.get("sceneId") or f"scene_{index:03d}"),
                    title=str(item.get("title") or f"分镜 {index}"),
                    narration=narration,
                    visual_type=visual_type,
                    visual_data=visual_data,
                    code_snippet=str(item.get("codeSnippet") or ""),
                    duration_seconds=max(1.0, float(item.get("durationSeconds") or 1)),
                    audio_url="",
                )
            )
        return AnimationScriptContent(
            title=str(storyboard.get("title") or f"{node_name}图解讲解"),
            duration_seconds=sum(scene.duration_seconds for scene in scenes),
            scenes=scenes,
            output=VideoLessonOutput(video_url="", audio_urls=[]),
        )

    def _stack_visual_data(self, value: Any) -> dict[str, Any]:
        data = value if isinstance(value, dict) else {}
        items = data.get("items")
        operations = data.get("operations")
        if not isinstance(items, list) or not all(isinstance(item, int) for item in items):
            items = [1, 2, 3]
        if not isinstance(operations, list) or not operations:
            operations = [{"type": "push", "value": 4}, {"type": "pop"}]
        normalized = []
        for operation in operations:
            if not isinstance(operation, dict) or operation.get("type") not in {"push", "pop"}:
                continue
            item = {"type": operation["type"]}
            if operation["type"] == "push" and isinstance(operation.get("value"), int):
                item["value"] = operation["value"]
            normalized.append(item)
        return {"items": items, "operations": normalized or [{"type": "push", "value": 4}, {"type": "pop"}]}

    def _text_visual_data(self, value: Any, narration: str) -> dict[str, Any]:
        data = value if isinstance(value, dict) else {}
        bullets = data.get("bullets")
        if not isinstance(bullets, list):
            bullets = []
        normalized = [str(item).strip() for item in bullets if str(item).strip()]
        return {"bullets": normalized[:4] or [narration]}


class TtsSkill:
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def synthesize(self, narration: str, scene_id: str, output_dir: Path) -> SynthesizedAudio:
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
        relative_path = path.relative_to(Path(settings.file_storage_path).resolve())
        return SynthesizedAudio(path=path, url=_storage_url(relative_path), duration_seconds=duration)

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
        if self._client is not None:
            return await self._stream_audio(self._client, headers, payload)
        timeout = httpx.Timeout(settings.tts_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            return await self._stream_audio(client, headers, payload)

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
    async def render(self, lesson: AnimationScriptContent, output_dir: Path) -> RenderedVideo:
        node = self._validate_configuration()
        output_dir.mkdir(parents=True, exist_ok=True)
        render_input_path = output_dir / "render-input.json"
        output_path = output_dir / "lesson.mp4"
        render_input = lesson.model_dump(by_alias=True)
        for scene in render_input["scenes"]:
            audio_filename = Path(scene["audioUrl"]).name
            scene["audioUrl"] = (output_dir / "audio" / audio_filename).resolve().as_uri()
        render_input_path.write_text(json.dumps(render_input, ensure_ascii=False), encoding="utf-8")
        project_path = Path(settings.video_render_project_path).resolve()
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
        relative_path = output_path.relative_to(Path(settings.file_storage_path).resolve())
        return RenderedVideo(path=output_path, url=_storage_url(relative_path))

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


class VideoGenerationService:
    def __init__(
        self,
        llm_service: LLMService | None = None,
        video_script_skill: VideoScriptSkill | None = None,
        storyboard_skill: StoryboardSkill | None = None,
        animation_spec_skill: AnimationSpecSkill | None = None,
        tts_skill: TtsSkill | None = None,
        video_render_skill: VideoRenderSkill | None = None,
        safety_audit_skill: SafetyAuditSkill | None = None,
    ) -> None:
        llm_service = llm_service or LLMService()
        self.video_script_skill = video_script_skill or VideoScriptSkill(llm_service)
        self.storyboard_skill = storyboard_skill or StoryboardSkill(llm_service)
        self.animation_spec_skill = animation_spec_skill or AnimationSpecSkill()
        self.tts_skill = tts_skill or TtsSkill()
        self.video_render_skill = video_render_skill or VideoRenderSkill()
        self.safety_audit_skill = safety_audit_skill or SafetyAuditSkill()

    async def generate(
        self,
        task_id: str,
        target_id: str,
        user_id: str,
        course_id: str,
        node: KnowledgeNode | None,
        target_goal: str,
        documents: list[RetrievedDocument],
    ) -> AnimationScriptContent:
        storage_root = Path(settings.file_storage_path).resolve()
        output_dir = storage_root / "generated_resources" / task_id
        try:
            script = await self.video_script_skill.generate(node, target_goal, documents)
            storyboard = await self.storyboard_skill.generate(node, script)
            lesson = self.animation_spec_skill.normalize(node, storyboard)
            audio_urls: list[str] = []
            for scene in lesson.scenes:
                audio = await self.tts_skill.synthesize(scene.narration, scene.scene_id, output_dir / "audio")
                scene.audio_url = audio.url
                scene.duration_seconds = max(scene.duration_seconds, audio.duration_seconds + 0.4)
                audio_urls.append(audio.url)
            lesson.duration_seconds = sum(scene.duration_seconds for scene in lesson.scenes)
            lesson.output.audio_urls = audio_urls
            video = await self.video_render_skill.render(lesson, output_dir)
            lesson.output.video_url = video.url
            content = json.dumps(lesson.model_dump(by_alias=True), ensure_ascii=False)
            audit = await self.safety_audit_skill.check(content, target_id, user_id, course_id)
            if audit.audit_status != AuditStatus.passed:
                raise VideoAuditError(AuditStatus(audit.audit_status))
            return lesson
        except Exception:
            shutil.rmtree(output_dir, ignore_errors=True)
            raise
