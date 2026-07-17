from __future__ import annotations

import re
from typing import Any

from app.schemas.common import VideoAspect, VideoTheme
from app.schemas.video import (
    AnimationScriptContent,
    TextVisualElement,
    VideoLessonOutput,
    VideoLessonScene,
    VideoNarrationBeat,
    VideoSourceReference,
    VisualPlan,
)
from app.services.video_pipeline.models import (
    ResolvedScenePlan,
    ResolvedTimeline,
    SceneAudio,
    VideoGenerationContext,
    VideoStoryboard,
)


def _camel_key(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(item.capitalize() for item in parts[1:])


def _camelize(value: Any) -> Any:
    if isinstance(value, dict):
        return {_camel_key(str(key)): _camelize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_camelize(item) for item in value]
    return value


def _public_screen_text(values: list[str]) -> list[str]:
    result: list[str] = []
    remaining = 40
    for value in values[:3]:
        compact = re.sub(r"\s+", " ", value).strip()
        if not compact or remaining <= 0:
            continue
        clipped = compact[:remaining]
        result.append(clipped)
        remaining -= len(clipped)
    return result or ["过程演示"]


def _layout(scene_type: str) -> str:
    if scene_type in {"direct_mapping_demo", "process_flow", "step_by_step", "algorithm_trace", "summary_recall"}:
        return "pipeline"
    if scene_type in {"compare_race", "before_after", "misconception_correction"}:
        return "comparison"
    if scene_type == "timeline":
        return "timeline"
    if scene_type in {"zoom_focus", "collision_demo", "data_structure_operation"}:
        return "grid_focus"
    if scene_type == "concept_relationship":
        return "summary_cards"
    return "center_focus"


def build_render_manifest(
    *,
    context: VideoGenerationContext,
    storyboard: VideoStoryboard,
    plans: list[ResolvedScenePlan],
    timeline: ResolvedTimeline,
    audio_by_scene: dict[str, SceneAudio],
    theme: str,
    aspect_ratio: str,
    quality_preset: str,
    width: int,
    height: int,
    subtitle_enabled: bool,
) -> dict[str, Any]:
    timeline_by_scene = {item.scene_id: item for item in timeline.scenes}
    plan_by_scene = {item.scene_id: item for item in plans}
    scenes: list[dict[str, Any]] = []
    for scene in storyboard.scenes:
        resolved = timeline_by_scene[scene.id]
        plan = plan_by_scene[scene.id]
        audio = audio_by_scene[scene.id]
        scene_value = {
            "id": scene.id,
            "narrative_role": scene.narrative_role,
            "scene_type": scene.scene_type,
            "title": scene.title,
            "teaching_purpose": scene.teaching_purpose,
            "narration": scene.narration,
            "screen_text": scene.screen_text,
            "actors": [actor.model_dump(mode="json") for actor in scene.actors],
            "beats": [beat.model_dump(mode="json") for beat in resolved.beats],
            "subtitles": [cue.model_dump(mode="json") for cue in resolved.subtitles],
            "audio_url": audio.url,
            "start_frame": resolved.start_frame,
            "duration_frames": resolved.duration_frames,
            "named_slots": plan.named_slots,
            "transition_out": plan.transition_out.model_dump(mode="json"),
        }
        scenes.append(_camelize(scene_value))
    return {
        "schemaVersion": "1.0",
        "courseId": context.course_id,
        "nodeId": context.current_node.id,
        "title": storyboard.title,
        "theme": theme,
        "aspectRatio": aspect_ratio,
        "qualityPreset": quality_preset,
        "subtitleEnabled": subtitle_enabled,
        "fps": timeline.fps,
        "width": width,
        "height": height,
        "totalFrames": timeline.total_frames,
        "scenes": scenes,
    }


def project_public_v2(
    *,
    context: VideoGenerationContext,
    storyboard: VideoStoryboard,
    timeline: ResolvedTimeline,
    audio_by_scene: dict[str, SceneAudio],
    theme: str | VideoTheme,
    aspect_ratio: str | VideoAspect,
    subtitle_enabled: bool,
    learner_profile_summary: str | None,
    target_duration_seconds: float | None,
) -> AnimationScriptContent:
    timeline_by_scene = {item.scene_id: item for item in timeline.scenes}
    public_scenes: list[VideoLessonScene] = []
    audio_urls: list[str] = []
    for scene in storyboard.scenes:
        resolved = timeline_by_scene[scene.id]
        audio = audio_by_scene[scene.id]
        duration = resolved.duration_frames / timeline.fps
        screen_text = _public_screen_text(scene.screen_text)
        preview = VisualPlan(
            layout=_layout(scene.scene_type),
            elements=[
                TextVisualElement(
                    type="keyword",
                    content=screen_text[0][:36],
                    animation="highlight",
                )
            ],
        )
        source_ids = scene.source_ids
        claims = scene.claims if source_ids else []
        beat = VideoNarrationBeat(
            beat_id=scene.id,
            narration=scene.narration,
            duration_seconds=duration,
            screen_text=screen_text,
            claims=claims,
            source_ids=source_ids,
            visual_plan=preview,
            audio_url=audio.url,
        )
        public_scenes.append(
            VideoLessonScene(
                scene_id=scene.id,
                scene_type=scene.narrative_role,
                title=scene.title,
                teaching_purpose=scene.teaching_purpose,
                concrete_objects=[actor.label or actor.id for actor in scene.actors[:6]],
                animation_steps=[],
                state_changes=[beat.emphasis for beat in scene.beats if beat.emphasis][:6],
                screen_text=screen_text,
                misconception_fix=(
                    scene.teaching_purpose if scene.scene_type == "misconception_correction" else ""
                ),
                component_hints=[],
                audit_checklist=["Scene DSL validated", "timing resolved from scene audio"],
                visual_plan=preview,
                beats=[beat],
            )
        )
        audio_urls.append(audio.url)

    theme_value = theme.value if hasattr(theme, "value") else str(theme)
    aspect_value = aspect_ratio.value if hasattr(aspect_ratio, "value") else str(aspect_ratio)
    sources = [
        VideoSourceReference(id=item.source_id, title=item.title, source_id=item.source_id)
        for item in context.rag_evidence
    ]
    return AnimationScriptContent(
        schema_version="2.0",
        title=storyboard.title,
        theme=theme_value,
        duration_seconds=timeline.total_duration_seconds,
        target_duration_seconds=target_duration_seconds,
        aspect_ratio=aspect_value,
        course_id=context.course_id,
        node_id=context.current_node.id,
        learner_profile_summary=learner_profile_summary,
        subtitle_enabled=subtitle_enabled,
        sources=sources,
        scenes=public_scenes,
        output=VideoLessonOutput(video_url="", audio_urls=audio_urls),
    )
