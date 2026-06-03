<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { AnimationScriptContent, VideoLessonScene, VisualElement } from "@/types/resource";

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

const currentScene = computed<VideoLessonScene | null>(() => lesson.value?.scenes[currentSceneIndex.value] ?? null);
const totalProgress = computed(() => {
  const sceneCount = lesson.value?.scenes.length ?? 0;
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
  const scenes = lesson.value?.scenes ?? [];
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
  <section v-if="lesson && currentScene" class="video-lesson-player">
    <div class="lesson-stage">
      <header class="stage-header">
        <div>
          <p>NodeLearn AI · Explainer</p>
          <h2>{{ lesson.title }}</h2>
        </div>
        <div class="scene-meta"><span>{{ currentScene.sceneType }}</span>{{ currentSceneIndex + 1 }} / {{ lesson.scenes.length }}</div>
      </header>

      <main class="motion-stage">
        <h3>{{ currentScene.title }}</h3>
        <section class="visual-plan" :class="`layout-${currentScene.visualPlan.layout}`">
          <template v-for="(element, index) in currentScene.visualPlan.elements" :key="`${element.type}-${index}`">
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
            <ol v-else-if="element.type === 'timeline'" class="timeline-steps" :class="animationClass(element)" :style="animationDelay(index)">
              <li v-for="item in element.items" :key="item">{{ item }}</li>
            </ol>
            <img v-else-if="element.type === 'image'" class="motion-image" :class="animationClass(element)" :style="animationDelay(index)" :src="element.imageUrl" :alt="element.alt" />
            <pre v-else-if="element.type === 'code'" class="code-element" :class="animationClass(element)" :style="animationDelay(index)"><code>{{ element.content }}</code></pre>
            <div v-else class="formula-element" :class="animationClass(element)" :style="animationDelay(index)">{{ element.content }}</div>
          </template>
        </section>
      </main>

      <div class="stage-progress"><span :style="{ width: `${totalProgress}%` }"></span></div>
    </div>

    <section class="subtitle"><strong>旁白字幕</strong><p>{{ currentScene.narration }}</p></section>
    <audio ref="audioElement" :src="currentScene.audioUrl" @timeupdate="updateProgress" @ended="handleEnded" @play="playing = true" @pause="playing = false" />
    <footer class="player-controls">
      <el-button :disabled="currentSceneIndex === 0" @click="previousScene">上一步</el-button>
      <el-button type="primary" @click="togglePlay">{{ playing ? "暂停" : "播放旁白" }}</el-button>
      <el-button :disabled="currentSceneIndex === lesson.scenes.length - 1" @click="nextScene">下一步</el-button>
      <el-checkbox v-model="autoPlay">自动播放</el-checkbox>
    </footer>
  </section>
  <el-alert v-else title="视频资源 JSON 无法解析，请重新生成资源" type="error" :closable="false" show-icon />
</template>

<style scoped>
.video-lesson-player { display: grid; gap: 14px; }
.lesson-stage { aspect-ratio: 16 / 9; display: grid; grid-template-rows: auto 1fr auto; gap: 16px; padding: 24px; overflow: hidden; box-sizing: border-box; border-radius: 16px; background: radial-gradient(circle at 15% 10%, #103b52, #071426 58%); color: #f7fbff; }
.stage-header, .player-controls, .scene-meta { display: flex; align-items: center; gap: 12px; }
.stage-header { justify-content: space-between; }
.stage-header p { margin: 0; color: #33d6c5; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
.stage-header h2, .motion-stage h3 { margin: 6px 0 0; }
.scene-meta { color: #a9bdd7; font-size: 13px; }
.scene-meta span { padding: 4px 9px; border: 1px solid #24415f; border-radius: 999px; }
.motion-stage { display: grid; grid-template-rows: auto 1fr; min-height: 0; }
.motion-stage h3 { color: #ffc857; }
.visual-plan { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 14px; min-height: 0; padding: 12px; }
.layout-pipeline, .layout-left_right { flex-direction: row; }
.layout-center_focus { flex-direction: column; }
.layout-summary_cards, .layout-comparison { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.layout-comparison { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.motion-text, .concept-card, .circle-label, .formula-element, .code-element { padding: 13px 17px; border: 1px solid #24415f; border-radius: 14px; background: rgba(16, 35, 63, .9); }
.motion-text.keyword, .circle-label { border-color: #33d6c5; color: #33d6c5; border-radius: 999px; font-weight: 700; }
.concept-card { color: #d7e8ff; text-align: center; }
.icon-bubble { display: grid; place-items: center; width: 84px; height: 84px; border: 2px solid #33d6c5; border-radius: 50%; color: #33d6c5; background: rgba(51, 214, 197, .1); }
.arrow-flow { display: grid; justify-items: center; min-width: 100px; color: #33d6c5; }
.arrow-flow span { display: block; width: 100%; height: 3px; margin-top: 6px; background: #33d6c5; transform-origin: left; }
.grid-focus { display: grid; gap: 8px; text-align: center; color: #ffc857; }
.grid-focus div { display: grid; grid-template-columns: repeat(3, 42px); gap: 5px; }
.grid-focus span { padding: 8px; border-radius: 6px; background: #173352; color: #d7e8ff; }
.grid-focus span.active { background: #ffc857; color: #071426; }
.timeline-steps { display: flex; gap: 10px; padding: 0; list-style-position: inside; color: #d7e8ff; }
.timeline-steps li { padding: 10px; border: 1px solid #24415f; border-radius: 10px; background: #10233f; }
.motion-image { width: 220px; height: 132px; border-radius: 12px; object-fit: cover; }
.subtitle { padding: 12px 16px; border: 1px solid #dbe5ef; border-radius: 12px; background: #fff; }
.subtitle p { margin: 6px 0 0; color: #475569; line-height: 1.6; }
.stage-progress { height: 5px; overflow: hidden; border-radius: 999px; background: #24415f; }
.stage-progress span { display: block; height: 100%; background: linear-gradient(90deg, #33d6c5, #5ea1ff); }
.motion-fade_in, .motion-pop_in, .motion-slide_in_left, .motion-slide_in_right, .motion-float, .motion-draw, .motion-highlight, .motion-zoom_in, .motion-stagger_in { animation: enter .7s both; }
.motion-slide_in_left { animation-name: enter-left; }.motion-slide_in_right { animation-name: enter-right; }.motion-pop_in, .motion-zoom_in { animation-name: enter-pop; }.motion-float { animation: enter .7s both, float 2.5s .7s ease-in-out infinite; }.motion-draw { animation-name: draw; }.motion-highlight { animation: enter .7s both, highlight 1.8s .7s ease-in-out infinite; }
@keyframes enter { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
@keyframes enter-left { from { opacity: 0; transform: translateX(-44px); } to { opacity: 1; transform: translateX(0); } }
@keyframes enter-right { from { opacity: 0; transform: translateX(44px); } to { opacity: 1; transform: translateX(0); } }
@keyframes enter-pop { from { opacity: 0; transform: scale(.72); } to { opacity: 1; transform: scale(1); } }
@keyframes float { 50% { transform: translateY(-8px); } }
@keyframes draw { from { opacity: 0; transform: scaleX(0); } to { opacity: 1; transform: scaleX(1); } }
@keyframes highlight { 50% { filter: brightness(1.32); transform: scale(1.035); } }
@media (max-width: 760px) { .lesson-stage { aspect-ratio: auto; min-height: 420px; }.layout-summary_cards { grid-template-columns: 1fr; }.timeline-steps { flex-wrap: wrap; } }
</style>
