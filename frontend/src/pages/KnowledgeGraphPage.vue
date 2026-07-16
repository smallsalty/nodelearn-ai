<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import * as echarts from "echarts";
import StateBlock from "@/components/StateBlock.vue";
import { courseApi } from "@/api/modules/course";
import { graphApi } from "@/api/modules/graph";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { Chapter, KnowledgeNode } from "@/types/course";
import type { GraphEdge, GraphNode, GraphViewState, KnowledgeGraph } from "@/types/graph";
import { DEFAULT_COURSE_ID, DEFAULT_USER_ID, difficultyLabel, masteryLabel } from "@/utils/format";

const chartRef = ref<HTMLDivElement | null>(null);
const router = useRouter();
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;
const graph = ref<KnowledgeGraph | null>(null);
const nodes = ref<KnowledgeNode[]>([]);
const chapters = ref<Chapter[]>([]);
const selectedNodeId = ref<string | null>(null);
const loading = ref(false);
const errorMessage = ref("");
const nodeErrorMessage = ref("");
const activeTab = ref("detail");
const viewState = reactive<GraphViewState>({
  selectedNodeId: undefined,
  expandedChapterId: undefined,
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
const selectedChapter = computed(() => chapters.value.find((chapter) => chapter.id === appState.selectedChapterId));

onMounted(() => {
  void loadGraph();
});

watch(courseId, (nextCourseId, previousCourseId) => {
  if (nextCourseId !== previousCourseId) {
    selectedNodeId.value = null;
    viewState.selectedNodeId = undefined;
    viewState.expandedChapterId = undefined;
    appState.selectedChapterId = null;
    appState.selectedNodeId = null;
    void loadGraph();
  }
});

watch(
  () => appState.graphOverviewRequestId,
  () => resetGraphView()
);

watch(
  () => appState.selectedNodeId,
  (nodeId) => {
    if (nodeId) {
      syncSelectedNode(nodeId);
      return;
    }
    selectedNodeId.value = null;
    viewState.selectedNodeId = undefined;
    void nextTick(renderGraph);
  }
);

watch(
  () => appState.selectedChapterId,
  (chapterId) => {
    if (!chapterId || appState.selectedNodeId) return;
    syncSelectedChapter(chapterId);
  }
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  chart?.dispose();
  chart = null;
});

async function loadGraph() {
  loading.value = true;
  errorMessage.value = "";
  nodeErrorMessage.value = "";
  try {
    const [graphResponse, nodeResponse, chapterResponse] = await Promise.all([
      graphApi.getUserCourseGraph(userId.value, courseId.value),
      courseApi.getNodes(courseId.value),
      courseApi.getChapters(courseId.value)
    ]);
    graph.value = graphResponse.data;
    nodes.value = nodeResponse.data;
    chapters.value = chapterResponse.data;
    if (appState.selectedNodeId) {
      syncSelectedNode(appState.selectedNodeId, false);
    } else if (appState.selectedChapterId) {
      syncSelectedChapter(appState.selectedChapterId, false);
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
    await nextTick();
    if (!errorMessage.value) renderGraph();
  }
}

function renderGraph() {
  if (!chartRef.value || !graph.value) return;
  ensureChart();
  if (!chart) return;
  const surface = themeColor("--nl-surface", "#ffffff");
  const text = themeColor("--nl-text", "#15342b");
  const border = themeColor("--nl-border-strong", "#9ab9a8");
  const graphView = buildGraphView();
  const chapterCount = graphView.nodes.filter((node) => node.isChapter).length;
  const sequenceEdgeCount = graphView.edges.filter((edge) => edge.kind === "sequence").length;
  chartRef.value.dataset.chapterCount = String(chapterCount);
  chartRef.value.dataset.sequenceEdgeCount = String(sequenceEdgeCount);
  chartRef.value.dataset.dependencyEdgeCount = String(graphView.edges.filter((edge) => edge.kind === "dependency").length);
  chartRef.value.setAttribute(
    "aria-label",
    viewState.expandedChapterId
      ? `${selectedChapter.value?.title ?? "当前章节"}固定知识图谱`
      : `${chapterCount} 个章节按课程顺序连接的固定知识图谱`
  );

  chart.setOption(
    {
      animation: false,
      backgroundColor: surface,
      tooltip: {
        formatter: (params: { data?: GraphViewNode; dataType?: string }) => {
          if (params.dataType !== "node" || !params.data) return "";
          const data = params.data;
          return data.isChapter
            ? `${data.label}<br/>点击展开章节节点，在详情中查看总览`
            : `${data.label}<br/>${masteryLabel(data.masteryStatus)} · ${Math.round(data.masteryScore)}`;
        }
      },
      series: [
        {
          type: "graph",
          layout: "none",
          roam: true,
          zoom: viewState.zoom,
          draggable: false,
          edgeSymbol: ["none", "arrow"],
          edgeSymbolSize: [0, 8],
          label: {
            show: true,
            color: text,
            fontSize: 12,
            width: 104,
            overflow: "truncate"
          },
          lineStyle: { color: border, width: 2, opacity: 0.86 },
          emphasis: { focus: "adjacency", lineStyle: { width: 3 } },
          data: graphView.nodes.map((node) => {
            const selected = isGraphNodeSelected(node);
            const chapterContext = isGraphChapterContext(node);
            return {
              ...node,
              name: node.label,
              symbolSize: node.isChapter ? 86 : Math.max(48, node.size ?? 48),
              itemStyle: {
                color: node.isChapter ? "#fff0a8" : nodeColor(node),
                borderColor: selected ? text : chapterContext ? themeColor("--nl-primary-hover", "#d5aa00") : surface,
                borderWidth: selected ? 4 : chapterContext ? 2.5 : 1.5,
                shadowBlur: selected ? 12 : 0,
                shadowColor: "rgba(21, 52, 43, 0.24)"
              }
            };
          }),
          links: graphView.edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            lineStyle: {
              color: edge.kind === "sequence"
                ? themeColor("--nl-primary-hover", "#d5aa00")
                : edge.kind === "containment"
                  ? themeColor("--nl-border", "#d6e4dc")
                  : border,
              width: edge.kind === "dependency" ? 2.2 : edge.kind === "sequence" ? 2 : 1.5,
              type: edge.kind === "dependency" ? "solid" : "dashed",
              curveness: edge.curveness,
              opacity: edge.kind === "dependency" ? 0.92 : edge.kind === "sequence" ? 0.82 : 0.68
            }
          }))
        }
      ]
    },
    true
  );

  chart.off("click");
  chart.on("click", (event) => {
    if (event.dataType !== "node") return;
    const data = event.data as GraphViewNode | undefined;
    if (!data?.id) return;
    if (data.isChapter) {
      selectChapter(data.id.slice("chapter:".length));
      return;
    }
    selectNode(data.id);
  });
}

