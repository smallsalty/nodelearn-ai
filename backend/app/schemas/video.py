from typing import Any, Literal

from pydantic import Field

from app.schemas.common import ContractModel


class StackOperation(ContractModel):
    type: Literal["push", "pop"]
    value: int | None = None


class VideoLessonScene(ContractModel):
    scene_id: str
    title: str
    narration: str
    visual_type: Literal["stack_animation", "text_slide"]
    visual_data: dict[str, Any]
    code_snippet: str
    duration_seconds: float
    audio_url: str


class VideoLessonOutput(ContractModel):
    video_url: str
    audio_urls: list[str] = Field(default_factory=list)


class AnimationScriptContent(ContractModel):
    title: str
    duration_seconds: float
    aspect_ratio: Literal["16:9"] = "16:9"
    scenes: list[VideoLessonScene] = Field(default_factory=list)
    output: VideoLessonOutput = Field(default_factory=lambda: VideoLessonOutput(video_url="", audio_urls=[]))
