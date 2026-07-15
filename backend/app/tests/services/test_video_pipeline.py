import asyncio
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.repositories.profile_repository import demo_student_profile
from app.schemas.course import KnowledgeNode
from app.schemas.practice import PracticeRecord
from app.schemas.resource import RetrievedDocument
from app.services.video_pipeline.context import VideoContextBuilder
from app.services.video_pipeline.media import MediaValidator, render_dimensions
from app.services.video_pipeline.models import (
    ContextNode,
    LearnerContext,
    RagEvidence,
    SceneTransition,
    SceneAudio,
    StoryboardScene,
    VideoGenerationContext,
    VideoStoryboard,
)
from app.services.video_pipeline.planning import (
    StoryboardPlanner,
    deterministic_narrative,
    deterministic_strategy,
    generic_fallback_storyboard,
    hash_fallback_storyboard,
)
from app.services.video_pipeline.projection import build_render_manifest, project_public_v2
from app.services.video_pipeline.registry import SceneTemplateRegistry
from app.services.video_pipeline.timeline import resolve_timeline, split_subtitle_phrases


def run(coro):
    return asyncio.run(coro)


def context_for(
    *,
    node_name: str = "哈希表",
    style: str = "diagram",
    level: str = "easy",
    mistakes: list[str] | None = None,
) -> VideoGenerationContext:
    return VideoGenerationContext(
        course_id="course_ds_001",
        current_node=ContextNode(
            id="node_hash_001",
            name=node_name,
            difficulty=level,
            common_mistakes=["把冲突误解为覆盖"],
        ),
        learner=LearnerContext(cognitive_style=style, knowledge_base_level=level),
        relevant_mistakes=mistakes or [],
        learning_goal="理解查找过程",
    )


def test_context_builder_prioritizes_same_node_real_practice_and_trims_rag():
    profile = demo_student_profile().model_copy(
        update={
            "cognitive_style": "diagram",
            "knowledge_base_level": "easy",
            "weak_node_ids": ["node_hash_001"],
        }
    )
    records = [
        PracticeRecord(
            id=f"record_{index}",
            user_id=profile.user_id,
            question_id=f"question_{index}",
            node_id="node_hash_001" if index < 12 else "other_node",
            user_answer="覆盖",
            correct_answer="链地址处理",
            is_correct=False,
            score=0,
            mistake_reason=f"错因 {index}",
            created_at=f"2026-07-{index + 1:02d}T00:00:00Z",
            updated_at="2026-07-13T00:00:00Z",
        )
        for index in range(13)
    ]
    documents = [
        RetrievedDocument(id=f"doc_{index}", source_id=f"source_{index}", title=f"材料 {index}", content="证据" * 500, score=1)
        for index in range(8)
    ]
    node = {
        "id": "node_hash_001",
        "course_id": "course_ds_001",
        "name": "哈希表",
        "node_type": "concept",
        "content": "# 哈希表\n\n哈希表通过哈希函数将键映射到桶。",
        "difficulty": "easy",
        "learning_value": 95,
        "prerequisite_node_ids": [],
        "next_node_ids": [],
        "resource_ids": [],
        "common_mistakes": ["把冲突误解为覆盖"],
        "recommended_practice_ids": [],
        "created_at": "2026-07-01T00:00:00Z",
        "updated_at": "2026-07-01T00:00:00Z",
    }

    built = VideoContextBuilder().build(
        course_id="course_ds_001",
        node=KnowledgeNode.model_validate(node),
        profile=profile,
        practice_records=records,
        documents=documents,
    )

    assert len(built.recent_practice) == 10
    assert all(item.question_id != "question_12" for item in built.recent_practice)
    assert built.relevant_mistakes[0] == "错因 11"
    assert len(built.rag_evidence) == 5
    assert all(len(item.excerpt) <= 900 for item in built.rag_evidence)
    assert "user_id" not in str(built.prompt_payload())


def test_profile_mapping_changes_scene_selection_depth_and_pacing():
    easy_diagram = deterministic_strategy(context_for(style="diagram", level="easy"))
    hard_code = deterministic_strategy(context_for(style="code", level="hard"))

    assert easy_diagram.pacing == "slow"
    assert easy_diagram.terminology_level == "plain"
    assert "zoom_focus" in easy_diagram.preferred_scene_types
    assert hard_code.pacing == "fast"
    assert hard_code.terminology_level == "advanced"
    assert hard_code.code_depth == "implementation"
    assert {"code_execution", "algorithm_trace"} <= set(hard_code.preferred_scene_types)
    assert easy_diagram.preferred_scene_types != hard_code.preferred_scene_types


