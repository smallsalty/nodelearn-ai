from __future__ import annotations

from collections.abc import Callable

from app.services.video_pipeline.models import ResolvedScenePlan, SceneTransition, StoryboardScene


SceneResolver = Callable[[StoryboardScene], ResolvedScenePlan]


class SceneTemplateRegistry:
    """Backend registry for resolving Scene DSL to named renderer slots."""

    SCENE_TYPES = (
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
    )

    def __init__(self) -> None:
        self._resolvers: dict[str, SceneResolver] = {
            scene_type: self._default_resolver for scene_type in self.SCENE_TYPES
        }

    def register(self, scene_type: str, resolver: SceneResolver) -> None:
        if scene_type not in self.SCENE_TYPES:
            raise ValueError(f"unsupported scene template: {scene_type}")
        self._resolvers[scene_type] = resolver

    def resolve(self, scene: StoryboardScene) -> ResolvedScenePlan:
        resolver = self._resolvers.get(scene.scene_type)
        if resolver is None:
            raise ValueError(f"scene template is not registered: {scene.scene_type}")
        return resolver(scene)

    def resolve_all(self, scenes: list[StoryboardScene]) -> list[ResolvedScenePlan]:
        plans = [self.resolve(scene) for scene in scenes]
        for index, (scene, plan) in enumerate(zip(scenes, plans, strict=True)):
            if plan.transition_out.type not in {"match_cut", "object_continuity"}:
                continue
            if index >= len(scenes) - 1 or not plan.transition_out.continuity_actor_id:
                plan.transition_out = SceneTransition(type="fade_through_background")
                continue
            current_actor = next(
                (actor for actor in scene.actors if actor.id == plan.transition_out.continuity_actor_id),
                None,
            )
            next_keys = {actor.continuity_key for actor in scenes[index + 1].actors if actor.continuity_key}
            if current_actor is None or not current_actor.continuity_key or current_actor.continuity_key not in next_keys:
                plan.transition_out = SceneTransition(type="fade_through_background")
        return plans

    @staticmethod
    def _default_resolver(scene: StoryboardScene) -> ResolvedScenePlan:
        named_slots: dict[str, list[str]] = {}
        continuity: list[str] = []
        for actor in scene.actors:
            named_slots.setdefault(actor.slot, []).append(actor.id)
            if actor.continuity_key:
                continuity.append(actor.continuity_key)
        return ResolvedScenePlan(
            scene_id=scene.id,
            narrative_role=scene.narrative_role,
            scene_type=scene.scene_type,
            renderer=scene.scene_type,
            named_slots=named_slots,
            continuity_keys=list(dict.fromkeys(continuity)),
            transition_out=scene.transition_out,
        )
