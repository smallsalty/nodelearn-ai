import json
import shutil
import subprocess
from pathlib import Path

import httpx
import pytest

from app.core.config import settings

pytestmark = pytest.mark.skipif(
    not settings.run_real_video_tests,
    reason="set RUN_REAL_VIDEO_TESTS=true to run paid Doubao and Remotion integration",
)


def test_real_video_generation_produces_audio_mp4_and_passed_audit(tmp_path: Path):
    ffprobe = shutil.which(settings.ffprobe_binary)
    assert ffprobe, f"ffprobe is not available: {settings.ffprobe_binary}"

    timeout = settings.video_render_timeout_seconds + settings.tts_timeout_seconds * 4
    with httpx.Client(base_url=settings.audit_api_base_url, timeout=timeout) as client:
        generated_response = client.post(
            "/resources/generate",
            json={
                "userId": "user_real_video_test_001",
                "courseId": "course_ds_001",
                "nodeId": "node_stack_001",
                "resourceTypes": ["video_script", "animation_script"],
            },
        )
        generated_response.raise_for_status()
        generated = generated_response.json()["data"]
        assert generated["status"] == "success"
        assert len(generated["resourceIds"]) == 2

        details = [client.get(f"/resources/{resource_id}").json()["data"] for resource_id in generated["resourceIds"]]
        assert {detail["resourceType"] for detail in details} == {"video_script", "animation_script"}
        assert all(detail["auditStatus"] == "passed" for detail in details)
        assert all(detail["fileUrl"] for detail in details)
        assert len({detail["fileUrl"] for detail in details}) == 1

        content = json.loads(details[0]["content"])
        assert content["scenes"]
        assert all(scene["audioUrl"] for scene in content["scenes"])

        for scene in content["scenes"]:
            audio_response = client.get(scene["audioUrl"])
            audio_response.raise_for_status()
            assert len(audio_response.content) > 256

        mp4_response = client.get(details[0]["fileUrl"])
        mp4_response.raise_for_status()
        assert len(mp4_response.content) > 1024

    mp4_path = tmp_path / "lesson.mp4"
    mp4_path.write_bytes(mp4_response.content)
    probe = subprocess.run(
        [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type",
            "-of",
            "json",
            str(mp4_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    codec_types = {item["codec_type"] for item in json.loads(probe.stdout)["streams"]}
    assert {"audio", "video"} <= codec_types
