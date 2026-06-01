from pathlib import Path

from app.schemas.video import AnimationScriptContent, VideoLessonScene


def test_animation_script_content_uses_contract_camel_case_fields():
    lesson = AnimationScriptContent(
        title="栈的入栈与出栈讲解",
        duration_seconds=20,
        scenes=[
            VideoLessonScene(
                scene_id="scene_001",
                title="栈是什么",
                narration="栈是一种后进先出的线性数据结构。",
                visual_type="stack_animation",
                visual_data={"items": [1, 2, 3], "operations": [{"type": "push", "value": 4}, {"type": "pop"}]},
                code_snippet="stack.push(4);\nstack.pop();",
                duration_seconds=20,
                audio_url="",
            )
        ],
    ).model_dump(by_alias=True)

    assert set(lesson.keys()) == {"title", "durationSeconds", "aspectRatio", "scenes", "output"}
    assert set(lesson["scenes"][0].keys()) == {
        "sceneId",
        "title",
        "narration",
        "visualType",
        "visualData",
        "codeSnippet",
        "durationSeconds",
        "audioUrl",
    }


def test_video_environment_variables_are_registered_in_contract_and_example():
    root = Path(__file__).resolve().parents[4]
    contract = (root / "docs" / "interface-contract.md").read_text(encoding="utf-8")
    env_example = (root / "backend" / ".env.example").read_text(encoding="utf-8")
    names = {
        "FILE_STORAGE_URL_PREFIX",
        "FILE_STORAGE_PUBLIC_BASE_URL",
        "TTS_PROVIDER",
        "TTS_BASE_URL",
        "TTS_API_KEY",
        "TTS_RESOURCE_ID",
        "TTS_VOICE_NAME",
        "TTS_AUDIO_FORMAT",
        "TTS_SAMPLE_RATE",
        "TTS_TIMEOUT_SECONDS",
        "VIDEO_RENDER_PROVIDER",
        "VIDEO_RENDER_PROJECT_PATH",
        "VIDEO_RENDER_BROWSER_EXECUTABLE",
        "VIDEO_RENDER_TIMEOUT_SECONDS",
        "FFMPEG_BINARY",
        "FFPROBE_BINARY",
        "AUDIT_API_BASE_URL",
        "AUDIT_TIMEOUT_SECONDS",
        "RUN_REAL_VIDEO_TESTS",
    }

    assert all(f"{name}=" in contract for name in names)
    assert all(f"{name}=" in env_example for name in names)
