from pathlib import Path

import pytest
from pydantic import ValidationError

from app.schemas.resource import ResourceGenerateRequest, ResourceGenerateResult, ResourceStreamEvent, VideoGenerateOptions
from app.schemas.video import AnimationScriptContent, VideoLessonScene


def animation_steps() -> list[dict]:
    return [
        {
            "startState": "input pending",
            "endState": "input highlighted",
            "visualAction": "highlight input",
            "narrationSentence": "First observe the input object.",
            "durationSeconds": 3,
        },
        {
            "startState": "rule idle",
            "endState": "rule applied",
            "visualAction": "move pointer to rule",
            "narrationSentence": "Then apply the operation rule.",
            "durationSeconds": 3,
        },
        {
            "startState": "structure old",
            "endState": "structure updated",
            "visualAction": "update visible structure",
            "narrationSentence": "Finally compare the changed state.",
            "durationSeconds": 3,
        },
    ]


def scene_payload(**updates):
    payload = {
        "scene_id": "scene_001",
        "scene_type": "definition",
        "title": "哈希表是什么",
        "narration": "哈希表通过哈希函数把键映射到存储位置。",
        "duration_seconds": 12,
        "teaching_purpose": "Explain hash table with concrete objects",
        "concrete_objects": ["key", "hash function", "bucket"],
        "animation_steps": animation_steps(),
        "state_changes": ["key enters", "hash index calculated", "bucket highlighted"],
        "screen_text": ["hash table"],
        "misconception_fix": "Collisions are expected and need handling.",
        "component_hints": ["HashTableBuckets", "HashFunctionPanel"],
        "audit_checklist": ["hasConcreteObjects", "hasStateChanges", "hasAnimationSteps"],
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


def universal_scene_payload(scene_type: str, index: int) -> dict:
    scene = {
        "scene_id": f"scene_{index:03d}",
        "scene_type": scene_type,
        "title": f"场景 {index}",
        "narration": f"这是第 {index} 个讲解场景，用于解释哈希表。",
        "duration_seconds": 12 if scene_type == "hook" else 16,
        "audio_url": "",
        "teaching_purpose": "Explain with concrete data structure objects",
        "concrete_objects": ["key", "hash function", "bucket"],
        "animation_steps": animation_steps(),
        "state_changes": ["input appears", "rule applies", "state updates"],
        "screen_text": [f"scene {index}"],
        "misconception_fix": "Do not memorize the term without tracking the state change.",
        "component_hints": ["HashTableBuckets", "CodeTracePanel"],
        "audit_checklist": ["hasConcreteObjects", "hasStateChanges", "hasAnimationSteps"],
        "visual_plan": {"layout": "center_focus", "elements": [{"type": "text", "content": f"要点 {index}", "animation": "fade_in"}]},
    }
    if scene_type == "definition":
        scene["visual_plan"] = {
            "layout": "center_focus",
            "elements": [
                {"type": "keyword", "content": "键", "animation": "pop_in"},
                {"type": "keyword", "content": "哈希函数", "animation": "pop_in"},
                {"type": "keyword", "content": "位置", "animation": "pop_in"},
            ],
        }
    elif scene_type == "analogy":
        scene["visual_plan"] = {
            "layout": "left_right",
            "elements": [
                {"type": "card", "content": "输入姓名", "animation": "slide_in_left"},
                {"type": "arrow", "label": "定位", "animation": "draw"},
                {"type": "card", "content": "找到柜门", "animation": "slide_in_right"},
            ],
        }
    elif scene_type == "mechanism":
        scene["visual_plan"] = {
            "layout": "pipeline",
            "elements": [
                {"type": "card", "content": "key", "animation": "stagger_in"},
                {"type": "arrow", "label": "hash", "animation": "draw"},
                {"type": "circle", "label": "index", "animation": "zoom_in"},
            ],
        }
    elif scene_type == "comparison":
        scene["visual_plan"] = {
            "layout": "comparison",
            "elements": [
                {"type": "card", "content": "数组 O(n)", "animation": "slide_in_left"},
                {"type": "card", "content": "哈希表 O(1)", "animation": "slide_in_right"},
            ],
        }
    elif scene_type == "process":
        scene["visual_plan"] = {
            "layout": "timeline",
            "elements": [{"type": "timeline", "items": ["输入", "计算", "定位"], "animation": "stagger_in"}],
        }
    elif scene_type == "example":
        scene["visual_plan"] = {
            "layout": "grid_focus",
            "elements": [
                {"type": "grid", "label": "桶数组", "items": ["0", "1", "2", "3"], "highlightIndex": 2, "animation": "highlight"},
                {"type": "text", "content": "key -> 2", "animation": "fade_in"},
            ],
        }
    elif scene_type == "summary":
        scene["visual_plan"] = {
            "layout": "summary_cards",
            "elements": [
                {"type": "card", "content": "键值映射", "animation": "stagger_in"},
                {"type": "card", "content": "哈希定位", "animation": "stagger_in"},
                {"type": "card", "content": "快速访问", "animation": "stagger_in"},
            ],
        }
    return scene


def test_video_lesson_scene_uses_motion_graphics_contract_fields():
    scene = VideoLessonScene(**scene_payload()).model_dump(by_alias=True)

    assert set(scene.keys()) == {
        "sceneId",
        "sceneType",
        "title",
        "narration",
        "durationSeconds",
        "teachingPurpose",
        "concreteObjects",
        "animationSteps",
        "stateChanges",
        "screenText",
        "misconceptionFix",
        "componentHints",
        "auditChecklist",
        "visualPlan",
        "audioUrl",
    }
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


def test_animation_script_rejects_legacy_text_slide_shape():
    with pytest.raises(ValidationError):
        VideoLessonScene(
            sceneId="scene_001",
            title="哈希表是什么",
            narration="哈希表通过键值映射快速定位。",
            visualType="text_slide",
            visualData={"bullets": ["键值映射", "快速查找"]},
            durationSeconds=10,
            audioUrl="",
        )


def test_scene_rejects_element_without_animation():
    with pytest.raises(ValidationError):
        VideoLessonScene(**scene_payload(visual_plan={"layout": "center_focus", "elements": [{"type": "text", "content": "短句"}]}))


def test_definition_scene_requires_one_to_three_keywords():
    with pytest.raises(ValidationError, match="1-3 keyword"):
        VideoLessonScene(**scene_payload(visual_plan={"layout": "center_focus", "elements": [{"type": "text", "content": "没有关键词", "animation": "fade_in"}]}))

    with pytest.raises(ValidationError, match="1-3 keyword"):
        VideoLessonScene(
            **scene_payload(
                visual_plan={
                    "layout": "center_focus",
                    "elements": [
                        {"type": "keyword", "content": "一", "animation": "pop_in"},
                        {"type": "keyword", "content": "二", "animation": "pop_in"},
                        {"type": "keyword", "content": "三", "animation": "pop_in"},
                        {"type": "keyword", "content": "四", "animation": "pop_in"},
                    ],
                }
            )
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


def test_animation_script_accepts_complete_universal_scene_sequence():
    scene_types = ["hook", "definition", "analogy", "mechanism", "comparison", "process", "example", "summary"]
    scenes = [VideoLessonScene(**universal_scene_payload(scene_type, index)) for index, scene_type in enumerate(scene_types, start=1)]
    lesson = AnimationScriptContent(title="哈希表", duration_seconds=sum(scene.duration_seconds for scene in scenes), scenes=scenes)
    dumped = lesson.model_dump(by_alias=True)

    assert dumped["style"] == "clean_motion_graphics"
    assert dumped["aspectRatio"] == "16:9"
    assert [scene["sceneType"] for scene in dumped["scenes"]] == scene_types


def test_video_generate_options_and_progress_fields_use_contract_aliases():
    request = ResourceGenerateRequest(
        userId="user_video_options_001",
        courseId="course_ds_001",
        resourceTypes=["video_script"],
        videoOptions=VideoGenerateOptions(qualityPreset="ultra", materialSource="generated_motion_assets", versionCount=2),
    ).model_dump(by_alias=True)
    result = ResourceGenerateResult(
        taskId="resource_task_001",
        resourceIds=[],
        status="running",
        progress=42,
        currentStage="quality_audit",
    ).model_dump(by_alias=True)
    event = ResourceStreamEvent(taskId="resource_task_001", eventType="progress", progress=42, stage="quality_audit").model_dump(by_alias=True)

    assert request["videoOptions"]["aspectRatio"] == "16:9"
    assert request["videoOptions"]["qualityPreset"] == "ultra"
    assert result["currentStage"] == "quality_audit"
    assert event["stage"] == "quality_audit"


def test_scene_accepts_data_structure_visual_elements_and_animation_steps():
    scene = VideoLessonScene(
        **scene_payload(
            scene_type="example",
            visual_plan={
                "layout": "grid_focus",
                "elements": [
                    {
                        "type": "hash_table_buckets",
                        "buckets": ["0", "1", "2", "3"],
                        "activeIndex": 2,
                        "keyLabel": "key",
                        "collisionIndices": [2],
                        "animation": "highlight",
                    }
                ],
            },
        )
    )

    dumped = scene.model_dump(by_alias=True)
    assert dumped["animationSteps"][0]["visualAction"] == "highlight input"
    assert dumped["visualPlan"]["elements"][0]["type"] == "hash_table_buckets"


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
        "IFLYTEK_APP_ID", "IFLYTEK_API_KEY", "IFLYTEK_API_SECRET", "IFLYTEK_BASE_URL",
        "IFLYTEK_SPARK_MODEL", "IFLYTEK_TTS_VOICE", "IFLYTEK_DIGITAL_HUMAN_BASE_URL",
        "IFLYTEK_DIGITAL_HUMAN_AVATAR_ID", "IFLYTEK_DIGITAL_HUMAN_VOICE_ID",
        "IFLYTEK_DIGITAL_HUMAN_CALLBACK_URL", "IFLYTEK_CALLBACK_TOKEN",
        "IFLYTEK_REQUEST_TIMEOUT_SECONDS", "IFLYTEK_ENABLE_MOCK",
    }

    assert all(f"{name}=" in contract for name in names)
    assert all(f"{name}=" in env_example for name in names)
