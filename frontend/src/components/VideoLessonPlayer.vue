<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { AnimationScriptContent, VideoLessonScene, VideoNarrationBeat, VisualElement, VisualPlan } from "@/types/resource";

const props = defineProps<{ content: string }>();
const currentSceneIndex = ref(0);
const audioElement = ref<HTMLAudioElement | null>(null);
const autoPlay = ref(false);
const playing = ref(false);
const sceneProgress = ref(0);

const lesson = computed<AnimationScriptContent | null>(() => {
  try {
    const parsed = JSON.parse(props.content) as AnimationScriptContent;
    return parsed.style === "clean_motion_graphics" && Array.isArray(parsed.scenes) ? parsed : null;
  } catch {
    return null;
  }
});

interface PlayerStep { scene: VideoLessonScene; beat: VideoNarrationBeat }
const steps = computed<PlayerStep[]>(() => (lesson.value?.scenes ?? []).flatMap((scene) => {
  if (scene.beats?.length) return scene.beats.map((beat) => ({ scene, beat }));
  if (!scene.visualPlan) return [];
  return [{
    scene,
    beat: {
      beatId: `${scene.sceneId}_legacy`,
      narration: scene.narration ?? "",
      durationSeconds: scene.durationSeconds,
      screenText: scene.screenText?.length ? scene.screenText : [scene.title],
      claims: [],
      sourceIds: [],
      visualPlan: scene.visualPlan,
      audioUrl: scene.audioUrl ?? ""
    }
  }];
}));
const currentStep = computed<PlayerStep | null>(() => steps.value[currentSceneIndex.value] ?? null);
const currentScene = computed<VideoLessonScene | null>(() => currentStep.value?.scene ?? null);
const currentBeat = computed<VideoNarrationBeat | null>(() => currentStep.value?.beat ?? null);
const currentVisualPlan = computed<VisualPlan | null>(() => currentBeat.value?.visualPlan ?? null);
const totalProgress = computed(() => {
  const sceneCount = steps.value.length;
  return sceneCount ? ((currentSceneIndex.value + sceneProgress.value / 100) / sceneCount) * 100 : 0;
});

watch(() => props.content, () => {
  currentSceneIndex.value = 0;
  sceneProgress.value = 0;
  playing.value = false;
});

const animationClass = (element: VisualElement) => `motion-${element.animation}`;
const animationDelay = (index: number) => ({ animationDelay: `${index * 90}ms` });

function previousScene() {
  if (currentSceneIndex.value > 0) {
    currentSceneIndex.value -= 1;
    void restartAudio();
  }
}

function nextScene() {
  const scenes = steps.value;
  if (currentSceneIndex.value < scenes.length - 1) {
    currentSceneIndex.value += 1;
    void restartAudio();
  } else {
    playing.value = false;
    sceneProgress.value = 100;
  }
}

async function togglePlay() {
  const audio = audioElement.value;
  if (!audio) return;
  if (audio.paused) await audio.play();
  else audio.pause();
}

function updateProgress() {
  const audio = audioElement.value;
  if (audio?.duration) sceneProgress.value = (audio.currentTime / audio.duration) * 100;
}

function handleEnded() {
  sceneProgress.value = 100;
  if (autoPlay.value) nextScene();
  else playing.value = false;
}

async function restartAudio() {
  sceneProgress.value = 0;
  await nextTick();
  const audio = audioElement.value;
  if (!audio) return;
  audio.load();
  if (autoPlay.value || playing.value) await audio.play();
}
</script>