function ensureChart() {
  if (!chartRef.value) return;
  if (chart && chart.getDom() !== chartRef.value) {
    resizeObserver?.disconnect();
    resizeObserver = null;
    chart.dispose();
    chart = null;
  }
  chart ??= echarts.init(chartRef.value);
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(() => chart?.resize());
    resizeObserver.observe(chartRef.value);
  }
}

type GraphViewNode = GraphNode & { isChapter?: boolean; x: number; y: number };
type GraphViewEdgeKind = "dependency" | "sequence" | "containment";
type GraphViewEdge = { source: string; target: string; kind: GraphViewEdgeKind; curveness?: number };

interface GraphViewData {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
}

interface ChapterGroup {
  id: string;
  label: string;
  nodes: GraphNode[];
  orderIndex: number;
}

const chapterGroups = computed<ChapterGroup[]>(() => {
  const graphNodes = graph.value?.nodes ?? [];
  const nodeById = new Map(nodes.value.map((node) => [node.id, node]));
  const chapterById = new Map(chapters.value.map((chapter) => [chapter.id, chapter]));
  const groups = new Map<string, ChapterGroup>();

  for (const chapter of chapters.value) {
    groups.set(chapter.id, {
      id: chapter.id,
      label: chapter.title,
      nodes: [],
      orderIndex: chapter.orderIndex
    });
  }

  for (const node of graphNodes) {
    const chapterId = nodeById.get(node.id)?.chapterId ?? "uncategorized";
    const chapter = chapterById.get(chapterId);
    const group = groups.get(chapterId) ?? {
      id: chapterId,
      label: chapter?.title ?? "其他知识点",
      nodes: [],
      orderIndex: chapter?.orderIndex ?? Number.MAX_SAFE_INTEGER
    };
    group.nodes.push(node);
    groups.set(chapterId, group);
  }

  for (const group of groups.values()) {
    group.nodes.sort((left, right) => {
      const leftNode = nodeById.get(left.id);
      const rightNode = nodeById.get(right.id);
      return (leftNode?.orderIndex ?? 0) - (rightNode?.orderIndex ?? 0) || left.label.localeCompare(right.label);
    });
  }

  return [...groups.values()].sort((left, right) => left.orderIndex - right.orderIndex || left.label.localeCompare(right.label));
});