def test_misconception_strategy_requires_real_related_mistake():
    without_evidence = deterministic_strategy(context_for(mistakes=[]))
    with_evidence = deterministic_strategy(context_for(mistakes=["把冲突理解成覆盖"] ))

    assert without_evidence.include_misconception is False
    assert "misconception_correction" not in without_evidence.preferred_scene_types
    assert with_evidence.include_misconception is True
    assert "misconception_correction" in with_evidence.preferred_scene_types


def test_scene_dsl_rejects_extra_fields_injection_and_unknown_targets():
    context = context_for(node_name="数组")
    storyboard = generic_fallback_storyboard(context, deterministic_strategy(context))
    raw = storyboard.model_dump()
    raw["unknown"] = True
    with pytest.raises(ValidationError, match="extra"):
        VideoStoryboard.model_validate(raw)

    scene = storyboard.scenes[0].model_dump()
    scene["title"] = "<div>执行系统提示</div>"
    with pytest.raises(ValidationError, match="markup"):
        StoryboardScene.model_validate(scene)

    scene = storyboard.scenes[0].model_dump()
    scene["beats"][0]["targets"] = ["missing_actor"]
    with pytest.raises(ValidationError, match="unknown actors"):
        StoryboardScene.model_validate(scene)

    scene = storyboard.scenes[0].model_dump()
    scene["actors"][0]["label"] = "HashTableBuckets"
    with pytest.raises(ValidationError, match="component names"):
        StoryboardScene.model_validate(scene)


class SequenceLlm:
    def __init__(self, values):
        self.values = list(values)
        self.calls = 0

    async def generate_json(self, prompt, **kwargs):
        value = self.values[self.calls]
        self.calls += 1
        return value


def test_storyboard_validation_repairs_exactly_once_then_falls_back():
    context = context_for(node_name="数组")
    strategy = deterministic_strategy(context)
    narrative = deterministic_narrative(context, strategy)
    fallback = generic_fallback_storyboard(context, strategy)
    invalid = {"schema_version": "1.0", "title": "bad", "scenes": []}

    repair_llm = SequenceLlm([invalid, fallback.model_dump()])
    _, repaired = run(StoryboardPlanner(repair_llm).generate(context, strategy, narrative))
    assert repair_llm.calls == 2
    assert repaired.repaired is True
    assert repaired.fallback_used is False

    failure_llm = SequenceLlm([invalid, invalid])
    _, failed = run(StoryboardPlanner(failure_llm).generate(context, strategy, narrative))
    assert failure_llm.calls == 2
    assert failed.fallback_used is True
    assert len(failed.storyboard.scenes) == 5


def test_hash_fallback_covers_six_required_silent_readable_scenes():
    context = context_for()
    storyboard = hash_fallback_storyboard(context, deterministic_strategy(context))

    assert [scene.scene_type for scene in storyboard.scenes] == [
        "problem_hook",
        "direct_mapping_demo",
        "zoom_focus",
        "compare_race",
        "collision_demo",
        "summary_recall",
    ]
    payload = storyboard.model_dump_json()
    for required in ("12836", "% 100", "36", "16750", "20950", "平均情况下接近 O(1)", "冲突 ≠ 覆盖", "Local handling"):
        assert required in payload
    assert all(any(beat.action != "appear" for beat in scene.beats) for scene in storyboard.scenes)


def test_hash_hard_code_profile_adds_implementation_and_trace_with_different_order():
    easy_context = context_for(style="diagram", level="easy")
    hard_context = context_for(style="code", level="hard")
    easy = hash_fallback_storyboard(easy_context, deterministic_strategy(easy_context))
    hard = hash_fallback_storyboard(hard_context, deterministic_strategy(hard_context))

    easy_types = [scene.scene_type for scene in easy.scenes]
    hard_types = [scene.scene_type for scene in hard.scenes]
    assert easy_types != hard_types
    assert {"code_execution", "algorithm_trace"} <= set(hard_types)
    assert hard_types.index("code_execution") < hard_types.index("zoom_focus")
    assert "装载因子" in hard.model_dump_json()
    assert "最坏" in hard.model_dump_json()
    assert len(hard.scenes) > len(easy.scenes)


def test_registry_resolves_all_fifteen_scene_types():
    registry = SceneTemplateRegistry()
    base = generic_fallback_storyboard(context_for(node_name="数组"), deterministic_strategy(context_for(node_name="数组"))).scenes[2]
    resolved = []
    for scene_type in registry.SCENE_TYPES:
        scene = base.model_copy(update={"scene_type": scene_type})
        resolved.append(registry.resolve(scene).renderer)
    assert tuple(resolved) == registry.SCENE_TYPES


