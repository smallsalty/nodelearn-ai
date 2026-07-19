<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, ArrowRight, Document, Menu } from "@element-plus/icons-vue";
import MarkdownContent from "@/components/MarkdownContent.vue";
import StateBlock from "@/components/StateBlock.vue";
import { courseApi } from "@/api/modules/course";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { CourseContent, CourseContentChapter } from "@/types/course";

interface AnchorTarget {
  anchor: string;
  chapter: CourseContentChapter;
  nodeId?: string;
}

interface ApplyAnchorOptions {
  behavior?: ScrollBehavior | "auto";
  focusHeading?: boolean;
  history?: "none" | "push" | "replace";
}

const route = useRoute();
const router = useRouter();
const content = ref<CourseContent | null>(null);
const loading = ref(false);
const errorMessage = ref("");
const anchorMessage = ref("");
const activeAnchor = ref("");
const activeChapterId = ref("");
const tocOpen = ref(false);
const toc = ref<HTMLElement | null>(null);
const drawerToc = ref<HTMLElement | null>(null);
const reader = ref<HTMLElement | null>(null);
const readerScroll = ref<HTMLElement | null>(null);
const chapterHeading = ref<HTMLElement | null>(null);
const courseId = computed(() => typeof route.params.courseId === "string" ? route.params.courseId : "");
const chapters = computed(() => content.value?.chapters ?? []);
const hasContent = computed(() => chapters.value.length > 0);
const activeChapterIndex = computed(() => chapters.value.findIndex((chapter) => chapter.id === activeChapterId.value));
const activeChapter = computed(() => chapters.value[activeChapterIndex.value] ?? null);
const previousChapter = computed(() => activeChapterIndex.value > 0 ? chapters.value[activeChapterIndex.value - 1] : null);
const nextChapter = computed(() => activeChapterIndex.value >= 0 && activeChapterIndex.value < chapters.value.length - 1
  ? chapters.value[activeChapterIndex.value + 1]
  : null);
const pageStatus = computed(() => activeChapterIndex.value >= 0
  ? `第 ${activeChapterIndex.value + 1} 章，共 ${chapters.value.length} 章`
  : "");
const chapterIdByNodeId = computed(() => {
  const result = new Map<string, string>();
  for (const chapter of chapters.value) {
    for (const section of chapter.sections) result.set(section.nodeId, chapter.id);
  }
  return result;
});

let observer: IntersectionObserver | null = null;
let syncingSelection = false;
let suppressedRouteAnchor = "";
let scrollSyncSuppressed = false;
let scrollSyncTimer: number | null = null;

watch(courseId, () => void loadContent(), { immediate: true });

watch(
  () => route.hash,
  (hash) => {
    if (!content.value || loading.value) return;
    const anchor = hash.startsWith("#") ? hash.slice(1) : hash;
    if (anchor && anchor === suppressedRouteAnchor) {
      suppressedRouteAnchor = "";
      return;
    }
    void applyRouteAnchor(anchor);
  }
);

watch(
  () => appState.selectedNodeId,
  (nodeId) => {
    if (syncingSelection || !nodeId || !chapterIdByNodeId.value.has(nodeId)) return;
    void navigateTo(`node-${nodeId}`);
  }
);

watch(
  () => appState.selectedChapterId,
  (chapterId) => {
    if (syncingSelection || appState.selectedNodeId || !chapterId) return;
    if (chapters.value.some((chapter) => chapter.id === chapterId)) void navigateTo(`chapter-${chapterId}`, true);
  }
);

watch(activeAnchor, () => void nextTick(scrollActiveTocItem));
watch(tocOpen, (open) => {
  if (open) void nextTick(scrollActiveTocItem);
});