const graphJumpValue = computed(() => {
  if (selectedNodeId.value) return `node:${selectedNodeId.value}`;
  if (appState.selectedChapterId) return `chapter:${appState.selectedChapterId}`;
  return undefined;
});

function buildGraphView(): GraphViewData {
  const expandedGroup = chapterGroups.value.find((group) => group.id === viewState.expandedChapterId);
  return expandedGroup ? buildExpandedChapterView(expandedGroup) : buildChapterOverview(chapterGroups.value);
}

function buildChapterOverview(groups: ChapterGroup[]): GraphViewData {
  const chapterIdByNodeId = new Map<string, string>();
  for (const group of groups) {
    for (const node of group.nodes) chapterIdByNodeId.set(node.id, group.id);
  }

  const dependencyEdges = new Map<string, GraphViewEdge>();
  const dependencyChapterPairs = new Set<string>();
  for (const edge of graph.value?.edges ?? []) {
    const sourceChapterId = chapterIdByNodeId.get(edge.source);
    const targetChapterId = chapterIdByNodeId.get(edge.target);
    if (!sourceChapterId || !targetChapterId || sourceChapterId === targetChapterId) continue;
    const source = `chapter:${sourceChapterId}`;
    const target = `chapter:${targetChapterId}`;
    dependencyEdges.set(`${source}:${target}`, { source, target, kind: "dependency", curveness: 0.08 });
    dependencyChapterPairs.add([sourceChapterId, targetChapterId].sort().join(":"));
  }

  const columnCount = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(groups.length))));
  const positionedGroups = groups.map((group, index) => {
    const row = Math.floor(index / columnCount);
    const offset = index % columnCount;
    const column = row % 2 === 0 ? offset : columnCount - 1 - offset;
    return chapterNode(group, 120 + column * 260, 100 + row * 180);
  });
  const sequenceEdges = groups.slice(0, -1).flatMap((group, index) => {
    const source = `chapter:${group.id}`;
    const target = `chapter:${groups[index + 1].id}`;
    const pairKey = [group.id, groups[index + 1].id].sort().join(":");
    return dependencyChapterPairs.has(pairKey)
      ? []
      : [{ source, target, kind: "sequence" as const, curveness: 0 }];
  });

  return {
    nodes: positionedGroups,
    edges: [...sequenceEdges, ...dependencyEdges.values()]
  };
}

