import json
import hashlib
import shutil
import subprocess
import time
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
    with httpx.Client(base_url=settings.audit_api_base_url, timeout=timeout, trust_env=False) as client:
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
        for _ in range(240):
            if generated["status"] not in {"running", "pending"}:
                break
            time.sleep(2)
            generated = client.get(f"/resources/generation-tasks/{generated['taskId']}").json()["data"]
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
        assert content["schemaVersion"] == "2.0"
        assert [scene["sceneType"] for scene in content["scenes"]] == [
            "hook", "definition", "mechanism", "comparison", "example", "summary"
        ]
        assert all(len(scene["beats"]) == 1 for scene in content["scenes"])
        scene_audio_urls = [scene["beats"][0]["audioUrl"] for scene in content["scenes"]]
        assert all(scene_audio_urls)
        assert content["output"]["audioUrls"] == scene_audio_urls
        assert all(scene["beats"][0]["visualPlan"]["elements"] for scene in content["scenes"])
        for scene in content["scenes"]:
            beat = scene["beats"][0]
            visible_text = "".join(visual_element_text(element) for element in beat["visualPlan"]["elements"])
            assert len(visible_text) <= 40
        joined = json.dumps(content, ensure_ascii=False)
        for required in ("12836", "16750", "20950", "平均情况下接近 O(1)", "冲突 ≠ 覆盖"):
            assert required in joined

        for scene in content["scenes"]:
            audio_response = client.get(scene["beats"][0]["audioUrl"])
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
            "stream=codec_type,codec_name,width,height,avg_frame_rate:format=duration,size",
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
    parsed_probe = json.loads(probe.stdout)
    video_stream = next(item for item in parsed_probe["streams"] if item["codec_type"] == "video")
    audio_stream = next(item for item in parsed_probe["streams"] if item["codec_type"] == "audio")
    assert video_stream["codec_name"] == "h264"
    assert audio_stream["codec_name"] == "aac"
    assert (video_stream["width"], video_stream["height"]) == (1920, 1080)
    assert video_stream["avg_frame_rate"] == "30/1"
    assert abs(float(parsed_probe["format"]["duration"]) - content["durationSeconds"]) <= max(0.75, content["durationSeconds"] * 0.01)

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