async function loadContent() {
  observer?.disconnect();
  content.value = null;
  activeChapterId.value = "";
  activeAnchor.value = "";
  errorMessage.value = "";
  anchorMessage.value = "";
  if (!courseId.value) {
    errorMessage.value = "缺少课程标识";
    return;
  }
  loading.value = true;
  try {
    const response = await courseApi.getCourseContent(courseId.value);
    content.value = response.data;
    loading.value = false;
    await nextTick();
    const requestedAnchor = route.hash.startsWith("#") ? route.hash.slice(1) : route.hash;
    if (requestedAnchor) {
      await applyRouteAnchor(requestedAnchor);
    } else if (response.data.chapters[0]) {
      await applyAnchor(`chapter-${response.data.chapters[0].id}`, { behavior: "auto", history: "replace" });
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

function resolveAnchor(anchor: string): AnchorTarget | null {
  if (anchor.startsWith("chapter-")) {
    const chapterId = anchor.slice("chapter-".length);
    const chapter = chapters.value.find((item) => item.id === chapterId);
    return chapter ? { anchor, chapter } : null;
  }
  if (anchor.startsWith("node-")) {
    const nodeId = anchor.slice("node-".length);
    const chapter = chapters.value.find((item) => item.sections.some((section) => section.nodeId === nodeId));
    return chapter ? { anchor, chapter, nodeId } : null;
  }
  return null;
}

async function applyRouteAnchor(anchor: string) {
  const requestedTarget = anchor ? resolveAnchor(anchor) : null;
  if (requestedTarget) {
    await applyAnchor(anchor, { behavior: "auto" });
    return;
  }

  const invalidAnchorMessage = anchor ? `未找到目录位置：${anchor}` : "";
  const fallback = activeChapter.value ?? chapters.value[0];
  if (fallback) await applyAnchor(`chapter-${fallback.id}`, { behavior: "auto" });
  anchorMessage.value = invalidAnchorMessage;
}

async function applyAnchor(anchor: string, options: ApplyAnchorOptions = {}) {
  const target = resolveAnchor(anchor);
  if (!target) {
    anchorMessage.value = `未找到目录位置：${anchor}`;
    return;
  }

  anchorMessage.value = "";
  activeChapterId.value = target.chapter.id;
  activeAnchor.value = anchor;
  syncGlobalSelection(target);
  await nextTick();
  setupObserver();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = reduceMotion ? "auto" : (options.behavior ?? "smooth");
  suppressScrollSync(behavior);
  if (target.nodeId) {
    document.getElementById(anchor)?.scrollIntoView({ behavior, block: "start" });
  } else {
    readerScroll.value?.scrollTo({ top: 0, behavior });
  }
  if (options.focusHeading) chapterHeading.value?.focus({ preventScroll: true });
  scrollActiveTocItem();

  if (options.history && options.history !== "none" && route.hash !== `#${anchor}`) {
    suppressedRouteAnchor = anchor;
    await router[options.history]({ hash: `#${anchor}` });
  }
  tocOpen.value = false;
}

function syncGlobalSelection(target: AnchorTarget) {
  syncingSelection = true;
  appState.selectedChapterId = target.chapter.id;
  appState.selectedNodeId = target.nodeId ?? null;
  void nextTick(() => {
    syncingSelection = false;
  });
}

function setupObserver() {
  observer?.disconnect();
  if (!readerScroll.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (scrollSyncSuppressed) return;
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target as HTMLElement)
        .sort((left, right) => Math.abs(left.getBoundingClientRect().top - 24) - Math.abs(right.getBoundingClientRect().top - 24));
      if (visible[0]?.id) activateAnchorFromScroll(visible[0].id);
    },
    { root: readerScroll.value, rootMargin: "-20px 0px -68%", threshold: [0, 0.05, 0.2] }
  );
  reader.value?.querySelectorAll<HTMLElement>("[data-content-anchor]").forEach((element) => observer?.observe(element));
}

function suppressScrollSync(behavior: ScrollBehavior | "auto") {
  scrollSyncSuppressed = true;
  if (scrollSyncTimer !== null) window.clearTimeout(scrollSyncTimer);
  scrollSyncTimer = window.setTimeout(() => {
    scrollSyncSuppressed = false;
    scrollSyncTimer = null;
  }, behavior === "smooth" ? 650 : 100);
}

function activateAnchorFromScroll(anchor: string) {
  if (!anchor || activeAnchor.value === anchor) return;
  const target = resolveAnchor(anchor);
  if (!target) return;
  activeAnchor.value = anchor;
  syncGlobalSelection(target);
  if (route.hash !== `#${anchor}`) {
    suppressedRouteAnchor = anchor;
    void router.replace({ hash: `#${anchor}` });
  }
}

function scrollActiveTocItem() {
  for (const container of [toc.value, drawerToc.value]) {
    const item = [...(container?.querySelectorAll<HTMLElement>("[data-toc-anchor]") ?? [])]
      .find((element) => element.dataset.tocAnchor === activeAnchor.value);
    item?.scrollIntoView({ block: "nearest" });
  }
}

function navigateTo(anchor: string, focusHeading = anchor.startsWith("chapter-")) {
  void applyAnchor(anchor, { focusHeading, history: "push" });
}

function openChapter(chapter: CourseContentChapter | null) {
  if (chapter) navigateTo(`chapter-${chapter.id}`, true);
}

function openGraph(nodeId: string) {
  appState.selectedChapterId = chapterIdByNodeId.value.get(nodeId) ?? null;
  appState.selectedNodeId = nodeId;
  void router.push("/knowledge-graph");
}

function openPractice(nodeId: string) {
  appState.selectedChapterId = chapterIdByNodeId.value.get(nodeId) ?? null;
  appState.selectedNodeId = nodeId;
  void router.push({ path: "/practice", query: { nodeId, tab: "single_choice" } });
}

function openMindMap(nodeId: string) {
  appState.selectedChapterId = chapterIdByNodeId.value.get(nodeId) ?? null;
  appState.selectedNodeId = nodeId;
  void router.push({ path: "/resources", query: { nodeId, action: "mind_map" } });
}

function openKnowledgeVideo(nodeId: string) {
  appState.selectedChapterId = chapterIdByNodeId.value.get(nodeId) ?? null;
  appState.selectedNodeId = nodeId;
  void router.push({ path: "/resources", query: { nodeId, action: "knowledge_video" } });
}

onMounted(() => {
  if (content.value) setupObserver();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  if (scrollSyncTimer !== null) window.clearTimeout(scrollSyncTimer);
});
</script>

<template>
  <section class="course-content-page">
    <StateBlock
      :loading="loading"
      :error="errorMessage"
      :empty="!hasContent"
      empty-text="该课程暂时没有可显示的正文"
      @retry="loadContent"
    >
      <div v-if="content && activeChapter" class="course-reader-layout">
        <aside ref="toc" class="course-toc" aria-label="课程目录">
          <div class="course-toc-heading">
            <strong class="course-toc-title">课程目录</strong>
            <span>{{ pageStatus }}</span>
          </div>
          <nav>
            <section v-for="chapter in chapters" :key="chapter.id" class="toc-chapter">
              <button
                type="button"
                :class="{
                  active: activeAnchor === `chapter-${chapter.id}`,
                  context: activeChapterId === chapter.id
                }"
                :aria-current="activeAnchor === `chapter-${chapter.id}` ? 'location' : undefined"
                :data-toc-anchor="`chapter-${chapter.id}`"
                @click="navigateTo(`chapter-${chapter.id}`, true)"
              >
                {{ chapter.title }}
              </button>
              <button
                v-for="section in chapter.sections"
                :key="section.nodeId"
                type="button"
                class="toc-section"
                :class="{ active: activeAnchor === `node-${section.nodeId}` }"
                :aria-current="activeAnchor === `node-${section.nodeId}` ? 'location' : undefined"
                :data-toc-anchor="`node-${section.nodeId}`"
                @click="navigateTo(`node-${section.nodeId}`, false)"
              >
                {{ section.title }}
              </button>
            </section>
          </nav>
        </aside>

        <section ref="readerScroll" class="course-reader-scroll" aria-label="课程章节正文">
          <div class="reader-mobile-toolbar">
            <el-button :icon="Menu" @click="tocOpen = true">课程目录</el-button>
            <span aria-live="polite">{{ pageStatus }}</span>
          </div>

          <div class="course-reader-inner">
            <header class="hero-panel course-content-hero">
              <div>
                <p class="section-label">Course Reader</p>
                <h2>{{ content.courseName }}</h2>
                <p>按章节分页阅读总览与小节；目录、工作台和正文分别滚动。</p>
              </div>
            </header>

            <el-alert
              v-if="anchorMessage"
              :title="anchorMessage"
              type="warning"
              show-icon
              :closable="false"
              class="mb-16"
            />

            <nav class="chapter-pager chapter-pager-top" aria-label="章节顶部翻页">
              <el-button
                class="chapter-pager-button chapter-pager-previous"
                :disabled="!previousChapter"
                :aria-label="previousChapter ? `上一章：${previousChapter.title}` : '已经是第一章'"
                @click="openChapter(previousChapter)"
              >
                <el-icon><ArrowLeft /></el-icon>
                <span><small>上一章</small><strong>{{ previousChapter?.title ?? "已经是第一章" }}</strong></span>
              </el-button>
              <strong class="chapter-pager-status" aria-live="polite">{{ pageStatus }}</strong>
              <el-button
                class="chapter-pager-button chapter-pager-next"
                :disabled="!nextChapter"
                :aria-label="nextChapter ? `下一章：${nextChapter.title}` : '已经是最后一章'"
                @click="openChapter(nextChapter)"
              >
                <span><small>下一章</small><strong>{{ nextChapter?.title ?? "已经是最后一章" }}</strong></span>
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </nav>

            <div ref="reader" class="course-reader">
              <article
                :id="`chapter-${activeChapter.id}`"
                :key="activeChapter.id"
                class="course-chapter"
                data-content-anchor
              >
                <header class="chapter-heading">
                  <span>{{ String(activeChapter.orderIndex).padStart(2, "0") }}</span>
                  <h2 ref="chapterHeading" tabindex="-1">{{ activeChapter.title }}</h2>
                </header>
                <MarkdownContent v-if="activeChapter.content" :content="activeChapter.content" />

                <section
                  v-for="section in activeChapter.sections"
                  :id="`node-${section.nodeId}`"
                  :key="section.nodeId"
                  class="course-section"
                  data-content-anchor
                >
                  <header class="section-heading">
                    <div>
                      <p class="section-label">Section {{ section.orderIndex }}</p>
                      <h3>{{ section.title }}</h3>
                    </div>
                    <el-icon aria-hidden="true"><Document /></el-icon>
                  </header>
                  <MarkdownContent :content="section.content" />
                  <footer class="section-actions" :aria-label="`${section.title} 学习操作`">
                    <el-button @click="openGraph(section.nodeId)">返回图谱</el-button>
                    <el-button plain @click="openPractice(section.nodeId)">进入练习</el-button>
                    <el-button plain @click="openMindMap(section.nodeId)">
                      生成思维导图<el-icon class="el-icon--right"><ArrowRight /></el-icon>
                    </el-button>
                    <el-button type="primary" @click="openKnowledgeVideo(section.nodeId)">
                      视频讲解<el-icon class="el-icon--right"><ArrowRight /></el-icon>
                    </el-button>
                  </footer>
                </section>
              </article>
            </div>

            <footer v-if="content.attribution" class="course-attribution">
              本课程正文整理自
              <a :href="content.attribution.url" target="_blank" rel="noopener noreferrer">{{ content.attribution.name }}</a>，
              依照
              <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" target="_blank" rel="noopener noreferrer">
                {{ content.attribution.license }}
              </a>
              许可使用。
            </footer>

            <nav class="chapter-pager chapter-pager-bottom" aria-label="章节底部翻页">
              <el-button
                class="chapter-pager-button chapter-pager-previous"
                :disabled="!previousChapter"
                :aria-label="previousChapter ? `上一章：${previousChapter.title}` : '已经是第一章'"
                @click="openChapter(previousChapter)"
              >
                <el-icon><ArrowLeft /></el-icon>
                <span><small>上一章</small><strong>{{ previousChapter?.title ?? "已经是第一章" }}</strong></span>
              </el-button>
              <strong class="chapter-pager-status" aria-live="polite">{{ pageStatus }}</strong>
              <el-button
                class="chapter-pager-button chapter-pager-next"
                :disabled="!nextChapter"
                :aria-label="nextChapter ? `下一章：${nextChapter.title}` : '已经是最后一章'"
                @click="openChapter(nextChapter)"
              >
                <span><small>下一章</small><strong>{{ nextChapter?.title ?? "已经是最后一章" }}</strong></span>
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </nav>
          </div>
        </section>
      </div>
    </StateBlock>

    <el-drawer
      v-model="tocOpen"
      title="课程目录"
      direction="ltr"
      size="min(88vw, 360px)"
      class="course-toc-drawer"
    >
      <nav v-if="content" ref="drawerToc" class="drawer-toc" aria-label="移动端课程目录">
        <section v-for="chapter in chapters" :key="chapter.id" class="toc-chapter">
          <button
            type="button"
            :class="{
              active: activeAnchor === `chapter-${chapter.id}`,
              context: activeChapterId === chapter.id
            }"
            :aria-current="activeAnchor === `chapter-${chapter.id}` ? 'location' : undefined"
            :data-toc-anchor="`chapter-${chapter.id}`"
            @click="navigateTo(`chapter-${chapter.id}`, true)"
          >
            {{ chapter.title }}
          </button>
          <button
            v-for="section in chapter.sections"
            :key="section.nodeId"
            type="button"
            class="toc-section"
            :class="{ active: activeAnchor === `node-${section.nodeId}` }"
            :aria-current="activeAnchor === `node-${section.nodeId}` ? 'location' : undefined"
            :data-toc-anchor="`node-${section.nodeId}`"
            @click="navigateTo(`node-${section.nodeId}`, false)"
          >
            {{ section.title }}
          </button>
        </section>
      </nav>
    </el-drawer>
  </section>