function buildExpandedChapterView(group: ChapterGroup): GraphViewData {
  const visibleNodes = group.nodes.filter(matchesActiveFilters);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const relationEdges = (graph.value?.edges ?? []).filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );
  const positions = layeredPositions(visibleNodes, relationEdges);
  const rootIds = visibleNodes
    .filter((node) => !relationEdges.some((edge) => edge.target === node.id))
    .map((node) => node.id);
  const chapterId = `chapter:${group.id}`;
  const maxY = Math.max(160, ...[...positions.values()].map((position) => position.y));
  const positionedNodes = visibleNodes.map((node) => {
    const position = positions.get(node.id) ?? { x: 340, y: 120 };
    return { ...node, ...position } as GraphViewNode;
  });

  return {
    nodes: [chapterNode(group, 80, maxY / 2), ...positionedNodes],
    edges: [
      ...rootIds.map((nodeId) => ({ source: chapterId, target: nodeId, kind: "containment" as const, curveness: 0 })),
      ...relationEdges.map((edge, index) => ({
        source: edge.source,
        target: edge.target,
        kind: "dependency" as const,
        curveness: relationCurveness(index)
      }))
    ]
  };
}

function layeredPositions(graphNodes: GraphNode[], edges: GraphEdge[]) {
  const order = new Map(graphNodes.map((node, index) => [node.id, index]));
  const nodeIds = new Set(graphNodes.map((node) => node.id));
  const indegree = new Map(graphNodes.map((node) => [node.id, 0]));
  const outgoing = new Map(graphNodes.map((node) => [node.id, [] as string[]]));
  const rank = new Map(graphNodes.map((node) => [node.id, 0]));

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  }

  const queue = graphNodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const processed = new Set<string>();
  while (queue.length) {
    queue.sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
    const nodeId = queue.shift();
    if (!nodeId) break;
    processed.add(nodeId);
    for (const targetId of outgoing.get(nodeId) ?? []) {
      rank.set(targetId, Math.max(rank.get(targetId) ?? 0, (rank.get(nodeId) ?? 0) + 1));
      const nextIndegree = (indegree.get(targetId) ?? 1) - 1;
      indegree.set(targetId, nextIndegree);
      if (nextIndegree === 0) queue.push(targetId);
    }
  }

  const maxRank = Math.max(0, ...rank.values());
  graphNodes
    .filter((node) => !processed.has(node.id))
    .forEach((node, index) => rank.set(node.id, maxRank + 1 + Math.floor(index / 4)));

  const layers = new Map<number, GraphNode[]>();
  for (const node of graphNodes) {
    const nodeRank = rank.get(node.id) ?? 0;
    layers.set(nodeRank, [...(layers.get(nodeRank) ?? []), node]);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [nodeRank, layerNodes] of [...layers.entries()].sort(([left], [right]) => left - right)) {
    layerNodes
      .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
      .forEach((node, index) => positions.set(node.id, { x: 340 + nodeRank * 260, y: 100 + index * 130 }));
  }
  return positions;
}

function relationCurveness(index: number) {
  const offsets = [0, 0.08, -0.08, 0.14, -0.14];
  return offsets[index % offsets.length];
}

function chapterNode(group: ChapterGroup, x: number, y: number): GraphViewNode {
  return {
    id: `chapter:${group.id}`,
    label: group.label,
    nodeType: "concept",
    difficulty: "easy",
    masteryStatus: "not_started",
    masteryScore: 0,
    isChapter: true,
    x,
    y
  };
}

function matchesActiveFilters(node: GraphNode): boolean {
  if (node.id === selectedNodeId.value) return true;
  if (viewState.showWeakOnly) return node.masteryStatus === "weak" || node.masteryScore < 60;
  if (viewState.showCompletedOnly) return node.masteryStatus === "mastered";
  return true;
}

function isGraphNodeSelected(node: GraphViewNode) {
  if (node.isChapter) {
    return !selectedNodeId.value && node.id === `chapter:${appState.selectedChapterId ?? ""}`;
  }
  return node.id === selectedNodeId.value;
}

