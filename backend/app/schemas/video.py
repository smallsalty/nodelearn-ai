from typing import Annotated, Literal

from pydantic import Field, HttpUrl, model_validator

from app.schemas.common import ContractModel

SceneType = Literal["hook", "definition", "analogy", "mechanism", "comparison", "process", "example", "summary"]
VisualLayout = Literal["center_focus", "left_right", "pipeline", "comparison", "timeline", "grid_focus", "summary_cards"]
VisualAnimationType = Literal[
    "fade_in",
    "pop_in",
    "slide_in_left",
    "slide_in_right",
    "float",
    "draw",
    "highlight",
    "zoom_in",
    "stagger_in",
]


class TextVisualElement(ContractModel):
    type: Literal["text", "keyword"]
    content: str
    animation: VisualAnimationType


class CardVisualElement(ContractModel):
    type: Literal["card"]
    content: str
    animation: VisualAnimationType


class IconVisualElement(ContractModel):
    type: Literal["icon"]
    name: str
    animation: VisualAnimationType


class ArrowVisualElement(ContractModel):
    type: Literal["arrow"]
    label: str
    animation: VisualAnimationType


class CircleVisualElement(ContractModel):
    type: Literal["circle"]
    label: str
    animation: VisualAnimationType


class GridVisualElement(ContractModel):
    type: Literal["grid"]
    label: str
    items: list[str] | None = None
    highlight_index: int = Field(ge=0)
    animation: VisualAnimationType


class TimelineVisualElement(ContractModel):
    type: Literal["timeline"]
    items: list[str] = Field(min_length=1)
    animation: VisualAnimationType


class ImageVisualElement(ContractModel):
    type: Literal["image"]
    image_url: HttpUrl
    alt: str
    animation: VisualAnimationType

    @model_validator(mode="after")
    def require_https(self):
        if self.image_url.scheme != "https":
            raise ValueError("imageUrl must use HTTPS")
        return self


class FormulaVisualElement(ContractModel):
    type: Literal["formula"]
    content: str
    animation: VisualAnimationType


class CodeVisualElement(ContractModel):
    type: Literal["code"]
    content: str
    animation: VisualAnimationType


VisualElement = Annotated[
    TextVisualElement
    | CardVisualElement
    | IconVisualElement
    | ArrowVisualElement
    | CircleVisualElement
    | GridVisualElement
    | TimelineVisualElement
    | ImageVisualElement
    | FormulaVisualElement
    | CodeVisualElement,
    Field(discriminator="type"),
]


def _element_text(element: VisualElement) -> str:
    values = []
    for field_name in ("content", "name", "label", "alt"):
        value = getattr(element, field_name, None)
        if value:
            values.append(str(value))
    items = getattr(element, "items", None)
    if items:
        values.extend(str(item) for item in items)
    return "".join(values)


class VisualPlan(ContractModel):
    layout: VisualLayout
    elements: list[VisualElement] = Field(min_length=1)


class VideoLessonScene(ContractModel):
    scene_id: str
    scene_type: SceneType
    title: str
    narration: str
    duration_seconds: float = Field(gt=0)
    visual_plan: VisualPlan
    audio_url: str

    @model_validator(mode="after")
    def validate_scene(self):
        if self.scene_type == "hook" and self.duration_seconds > 15:
            raise ValueError("hook durationSeconds must not exceed 15")
        keyword_count = sum(element.type == "keyword" for element in self.visual_plan.elements)
        if self.scene_type == "definition" and not 1 <= keyword_count <= 3:
            raise ValueError("definition scene must contain 1-3 keyword elements")
        card_count = sum(element.type == "card" for element in self.visual_plan.elements)
        if self.scene_type == "summary" and card_count != 3:
            raise ValueError("summary scene must contain exactly 3 card elements")
        visible_text = "".join(_element_text(element) for element in self.visual_plan.elements)
        if len(visible_text) > 80:
            raise ValueError("scene visual text must not exceed 80 characters")
        if self.narration.strip() and self.narration.strip() in visible_text:
            raise ValueError("scene narration must not be copied into visual elements")
        return self


class VideoLessonOutput(ContractModel):
    video_url: str
    audio_urls: list[str] = Field(default_factory=list)


class AnimationScriptContent(ContractModel):
    title: str
    style: Literal["clean_motion_graphics"] = "clean_motion_graphics"
    duration_seconds: float
    aspect_ratio: Literal["16:9"] = "16:9"
    scenes: list[VideoLessonScene] = Field(default_factory=list)
    output: VideoLessonOutput = Field(default_factory=lambda: VideoLessonOutput(video_url="", audio_urls=[]))

    @model_validator(mode="after")
    def validate_scene_sequence(self):
        if not self.scenes:
            return self
        expected = ["hook", "definition", "analogy", "mechanism", "comparison", "process", "example", "summary"]
        actual = [scene.scene_type for scene in self.scenes]
        if actual != expected:
            raise ValueError(f"sceneType sequence must be: {', '.join(expected)}")
        return self
