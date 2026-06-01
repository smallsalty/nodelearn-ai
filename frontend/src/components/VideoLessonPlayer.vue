<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { AnimationScriptContent, StackOperation, VideoLessonScene } from "@/types/resource";

const props = defineProps<{
  content: string;
}>();

const currentSceneIndex = ref(0);
const audioElement = ref<HTMLAudioElement | null>(null);
const autoPlay = ref(false);
const playing = ref(false);
const sceneProgress = ref(0);

const lesson = computed<AnimationScriptContent | null>(() => {
  try {
    const parsed = JSON.parse(props.content) as AnimationScriptContent;
    return Array.isArray(parsed.scenes) ? parsed : null;
  } catch {
    return null;
  }
});

const currentScene = computed<VideoLessonScene | null>(
  () => lesson.value?.scenes[currentSceneIndex.value] ?? null
);

const totalProgress = computed(() => {
  const sceneCount = lesson.value?.scenes.length ?? 0;
  if (!sceneCount) return 0;
  return ((currentSceneIndex.value + sceneProgress.value / 100) / sceneCount) * 100;
});

const stackItems = computed<number[]>(() => {
  const scene = currentScene.value;
  if (!scene || scene.visualType !== "stack_animation") return [];
  const items = Array.isArray(scene.visualData.items) ? [...scene.visualData.items] : [];
  const operations = Array.isArray(scene.visualData.operations)
    ? (scene.visualData.operations as StackOperation[])
    : [];
  const completed = Math.floor((sceneProgress.value / 100) * (operations.length + 1));
  for (const operation of operations.slice(0, completed)) {
    if (operation.type === "push" && typeof operation.value === "number") {
      items.push(operation.value);
    }
    if (operation.type === "pop") {
      items.pop();
    }
  }
  return items;
});

const textBullets = computed<string[]>(() => {
  const scene = currentScene.value;
  if (!scene || scene.visualType !== "text_slide" || !Array.isArray(scene.visualData.bullets)) {
    return [];
  }
  return scene.visualData.bullets.map((item) => String(item));
});

const highlightedCode = computed(() => highlightCode(currentScene.value?.codeSnippet ?? ""));

watch(
  () => props.content,
  () => {
    currentSceneIndex.value = 0;
    sceneProgress.value = 0;
    playing.value = false;
  }
);

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
  if (audio.paused) {
    await audio.play();
    playing.value = true;
  } else {
    audio.pause();
    playing.value = false;
  }
}

function updateProgress() {
  const audio = audioElement.value;
  if (!audio || !audio.duration) return;
  sceneProgress.value = (audio.currentTime / audio.duration) * 100;
}

function handleEnded() {
  sceneProgress.value = 100;
  if (autoPlay.value) {
    nextScene();
  } else {
    playing.value = false;
  }
}

async function restartAudio() {
  sceneProgress.value = 0;
  await nextTick();
  const audio = audioElement.value;
  if (!audio) return;
  audio.load();
  if (autoPlay.value || playing.value) {
    await audio.play();
    playing.value = true;
  }
}

function highlightCode(value: string): string {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /\b(const|let|var|function|return|if|else|for|while|push|pop|class|def)\b/g,
    '<span class="code-keyword">$1</span>'
  );
}
</script>

<template>
  <section v-if="lesson && currentScene" class="video-lesson-player">
    <div class="lesson-stage">
      <header class="stage-header">
        <div>
          <p>NodeLearn AI 动态讲解</p>
          <h2>{{ lesson.title }}</h2>
        </div>
        <span>{{ currentSceneIndex + 1 }} / {{ lesson.scenes.length }}</span>
      </header>

      <section class="scene-layout">
        <div class="visual-panel">
          <h3>{{ currentScene.title }}</h3>
          <div v-if="currentScene.visualType === 'stack_animation'" class="stack-scene">
            <div class="stack-items">
              <div v-for="(item, index) in stackItems" :key="`${item}-${index}`" class="stack-item">
                {{ item }}
              </div>
            </div>
            <span>栈顶</span>
          </div>
          <ul v-else class="text-slide">
            <li v-for="(bullet, index) in textBullets" :key="`${bullet}-${index}`">{{ bullet }}</li>
          </ul>
        </div>

        <aside class="explain-panel">
          <div>
            <strong>旁白字幕</strong>
            <p>{{ currentScene.narration }}</p>
          </div>
          <div v-if="currentScene.codeSnippet">
            <strong>代码高亮</strong>
            <pre><code v-html="highlightedCode"></code></pre>
          </div>
        </aside>
      </section>

      <div class="stage-progress">
        <span :style="{ width: `${totalProgress}%` }"></span>
      </div>
    </div>

    <audio
      ref="audioElement"
      :src="currentScene.audioUrl"
      @timeupdate="updateProgress"
      @ended="handleEnded"
      @play="playing = true"
      @pause="playing = false"
    />

    <footer class="player-controls">
      <el-button :disabled="currentSceneIndex === 0" @click="previousScene">上一步</el-button>
      <el-button type="primary" @click="togglePlay">{{ playing ? "暂停" : "播放旁白" }}</el-button>
      <el-button :disabled="currentSceneIndex === lesson.scenes.length - 1" @click="nextScene">下一步</el-button>
      <el-checkbox v-model="autoPlay">自动播放</el-checkbox>
    </footer>
  </section>
  <el-alert v-else title="视频资源 JSON 无法解析" type="error" :closable="false" show-icon />
</template>

<style scoped>
.video-lesson-player {
  display: grid;
  gap: 14px;
}

.lesson-stage {
  aspect-ratio: 16 / 9;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 18px;
  padding: 26px;
  overflow: hidden;
  box-sizing: border-box;
  border-radius: 16px;
  background: #071426;
  color: #f7fbff;
}

.stage-header,
.player-controls,
.stack-scene {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stage-header {
  justify-content: space-between;
}

.stage-header p {
  margin: 0;
  color: #33d6c5;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.stage-header h2,
.visual-panel h3 {
  margin: 7px 0 0;
}

.scene-layout {
  display: grid;
  grid-template-columns: 1.25fr 0.85fr;
  gap: 18px;
  min-height: 0;
}

.visual-panel,
.explain-panel > div {
  padding: 18px;
  border: 1px solid #24415f;
  border-radius: 12px;
  background: #10233f;
}

.visual-panel h3 {
  color: #ffc857;
}

.stack-scene {
  justify-content: center;
  height: calc(100% - 30px);
}

.stack-items {
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
  width: 120px;
}

.stack-item {
  padding: 10px;
  border: 2px solid #5ea1ff;
  border-radius: 8px;
  text-align: center;
}

.stack-item:last-child {
  border-color: #ffc857;
}

.text-slide {
  color: #d7e8ff;
  line-height: 1.8;
}

.explain-panel {
  display: grid;
  gap: 12px;
  min-height: 0;
  overflow: auto;
}

.explain-panel p {
  color: #d7e8ff;
  line-height: 1.7;
}

pre {
  overflow: auto;
  color: #d7e8ff;
  white-space: pre-wrap;
}

:deep(.code-keyword) {
  color: #ffc857;
}

.stage-progress {
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: #24415f;
}

.stage-progress span {
  display: block;
  height: 100%;
  background: #33d6c5;
}

@media (max-width: 760px) {
  .lesson-stage {
    aspect-ratio: auto;
  }

  .scene-layout {
    grid-template-columns: 1fr;
  }
}
</style>