function isGraphChapterContext(node: GraphViewNode) {
  return Boolean(
    node.isChapter
    && selectedNodeId.value
    && node.id === `chapter:${appState.selectedChapterId ?? ""}`
  );
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
  const node = nodes.value.find((item) => item.id === nodeId);
  selectedNodeId.value = nodeId;
  viewState.selectedNodeId = nodeId;
  appState.selectedChapterId = node?.chapterId ?? null;
  appState.selectedNodeId = nodeId;
  activeTab.value = "detail";
  renderGraph();
}

function syncSelectedNode(nodeId: string, shouldRender = true): void {
  const node = nodes.value.find((item) => item.id === nodeId);
  if (!node || !graph.value?.nodes.some((item) => item.id === nodeId)) return;
  selectedNodeId.value = nodeId;
  viewState.selectedNodeId = nodeId;
  if (node.chapterId) {
    appState.selectedChapterId = node.chapterId;
    viewState.expandedChapterId = node.chapterId;
  }
  activeTab.value = "detail";
  if (shouldRender) void nextTick(renderGraph);
}

function syncSelectedChapter(chapterId: string, shouldRender = true): void {
  if (!chapters.value.some((chapter) => chapter.id === chapterId)) return;
  selectedNodeId.value = null;
  viewState.selectedNodeId = undefined;
  viewState.expandedChapterId = chapterId;
  activeTab.value = "detail";
  if (shouldRender) void nextTick(renderGraph);
}

function selectChapter(chapterId: string): void {
  viewState.expandedChapterId = viewState.expandedChapterId === chapterId ? undefined : chapterId;
  selectedNodeId.value = null;
  viewState.selectedNodeId = undefined;
  appState.selectedChapterId = chapterId;
  appState.selectedNodeId = null;
  activeTab.value = "detail";
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
  viewState.expandedChapterId = undefined;
  viewState.showWeakOnly = false;
  viewState.showCompletedOnly = false;
  selectedNodeId.value = null;
  viewState.selectedNodeId = undefined;
  appState.selectedChapterId = null;
  appState.selectedNodeId = null;
  activeTab.value = "detail";
  chart?.clear();
  renderGraph();
}

function jumpToTarget(value: string): void {
  if (value.startsWith("chapter:")) {
    const chapterId = value.slice("chapter:".length);
    appState.selectedChapterId = chapterId;
    appState.selectedNodeId = null;
    syncSelectedChapter(chapterId);
    return;
  }
  const nodeId = value.startsWith("node:") ? value.slice("node:".length) : value;
  selectNode(nodeId);
}

function openNodeContent() {
  if (!selectedNodeId.value) return;
  void router.push({ name: "course-content", params: { courseId: courseId.value }, hash: `#node-${selectedNodeId.value}` });
}

function openChapterContent() {
  if (!selectedChapter.value) return;
  appState.selectedChapterId = selectedChapter.value.id;
  appState.selectedNodeId = null;
  void router.push({ name: "course-content", params: { courseId: courseId.value }, hash: `#chapter-${selectedChapter.value.id}` });
}

function openPractice() {
  if (!selectedNodeId.value) return;
  void router.push({ path: "/practice", query: { nodeId: selectedNodeId.value, tab: "single_choice" } });
}

function openMindMap() {
  if (!selectedNodeId.value) return;
  void router.push({ path: "/resources", query: { nodeId: selectedNodeId.value, action: "mind_map" } });
}
</script>

