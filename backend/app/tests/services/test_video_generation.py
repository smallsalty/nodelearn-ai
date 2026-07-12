import asyncio
import base64
import json
from pathlib import Path

import pytest

from app.agents.multimodal_skills import AnimationSpecSkill, QualityAuditSkill, TtsSkill, VideoAuditError, VideoRenderSkill
from app.core.config import settings
from app.repositories.learning_path_repository import LearningPathRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.resource_repository import ResourceRepository
from app.schemas.common import AuditStatus
from app.schemas.resource import ResourceGenerateRequest, RetrievedDocument
from app.schemas.video import AnimationScriptContent, VideoLessonOutput, VideoLessonScene
from app.services.resource_service import ResourceService


def run(coro):
    return asyncio.run(coro)


def render_ready_lesson(audio_urls: list[str] | None = None) -> AnimationScriptContent:
    scene_types = ["hook", "definition", "analogy", "mechanism", "comparison", "process", "example", "summary"]
    scene_audio_urls = audio_urls or [f"http://localhost:8000/storage/test/scene_{index:03d}.mp3" for index in range(1, 9)]
    scenes = []
    for index, scene_type in enumerate(scene_types, start=1):
        elements = [{"type": "text", "content": f"要点 {index}", "animation": "fade_in"}]
        layout = "center_focus"
        if scene_type == "definition":
            elements = [
                {"type": "keyword", "content": "键", "animation": "pop_in"},
                {"type": "keyword", "content": "哈希函数", "animation": "pop_in"},
                {"type": "keyword", "content": "位置", "animation": "pop_in"},
            ]
        elif scene_type == "summary":
            layout = "summary_cards"
            elements = [
                {"type": "card", "content": "键值映射", "animation": "stagger_in"},
                {"type": "card", "content": "哈希定位", "animation": "stagger_in"},
                {"type": "card", "content": "快速访问", "animation": "stagger_in"},
            ]
        scenes.append(
            VideoLessonScene(
                scene_id=f"scene_{index:03d}",
                scene_type=scene_type,
                title=f"场景 {index}",
                narration=f"这是第 {index} 个讲解场景。",
                duration_seconds=12 if scene_type == "hook" else 16,
                teaching_purpose="Explain with concrete objects",
                concrete_objects=["key", "hash function", "bucket"],
                animation_steps=[
                    {
                        "startState": "input pending",
                        "endState": "input highlighted",
                        "visualAction": "highlight input",
                        "narrationSentence": "First observe the input object.",
                        "durationSeconds": 3,
                    },
                    {
                        "startState": "rule idle",
                        "endState": "rule applied",
                        "visualAction": "move pointer to rule",
                        "narrationSentence": "Then apply the operation rule.",
                        "durationSeconds": 3,
                    },
                    {
                        "startState": "structure old",
                        "endState": "structure updated",
                        "visualAction": "update visible structure",
                        "narrationSentence": "Finally compare the changed state.",
                        "durationSeconds": 3,
                    },
                ],
                state_changes=["input appears", "rule applies", "state updates"],
                screen_text=[f"scene {index}"],
                misconception_fix="Do not memorize the term without tracking state changes.",
                component_hints=["HashTableBuckets", "CodeTracePanel"],
                audit_checklist=["hasConcreteObjects", "hasStateChanges", "hasAnimationSteps"],
                visual_plan={"layout": layout, "elements": elements},
                audio_url=scene_audio_urls[index - 1],
            )
        )
    return AnimationScriptContent(
        title="哈希表讲解",
        duration_seconds=sum(scene.duration_seconds for scene in scenes),
        scenes=scenes,
        output=VideoLessonOutput(video_url="", audio_urls=scene_audio_urls),
    )