</template>

<style scoped>
.course-content-page {
  min-width: 0;
  height: 100%;
  min-height: 0;
}

.course-reader-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 18px;
  height: 100%;
  min-height: 0;
}

.course-toc,
.course-reader-scroll {
  min-height: 0;
  height: 100%;
}

.course-toc {
  overflow: auto;
  padding: 18px 10px 18px 18px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-lg);
  background: var(--nl-surface);
  box-shadow: var(--nl-shadow-card);
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.course-toc-heading {
  position: sticky;
  top: -18px;
  z-index: 2;
  display: grid;
  gap: 3px;
  margin: -18px -2px 8px -8px;
  padding: 18px 10px 12px 16px;
  border-bottom: 1px solid var(--nl-border);
  background: var(--nl-surface);
}

.course-toc-title {
  font-size: 16px;
}

.course-toc-heading span {
  color: var(--nl-text-subtle);
  font-size: 12px;
}

.course-toc nav,
.drawer-toc {
  display: grid;
  gap: 8px;
}

.toc-chapter {
  display: grid;
  gap: 2px;
}

.toc-chapter button {
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-radius: var(--nl-radius-sm);
  background: transparent;
  color: var(--nl-text-muted);
  text-align: left;
  line-height: 1.35;
}

.toc-chapter button:first-child {
  color: var(--nl-text);
  font-weight: 750;
}