<template>
  <section v-if="lesson && currentScene && currentBeat && currentVisualPlan" class="video-lesson-player">
    <div class="lesson-stage">
      <header class="stage-header">
        <div>
          <p>课程讲解</p>
          <h2>{{ lesson.title }}</h2>
        </div>
        <div class="scene-meta"><span>{{ currentScene.sceneType }}</span>{{ currentSceneIndex + 1 }} / {{ steps.length }}</div>
      </header>

      <main class="motion-stage">
        <div class="screen-copy">
          <h3>{{ currentBeat.screenText[0] }}</h3>
          <ul v-if="currentBeat.screenText.length > 1">
            <li v-for="item in currentBeat.screenText.slice(1, 3)" :key="item">{{ item }}</li>
          </ul>
        </div>
        <section class="visual-plan" :class="`layout-${currentVisualPlan.layout}`">
          <template v-for="(element, index) in currentVisualPlan.elements" :key="`${element.type}-${index}`">
            <div v-if="element.type === 'text' || element.type === 'keyword'" class="motion-text" :class="[animationClass(element), { keyword: element.type === 'keyword' }]" :style="animationDelay(index)">
              {{ element.content }}
            </div>
            <div v-else-if="element.type === 'card'" class="concept-card" :class="animationClass(element)" :style="animationDelay(index)">{{ element.content }}</div>
            <div v-else-if="element.type === 'icon'" class="icon-bubble" :class="animationClass(element)" :style="animationDelay(index)"><span>{{ element.name }}</span></div>
            <div v-else-if="element.type === 'arrow'" class="arrow-flow" :class="animationClass(element)" :style="animationDelay(index)"><small>{{ element.label }}</small><span></span></div>
            <div v-else-if="element.type === 'circle'" class="circle-label" :class="animationClass(element)" :style="animationDelay(index)">{{ element.label }}</div>
            <div v-else-if="element.type === 'grid'" class="grid-focus" :class="animationClass(element)" :style="animationDelay(index)">
              <strong>{{ element.label }}</strong>
              <div><span v-for="(item, itemIndex) in element.items ?? ['0','1','2','3','4','5','6','7','8']" :key="`${item}-${itemIndex}`" :class="{ active: itemIndex === element.highlightIndex }">{{ item }}</span></div>
            </div>
            <div v-else-if="element.type === 'hash_table_buckets'" class="data-structure hash-buckets" :class="animationClass(element)" :style="animationDelay(index)">
              <strong>{{ element.keyLabel ?? "hash buckets" }}</strong>
              <div><span v-for="(bucket, bucketIndex) in element.buckets" :key="`${bucket}-${bucketIndex}`" :class="{ active: bucketIndex === element.activeIndex, collision: element.collisionIndices?.includes(bucketIndex) }">#{{ bucket }}</span></div>
            </div>
            <div v-else-if="element.type === 'hash_function_panel'" class="data-structure function-panel" :class="animationClass(element)" :style="animationDelay(index)">
              <span>{{ element.inputKey }}</span><b>hash</b><span>{{ element.expression }}</span><b>=</b><span>{{ element.outputIndex }}</span>
            </div>
            <div v-else-if="element.type === 'collision_chain' || element.type === 'linked_list_nodes'" class="data-structure node-chain" :class="animationClass(element)" :style="animationDelay(index)">
              <span v-for="(node, nodeIndex) in element.nodes" :key="`${node}-${nodeIndex}`" :class="{ active: nodeIndex === (element.type === 'collision_chain' ? element.activeNodeIndex : element.activeIndex) }">{{ node }}</span>
            </div>
            <div v-else-if="element.type === 'array_cells'" class="data-structure array-cells" :class="animationClass(element)" :style="animationDelay(index)">
              <span v-for="(item, itemIndex) in element.items" :key="`${item}-${itemIndex}`" :class="{ active: element.activeIndices?.includes(itemIndex) }">{{ item }}</span>
            </div>
            <div v-else-if="element.type === 'stack_blocks'" class="data-structure stack-blocks" :class="animationClass(element)" :style="animationDelay(index)">
              <strong>{{ element.operation }}</strong>
              <span v-for="(item, itemIndex) in element.items" :key="`${item}-${itemIndex}`" :class="{ active: itemIndex === element.activeIndex }">{{ item }}</span>
            </div>
            <div v-else-if="element.type === 'queue_line'" class="data-structure queue-line" :class="animationClass(element)" :style="animationDelay(index)">
              <strong>{{ element.operation }}</strong>
              <span v-for="(item, itemIndex) in element.items" :key="`${item}-${itemIndex}`" :class="{ active: itemIndex === element.headIndex || itemIndex === element.tailIndex }">{{ item }}</span>
            </div>
            <div v-else-if="element.type === 'tree_node_graph'" class="data-structure tree-preview" :class="animationClass(element)" :style="animationDelay(index)">
              <span v-for="node in element.nodes" :key="node" :class="{ active: element.activePath?.includes(node) }">{{ node }}</span>
            </div>
            <pre v-else-if="element.type === 'code_trace_panel'" class="code-element" :class="animationClass(element)" :style="animationDelay(index)"><code>{{ element.codeLines.join("\n") }}</code></pre>
            <div v-else-if="element.type === 'pointer_arrow'" class="data-structure pointer-preview" :class="animationClass(element)" :style="animationDelay(index)">
              <span>{{ element.fromLabel }}</span><b>{{ element.label }}</b><span>{{ element.toLabel }}</span>
            </div>
            <div v-else-if="element.type === 'memory_box'" class="data-structure memory-box" :class="animationClass(element)" :style="animationDelay(index)">
              <small>{{ element.address }}</small><span :class="{ active: element.active }">{{ element.value }}</span>
            </div>
            <div v-else-if="element.type === 'complexity_chart'" class="data-structure complexity-chart" :class="animationClass(element)" :style="animationDelay(index)">
              <strong>{{ element.label }}</strong>
              <span v-for="(item, itemIndex) in element.items" :key="`${item}-${itemIndex}`" :class="{ active: itemIndex === element.activeIndex }">{{ item }}</span>
            </div>
            <ol v-else-if="element.type === 'timeline'" class="timeline-steps" :class="animationClass(element)" :style="animationDelay(index)">
              <li v-for="item in element.items" :key="item">{{ item }}</li>
            </ol>
            <img v-else-if="element.type === 'image'" class="motion-image" :class="animationClass(element)" :style="animationDelay(index)" :src="element.imageUrl" :alt="element.alt" />
            <pre v-else-if="element.type === 'code'" class="code-element" :class="animationClass(element)" :style="animationDelay(index)"><code>{{ element.content }}</code></pre>
            <div v-else-if="element.type === 'formula'" class="formula-element" :class="animationClass(element)" :style="animationDelay(index)">{{ element.content }}</div>
          </template>
        </section>
      </main>

      <div class="stage-progress"><span :style="{ width: `${totalProgress}%` }"></span></div>
    </div>

    <section class="subtitle"><strong>旁白字幕</strong><p>{{ currentBeat.narration }}</p></section>
    <section class="scene-audit">
      <div v-if="currentScene.teachingPurpose"><strong>Purpose</strong><span>{{ currentScene.teachingPurpose }}</span></div>
      <div v-if="currentScene.concreteObjects?.length"><strong>Objects</strong><span>{{ currentScene.concreteObjects.join(" / ") }}</span></div>
      <div v-if="currentScene.stateChanges?.length"><strong>State</strong><span>{{ currentScene.stateChanges.join(" -> ") }}</span></div>
      <div v-if="currentScene.misconceptionFix"><strong>Fix</strong><span>{{ currentScene.misconceptionFix }}</span></div>
      <ol v-if="currentScene.animationSteps?.length" class="animation-step-list">
        <li v-for="step in currentScene.animationSteps" :key="`${step.startState}-${step.endState}`">
          {{ step.startState }} -> {{ step.endState }} / {{ step.visualAction }}
        </li>
      </ol>
    </section>
    <audio ref="audioElement" :src="currentBeat.audioUrl" @timeupdate="updateProgress" @ended="handleEnded" @play="playing = true" @pause="playing = false" />
    <footer class="player-controls">
      <el-button :disabled="currentSceneIndex === 0" @click="previousScene">上一步</el-button>
      <el-button type="primary" @click="togglePlay">{{ playing ? "暂停" : "播放旁白" }}</el-button>
      <el-button :disabled="currentSceneIndex === steps.length - 1" @click="nextScene">下一步</el-button>
      <el-checkbox v-model="autoPlay">自动播放</el-checkbox>
    </footer>
  </section>
  <el-alert v-else title="视频资源 JSON 无法解析，请重新生成资源" type="error" :closable="false" show-icon />
