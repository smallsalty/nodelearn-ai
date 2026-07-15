from __future__ import annotations

import json
import re
from typing import Annotated, Any, Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


NarrativeRole = Literal[
    "hook",
    "definition",
    "analogy",
    "mechanism",
    "comparison",
    "process",
    "example",
    "summary",
]
SceneType = Literal[
    "problem_hook",
    "direct_mapping_demo",
    "process_flow",
    "step_by_step",
    "compare_race",
    "collision_demo",
    "misconception_correction",
    "code_execution",
    "data_structure_operation",
    "algorithm_trace",
    "concept_relationship",
    "before_after",
    "timeline",
    "zoom_focus",
    "summary_recall",
]
SlotName = Literal[
    "stage",
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "left_lane",
    "right_lane",
    "foreground",
    "background",
]
ActionType = Literal[
    "appear",
    "move",
    "grow",
    "draw",
    "highlight",
    "count",
    "type",
    "reveal",
    "follow_path",
    "camera",
    "collision",
    "state_transition",
    "code_highlight",
]
TransitionType = Literal[
    "match_cut",
    "object_continuity",
    "camera_focus",
    "fade_through_background",
    "directional_slide",
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ContextNode(StrictModel):
    id: str
    name: str
    description: str | None = None
    difficulty: str | None = None
    common_mistakes: list[str] = Field(default_factory=list, max_length=10)


class LearnerContext(StrictModel):
    cognitive_style: str | None = None
    practice_preference: str | None = None
    knowledge_base_level: str | None = None
    learning_goal: str | None = None
    weak_node_ids: list[str] = Field(default_factory=list, max_length=20)
    common_mistakes: list[str] = Field(default_factory=list, max_length=12)
    profile_summary: str | None = Field(default=None, max_length=500)


class PracticeEvidence(StrictModel):
    question_id: str
    is_correct: bool
    mistake_reason: str | None = Field(default=None, max_length=300)
    user_answer: str | None = Field(default=None, max_length=200)
    correct_answer: str | None = Field(default=None, max_length=200)
    created_at: str | None = None


class RagEvidence(StrictModel):
    source_id: str
    title: str
    excerpt: str = Field(max_length=900)
    score: float | None = None


class VideoGenerationContext(StrictModel):
    course_id: str
    course_name: str | None = None
    current_node: ContextNode
    prerequisite_nodes: list[ContextNode] = Field(default_factory=list, max_length=8)
    learner: LearnerContext
    relevant_mistakes: list[str] = Field(default_factory=list, max_length=12)
    recent_practice: list[PracticeEvidence] = Field(default_factory=list, max_length=10)
    rag_evidence: list[RagEvidence] = Field(default_factory=list, max_length=5)
    learning_goal: str | None = Field(default=None, max_length=500)
    custom_requirement: str | None = Field(default=None, max_length=500)

    def prompt_payload(self) -> dict[str, Any]:
        """Return the ordered, identity-free prompt context."""

        return {
            "current_node": self.current_node.model_dump(),
            "mistakes_and_weakness": {
                "relevant_mistakes": self.relevant_mistakes,
                "recent_practice": [item.model_dump() for item in self.recent_practice],
                "is_weak_node": self.current_node.id in self.learner.weak_node_ids,
            },
            "cognitive_style": {
                "cognitive_style": self.learner.cognitive_style,
                "practice_preference": self.learner.practice_preference,
                "knowledge_base_level": self.learner.knowledge_base_level,
            },
            "goal": self.learning_goal or self.learner.learning_goal,
            "custom_requirement": self.custom_requirement,
            "rag": [item.model_dump() for item in self.rag_evidence],
            "prerequisites": [item.model_dump() for item in self.prerequisite_nodes],
        }


class TeachingStrategy(StrictModel):
    entry_mode: Literal["question", "complete_example", "definition", "code_problem"]
    preferred_scene_types: list[SceneType] = Field(min_length=3, max_length=10)
    terminology_level: Literal["plain", "standard", "advanced"]
    pacing: Literal["slow", "steady", "fast"]
    code_depth: Literal["none", "illustrative", "implementation"]
    include_misconception: bool
    complexity_notes: list[str] = Field(default_factory=list, max_length=8)
    personalization_reasons: list[str] = Field(default_factory=list, min_length=1, max_length=10)


class NarrativeSection(StrictModel):
    role: NarrativeRole
    title: str = Field(min_length=1, max_length=36)
    teaching_objective: str = Field(min_length=1, max_length=180)
    key_points: list[str] = Field(min_length=1, max_length=4)
    evidence_mistake: str | None = Field(default=None, max_length=300)


class VideoNarrative(StrictModel):
    title: str = Field(min_length=1, max_length=60)
    sections: list[NarrativeSection] = Field(min_length=5, max_length=12)

    @model_validator(mode="after")
    def validate_order(self) -> "VideoNarrative":
        roles = [item.role for item in self.sections]
        required = ["hook", "definition", "mechanism", "example", "summary"]
        if any(role not in roles for role in required):
            raise ValueError("narrative must include hook, definition, mechanism, example and summary")
        if roles[0] != "hook" or roles[-1] != "summary":
            raise ValueError("narrative must start with hook and end with summary")
        if [roles.index(role) for role in required] != sorted(roles.index(role) for role in required):
            raise ValueError("required narrative roles are out of order")
        return self


class ActorBase(StrictModel):
    id: str = Field(pattern=r"^[a-z][a-z0-9_]{0,39}$")
    slot: SlotName
    label: str | None = Field(default=None, max_length=80)
    continuity_key: str | None = Field(default=None, pattern=r"^[a-z][a-z0-9_]{0,39}$")


class KeyActor(ActorBase):
    kind: Literal["key"]
    value: str = Field(max_length=32)


class DataTokenActor(ActorBase):
    kind: Literal["data_token"]
    value: str = Field(max_length=40)


class BucketRowActor(ActorBase):
    kind: Literal["bucket_row"]
    bucket_count: int = Field(ge=4, le=120)
    focus_indices: list[int] = Field(default_factory=list, max_length=8)

    @model_validator(mode="after")
    def validate_indices(self) -> "BucketRowActor":
        if any(index >= self.bucket_count for index in self.focus_indices):
            raise ValueError("focus index is outside bucket row")
        return self


class FormulaActor(ActorBase):
    kind: Literal["formula"]
    expression: str = Field(min_length=1, max_length=100)
    steps: list[str] = Field(default_factory=list, max_length=8)


class ArrowActor(ActorBase):
    kind: Literal["arrow"]
    from_actor_id: str = Field(pattern=r"^[a-z][a-z0-9_]{0,39}$")
    to_actor_id: str = Field(pattern=r"^[a-z][a-z0-9_]{0,39}$")


class CodePanelActor(ActorBase):
    kind: Literal["code_panel"]
    language: str = Field(default="text", max_length=20)
    code_lines: list[str] = Field(min_length=1, max_length=20)


class VariablePanelActor(ActorBase):
    kind: Literal["variable_panel"]
    variables: dict[str, str] = Field(default_factory=dict)


class CollectionActor(ActorBase):
    kind: Literal["array", "list", "stack", "queue", "tree", "graph"]
    items: list[str] = Field(default_factory=list, max_length=120)


class CounterActor(ActorBase):
    kind: Literal["counter"]
    start: int = Field(default=0, ge=0, le=10000)
    end: int = Field(ge=0, le=10000)
    suffix: str | None = Field(default=None, max_length=20)


class CalloutActor(ActorBase):
    kind: Literal["callout"]
    text: str = Field(min_length=1, max_length=100)
    tone: Literal["neutral", "positive", "warning", "result"] = "neutral"


class ComparisonLaneActor(ActorBase):
    kind: Literal["comparison_lane"]
    title: str = Field(min_length=1, max_length=40)
    items: list[str] = Field(default_factory=list, max_length=120)


Actor: TypeAlias = Annotated[
    KeyActor
    | DataTokenActor
    | BucketRowActor
    | FormulaActor
    | ArrowActor
    | CodePanelActor
    | VariablePanelActor
    | CollectionActor
    | CounterActor
    | CalloutActor
    | ComparisonLaneActor,
    Field(discriminator="kind"),
]


class Beat(StrictModel):
    id: str = Field(pattern=r"^[a-z][a-z0-9_]{0,39}$")
    start_ratio: float = Field(ge=0, le=1)
    end_ratio: float = Field(gt=0, le=1)
    action: ActionType
    targets: list[str] = Field(min_length=1, max_length=6)
    emphasis: str | None = Field(default=None, max_length=50)

    @model_validator(mode="after")
    def validate_ratio(self) -> "Beat":
        if self.end_ratio <= self.start_ratio:
            raise ValueError("beat end_ratio must be greater than start_ratio")
        return self


class SceneTransition(StrictModel):
    type: TransitionType = "fade_through_background"
    continuity_actor_id: str | None = Field(default=None, pattern=r"^[a-z][a-z0-9_]{0,39}$")
    direction: Literal["left", "right", "up", "down"] | None = None


_UNSAFE_PATTERN = re.compile(
    r"(<\/?[a-z][^>]*>|```|\b(?:jsx|tsx|html|css|javascript|component)\b|"
    r"\b[A-Z][A-Za-z]+(?:Panel|Renderer|Component|Buckets|Chart)\b|position\s*:\s*absolute|"
    r"ignore\s+(?:all\s+)?previous|system\s+prompt|developer\s+message)",
    re.IGNORECASE,
)


class StoryboardScene(StrictModel):
    id: str = Field(pattern=r"^scene_[0-9]{2}$")
    narrative_role: NarrativeRole
    scene_type: SceneType
    title: str = Field(min_length=1, max_length=36)
    teaching_purpose: str = Field(min_length=1, max_length=180)
    narration: str = Field(min_length=8, max_length=150)
    screen_text: list[str] = Field(min_length=1, max_length=4)
    actors: list[Actor] = Field(min_length=1, max_length=20)
    beats: list[Beat] = Field(min_length=1, max_length=20)
    transition_out: SceneTransition = Field(default_factory=SceneTransition)
    claims: list[str] = Field(default_factory=list, max_length=6)
    source_ids: list[str] = Field(default_factory=list, max_length=6)

    @field_validator("title", "teaching_purpose", "narration")
    @classmethod
    def reject_injection_text(cls, value: str) -> str:
        if _UNSAFE_PATTERN.search(value):
            raise ValueError("storyboard contains markup, implementation details or prompt injection")
        return value

    @field_validator("screen_text", "claims")
    @classmethod
    def reject_injection_list(cls, values: list[str]) -> list[str]:
        if any(_UNSAFE_PATTERN.search(value) for value in values):
            raise ValueError("storyboard text contains unsafe content")
        return values

    @model_validator(mode="after")
    def validate_scene_graph(self) -> "StoryboardScene":
        actor_payload = json.dumps(
            [actor.model_dump(mode="json") for actor in self.actors],
            ensure_ascii=False,
        )
        if _UNSAFE_PATTERN.search(actor_payload):
            raise ValueError("storyboard actors contain markup, component names or prompt injection")
        actor_ids = [actor.id for actor in self.actors]
        beat_ids = [beat.id for beat in self.beats]
        if len(actor_ids) != len(set(actor_ids)):
            raise ValueError("actor ids must be unique inside a scene")
        if len(beat_ids) != len(set(beat_ids)):
            raise ValueError("beat ids must be unique inside a scene")
        actor_id_set = set(actor_ids)
        for beat in self.beats:
            missing = set(beat.targets) - actor_id_set
            if missing:
                raise ValueError(f"beat targets unknown actors: {sorted(missing)}")
        for actor in self.actors:
            if isinstance(actor, ArrowActor):
                missing = {actor.from_actor_id, actor.to_actor_id} - actor_id_set
                if missing:
                    raise ValueError(f"arrow references unknown actors: {sorted(missing)}")
        educational_actions = {
            "move",
            "grow",
            "draw",
            "highlight",
            "count",
            "type",
            "reveal",
            "follow_path",
            "collision",
            "state_transition",
            "code_highlight",
        }
        if not any(beat.action in educational_actions for beat in self.beats):
            raise ValueError("scene must contain at least one instructional visual event")
        transition = self.transition_out
        if transition.type in {"match_cut", "object_continuity"}:
            if not transition.continuity_actor_id or transition.continuity_actor_id not in actor_id_set:
                self.transition_out = SceneTransition(type="fade_through_background")
        return self


class VideoStoryboard(StrictModel):
    schema_version: Literal["1.0"] = "1.0"
    title: str = Field(min_length=1, max_length=60)
    scenes: list[StoryboardScene] = Field(min_length=5, max_length=24)

    @model_validator(mode="after")
    def validate_storyboard(self) -> "VideoStoryboard":
        ids = [scene.id for scene in self.scenes]
        if len(ids) != len(set(ids)):
            raise ValueError("scene ids must be unique")
        roles = [scene.narrative_role for scene in self.scenes]
        required = ["hook", "definition", "mechanism", "example", "summary"]
        if roles[0] != "hook" or roles[-1] != "summary":
            raise ValueError("storyboard must start with hook and end with summary")
        if any(role not in roles for role in required):
            raise ValueError("storyboard is missing a required public narrative role")
        if [roles.index(role) for role in required] != sorted(roles.index(role) for role in required):
            raise ValueError("required storyboard roles are out of order")
        return self


class ValidatedStoryboard(StrictModel):
    storyboard: VideoStoryboard
    repaired: bool = False
    fallback_used: bool = False
    validation_notes: list[str] = Field(default_factory=list)


class ResolvedScenePlan(StrictModel):
    scene_id: str
    narrative_role: NarrativeRole
    scene_type: SceneType
    renderer: SceneType
    named_slots: dict[str, list[str]]
    continuity_keys: list[str] = Field(default_factory=list)
    transition_out: SceneTransition


class SceneAudio(StrictModel):
    scene_id: str
    path: str
    url: str
    duration_seconds: float = Field(gt=0, le=60)


class SubtitleCue(StrictModel):
    id: str
    text: str = Field(min_length=1, max_length=40)
    start_frame: int = Field(ge=0)
    end_frame: int = Field(gt=0)
    highlight_terms: list[str] = Field(default_factory=list, max_length=4)

    @model_validator(mode="after")
    def validate_frames(self) -> "SubtitleCue":
        if self.end_frame <= self.start_frame:
            raise ValueError("subtitle cue must have a positive duration")
        return self


class ResolvedBeat(StrictModel):
    id: str
    action: ActionType
    targets: list[str]
    start_frame: int = Field(ge=0)
    end_frame: int = Field(gt=0)
    emphasis: str | None = None


class ResolvedTimelineScene(StrictModel):
    scene_id: str
    start_frame: int = Field(ge=0)
    duration_frames: int = Field(gt=0)
    audio_duration_seconds: float = Field(gt=0)
    beats: list[ResolvedBeat]
    subtitles: list[SubtitleCue]


class ResolvedTimeline(StrictModel):
    fps: int = Field(default=30, ge=1, le=60)
    scenes: list[ResolvedTimelineScene] = Field(min_length=1)
    total_frames: int = Field(gt=0)
    total_duration_seconds: float = Field(gt=0)


class MediaStream(StrictModel):
    codec_type: Literal["video", "audio"]
    codec_name: str
    width: int | None = None
    height: int | None = None
    avg_frame_rate: str | None = None
    duration: float | None = None


class MediaProbeResult(StrictModel):
    path: str
    size_bytes: int = Field(gt=0)
    duration_seconds: float = Field(gt=0)
    video: MediaStream
    audio: MediaStream
    raw_probe: dict[str, Any]
