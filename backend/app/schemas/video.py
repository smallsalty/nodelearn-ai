from typing import Annotated, Literal

from pydantic import Field, HttpUrl, model_validator

from app.schemas.common import ContractModel, VideoAspect

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


class HashTableBucketsVisualElement(ContractModel):
    type: Literal["hash_table_buckets"]
    buckets: list[str] = Field(min_length=1)
    active_index: int = Field(ge=0)
    key_label: str | None = None
    collision_indices: list[int] = Field(default_factory=list)
    animation: VisualAnimationType


class HashFunctionPanelVisualElement(ContractModel):
    type: Literal["hash_function_panel"]
    input_key: str
    expression: str
    output_index: int = Field(ge=0)
    animation: VisualAnimationType


class CollisionChainVisualElement(ContractModel):
    type: Literal["collision_chain"]
    bucket_index: int = Field(ge=0)
    nodes: list[str] = Field(min_length=1)
    active_node_index: int = Field(default=0, ge=0)
    animation: VisualAnimationType


class ArrayCellsVisualElement(ContractModel):
    type: Literal["array_cells"]
    items: list[str] = Field(min_length=1)
    active_indices: list[int] = Field(default_factory=list)
    pointer_labels: dict[str, str] = Field(default_factory=dict)
    animation: VisualAnimationType


class LinkedListNodesVisualElement(ContractModel):
    type: Literal["linked_list_nodes"]
    nodes: list[str] = Field(min_length=1)
    active_index: int = Field(default=0, ge=0)
    pointer_label: str | None = None
    animation: VisualAnimationType


class StackBlocksVisualElement(ContractModel):
    type: Literal["stack_blocks"]
    items: list[str] = Field(min_length=1)
    active_index: int = Field(default=0, ge=0)
    operation: str
    animation: VisualAnimationType


class QueueLineVisualElement(ContractModel):
    type: Literal["queue_line"]
    items: list[str] = Field(min_length=1)
    head_index: int = Field(default=0, ge=0)
    tail_index: int = Field(default=0, ge=0)
    operation: str
    animation: VisualAnimationType


class TreeNodeGraphVisualElement(ContractModel):
    type: Literal["tree_node_graph"]
    nodes: list[str] = Field(min_length=1)
    edges: list[list[str]] = Field(default_factory=list)
    active_path: list[str] = Field(default_factory=list)
    animation: VisualAnimationType


class CodeTracePanelVisualElement(ContractModel):
    type: Literal["code_trace_panel"]
    code_lines: list[str] = Field(min_length=1)
    active_line_index: int = Field(default=0, ge=0)
    variables: dict[str, str] = Field(default_factory=dict)
    animation: VisualAnimationType


class PointerArrowVisualElement(ContractModel):
    type: Literal["pointer_arrow"]
    from_label: str
    to_label: str
    label: str
    animation: VisualAnimationType


class MemoryBoxVisualElement(ContractModel):
    type: Literal["memory_box"]
    address: str
    value: str
    active: bool = False
    animation: VisualAnimationType


class ComplexityChartVisualElement(ContractModel):
    type: Literal["complexity_chart"]
    items: list[str] = Field(min_length=1)
    active_index: int = Field(default=0, ge=0)
    label: str
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
    | CodeVisualElement
    | HashTableBucketsVisualElement
    | HashFunctionPanelVisualElement
    | CollisionChainVisualElement
    | ArrayCellsVisualElement
    | LinkedListNodesVisualElement
    | StackBlocksVisualElement
    | QueueLineVisualElement
    | TreeNodeGraphVisualElement
    | CodeTracePanelVisualElement
    | PointerArrowVisualElement
    | MemoryBoxVisualElement
    | ComplexityChartVisualElement,
    Field(discriminator="type"),
]


def _element_text(element: VisualElement) -> str:
    values = []
    for field_name in ("content", "name", "label", "alt", "key_label", "expression", "operation", "address", "value"):
        value = getattr(element, field_name, None)
        if value:
            values.append(str(value))
    for collection_name in ("items", "nodes", "buckets", "active_path"):
        items = getattr(element, collection_name, None)
        if items:
            values.extend(str(item) for item in items)
    return "".join(values)


class VisualPlan(ContractModel):
    layout: VisualLayout
    elements: list[VisualElement] = Field(min_length=1)


class AnimationStep(ContractModel):
    start_state: str
    end_state: str
    visual_action: str
    narration_sentence: str
    duration_seconds: float | None = Field(default=None, gt=0)


class VideoLessonScene(ContractModel):
    scene_id: str
    scene_type: SceneType
    title: str
    narration: str
    duration_seconds: float = Field(gt=0)
    teaching_purpose: str
    concrete_objects: list[str] = Field(min_length=1)
    animation_steps: list[AnimationStep] = Field(min_length=3)
    state_changes: list[str] = Field(min_length=1)
    screen_text: list[str] = Field(default_factory=list)
    misconception_fix: str
    component_hints: list[str] = Field(min_length=1)
    audit_checklist: list[str] = Field(default_factory=list)
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
        if not any(step.narration_sentence.strip() for step in self.animation_steps):
            raise ValueError("scene animationSteps must map to narration sentences")
        return self


class VideoLessonOutput(ContractModel):
    video_url: str
    audio_urls: list[str] = Field(default_factory=list)


class AnimationScriptContent(ContractModel):
    title: str
    style: Literal["clean_motion_graphics"] = "clean_motion_graphics"
    duration_seconds: float
    aspect_ratio: VideoAspect = VideoAspect.landscape
    course_id: str | None = None
    node_id: str | None = None
    learner_profile_summary: str | None = None
    quality_score: float | None = Field(default=None, ge=0, le=1)
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
