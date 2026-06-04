import json
import hashlib
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


def visual_element_text(element: dict) -> str:
    values = []
    for key in ("content", "name", "label", "alt"):
        value = element.get(key)
        if value:
            values.append(str(value))
    items = element.get("items")
    if isinstance(items, list):
        values.extend(str(item) for item in items)
    return "".join(values)


def test_real_video_generation_produces_audio_mp4_and_passed_audit(tmp_path: Path):
    ffprobe = shutil.which(settings.ffprobe_binary)
    assert ffprobe, f"ffprobe is not available: {settings.ffprobe_binary}"
    ffmpeg = shutil.which(settings.ffmpeg_binary)
    assert ffmpeg, f"ffmpeg is not available: {settings.ffmpeg_binary}"

    timeout = settings.video_render_timeout_seconds + settings.tts_timeout_seconds * 4
    with httpx.Client(base_url=settings.audit_api_base_url, timeout=timeout) as client:
        generated_response = client.post(
            "/resources/generate",
            json={
                "userId": "user_real_video_test_001",
                "courseId": "course_ds_001",
                "nodeId": "node_docs_chapter_hashing_hash_map_md_f99bbe2ebac4",
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
        assert content["style"] == "clean_motion_graphics"
        assert content["aspectRatio"] == "16:9"
        assert content["output"]["videoUrl"] == details[0]["fileUrl"]
        assert [scene["sceneType"] for scene in content["scenes"]] == [
            "hook", "definition", "analogy", "mechanism", "comparison", "process", "example", "summary"
        ]
        scene_audio_urls = [scene["audioUrl"] for scene in content["scenes"]]
        assert all(scene_audio_urls)
        assert content["output"]["audioUrls"] == scene_audio_urls
        assert all(scene["visualPlan"]["elements"] for scene in content["scenes"])
        assert all(all(element["animation"] for element in scene["visualPlan"]["elements"]) for scene in content["scenes"])
        definition = next(scene for scene in content["scenes"] if scene["sceneType"] == "definition")
        assert 1 <= sum(element["type"] == "keyword" for element in definition["visualPlan"]["elements"]) <= 3
        summary = next(scene for scene in content["scenes"] if scene["sceneType"] == "summary")
        assert sum(element["type"] == "card" for element in summary["visualPlan"]["elements"]) == 3
        for scene in content["scenes"]:
            visible_text = "".join(visual_element_text(element) for element in scene["visualPlan"]["elements"])
            assert len(visible_text) <= 80

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

    scene_start = 0.0
    for scene in content["scenes"]:
        frame_hashes = []
        for offset in (0.2, min(2.5, scene["durationSeconds"] - 0.2)):
            frame = subprocess.run(
                [ffmpeg, "-ss", str(scene_start + offset), "-i", str(mp4_path), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"],
                check=True,
                capture_output=True,
            )
            frame_hashes.append(hashlib.sha256(frame.stdout).hexdigest())
        assert len(set(frame_hashes)) == 2, f"{scene['sceneId']} rendered as a static card"
        scene_start += scene["durationSeconds"]
