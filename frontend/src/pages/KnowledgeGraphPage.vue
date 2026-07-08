<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import * as echarts from "echarts";
import StateBlock from "@/components/StateBlock.vue";
import { courseApi } from "@/api/modules/course";
import { graphApi } from "@/api/modules/graph";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { KnowledgeNode } from "@/types/course";
import type { GraphNode, GraphViewState, KnowledgeGraph } from "@/types/graph";
import { DEFAULT_COURSE_ID, DEFAULT_USER_ID, difficultyLabel, masteryLabel } from "@/utils/format";

const chartRef = ref<HTMLDivElement | null>(null);
const router = useRouter();
let chart: echarts.ECharts | null = null;
const graph = ref<KnowledgeGraph | null>(null);
const nodes = ref<KnowledgeNode[]>([]);
const selectedNodeId = ref<string | null>(null);
const loading = ref(false);
const errorMessage = ref("");
const nodeErrorMessage = ref("");
const viewState = reactive<GraphViewState>({
  selectedNodeId: undefined,
  zoom: 1,
  centerX: 0,
  centerY: 0,
  showWeakOnly: false,
  showCompletedOnly: false
});

const courseId = computed(() => appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const selectedGraphNode = computed(() => graph.value?.nodes.find((node) => node.id === selectedNodeId.value));
const selectedKnowledgeNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value));

onMounted(() => {
  void loadGraph();
});

watch(
  graph,
  async () => {
    await nextTick();
    renderGraph();
  },
  { flush: "post" }
);

onBeforeUnmount(() => {
  chart?.dispose();
  chart = null;
});

async function loadGraph() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const graphResponse = await graphApi.getUserCourseGraph(userId.value, courseId.value);
    graph.value = graphResponse.data;
    await nextTick();
    renderGraph();
    window.setTimeout(renderGraph, 80);
    void loadKnowledgeNodes();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function loadKnowledgeNodes() {
  nodeErrorMessage.value = "";
  try {
    const nodeResponse = await courseApi.getNodes(courseId.value);
    nodes.value = nodeResponse.data;
  } catch (error) {
    nodeErrorMessage.value = getErrorMessage(error);
  }
}

function renderGraph() {
  if (!chartRef.value || !graph.value) return;
  chart ??= echarts.init(chartRef.value);
  const surface = themeColor("--nl-surface", "#ffffff");
  const text = themeColor("--nl-text", "#15342b");
  const border = themeColor("--nl-border-strong", "#b9d4c5");
  const filteredNodes = graph.value.nodes.filter((node) => {
    if (viewState.showWeakOnly) return node.masteryStatus === "weak" || node.masteryScore < 60;
    if (viewState.showCompletedOnly) return node.masteryStatus === "mastered";
    return true;
  });
  const visibleIds = new Set(filteredNodes.map((node) => node.id));
  chart.setOption({
    backgroundColor: surface,
    tooltip: {
      formatter: (params: { data?: GraphNode }) => {
        const data = params.data;
        return data ? `${data.label}<br/>${masteryLabel(data.masteryStatus)} · ${data.masteryScore}` : "";
      }
    },
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        zoom: viewState.zoom,
        draggable: true,
        force: { repulsion: 160, edgeLength: 90 },
        label: { show: true, color: text, fontSize: 12 },
        lineStyle: { color: border, width: 1.5, curveness: 0.08 },
        data: filteredNodes.map((node) => ({
          ...node,
          name: node.label,
          symbolSize: Math.max(42, node.size ?? 46),
          itemStyle: {
            color: nodeColor(node),
            borderColor: node.id === selectedNodeId.value ? text : surface,
            borderWidth: node.id === selectedNodeId.value ? 3 : 1
          }
        })),
        links: graph.value.edges
          .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
          .map((edge) => ({ source: edge.source, target: edge.target, label: { show: false } }))
      }
    ]
  });
  chart.off("click");
  chart.on("click", (event) => {
    const data = event.data as GraphNode | undefined;
    if (data?.id) selectNode(data.id);
  });
}

function nodeColor(node: GraphNode) {
  if (node.masteryStatus === "mastered") return themeColor("--nl-success-soft", "#ddf5e8");
  if (node.masteryStatus === "weak") return themeColor("--nl-warning-soft", "#fff4d8");
  if (node.masteryStatus === "learning") return themeColor("--nl-primary-soft", "#d8f3e5");
  return themeColor("--nl-surface-muted", "#f1f7f3");
}