.toc-chapter button:hover,
.toc-chapter button.context {
  background: color-mix(in srgb, var(--nl-primary-tint) 55%, transparent);
  color: var(--nl-text);
}

.toc-chapter button.active {
  background: var(--nl-primary-tint);
  color: var(--nl-text);
  box-shadow: inset 3px 0 var(--nl-primary-hover);
}

.toc-chapter button:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--nl-primary-hover) 45%, transparent);
  outline-offset: 1px;
}

.toc-chapter .toc-section {
  padding-left: 22px;
  font-size: 13px;
}

.course-reader-scroll {
  min-width: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.course-reader-inner {
  width: min(100%, 1120px);
  margin: 0 auto;
  padding: 0 4px 20px;
}

.reader-mobile-toolbar {
  display: none;
}

.course-content-hero {
  align-items: center;
}

.chapter-pager {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: 12px;
  margin: 14px 0;
  padding: 12px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-lg);
  background: var(--nl-surface);
}

.chapter-pager-button {
  width: 100%;
  min-width: 0;
  height: auto;
  min-height: 54px;
  margin: 0;
  padding: 9px 12px;
  white-space: normal;
}

.chapter-pager-button > span,
.chapter-pager-button :deep(.el-button__text) > span {
  display: grid;
  min-width: 0;
  text-align: left;
}

