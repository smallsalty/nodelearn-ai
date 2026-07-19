from __future__ import annotations

import math
import re

from app.services.video_pipeline.models import (
    ResolvedBeat,
    ResolvedTimeline,
    ResolvedTimelineScene,
    SceneAudio,
    SubtitleCue,
    VideoStoryboard,
)


TARGET_DURATION_TOLERANCE_RATIO = 0.15


def validate_target_duration(
    actual_duration_seconds: float,
    target_duration_seconds: float | None,
    *,
    tolerance_ratio: float = TARGET_DURATION_TOLERANCE_RATIO,
) -> None:
    """Reject lessons that materially miss the duration requested by the user."""

    if target_duration_seconds is None:
        return
    lower_bound = target_duration_seconds * (1 - tolerance_ratio)
    upper_bound = target_duration_seconds * (1 + tolerance_ratio)
    if not lower_bound <= actual_duration_seconds <= upper_bound:
        raise RuntimeError(
            "video duration is outside the target tolerance: "
            f"target={target_duration_seconds:.3f}s, actual={actual_duration_seconds:.3f}s, "
            f"allowed={lower_bound:.3f}-{upper_bound:.3f}s"
        )


_PHRASE_BREAK = re.compile(r"(?<=[。！？；!?;，,：:])")


def split_subtitle_phrases(text: str, max_chars: int = 36) -> list[str]:
    compact = re.sub(r"\s+", " ", text).strip()
    if not compact:
        return []
    clauses = [item.strip() for item in _PHRASE_BREAK.split(compact) if item.strip()]
    phrases: list[str] = []
    for clause in clauses:
        while len(clause) > max_chars:
            cut = min(max_chars, len(clause))
            preferred = max(clause.rfind(mark, 0, cut + 1) for mark in ("，", ",", "、", " "))
            if preferred >= 10:
                cut = preferred + 1
            phrases.append(clause[:cut].strip())
            clause = clause[cut:].strip()
        if clause:
            phrases.append(clause)
    return phrases


def _phrase_weight(phrase: str) -> float:
    content_weight = max(1, len(re.sub(r"[\s，。！？；、,.!?;:]", "", phrase)))
    pause = 2.4 if phrase.endswith(("。", "！", "？", ".", "!", "?")) else 1.4 if phrase.endswith(("；", ";")) else 0.7
    return content_weight + pause


def resolve_timeline(
    storyboard: VideoStoryboard,
    audio_by_scene: dict[str, SceneAudio],
    *,
    fps: int = 30,
) -> ResolvedTimeline:
    resolved_scenes: list[ResolvedTimelineScene] = []
    cursor = 0
    for scene in storyboard.scenes:
        audio = audio_by_scene.get(scene.id)
        if audio is None:
            raise RuntimeError(f"missing audio for scene: {scene.id}")
        duration_frames = math.ceil((audio.duration_seconds + 0.35) * fps)
        duration_seconds = duration_frames / fps
        if duration_seconds < 3:
            raise RuntimeError(f"scene audio is too short for public v2 pacing: {scene.id}")
        if duration_seconds > 15:
            raise RuntimeError(f"scene audio is too long for public v2 pacing: {scene.id}")
        if scene.narrative_role == "hook" and duration_seconds > 8:
            raise RuntimeError("hook scene audio must not exceed 8 seconds")

        beats = [
            ResolvedBeat(
                id=beat.id,
                action=beat.action,
                targets=beat.targets,
                start_frame=min(duration_frames - 1, max(0, math.floor(beat.start_ratio * duration_frames))),
                end_frame=min(duration_frames, max(1, math.ceil(beat.end_ratio * duration_frames))),
                emphasis=beat.emphasis,
            )
            for beat in scene.beats
        ]
        for beat in beats:
            if beat.end_frame <= beat.start_frame:
                beat.end_frame = min(duration_frames, beat.start_frame + 1)

        phrases = split_subtitle_phrases(scene.narration)
        audio_frames = max(1, math.ceil(audio.duration_seconds * fps))
        weights = [_phrase_weight(item) for item in phrases]
        weight_total = sum(weights) or 1
        subtitle_cursor = 0
        cumulative_weight = 0.0
        subtitles: list[SubtitleCue] = []
        for index, (phrase, weight) in enumerate(zip(phrases, weights, strict=True)):
            cumulative_weight += weight
            if index == len(phrases) - 1:
                end_frame = audio_frames
            else:
                end_frame = max(
                    subtitle_cursor + 1,
                    round(audio_frames * cumulative_weight / weight_total),
                )
            end_frame = min(audio_frames, end_frame)
            midpoint = (subtitle_cursor + end_frame) / 2
            highlights = list(
                dict.fromkeys(
                    beat.emphasis
                    for beat in beats
                    if beat.emphasis
                    and beat.start_frame <= midpoint <= beat.end_frame
                    and beat.emphasis in phrase
                )
            )[:4]
            subtitles.append(
                SubtitleCue(
                    id=f"{scene.id}_subtitle_{index + 1:02d}",
                    text=phrase,
                    start_frame=subtitle_cursor,
                    end_frame=max(subtitle_cursor + 1, end_frame),
                    highlight_terms=highlights,
                )
            )
            subtitle_cursor = end_frame

        resolved_scenes.append(
            ResolvedTimelineScene(
                scene_id=scene.id,
                start_frame=cursor,
                duration_frames=duration_frames,
                audio_duration_seconds=audio.duration_seconds,
                beats=beats,
                subtitles=subtitles,
            )
        )
        cursor += duration_frames

    return ResolvedTimeline(
        fps=fps,
        scenes=resolved_scenes,
        total_frames=cursor,
        total_duration_seconds=cursor / fps,
    )