function themeColor(token: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function selectNode(nodeId: string): void {
  selectedNodeId.value = nodeId;
  viewState.selectedNodeId = nodeId;
  appState.selectedNodeId = nodeId;
  renderGraph();
}

function zoomIn(): void {
  viewState.zoom = Math.min(viewState.zoom + 0.2, 2.4);
  renderGraph();
}

function zoomOut(): void {
  viewState.zoom = Math.max(viewState.zoom - 0.2, 0.4);
  renderGraph();
}

function resetGraphView(): void {
  viewState.zoom = 1;
  viewState.centerX = 0;
  viewState.centerY = 0;
  viewState.showWeakOnly = false;
  viewState.showCompletedOnly = false;
  renderGraph();
}

function jumpToNode(nodeId: string): void {
  selectNode(nodeId);
  renderGraph();
}

function openNodeDetail(nodeId: string): void {
  selectNode(nodeId);
}

function openResourceAction(action: "knowledge_video" | "digital_human_video" | "digital_human_chat") {
  if (!selectedNodeId.value) return;
  void router.push({ path: "/resources", query: { nodeId: selectedNodeId.value, action } });
}
</script>

<template>
  <section class="knowledge-graph-page graph-page">
    <section class="panel-card graph-card">
      <header class="panel-header">
        <div>
          <h2>知识图谱</h2>
          <p>节点和边来自后端 `KnowledgeGraph`，掌握状态用于个性化视图。</p>
        </div>
        <div class="button-row">
          <el-button @click="zoomIn">放大</el-button>
          <el-button @click="zoomOut">缩小</el-button>
          <el-button @click="resetGraphView">重置</el-button>
          <el-button :loading="loading" @click="loadGraph">刷新</el-button>
        </div>
      </header>

      <div class="graph-filters">
        <el-switch v-model="viewState.showWeakOnly" active-text="只看薄弱" @change="renderGraph" />
        <el-switch v-model="viewState.showCompletedOnly" active-text="只看掌握" @change="renderGraph" />
      </div>

      <StateBlock :loading="loading" :error="errorMessage" :empty="!graph?.nodes.length" empty-text="暂无图谱数据" @retry="loadGraph">
        <div ref="chartRef" class="graph-canvas" role="img" aria-label="数据结构知识图谱" />
      </StateBlock>
    </section>

    <el-tabs class="page-tabs">
      <el-tab-pane label="节点跳转" name="jump">
        <el-select filterable placeholder="选择节点" :model-value="selectedNodeId" @change="jumpToNode">
          <el-option v-for="node in graph?.nodes ?? []" :key="node.id" :label="node.label" :value="node.id" />
        </el-select>
      </el-tab-pane>

      <el-tab-pane label="节点详情" name="detail">
        <el-alert
          v-if="nodeErrorMessage"
          :title="nodeErrorMessage"
          type="warning"
          show-icon
          :closable="false"
          class="mb-16"
        />
        <el-empty v-if="!selectedGraphNode" description="点击图谱节点查看详情" />
        <article v-else class="node-detail">
          <h3>{{ selectedGraphNode.label }}</h3>
          <div class="tag-row">
            <el-tag>{{ selectedGraphNode.nodeType }}</el-tag>
            <el-tag type="warning">{{ difficultyLabel(selectedGraphNode.difficulty) }}</el-tag>
            <el-tag type="success">{{ masteryLabel(selectedGraphNode.masteryStatus) }}</el-tag>
          </div>
          <el-progress :percentage="Math.round(selectedGraphNode.masteryScore)" />
          <p>{{ selectedKnowledgeNode?.description ?? "暂无节点描述" }}</p>
          <p><strong>常见错因：</strong>{{ selectedKnowledgeNode?.commonMistakes.join("、") || "暂无" }}</p>
          <div class="node-actions">
            <el-button type="primary" plain @click="openResourceAction('knowledge_video')">生成知识点视频</el-button>
            <el-button plain @click="openResourceAction('digital_human_video')">数字人讲解</el-button>
            <el-button plain @click="openResourceAction('digital_human_chat')">和数字人对话</el-button>
          </div>
        </article>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<style scoped>
.node-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
</style>