.chapter-pager-next > span,
.chapter-pager-next :deep(.el-button__text) > span {
  text-align: right;
}

.chapter-pager-button small,
.chapter-pager-button strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-pager-button small {
  color: var(--nl-text-subtle);
  font-size: 11px;
}

.chapter-pager-button strong {
  max-width: 260px;
  color: inherit;
  font-size: 13px;
}

.chapter-pager-status {
  display: grid;
  place-items: center;
  min-width: 120px;
  color: var(--nl-text-muted);
  font-size: 13px;
  text-align: center;
}

.course-reader {
  min-width: 0;
}

.course-chapter {
  scroll-margin-top: 20px;
  padding: clamp(22px, 3vw, 44px);
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-xl);
  background: var(--nl-surface);
  box-shadow: var(--nl-shadow-card);
}

.chapter-heading {
  display: flex;
  gap: 14px;
  align-items: baseline;
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 2px solid var(--nl-primary);
}

.chapter-heading > span {
  color: var(--nl-warning);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.chapter-heading h2,
.section-heading h3 {
  margin: 0;
}

.chapter-heading h2:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--nl-primary-hover) 45%, transparent);
  outline-offset: 5px;
  border-radius: 4px;
}

.course-section {
  scroll-margin-top: 20px;
  margin-top: 44px;
  padding-top: 30px;
  border-top: 1px solid var(--nl-border);
}

