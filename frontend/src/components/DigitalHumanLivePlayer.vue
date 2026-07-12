<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import Hls from "hls.js";
import { VideoPlay } from "@element-plus/icons-vue";
import type { TaskStatus } from "@/types/contracts";

const props = defineProps<{
  videoUrl?: string;
  status: TaskStatus;
  errorMessage?: string;
}>();

const videoElement = ref<HTMLVideoElement | null>(null);
const playerError = ref("");
const playRequired = ref(false);
let hls: Hls | null = null;

function destroyPlayer() {
  hls?.destroy();
  hls = null;
  const video = videoElement.value;
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

async function tryPlay() {
  const video = videoElement.value;
  if (!video) return;
  try {
    await video.play();
    playRequired.value = false;
  } catch {
    playRequired.value = true;
  }
}

async function attachPlayer(url?: string) {
  destroyPlayer();
  playerError.value = "";
  playRequired.value = false;
  if (!url) return;
  await nextTick();
  const video = videoElement.value;
  if (!video) return;
  if (url.toLowerCase().includes(".m3u8") && Hls.isSupported()) {
    hls = new Hls({
      lowLatencyMode: true,
      liveSyncDurationCount: 2,
      liveMaxLatencyDurationCount: 8,
      enableWorker: true
    });
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => void tryPlay());
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      playerError.value = data.details || "直播流播放失败";
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError();
    });
    return;
  }
  video.src = url;
  video.addEventListener("loadedmetadata", () => void tryPlay(), { once: true });
}

watch(() => props.videoUrl, (url) => void attachPlayer(url), { immediate: true });
onBeforeUnmount(destroyPlayer);
</script>

<template>
  <section class="live-player" :class="`is-${status}`">
    <video ref="videoElement" controls autoplay playsinline aria-label="数字人实时直播" />
    <div v-if="!videoUrl" class="player-placeholder">
      <el-icon><VideoPlay /></el-icon>
      <strong>{{ status === "failed" ? "直播启动失败" : "数字人直播等待连接" }}</strong>
      <span>{{ errorMessage || "发送问题后，数字人将在这里实时讲解。" }}</span>
    </div>
    <button v-if="playRequired && videoUrl" class="play-overlay" type="button" @click="tryPlay">
      <el-icon><VideoPlay /></el-icon>
      点击播放带声音的数字人回答
    </button>
    <el-alert
      v-if="playerError || errorMessage"
      class="player-alert"
      :title="playerError || errorMessage"
      type="error"
      show-icon
      :closable="false"
    />
  </section>
</template>

<style scoped>
.live-player {
  position: relative;
  min-height: 250px;
  overflow: hidden;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-lg);
  background: #111814;
}

.live-player video {
  display: block;
  width: 100%;
  min-height: 250px;
  max-height: 420px;
  object-fit: contain;
}

.player-placeholder,
.play-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  padding: 24px;
  border: 0;
  background: linear-gradient(145deg, #17231c, #0e1511);
  color: #f5fbf7;
  text-align: center;
}

.player-placeholder .el-icon,
.play-overlay .el-icon {
  font-size: 34px;
  color: var(--nl-primary);
}

.player-placeholder span {
  color: #b8c6bd;
}

.play-overlay {
  cursor: pointer;
  background: rgb(10 17 13 / 78%);
  font: inherit;
}

.player-alert {
  position: absolute;
  right: 12px;
  bottom: 12px;
  left: 12px;
}
</style>