<template>
  <section class="knowledge-graph-page graph-page">
    <section class="panel-card graph-card">
      <header class="panel-header">
        <div>
          <h2>知识图谱</h2>
          <p>章节与节点使用固定布局；节点不可拖动，画布可平移和缩放。</p>
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
        <span class="graph-hint">{{ viewState.expandedChapterId ? "再次点击章节可返回概览" : "点击章节展开固定节点布局" }}</span>
        <div class="graph-legend" aria-label="图谱连线图例">
          <span><i class="sequence" aria-hidden="true" />章节顺序</span>
          <span><i class="dependency" aria-hidden="true" />知识依赖</span>
        </div>
      </div>

      <StateBlock :loading="loading" :error="errorMessage" :empty="!graph?.nodes.length" empty-text="暂无图谱数据" @retry="loadGraph">
        <div ref="chartRef" class="graph-canvas" role="img" aria-label="固定布局的数据结构知识图谱" />
      </StateBlock>
    </section>

    <el-tabs v-model="activeTab" class="page-tabs">
      <el-tab-pane label="节点详情" name="detail">
        <el-alert v-if="nodeErrorMessage" :title="nodeErrorMessage" type="warning" show-icon :closable="false" class="mb-16" />
        <article v-if="selectedChapter && !selectedGraphNode" class="node-detail">
          <h3>{{ selectedChapter.title }}</h3>
          <div class="tag-row">
            <el-tag type="warning">章节</el-tag>
            <el-tag type="info">{{ chapterGroups.find((group) => group.id === selectedChapter?.id)?.nodes.length ?? 0 }} 个知识节点</el-tag>
          </div>
          <p>{{ selectedChapter.description || "该章节可直接阅读总览正文，并继续浏览所属知识节点。" }}</p>
          <div class="node-actions" aria-label="章节学习操作">
            <el-button type="primary" @click="openChapterContent">查看章节总览</el-button>
          </div>
        </article>
        <el-empty v-else-if="!selectedGraphNode" description="点击图谱章节或节点查看详情" />
        <article v-else class="node-detail">
          <h3>{{ selectedGraphNode.label }}</h3>
          <div class="tag-row">
            <el-tag>{{ selectedGraphNode.nodeType }}</el-tag>
            <el-tag type="warning">{{ difficultyLabel(selectedGraphNode.difficulty) }}</el-tag>
            <el-tag type="success">{{ masteryLabel(selectedGraphNode.masteryStatus) }}</el-tag>
          </div>
          <el-progress :percentage="Math.round(selectedGraphNode.masteryScore)" />
          <p>{{ selectedKnowledgeNode?.description ?? "暂无节点摘要" }}</p>
          <p><strong>常见错因：</strong>{{ selectedKnowledgeNode?.commonMistakes.join("、") || "暂无" }}</p>
          <div class="node-actions" aria-label="节点学习操作">
            <el-button type="primary" @click="openNodeContent">查看正文</el-button>
            <el-button plain @click="openPractice">课后测试</el-button>
            <el-button plain @click="openMindMap">生成思维导图</el-button>
          </div>
        </article>
      </el-tab-pane>

      <el-tab-pane label="快速跳转" name="jump">
        <el-select
          filterable
          placeholder="选择章节总览或知识节点"
          aria-label="图谱快速跳转"
          :model-value="graphJumpValue"
          @change="jumpToTarget"
        >
          <el-option-group v-for="group in chapterGroups" :key="group.id" :label="group.label">
            <el-option :label="`${group.label} · 总览`" :value="`chapter:${group.id}`" />
            <el-option
              v-for="node in group.nodes"
              :key="node.id"
              :label="node.label"
              :value="`node:${node.id}`"
            />
          </el-option-group>
        </el-select>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<style scoped>
.graph-hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.graph-legend {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-left: auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.graph-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.graph-legend i {
  display: inline-block;
  width: 26px;
  border-top: 2px solid var(--nl-border-strong);
}

.graph-legend i.sequence {
  border-color: var(--nl-primary-hover);
  border-top-style: dashed;
}

.graph-legend i.dependency {
  border-top-style: solid;
}

.node-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 760px) {
  .graph-legend {
    width: 100%;
    margin-left: 0;
  }
}
</style>
