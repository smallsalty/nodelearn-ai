import asyncio
import hashlib
import json
import os
import shutil
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

from app.services.video_pipeline.media import MediaValidator
from app.services.video_pipeline.models import ContextNode, LearnerContext, SceneAudio, VideoGenerationContext
from app.services.video_pipeline.planning import deterministic_strategy, hash_fallback_storyboard
from app.services.video_pipeline.projection import build_render_manifest, project_public_v2
from app.services.video_pipeline.registry import SceneTemplateRegistry
from app.services.video_pipeline.timeline import resolve_timeline


RUN_E2E = os.getenv("RUN_VIDEO_RENDER_E2E") == "1"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        return


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


@pytest.mark.skipif(not RUN_E2E, reason="set RUN_VIDEO_RENDER_E2E=1 to render the fixture MP4")
def test_hash_fixture_renders_real_h264_aac_mp4_with_changing_keyframes(tmp_path: Path):
    if not all(shutil.which(command) for command in ("node", "ffmpeg", "ffprobe")):
        pytest.skip("Node.js and FFmpeg tools are required")
    repo_root = Path(__file__).resolve().parents[4]
    renderer = repo_root / "video-renderer"
    if not (renderer / "node_modules" / "@remotion" / "renderer").exists():
        pytest.skip("Remotion dependencies are not installed")

    audio_dir = tmp_path / "audio"
    audio_dir.mkdir()
    for index in range(1, 7):
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"sine=frequency={320 + index * 45}:sample_rate=44100", "-t", "3.2", "-q:a", "5", str(audio_dir / f"scene_{index:02d}.mp3")],
            check=True,
        )

    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(audio_dir)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        context = VideoGenerationContext(
            course_id="course_hash_fixture",
            current_node=ContextNode(id="node_hash_fixture", name="哈希表", difficulty="easy"),
            learner=LearnerContext(cognitive_style="diagram", knowledge_base_level="easy"),
        )
        storyboard = hash_fallback_storyboard(context, deterministic_strategy(context))
        audio = {
            scene.id: SceneAudio(
                scene_id=scene.id,
                path=str(audio_dir / f"{scene.id}.mp3"),
                url=f"http://127.0.0.1:{server.server_port}/{scene.id}.mp3",
                duration_seconds=probe_duration(audio_dir / f"{scene.id}.mp3"),
            )
            for scene in storyboard.scenes
        }
        timeline = resolve_timeline(storyboard, audio)
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
            plans=SceneTemplateRegistry().resolve_all(storyboard.scenes),
            timeline=timeline,
            audio_by_scene=audio,
            theme="warm_academic",
            aspect_ratio="16:9",
            quality_preset="standard",
            width=1280,
            height=720,
            subtitle_enabled=True,
        )
        input_path = tmp_path / "render-input.json"
        video_path = tmp_path / "hash-fixture.mp4"
        input_path.write_text(
            json.dumps({"lesson": lesson.model_dump(by_alias=True, mode="json"), "renderManifest": manifest, "qualityPreset": "standard"}, ensure_ascii=False),
            encoding="utf-8",
        )
        subprocess.run(
            ["node", str(renderer / "render.mjs"), "--input", str(input_path), "--output", str(video_path)],
            cwd=renderer,
            check=True,
            timeout=240,
        )
        probe = asyncio.run(MediaValidator().probe_and_validate(video_path, timeline=timeline, width=1280, height=720, fps=30))
        assert probe.video.codec_name == "h264"
        assert probe.audio.codec_name == "aac"

        for scene in timeline.scenes:
            early = tmp_path / f"{scene.scene_id}-early.png"
            late = tmp_path / f"{scene.scene_id}-late.png"
            for frame, output in ((scene.start_frame + 5, early), (scene.start_frame + scene.duration_frames - 10, late)):
                subprocess.run(
                    ["ffmpeg", "-y", "-v", "error", "-i", str(video_path), "-vf", f"select=eq(n\\,{frame})", "-frames:v", "1", str(output)],
                    check=True,
                )
            assert hashlib.sha256(early.read_bytes()).digest() != hashlib.sha256(late.read_bytes()).digest()
    finally:
        server.shutdown()
        server.server_close()