</template>

<style scoped>
.video-lesson-player { display: grid; gap: 14px; }
.lesson-stage { aspect-ratio: 16 / 9; display: grid; grid-template-rows: auto 1fr auto; gap: 16px; padding: 24px; overflow: hidden; box-sizing: border-box; border: 1px solid var(--nl-border); border-radius: var(--nl-radius-lg); background: var(--nl-surface); color: var(--nl-text); }
.stage-header, .player-controls, .scene-meta { display: flex; align-items: center; gap: 12px; }
.stage-header { justify-content: space-between; }
.stage-header p { margin: 0; color: var(--nl-text-subtle); font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; }
.stage-header h2, .motion-stage h3 { margin: 6px 0 0; }
.scene-meta { color: var(--nl-text-muted); font-size: 13px; }
.scene-meta span { padding: 4px 9px; border: 1px solid var(--nl-border); border-radius: var(--nl-radius-sm); background: var(--nl-bg); }
.motion-stage { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 12px; min-height: 0; }
.motion-stage h3 { color: var(--nl-primary); }
.screen-copy { display: grid; gap: 8px; }
.screen-copy ul { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.screen-copy li { padding: 5px 9px; border-left: 3px solid var(--nl-warning); border-radius: var(--nl-radius-sm); background: var(--nl-surface); color: var(--nl-text-muted); font-size: 13px; font-weight: 650; }
.visual-plan { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 14px; min-height: 0; padding: 12px; border: 1px solid var(--nl-border); border-radius: var(--nl-radius-lg); background: var(--nl-bg); }
.layout-pipeline { flex-direction: row; justify-content: space-around; }
.layout-left_right { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: center; }
.layout-center_focus { flex-direction: column; }
.layout-summary_cards, .layout-comparison { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.layout-comparison { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.layout-grid_focus { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(140px, .7fr); align-content: center; }
.layout-timeline { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, 1fr); align-content: center; }
.motion-text, .concept-card, .circle-label, .formula-element, .code-element { padding: 13px 17px; border: 1px solid var(--nl-border); border-radius: var(--nl-radius-md); background: var(--nl-surface); box-shadow: var(--nl-shadow-card); }
.motion-text.keyword, .circle-label { border-color: var(--nl-primary-soft); color: var(--nl-primary); border-radius: var(--nl-radius-sm); font-weight: 700; }
.concept-card { color: var(--nl-text); text-align: center; }
.icon-bubble { display: grid; place-items: center; width: 84px; height: 84px; border: 1px solid var(--nl-primary-soft); border-radius: 50%; color: var(--nl-primary); background: var(--nl-primary-tint); }
.arrow-flow { display: grid; justify-items: center; min-width: 100px; color: var(--nl-primary); }
.arrow-flow span { display: block; width: 100%; height: 3px; margin-top: 6px; background: var(--nl-primary); transform-origin: left; }
.grid-focus { display: grid; gap: 8px; text-align: center; color: var(--nl-primary); }
.grid-focus div { display: grid; grid-template-columns: repeat(3, 42px); gap: 5px; }
.grid-focus span { padding: 8px; border: 1px solid var(--nl-border); border-radius: 6px; background: var(--nl-surface); color: var(--nl-text-muted); }
.grid-focus span.active { border-color: var(--nl-warning); background: var(--nl-warning-soft); color: var(--nl-text); }
.data-structure { display: grid; gap: 8px; padding: 13px 17px; border: 1px solid var(--nl-border); border-radius: var(--nl-radius-md); background: var(--nl-surface); color: var(--nl-text); }
.data-structure strong { color: var(--nl-primary); }
.data-structure span { padding: 8px 10px; border: 1px solid var(--nl-border); border-radius: 8px; background: var(--nl-bg); text-align: center; }
.data-structure span.active, .data-structure span.collision { border-color: var(--nl-warning); background: var(--nl-warning-soft); color: var(--nl-text); }
.hash-buckets div, .array-cells, .queue-line, .node-chain, .function-panel, .pointer-preview, .complexity-chart { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px; }
.stack-blocks { justify-items: center; }
.stack-blocks span { min-width: 90px; }
.tree-preview { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.memory-box small { color: var(--nl-text-subtle); }
.timeline-steps { display: flex; gap: 10px; padding: 0; list-style-position: inside; color: var(--nl-text); }
.timeline-steps li { padding: 10px; border: 1px solid var(--nl-border); border-radius: var(--nl-radius-sm); background: var(--nl-surface); }
.motion-image { width: 220px; height: 132px; border-radius: var(--nl-radius-md); object-fit: cover; }
.subtitle { padding: 12px 16px; border: 1px solid var(--nl-border); border-radius: var(--nl-radius-md); background: var(--nl-surface); }
.subtitle p { margin: 6px 0 0; color: var(--nl-text-muted); line-height: 1.6; }
.scene-audit { display: grid; gap: 8px; padding: 12px 16px; border: 1px solid var(--nl-border); border-radius: var(--nl-radius-md); background: var(--nl-bg); color: var(--nl-text-muted); }
.scene-audit div { display: grid; grid-template-columns: 86px minmax(0, 1fr); gap: 10px; }
.scene-audit strong { color: var(--nl-text); }
.animation-step-list { margin: 0; padding-left: 20px; line-height: 1.55; }
.stage-progress { height: 5px; overflow: hidden; border-radius: 999px; background: var(--nl-surface-muted); }
.stage-progress span { display: block; height: 100%; background: var(--nl-primary); }
.motion-fade_in, .motion-pop_in, .motion-slide_in_left, .motion-slide_in_right, .motion-float, .motion-draw, .motion-highlight, .motion-zoom_in, .motion-stagger_in { animation: enter 220ms both; }
.motion-slide_in_left { animation-name: enter-left; }.motion-slide_in_right { animation-name: enter-right; }.motion-pop_in, .motion-zoom_in { animation-name: enter-pop; }.motion-float { animation-name: enter; }.motion-draw { animation-name: draw; }.motion-highlight { animation-name: enter; }
@keyframes enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes enter-left { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
@keyframes enter-right { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
@keyframes enter-pop { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
@keyframes draw { from { opacity: 0; transform: scaleX(0); } to { opacity: 1; transform: scaleX(1); } }
@media (max-width: 760px) { .lesson-stage { aspect-ratio: auto; min-height: 420px; }.layout-summary_cards, .layout-comparison, .layout-left_right, .layout-grid_focus, .layout-timeline { grid-template-columns: 1fr; }.timeline-steps { flex-wrap: wrap; } }
@media (prefers-reduced-motion: reduce) { .visual-plan * { animation-duration: 1ms !important; animation-iteration-count: 1 !important; } }
</style>
