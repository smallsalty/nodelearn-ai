import React from "react";
import type { InternalSceneType, RenderManifestScene, VideoTheme } from "../types";
import { SceneShell } from "./SceneShell";
import {
  AlgorithmTraceRenderer,
  BeforeAfterRenderer,
  CodeExecutionRenderer,
  CollisionDemoRenderer,
  CompareRaceRenderer,
  ConceptRelationshipRenderer,
  DataStructureOperationRenderer,
  DirectMappingDemoRenderer,
  MisconceptionCorrectionRenderer,
  ProblemHookRenderer,
  ProcessFlowRenderer,
  StepByStepRenderer,
  SummaryRecallRenderer,
  TimelineRenderer,
  ZoomFocusRenderer,
  type SceneRendererProps,
} from "./SceneRenderers";

type SceneRenderer = React.FC<SceneRendererProps>;

export const SCENE_RENDERER_REGISTRY: Record<InternalSceneType, SceneRenderer> = {
  problem_hook: ProblemHookRenderer,
  direct_mapping_demo: DirectMappingDemoRenderer,
  process_flow: ProcessFlowRenderer,
  step_by_step: StepByStepRenderer,
  compare_race: CompareRaceRenderer,
  collision_demo: CollisionDemoRenderer,
  misconception_correction: MisconceptionCorrectionRenderer,
  code_execution: CodeExecutionRenderer,
  data_structure_operation: DataStructureOperationRenderer,
  algorithm_trace: AlgorithmTraceRenderer,
  concept_relationship: ConceptRelationshipRenderer,
  before_after: BeforeAfterRenderer,
  timeline: TimelineRenderer,
  zoom_focus: ZoomFocusRenderer,
  summary_recall: SummaryRecallRenderer,
};

export const RegistrySceneRenderer: React.FC<{
  scene: RenderManifestScene;
  theme: VideoTheme;
  subtitleEnabled: boolean;
}> = ({ scene, theme, subtitleEnabled }) => {
  const Renderer = SCENE_RENDERER_REGISTRY[scene.sceneType];
  return <SceneShell scene={scene} theme={theme} subtitleEnabled={subtitleEnabled}><Renderer scene={scene} /></SceneShell>;
};
