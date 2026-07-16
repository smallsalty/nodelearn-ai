<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import MarkdownContent from "@/components/MarkdownContent.vue";
import StateBlock from "@/components/StateBlock.vue";
import { courseApi } from "@/api/modules/course";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { KnowledgeNode } from "@/types/course";
import { difficultyLabel } from "@/utils/format";

const route = useRoute();
const router = useRouter();
const node = ref<KnowledgeNode | null>(null);
const loading = ref(false);
const errorMessage = ref("");
const nodeId = computed(() => (typeof route.params.nodeId === "string" ? route.params.nodeId : ""));

watch(nodeId, () => void loadNode(), { immediate: true });

async function loadNode() {
  if (!nodeId.value) {
    node.value = null;
    errorMessage.value = "缺少知识节点标识";
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  node.value = null;
  try {
    const response = await courseApi.getNode(nodeId.value);
    node.value = response.data;
    appState.selectedChapterId = response.data.chapterId ?? null;
    appState.selectedNodeId = response.data.id;
    await router.replace({
      name: "course-content",
      params: { courseId: response.data.courseId },
      hash: `#node-${response.data.id}`
    });
  } catch (error) {
    appState.selectedChapterId = null;
    appState.selectedNodeId = null;
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

function backToGraph() {
  if (node.value) {
    appState.selectedChapterId = node.value.chapterId ?? null;
    appState.selectedNodeId = node.value.id;
  }
  void router.push("/knowledge-graph");
}

function openPractice() {
  if (!node.value) return;
  void router.push({ path: "/practice", query: { nodeId: node.value.id, tab: "single_choice" } });
}

function openMindMap() {
  if (!node.value) return;
  void router.push({ path: "/resources", query: { nodeId: node.value.id, action: "mind_map" } });
}
</script>

<template>
  <section class="node-content-page">
    <header class="hero-panel node-content-header">
      <div>
        <p class="section-label">Knowledge Node</p>
        <h2>{{ node?.name ?? "知识节点正文" }}</h2>
        <p>{{ node?.description ?? "读取数据库中的节点 Markdown 正文。" }}</p>
      </div>
      <div class="button-row">
        <el-button @click="backToGraph">返回图谱</el-button>
        <el-button plain :disabled="!node" @click="openPractice">进入练习</el-button>
        <el-button type="primary" :disabled="!node" @click="openMindMap">生成思维导图</el-button>
      </div>
    </header>

    <StateBlock :loading="loading" :error="errorMessage" :empty="!node" empty-text="没有可显示的知识节点" @retry="loadNode">
      <article v-if="node" class="panel-card node-reading-card">
        <div class="tag-row node-reading-meta">
          <el-tag>{{ node.nodeType }}</el-tag>
          <el-tag type="warning">{{ difficultyLabel(node.difficulty) }}</el-tag>
          <el-tag type="info">{{ node.id }}</el-tag>
        </div>
        <MarkdownContent :content="node.content" />
      </article>
    </StateBlock>
  </section>
</template>

<style scoped>
.node-content-header {
  align-items: center;
}

.node-reading-card {
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
}

.node-reading-meta {
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--nl-border);
}

@media (max-width: 760px) {
  .node-content-header {
    align-items: flex-start;
  }
}
</style>