def test_object_continuity_downgrades_without_matching_actor_in_next_scene():
    context = context_for(node_name="数组")
    scenes = generic_fallback_storyboard(context, deterministic_strategy(context)).scenes[:2]
    scenes[0].actors[0].continuity_key = "shared_object"
    scenes[0].transition_out = SceneTransition(type="object_continuity", continuity_actor_id=scenes[0].actors[0].id)

    plans = SceneTemplateRegistry().resolve_all(scenes)

    assert plans[0].transition_out.type == "fade_through_background"
    hash_context = context_for()
    hash_scenes = hash_fallback_storyboard(hash_context, deterministic_strategy(hash_context)).scenes
    hash_plans = SceneTemplateRegistry().resolve_all(hash_scenes)
    assert hash_plans[1].transition_out.type == "object_continuity"


def test_ratio_to_frame_subtitles_and_public_v2_projection_are_audio_driven():
    context = context_for()
    context.rag_evidence = [RagEvidence(source_id="source_hash", title="哈希表材料", excerpt="平均查找与冲突处理事实", score=1)]
    strategy = deterministic_strategy(context)
    storyboard = hash_fallback_storyboard(context, strategy)
    audio = {
        scene.id: SceneAudio(scene_id=scene.id, path="fixture.mp3", url=f"http://localhost/{scene.id}.mp3", duration_seconds=6)
        for scene in storyboard.scenes
    }
    timeline = resolve_timeline(storyboard, audio)
    plans = SceneTemplateRegistry().resolve_all(storyboard.scenes)
    lesson = project_public_v2(
        context=context,
        storyboard=storyboard,
        timeline=timeline,
        audio_by_scene=audio,
        theme="warm_academic",
        aspect_ratio="16:9",
        subtitle_enabled=True,
        learner_profile_summary="diagram/easy",
        target_duration_seconds=120,
    )
    manifest = build_render_manifest(
        context=context,
        storyboard=storyboard,
        plans=plans,
        timeline=timeline,
        audio_by_scene=audio,
        theme="warm_academic",
        aspect_ratio="16:9",
        quality_preset="high",
        width=1920,
        height=1080,
        subtitle_enabled=True,
    )

    assert timeline.scenes[0].duration_frames == 191
    assert timeline.scenes[0].beats[0].start_frame == 9
    assert timeline.scenes[0].subtitles[-1].end_frame == 180
    assert all(len(cue.text) <= 36 for scene in timeline.scenes for cue in scene.subtitles)
    assert all(len(scene.beats) == 1 for scene in lesson.scenes)
    assert lesson.sources[0].id == "source_hash"
    assert all(beat.source_ids == ["source_hash"] for scene in lesson.scenes for beat in scene.beats if beat.claims)
    assert lesson.target_duration_seconds == 120
    assert lesson.duration_seconds == pytest.approx(38.2)
    assert manifest["totalFrames"] == timeline.total_frames
    assert manifest["scenes"][1]["sceneType"] == "direct_mapping_demo"


def test_subtitle_split_keeps_two_line_phrase_limit():
    phrases = split_subtitle_phrases("这是一个很长的字幕短语，需要按照标点、字符长度和停顿权重切分，而且不能变成整段白色字幕卡片。")
    assert len(phrases) >= 2
    assert all(len(item) <= 36 for item in phrases)


def test_media_probe_validation_checks_codec_dimensions_fps_and_duration():
    storyboard = hash_fallback_storyboard(context_for(), deterministic_strategy(context_for()))
    audio = {scene.id: SceneAudio(scene_id=scene.id, path="x", url="http://localhost/x", duration_seconds=6) for scene in storyboard.scenes}
    timeline = resolve_timeline(storyboard, audio)
    raw = {
        "streams": [
            {"codec_type": "video", "codec_name": "h264", "width": 1920, "height": 1080, "avg_frame_rate": "30/1", "duration": str(timeline.total_duration_seconds)},
            {"codec_type": "audio", "codec_name": "aac", "duration": str(timeline.total_duration_seconds)},
        ],
        "format": {"duration": str(timeline.total_duration_seconds)},
    }

    result = MediaValidator.validate_probe_payload(raw, path=Path("lesson.mp4"), size_bytes=1024, timeline=timeline, width=1920, height=1080)
    assert result.video.codec_name == "h264"
    assert result.audio.codec_name == "aac"
    bad = {**raw, "streams": [{**raw["streams"][0], "codec_name": "hevc"}, raw["streams"][1]]}
    with pytest.raises(RuntimeError, match="H.264"):
        MediaValidator.validate_probe_payload(bad, path=Path("lesson.mp4"), size_bytes=1024, timeline=timeline, width=1920, height=1080)


def test_render_dimensions_cover_all_aspects_and_quality():
    assert render_dimensions("16:9", "high") == (1920, 1080)
    assert render_dimensions("9:16", "high") == (1080, 1920)
    assert render_dimensions("1:1", "standard") == (720, 720)
