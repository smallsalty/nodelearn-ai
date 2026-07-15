from __future__ import annotations

import asyncio
import json
import shutil
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.services.video_pipeline.models import MediaProbeResult, MediaStream, ResolvedTimeline


def render_dimensions(aspect_ratio: str, quality_preset: str) -> tuple[int, int]:
    long_edge = {"standard": 1280, "high": 1920, "ultra": 2560}.get(quality_preset, 1920)
    short_edge = {"standard": 720, "high": 1080, "ultra": 1440}.get(quality_preset, 1080)
    if aspect_ratio == "9:16":
        return short_edge, long_edge
    if aspect_ratio == "1:1":
        edge = {"standard": 720, "high": 1080, "ultra": 1440}.get(quality_preset, 1080)
        return edge, edge
    return long_edge, short_edge


def _rate(value: str | None) -> float:
    if not value:
        return 0
    if "/" not in value:
        return float(value)
    numerator, denominator = value.split("/", 1)
    return float(numerator) / max(float(denominator), 1)


class MediaValidator:
    async def probe_and_validate(
        self,
        path: Path,
        *,
        timeline: ResolvedTimeline,
        width: int,
        height: int,
        fps: int = 30,
    ) -> MediaProbeResult:
        if not path.is_file() or path.stat().st_size <= 0:
            raise RuntimeError("MP4 output is missing or empty")
        ffprobe = shutil.which(settings.ffprobe_binary) or (
            settings.ffprobe_binary if Path(settings.ffprobe_binary).is_file() else None
        )
        if ffprobe is None:
            raise RuntimeError(f"ffprobe is not available: {settings.ffprobe_binary}")
        process = await asyncio.create_subprocess_exec(
            ffprobe,
            "-v",
            "error",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            str(path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            raise RuntimeError(f"ffprobe rejected MP4 output: {stderr.decode(errors='replace').strip()}")
        try:
            raw: dict[str, Any] = json.loads(stdout.decode())
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise RuntimeError("ffprobe returned invalid JSON") from exc

        return self.validate_probe_payload(
            raw,
            path=path,
            size_bytes=path.stat().st_size,
            timeline=timeline,
            width=width,
            height=height,
            fps=fps,
        )

    @staticmethod
    def validate_probe_payload(
        raw: dict[str, Any],
        *,
        path: Path,
        size_bytes: int,
        timeline: ResolvedTimeline,
        width: int,
        height: int,
        fps: int = 30,
    ) -> MediaProbeResult:
        streams = raw.get("streams") if isinstance(raw.get("streams"), list) else []
        video_raw = next((item for item in streams if item.get("codec_type") == "video"), None)
        audio_raw = next((item for item in streams if item.get("codec_type") == "audio"), None)
        if not isinstance(video_raw, dict) or not isinstance(audio_raw, dict):
            raise RuntimeError("MP4 output must contain audio and video streams")
        duration = float((raw.get("format") or {}).get("duration") or 0)
        video = MediaStream(
            codec_type="video",
            codec_name=str(video_raw.get("codec_name") or ""),
            width=int(video_raw.get("width") or 0),
            height=int(video_raw.get("height") or 0),
            avg_frame_rate=str(video_raw.get("avg_frame_rate") or ""),
            duration=float(video_raw["duration"]) if video_raw.get("duration") else None,
        )
        audio = MediaStream(
            codec_type="audio",
            codec_name=str(audio_raw.get("codec_name") or ""),
            duration=float(audio_raw["duration"]) if audio_raw.get("duration") else None,
        )
        if video.codec_name != "h264":
            raise RuntimeError(f"MP4 video codec must be H.264, got {video.codec_name}")
        if audio.codec_name != "aac":
            raise RuntimeError(f"MP4 audio codec must be AAC, got {audio.codec_name}")
        if (video.width, video.height) != (width, height):
            raise RuntimeError(
                f"MP4 dimensions must be {width}x{height}, got {video.width}x{video.height}"
            )
        actual_fps = _rate(video.avg_frame_rate)
        if abs(actual_fps - fps) > 0.01:
            raise RuntimeError(f"MP4 frame rate must be {fps}fps, got {actual_fps:.3f}")
        tolerance = max(0.75, timeline.total_duration_seconds * 0.01)
        if abs(duration - timeline.total_duration_seconds) > tolerance:
            raise RuntimeError(
                "MP4 duration does not match resolved timeline: "
                f"expected {timeline.total_duration_seconds:.3f}s, got {duration:.3f}s"
            )
        return MediaProbeResult(
            path=str(path),
            size_bytes=size_bytes,
            duration_seconds=duration,
            video=video,
            audio=audio,
            raw_probe=raw,
        )