def test_tts_skill_rejects_missing_real_api_key(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    monkeypatch.setattr(settings, "tts_api_key", "")

    with pytest.raises(RuntimeError, match="TTS_API_KEY is not configured"):
        run(TtsSkill().synthesize("真实旁白", "scene_001", tmp_path))

    assert not list(tmp_path.iterdir())


def test_tts_skill_rejects_doubao_business_error_after_audio_chunk():
    body = (
        json.dumps({"code": 0, "message": "", "data": base64.b64encode(b"partial").decode()})
        + "\n"
        + json.dumps({"code": 45000000, "message": "speaker permission denied", "data": None})
    ).encode()

    with pytest.raises(RuntimeError, match="Doubao TTS returned code 45000000"):
        TtsSkill()._decode_audio_chunks(body)


def test_video_render_skill_reports_missing_remotion_project(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    monkeypatch.setattr(settings, "video_render_project_path", str(tmp_path / "missing-renderer"))
    lesson = render_ready_lesson()

    with pytest.raises(RuntimeError, match="Remotion renderer is missing"):
        run(VideoRenderSkill().render(lesson, tmp_path / "output"))

    assert not (tmp_path / "output" / "lesson.mp4").exists()


def test_video_render_skill_rejects_empty_scenes_before_dependency_checks(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    monkeypatch.setattr(settings, "video_render_project_path", str(tmp_path / "missing-renderer"))
    lesson = AnimationScriptContent(title="空分镜", duration_seconds=0, scenes=[])

    with pytest.raises(RuntimeError, match="must contain scenes"):
        run(VideoRenderSkill().render(lesson, tmp_path / "output"))

    assert not (tmp_path / "output").exists()


def test_video_render_skill_rejects_audio_output_mismatch_before_dependency_checks(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    monkeypatch.setattr(settings, "video_render_project_path", str(tmp_path / "missing-renderer"))
    lesson = render_ready_lesson()
    lesson.output.audio_urls = lesson.output.audio_urls[:-1]

    with pytest.raises(RuntimeError, match="output.audioUrls must match"):
        run(VideoRenderSkill().render(lesson, tmp_path / "output"))

    assert not (tmp_path / "output").exists()


def test_video_render_skill_rejects_non_http_audio_url_before_dependency_checks(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    monkeypatch.setattr(settings, "video_render_project_path", str(tmp_path / "missing-renderer"))
    audio_urls = [f"http://localhost:8000/storage/test/scene_{index:03d}.mp3" for index in range(1, 9)]
    audio_urls[0] = str(tmp_path / "scene_001.mp3")
    lesson = render_ready_lesson(audio_urls)

    with pytest.raises(RuntimeError, match=r"HTTP\(S\) storage URL"):
        run(VideoRenderSkill().render(lesson, tmp_path / "output"))

    assert not (tmp_path / "output").exists()


def test_quality_audit_rejects_abstract_scene_without_domain_component():
    lesson = render_ready_lesson()

    with pytest.raises(RuntimeError, match="data-structure visual component"):
        QualityAuditSkill().audit(lesson)


def test_v2_visual_director_replaces_malformed_llm_visual_elements():
    scene_types = ["hook", "definition", "analogy", "mechanism", "comparison", "process", "example", "summary"]
    storyboard = {
        "title": "数组科普",
        "scenes": [
            {
                "sceneType": scene_type,
                "title": f"场景 {index}",
                "narration": "观察数组元素如何根据下标定位。",
                "visualPlan": {"layout": "grid_focus", "elements": [{"type": "array_cells"}]},
            }
            for index, scene_type in enumerate(scene_types, start=1)
        ],
    }
    lesson = AnimationSpecSkill().normalize(
        None,
        storyboard,
        schema_version="2.0",
        documents=[RetrievedDocument(id="doc_001", sourceId="source_001", title="数组", content="数组支持按下标访问。", score=1)],
    )

    assert lesson.schema_version == "2.0"
    assert lesson.scenes[1].beats[0].source_ids == ["doc_001"]
    assert lesson.scenes[1].beats[0].visual_plan.elements[0].type == "array_cells"
    QualityAuditSkill().audit(lesson)

    audio_urls = []
    for scene in lesson.scenes:
        for beat in scene.beats:
            beat.audio_url = f"http://localhost:8000/storage/test/{beat.beat_id}.mp3"
            audio_urls.append(beat.audio_url)
    lesson.output.audio_urls = audio_urls
    payload = VideoRenderSkill()._validate_lesson_for_render(lesson)
    assert payload["theme"] == "warm_academic"
    assert payload["output"]["audioUrls"] == audio_urls


def test_video_request_saves_failed_resources_without_fake_file_url(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "tts_api_key", "")
    repository = ResourceRepository()
    service = ResourceService(
        repository=repository,
        profile_repository=ProfileRepository(),
        learning_path_repository=LearningPathRepository(),
    )

    plan = run(
        service.generate_resources(
            ResourceGenerateRequest(
                user_id="user_video_failure_001",
                course_id="course_ds_001",
                node_id="node_stack_001",
                resource_types=["video_script", "animation_script"],
            )
        )
    )

    assert plan.result.status == "failed"
    assert [resource.resource_type for resource in plan.resources] == ["video_script", "animation_script"]
    assert all(resource.status == "failed" for resource in plan.resources)
    assert all(resource.audit_status == "unchecked" for resource in plan.resources)
    assert all(resource.file_url is None for resource in plan.resources)
    assert all(json.loads(resource.content)["scenes"] == [] for resource in plan.resources)
    assert plan.result.progress == 100
    assert plan.result.current_stage == "error"
    assert plan.result.error_message


def test_video_request_fails_in_mock_mode_without_fake_media():
    repository = ResourceRepository()
    service = ResourceService(
        repository=repository,
        profile_repository=ProfileRepository(),
        learning_path_repository=LearningPathRepository(),
    )

    plan = run(
        service.generate_resources(
            ResourceGenerateRequest(
                user_id="user_video_mock_rejected_001",
                course_id="course_ds_001",
                node_id="node_stack_001",
                resource_types=["video_script", "animation_script"],
            )
        )
    )

    assert plan.result.status == "failed"
    assert all(resource.file_url is None for resource in plan.resources)
    assert all(resource.status == "failed" for resource in plan.resources)


def test_video_audit_rejection_never_returns_success():
    class RejectingVideoGenerationService:
        async def generate(self, **kwargs):
            raise VideoAuditError(AuditStatus.rejected)

    repository = ResourceRepository()
    service = ResourceService(
        repository=repository,
        profile_repository=ProfileRepository(),
        learning_path_repository=LearningPathRepository(),
        video_generation_service=RejectingVideoGenerationService(),
    )

    plan = run(
        service.generate_resources(
            ResourceGenerateRequest(
                user_id="user_video_audit_rejected_001",
                course_id="course_ds_001",
                node_id="node_stack_001",
                resource_types=["video_script", "animation_script"],
            )
        )
    )

    assert plan.result.status == "failed"
    assert all(resource.status == "failed" for resource in plan.resources)
    assert all(resource.audit_status == "rejected" for resource in plan.resources)
    assert all(resource.file_url is None for resource in plan.resources)


def test_successful_video_request_records_generation_stages():
    class SuccessfulVideoGenerationService:
        async def generate(self, **kwargs):
            progress_callback = kwargs["progress_callback"]
            for stage, progress in [
                ("script", 12),
                ("storyboard", 28),
                ("quality_audit", 42),
                ("tts", 60),
                ("render", 78),
                ("audit", 90),
            ]:
                progress_callback(stage, progress)
            lesson = render_ready_lesson()
            lesson.output.video_url = "http://localhost:8000/storage/generated_resources/test/lesson.mp4"
            return lesson

    repository = ResourceRepository()
    service = ResourceService(
        repository=repository,
        profile_repository=ProfileRepository(),
        learning_path_repository=LearningPathRepository(),
        video_generation_service=SuccessfulVideoGenerationService(),
    )

    plan = run(
        service.generate_resources(
            ResourceGenerateRequest(
                user_id="user_video_success_001",
                course_id="course_ds_001",
                node_id="node_stack_001",
                resource_types=["video_script", "animation_script"],
            )
        )
    )
    stages = [event.stage for event in repository.list_generation_events(plan.result.task_id)]

    assert plan.result.status == "success"
    assert plan.result.progress == 100
    assert plan.result.current_stage == "done"
    assert ["script", "storyboard", "quality_audit", "tts", "render", "audit", "persist", "done"] == [
        stage for stage in stages if stage in {"script", "storyboard", "quality_audit", "tts", "render", "audit", "persist", "done"}
    ][-8:]
