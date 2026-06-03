from pathlib import Path

import pytest
from pydantic import ValidationError

from app.schemas.video import AnimationScriptContent, VideoLessonScene


def scene_payload(**updates):
    payload = {
        "scene_id": "scene_001",
        "scene_type": "definition",
        "title": "哈希表是什么",
        "narration": "哈希表通过哈希函数把键映射到存储位置。",
        "duration_seconds": 12,
        "visual_plan": {
            "layout": "center_focus",
            "elements": [
                {"type": "keyword", "content": "键", "animation": "pop_in"},
                {"type": "keyword", "content": "哈希函数", "animation": "pop_in"},
                {"type": "keyword", "content": "位置", "animation": "pop_in"},
            ],
        },
        "audio_url": "",
    }
    payload.update(updates)
    return payload


def test_video_lesson_scene_uses_motion_graphics_contract_fields():
    scene = VideoLessonScene(**scene_payload()).model_dump(by_alias=True)

    assert set(scene.keys()) == {"sceneId", "sceneType", "title", "narration", "durationSeconds", "visualPlan", "audioUrl"}
    assert scene["sceneType"] == "definition"
    assert scene["visualPlan"]["layout"] == "center_focus"


def test_animation_script_rejects_legacy_stack_animation_shape():
    with pytest.raises(ValidationError):
        VideoLessonScene(
            sceneId="scene_001",
            title="栈是什么",
            narration="栈是一种后进先出的结构。",
            visualType="stack_animation",
            visualData={"items": [1, 2, 3]},
            codeSnippet="stack.pop();",
            durationSeconds=10,
            audioUrl="",
        )


def test_scene_rejects_visual_text_over_80_characters():
    with pytest.raises(ValidationError, match="must not exceed 80"):
        VideoLessonScene(**scene_payload(scene_type="example", visual_plan={"layout": "center_focus", "elements": [{"type": "text", "content": "知识点" * 30, "animation": "fade_in"}]}))


def test_scene_rejects_non_https_image():
    with pytest.raises(ValidationError, match="imageUrl must use HTTPS"):
        VideoLessonScene(**scene_payload(visual_plan={"layout": "center_focus", "elements": [{"type": "image", "imageUrl": "http://example.com/a.png", "alt": "示例", "animation": "fade_in"}]}))


def test_summary_scene_requires_three_cards():
    with pytest.raises(ValidationError, match="exactly 3 card"):
        VideoLessonScene(**scene_payload(scene_type="summary", visual_plan={"layout": "summary_cards", "elements": [{"type": "card", "content": "1. 定义", "animation": "stagger_in"}]}))


def test_animation_script_requires_universal_scene_sequence():
    scene = VideoLessonScene(**scene_payload())
    with pytest.raises(ValidationError, match="sceneType sequence"):
        AnimationScriptContent(title="哈希表", duration_seconds=12, scenes=[scene])


def test_video_environment_variables_are_registered_in_contract_and_example():
    root = Path(__file__).resolve().parents[4]
    contract = (root / "docs" / "interface-contract.md").read_text(encoding="utf-8")
    env_example = (root / "backend" / ".env.example").read_text(encoding="utf-8")
    names = {
        "FILE_STORAGE_URL_PREFIX", "FILE_STORAGE_PUBLIC_BASE_URL", "TTS_PROVIDER", "TTS_BASE_URL", "TTS_API_KEY",
        "TTS_RESOURCE_ID", "TTS_VOICE_NAME", "TTS_AUDIO_FORMAT", "TTS_SAMPLE_RATE", "TTS_TIMEOUT_SECONDS",
        "VIDEO_RENDER_PROVIDER", "VIDEO_RENDER_PROJECT_PATH", "VIDEO_RENDER_BROWSER_EXECUTABLE",
        "VIDEO_RENDER_TIMEOUT_SECONDS", "FFMPEG_BINARY", "FFPROBE_BINARY", "AUDIT_API_BASE_URL",
        "AUDIT_TIMEOUT_SECONDS", "RUN_REAL_VIDEO_TESTS",
    }

    assert all(f"{name}=" in contract for name in names)
    assert all(f"{name}=" in env_example for name in names)