.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.section-heading > .el-icon {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 50%;
  background: var(--nl-primary-tint);
  color: var(--nl-warning);
}

.section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px dashed var(--nl-border-strong);
}

.course-attribution {
  padding: 20px 10px 8px;
  color: var(--nl-text-muted);
  text-align: center;
}

.course-attribution a {
  color: var(--nl-warning);
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (min-width: 768px) and (max-width: 1199px) {
  .course-reader-layout {
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 12px;
  }

  .chapter-pager {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .chapter-pager-status {
    grid-column: 1 / -1;
    grid-row: 1;
    min-height: 24px;
  }

  .chapter-pager-previous,
  .chapter-pager-next {
    grid-row: 2;
  }

  .course-chapter {
    padding: 24px 20px;
  }
}

@media (max-width: 767px) {
  .course-reader-layout {
    display: block;
    height: 100%;
  }

  .course-toc {
    display: none;
  }

  .reader-mobile-toolbar {
    position: sticky;
    top: 0;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: -1px -1px 12px;
    padding: 8px 4px 10px;
    border-bottom: 1px solid var(--nl-border);
    background: color-mix(in srgb, var(--nl-workbench-bg) 94%, transparent);
    backdrop-filter: blur(12px);
  }

  .reader-mobile-toolbar span {
    color: var(--nl-text-muted);
    font-size: 12px;
    font-weight: 700;
  }

  .course-content-hero {
    align-items: flex-start;
  }

  .chapter-pager {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .chapter-pager-status {
    grid-column: 1 / -1;
    grid-row: 1;
    min-height: 24px;
  }

  .chapter-pager-previous,
  .chapter-pager-next {
    grid-row: 2;
  }

  .chapter-pager-button strong {
    max-width: 130px;
  }

  .course-chapter {
    margin-inline: -4px;
    padding: 20px 16px;
    border-radius: var(--nl-radius-lg);
  }

  .chapter-heading {
    align-items: flex-start;
  }

  .section-actions .el-button {
    width: 100%;
    margin-left: 0;
  }
}
</style>
