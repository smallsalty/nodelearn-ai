<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Component, CSSProperties } from "vue";
import {
  Aim,
  ArrowRight,
  Connection,
  Cpu,
  Expand,
  Fold,
  Grid,
  Operation,
  Refresh,
  Search,
  Share,
  Tickets
} from "@element-plus/icons-vue";
import MindMapNode from "./MindMapNode.vue";
import type {
  KnowledgeMindMap,
  KnowledgeMindMapNode,
  KnowledgeMindMapRelation,
  MindMapBranchType
} from "./types";

const props = defineProps<{
  content: string;
}>();

type MindMapSide = "left" | "right";

interface NodeSize {
  width: number;
  height: number;
}

interface LayoutMetrics {
  centerWidth: number;
  centerHeight: number;
  branchWidth: number;
  branchHeight: number;
  childWidth: number;
  childHeight: number;
  leafWidth: number;
  leafHeight: number;
  edgeX: number;
  edgeY: number;
  minHeight: number;
  branchGap: number;
  childGap: number;
  leafGap: number;
  branchRatio: number;
  childRatio: number;
  leafRatio: number;
  popoverWidth: number;
}

interface LayoutBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutNode extends LayoutBox {
  node: KnowledgeMindMapNode;
  level: number;
  side: MindMapSide;
  hasChildren: boolean;
  isExpanded: boolean;
}

interface LayoutConnector {
  key: string;
  path: string;
  level: number;
  side: MindMapSide;
}

interface MeasuredBlock {
  node: KnowledgeMindMapNode;
  level: number;
  height: number;
  children: MeasuredBlock[];
}

interface MindMapLayout {
  width: number;
  height: number;
  center: LayoutBox;
  nodes: LayoutNode[];
  connectors: LayoutConnector[];
}

const DESKTOP_BREAKPOINT = 768;
const CENTER_ID = "__mind_map_center__";

const expandedIds = ref<Set<string>>(new Set());
const selectedId = ref<string | null>(null);
const focusedNodeId = ref<string | null>(null);
const searchKeyword = ref("");
const boardRef = ref<HTMLElement | null>(null);
const boardWidth = ref(1120);
const viewportWidth = ref(1024);

let resizeObserver: ResizeObserver | null = null;

const iconByType: Record<MindMapBranchType, Component> = {
  definition: Tickets,
  structure: Grid,
  principle: Cpu,
  classification: Share,
  operation: Operation,
  algorithm: Operation,
  complexity: Connection,
  relation: Share,
  application: ArrowRight
};

const parsedResult = computed(() => parseMindMap(props.content));
const mindMap = computed(() => parsedResult.value.map);
const parseError = computed(() => parsedResult.value.error);
const allNodes = computed(() => (mindMap.value ? flattenNodes(mindMap.value.branches) : []));
const parentById = computed(() => buildParentMap(mindMap.value?.branches ?? []));
const nodeById = computed(() => new Map(allNodes.value.map((node) => [node.id, node])));
const selectedNode = computed(() => (selectedId.value ? nodeById.value.get(selectedId.value) ?? null : null));
const selectedRelations = computed(() => {
  if (!mindMap.value || !selectedId.value) return [];
  return mindMap.value.relations.filter(
    (relation) => relation.sourceId === selectedId.value || relation.targetId === selectedId.value
  );
});
const matchedIds = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) return new Set<string>();
  return new Set(allNodes.value.filter((node) => matchNode(node, keyword)).map((node) => node.id));
});
const searchCount = computed(() => matchedIds.value.size);
const isMobileLayout = computed(() => viewportWidth.value < DESKTOP_BREAKPOINT);
const focusPath = computed(() => {
  if (!focusedNodeId.value || !mindMap.value) return [];
  return findNodePath(mindMap.value.branches, focusedNodeId.value);
});
const focusPathIds = computed(() => new Set(focusPath.value.map((node) => node.id)));
const focusAllowedIds = computed(() => {
  if (!focusedNodeId.value || !focusPath.value.length) return null;
  const result = new Set(focusPath.value.map((node) => node.id));
  const focusedNode = focusPath.value[focusPath.value.length - 1];
  focusedNode.children.forEach((child) => result.add(child.id));
  return result;
});
const mobileBranches = computed(() => {
  const branches = mindMap.value?.branches ?? [];
  if (!focusAllowedIds.value) return branches;
  return filterNodesByAllowedIds(branches, focusAllowedIds.value);
});
const mindMapLayout = computed<MindMapLayout>(() => createMindMapLayout());
const boardStyle = computed<CSSProperties>(() => {
  if (isMobileLayout.value) return {};
  return { minHeight: `${mindMapLayout.value.height}px` };
});
const centralTopicStyle = computed<CSSProperties>(() => layoutBoxStyle(mindMapLayout.value.center));
const selectedLayoutNode = computed(() => {
  if (!selectedId.value) return null;
  return mindMapLayout.value.nodes.find((node) => node.id === selectedId.value) ?? null;
});
const selectedPopover = computed(() => {
  if (isMobileLayout.value || !selectedNode.value?.description || !selectedLayoutNode.value) return null;
  const layoutNode = selectedLayoutNode.value;
  const metrics = getLayoutMetrics(mindMapLayout.value.width);
  const width = metrics.popoverWidth;
  const sideOffset = 12;
  const preferredLeft =
    layoutNode.side === "right" ? layoutNode.x + layoutNode.width + sideOffset : layoutNode.x - width - sideOffset;
  const left = clamp(preferredLeft, metrics.edgeX, mindMapLayout.value.width - width - metrics.edgeX);
  const top = clamp(layoutNode.y + layoutNode.height / 2 - 42, metrics.edgeY, mindMapLayout.value.height - 112);
  return {
    title: selectedNode.value.title,
    description: selectedNode.value.description,
    style: {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`
    } satisfies CSSProperties
  };
});

watch(
  () => props.content,
  () => {
    resetView();
    nextTick(measureBoard);
  }
);

watch(searchKeyword, (value) => {
  const keyword = value.trim().toLowerCase();
  if (!keyword) return;
  const firstMatch = allNodes.value.find((node) => matchNode(node, keyword));
  if (firstMatch) {
    revealNode(firstMatch.id, false);
  }
});

onMounted(() => {
  measureBoard();
  if (typeof ResizeObserver !== "undefined" && boardRef.value) {
    resizeObserver = new ResizeObserver(() => measureBoard());
    resizeObserver.observe(boardRef.value);
  }
  window.addEventListener("resize", measureBoard);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("resize", measureBoard);
});

function measureBoard() {
  viewportWidth.value = window.innerWidth;
  const width = boardRef.value?.clientWidth;
  if (width && Number.isFinite(width)) {
    boardWidth.value = Math.max(320, Math.round(width));
  }
}

function handleNodeClick(node: KnowledgeMindMapNode) {
  selectedId.value = node.id;
  if (node.children.length) {
    toggleNode(node);
  }
}

function selectNode(node: KnowledgeMindMapNode) {
  selectedId.value = node.id;
}

function toggleNode(node: KnowledgeMindMapNode) {
  if (!node.children.length) return;
  const next = new Set(expandedIds.value);
  if (next.has(node.id)) {
    next.delete(node.id);
  } else {
    next.add(node.id);
  }
  expandedIds.value = next;
}

function expandAll() {
  focusedNodeId.value = null;
  expandedIds.value = new Set(allNodes.value.filter((node) => node.children.length).map((node) => node.id));
}

function collapseAll() {
  focusedNodeId.value = null;
  expandedIds.value = new Set();
}

function resetView() {
  expandedIds.value = new Set();
  selectedId.value = null;
  focusedNodeId.value = null;
  searchKeyword.value = "";
}

function focusSelected() {
  if (!selectedId.value) return;
  focusedNodeId.value = selectedId.value;
  revealNode(selectedId.value, true);
}

function selectFirstMatch() {
  const firstMatch = allNodes.value.find((node) => matchedIds.value.has(node.id));
  if (!firstMatch) return;
  selectedId.value = firstMatch.id;
  revealNode(firstMatch.id, false);
}

function clearFocus() {
  focusedNodeId.value = null;
}

function revealNode(nodeId: string, includeSelf: boolean) {
  const next = new Set(expandedIds.value);
  let current = parentById.value.get(nodeId);
  while (current) {
    next.add(current);
    current = parentById.value.get(current);
  }
  if (includeSelf && nodeById.value.get(nodeId)?.children.length) {
    next.add(nodeId);
  }
  expandedIds.value = next;
}

function createMindMapLayout(): MindMapLayout {
  const width = Math.max(320, boardWidth.value || 1120);
  const metrics = getLayoutMetrics(width);
  const center: LayoutBox = {
    id: CENTER_ID,
    x: width / 2 - metrics.centerWidth / 2,
    y: metrics.minHeight / 2 - metrics.centerHeight / 2,
    width: metrics.centerWidth,
    height: metrics.centerHeight
  };
  if (!mindMap.value) {
    return { width, height: metrics.minHeight, center, nodes: [], connectors: [] };
  }

  const branchInfos = mindMap.value.branches
    .map((node, index) => ({ node, side: getBranchSide(index) }))
    .filter((info) => !focusAllowedIds.value || focusAllowedIds.value.has(info.node.id));
  const leftBlocks = branchInfos
    .filter((info) => info.side === "left")
    .map((info) => measureBlock(info.node, 1, metrics));
  const rightBlocks = branchInfos
    .filter((info) => info.side === "right")
    .map((info) => measureBlock(info.node, 1, metrics));
  const leftTotal = getBlocksHeight(leftBlocks, metrics.branchGap);
  const rightTotal = getBlocksHeight(rightBlocks, metrics.branchGap);
  const height = Math.max(metrics.minHeight, Math.max(leftTotal, rightTotal) + metrics.edgeY * 2);
  const centeredCenter = {
    ...center,
    y: height / 2 - metrics.centerHeight / 2
  };
  const nodes: LayoutNode[] = [];
  const connectors: LayoutConnector[] = [];

  placeSideBlocks("left", leftBlocks, leftTotal, centeredCenter, width, height, metrics, nodes, connectors);
  placeSideBlocks("right", rightBlocks, rightTotal, centeredCenter, width, height, metrics, nodes, connectors);

  return { width, height, center: centeredCenter, nodes, connectors };
}

function placeSideBlocks(
  side: MindMapSide,
  blocks: MeasuredBlock[],
  totalHeight: number,
  center: LayoutBox,
  width: number,
  height: number,
  metrics: LayoutMetrics,
  nodes: LayoutNode[],
  connectors: LayoutConnector[]
) {
  let top = height / 2 - totalHeight / 2;
  for (const block of blocks) {
    placeBlock(block, side, top, center, width, metrics, nodes, connectors);
    top += block.height + metrics.branchGap;
  }
}

function placeBlock(
  block: MeasuredBlock,
  side: MindMapSide,
  top: number,
  parent: LayoutBox,
  width: number,
  metrics: LayoutMetrics,
  nodes: LayoutNode[],
  connectors: LayoutConnector[]
) {
  const size = getNodeSize(block.level, metrics);
  const visibleChildren = getVisibleChildren(block.node);
  const layoutNode: LayoutNode = {
    id: block.node.id,
    node: block.node,
    level: block.level,
    side,
    x: getNodeX(block.level, side, size.width, width, metrics),
    y: top + block.height / 2 - size.height / 2,
    width: size.width,
    height: size.height,
    hasChildren: block.node.children.length > 0,
    isExpanded: visibleChildren.length > 0
  };
  nodes.push(layoutNode);
  connectors.push(createConnector(parent, layoutNode, side));

  if (!block.children.length) return;
  const gap = getGapForLevel(block.level + 1, metrics);
  const childrenTotal = getBlocksHeight(block.children, gap);
  let childTop = top + block.height / 2 - childrenTotal / 2;
  for (const child of block.children) {
    placeBlock(child, side, childTop, layoutNode, width, metrics, nodes, connectors);
    childTop += child.height + gap;
  }
}

function measureBlock(node: KnowledgeMindMapNode, level: number, metrics: LayoutMetrics): MeasuredBlock {
  const children = getVisibleChildren(node).map((child) => measureBlock(child, level + 1, metrics));
  const ownSize = getNodeSize(level, metrics);
  const gap = getGapForLevel(level + 1, metrics);
  const childrenHeight = getBlocksHeight(children, gap);
  return {
    node,
    level,
    height: Math.max(ownSize.height, childrenHeight),
    children
  };
}

function getVisibleChildren(node: KnowledgeMindMapNode): KnowledgeMindMapNode[] {
  const allowedIds = focusAllowedIds.value;
  if (allowedIds) {
    return node.children.filter((child) => allowedIds.has(child.id));
  }
  if (!expandedIds.value.has(node.id)) return [];
  return node.children;
}

function getBlocksHeight(blocks: MeasuredBlock[], gap: number): number {
  if (!blocks.length) return 0;
  return blocks.reduce((sum, block) => sum + block.height, 0) + gap * (blocks.length - 1);
}

function createConnector(parent: LayoutBox, child: LayoutNode, side: MindMapSide): LayoutConnector {
  const fromX = side === "right" ? parent.x + parent.width : parent.x;
  const fromY = parent.y + parent.height / 2;
  const toX = side === "right" ? child.x : child.x + child.width;
  const toY = child.y + child.height / 2;
  const distance = Math.abs(toX - fromX);
  const curve = clamp(distance * 0.55, 22, 84);
  const path =
    side === "right"
      ? `M ${fromX} ${fromY} C ${fromX + curve} ${fromY}, ${toX - curve} ${toY}, ${toX} ${toY}`
      : `M ${fromX} ${fromY} C ${fromX - curve} ${fromY}, ${toX + curve} ${toY}, ${toX} ${toY}`;
  return {
    key: `${parent.id}-${child.id}`,
    path,
    level: child.level,
    side
  };
}

function getBranchSide(index: number): MindMapSide {
  return index % 2 === 0 ? "right" : "left";
}

function getNodeSize(level: number, metrics: LayoutMetrics): NodeSize {
  if (level === 1) return { width: metrics.branchWidth, height: metrics.branchHeight };
  if (level === 2) return { width: metrics.childWidth, height: metrics.childHeight };
  return { width: metrics.leafWidth, height: metrics.leafHeight };
}

function getNodeX(level: number, side: MindMapSide, nodeWidth: number, width: number, metrics: LayoutMetrics): number {
  const ratio = level === 1 ? metrics.branchRatio : level === 2 ? metrics.childRatio : metrics.leafRatio;
  const nodeCenterRatio = side === "right" ? ratio : 1 - ratio;
  return clamp(width * nodeCenterRatio - nodeWidth / 2, metrics.edgeX, width - metrics.edgeX - nodeWidth);
}

function getGapForLevel(level: number, metrics: LayoutMetrics): number {
  if (level <= 2) return metrics.childGap;
  return metrics.leafGap;
}

function getLayoutMetrics(width: number): LayoutMetrics {
  if (width >= 1180) {
    return {
      centerWidth: 230,
      centerHeight: 130,
      branchWidth: 198,
      branchHeight: 64,
      childWidth: 172,
      childHeight: 54,
      leafWidth: 142,
      leafHeight: 42,
      edgeX: 26,
      edgeY: 38,
      minHeight: 540,
      branchGap: 30,
      childGap: 14,
      leafGap: 10,
      branchRatio: 0.66,
      childRatio: 0.8,
      leafRatio: 0.92,
      popoverWidth: 268
    };
  }
  if (width >= 940) {
    return {
      centerWidth: 196,
      centerHeight: 120,
      branchWidth: 166,
      branchHeight: 58,
      childWidth: 136,
      childHeight: 50,
      leafWidth: 112,
      leafHeight: 40,
      edgeX: 16,
      edgeY: 32,
      minHeight: 510,
      branchGap: 24,
      childGap: 12,
      leafGap: 8,
      branchRatio: 0.68,
      childRatio: 0.83,
      leafRatio: 0.94,
      popoverWidth: 236
    };
  }
  return {
    centerWidth: 158,
    centerHeight: 112,
    branchWidth: 126,
    branchHeight: 56,
    childWidth: 106,
    childHeight: 48,
    leafWidth: 88,
    leafHeight: 38,
    edgeX: 10,
    edgeY: 28,
    minHeight: 500,
    branchGap: 20,
    childGap: 10,
    leafGap: 8,
    branchRatio: 0.69,
    childRatio: 0.85,
    leafRatio: 0.96,
    popoverWidth: 210
  };
}

function layoutBoxStyle(box: LayoutBox): CSSProperties {
  return {
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.width}px`,
    minHeight: `${box.height}px`
  };
}

function layoutNodeStyle(node: LayoutNode): CSSProperties {
  return layoutBoxStyle(node);
}

function layoutNodeClasses(node: LayoutNode) {
  return [
    `level-${Math.min(node.level, 3)}`,
    node.side,
    {
      selected: selectedId.value === node.id,
      matched: matchedIds.value.has(node.id),
      expandable: node.hasChildren,
      expanded: node.isExpanded,
      "focus-path": focusPathIds.value.has(node.id)
    }
  ];
}

function getNodeIcon(branchType: MindMapBranchType): Component {
  return iconByType[branchType] ?? Tickets;
}

function parseMindMap(content: string): { map: KnowledgeMindMap | null; error: string | null } {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!isKnowledgeMindMap(parsed)) {
      return { map: null, error: "思维导图数据异常" };
    }
    return { map: parsed, error: null };
  } catch {
    return { map: null, error: "思维导图数据异常" };
  }
}

function isKnowledgeMindMap(value: unknown): value is KnowledgeMindMap {
  if (!isRecord(value)) return false;
  return (
    typeof value.title === "string" &&
    (value.scope === "chapter" || value.scope === "node") &&
    typeof value.courseId === "string" &&
    typeof value.centralTopic === "string" &&
    typeof value.summary === "string" &&
    Array.isArray(value.branches) &&
    value.branches.every(isMindMapNode) &&
    Array.isArray(value.relations) &&
    value.relations.every(isMindMapRelation)
  );
}

function isMindMapNode(value: unknown): value is KnowledgeMindMapNode {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.branchType === "string" &&
    Array.isArray(value.children) &&
    value.children.every(isMindMapNode)
  );
}

function isMindMapRelation(value: unknown): value is KnowledgeMindMapRelation {
  if (!isRecord(value)) return false;
  return (
    typeof value.sourceId === "string" &&
    typeof value.targetId === "string" &&
    typeof value.relationType === "string" &&
    typeof value.label === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function flattenNodes(nodes: KnowledgeMindMapNode[]): KnowledgeMindMapNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
}

function buildParentMap(nodes: KnowledgeMindMapNode[], parentId?: string) {
  const result = new Map<string, string>();
  for (const node of nodes) {
    if (parentId) result.set(node.id, parentId);
    for (const [childId, nodeId] of buildParentMap(node.children, node.id)) {
      result.set(childId, nodeId);
    }
  }
  return result;
}

function findNodePath(nodes: KnowledgeMindMapNode[], nodeId: string): KnowledgeMindMapNode[] {
  for (const node of nodes) {
    if (node.id === nodeId) return [node];
    const childPath = findNodePath(node.children, nodeId);
    if (childPath.length) return [node, ...childPath];
  }
  return [];
}

function filterNodesByAllowedIds(
  nodes: KnowledgeMindMapNode[],
  allowedIds: Set<string>
): KnowledgeMindMapNode[] {
  return nodes
    .filter((node) => allowedIds.has(node.id))
    .map((node) => ({
      ...node,
      children: filterNodesByAllowedIds(node.children, allowedIds)
    }));
}

function matchNode(node: KnowledgeMindMapNode, keyword: string): boolean {
  return [node.title, node.knowledgePoint, node.description]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
</script>

<template>
  <section class="mind-map-viewer">
    <template v-if="mindMap">
      <header class="mind-map-header">
        <div>
          <p>{{ mindMap.scope === "chapter" ? "章节知识点导图" : "知识点导图" }}</p>
          <h4>{{ mindMap.title }}</h4>
        </div>
        <el-tag>{{ allNodes.length }} 个节点</el-tag>
      </header>

      <div class="mind-map-toolbar" aria-label="思维导图工具栏">
        <el-button :icon="Expand" @click="expandAll">全部展开</el-button>
        <el-button :icon="Fold" @click="collapseAll">全部收起</el-button>
        <el-button :icon="Refresh" @click="resetView">重置视图</el-button>
        <el-input
          v-model="searchKeyword"
          clearable
          class="mind-search"
          placeholder="搜索知识点"
          :prefix-icon="Search"
          @keyup.enter="selectFirstMatch"
          @clear="clearFocus"
        />
        <el-button :icon="Search" :disabled="!searchKeyword.trim() || !searchCount" @click="selectFirstMatch">搜索</el-button>
        <el-button :icon="Aim" :disabled="!selectedNode" @click="focusSelected">聚焦当前节点</el-button>
        <el-button v-if="focusedNodeId" @click="clearFocus">取消聚焦</el-button>
      </div>

      <p v-if="searchKeyword.trim()" class="search-status">
        已匹配 {{ searchCount }} 个知识点
      </p>

      <div class="mind-map-canvas">
        <div
          ref="boardRef"
          class="mind-map-board"
          :class="{ focused: focusedNodeId, mobile: isMobileLayout }"
          :style="boardStyle"
        >
          <template v-if="!isMobileLayout">
            <svg
              class="mind-map-links"
              :viewBox="`0 0 ${mindMapLayout.width} ${mindMapLayout.height}`"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                v-for="connector in mindMapLayout.connectors"
                :key="connector.key"
                class="mind-link"
                :class="[`level-${Math.min(connector.level, 3)}`, connector.side]"
                :d="connector.path"
              />
            </svg>

            <button
              type="button"
              class="central-topic"
              :style="centralTopicStyle"
              aria-label="重置思维导图视图"
              @click="resetView"
            >
              <span>中心主题</span>
              <strong>{{ mindMap.centralTopic }}</strong>
              <small>{{ mindMap.summary }}</small>
            </button>

            <button
              v-for="layoutNode in mindMapLayout.nodes"
              :key="layoutNode.id"
              type="button"
              class="mind-layout-node"
              :class="layoutNodeClasses(layoutNode)"
              :style="layoutNodeStyle(layoutNode)"
              :aria-expanded="layoutNode.hasChildren ? layoutNode.isExpanded : undefined"
              @click="handleNodeClick(layoutNode.node)"
            >
              <el-icon class="layout-node-icon">
                <component :is="getNodeIcon(layoutNode.node.branchType)" />
              </el-icon>
              <span class="layout-node-copy">
                <strong>{{ layoutNode.node.title }}</strong>
                <small
                  v-if="
                    layoutNode.level < 3 &&
                    layoutNode.node.knowledgePoint &&
                    layoutNode.node.knowledgePoint !== layoutNode.node.title
                  "
                >
                  {{ layoutNode.node.knowledgePoint }}
                </small>
              </span>
              <el-icon v-if="layoutNode.hasChildren" class="layout-expand-icon">
                <ArrowRight />
              </el-icon>
            </button>

            <aside v-if="selectedPopover" class="mind-node-popover" :style="selectedPopover.style">
              <span>节点说明</span>
              <strong>{{ selectedPopover.title }}</strong>
              <p>{{ selectedPopover.description }}</p>
            </aside>
          </template>

          <div v-else class="mobile-mind-tree">
            <button type="button" class="mobile-central-topic" @click="resetView">
              <span>中心主题</span>
              <strong>{{ mindMap.centralTopic }}</strong>
              <small>{{ mindMap.summary }}</small>
            </button>
            <ul class="mobile-branch-list">
              <MindMapNode
                v-for="branch in mobileBranches"
                :key="branch.id"
                :node="branch"
                :level="1"
                side="right"
                :expanded-ids="expandedIds"
                :selected-id="selectedId"
                :matched-ids="matchedIds"
                @select="selectNode"
                @toggle="toggleNode"
              />
            </ul>
            <aside v-if="selectedNode?.description" class="mobile-node-popover">
              <span>节点说明</span>
              <strong>{{ selectedNode.title }}</strong>
              <p>{{ selectedNode.description }}</p>
            </aside>
          </div>
        </div>
      </div>

      <footer class="mind-map-detail">
        <div>
          <span>{{ selectedNode ? "当前节点" : "导图摘要" }}</span>
          <h5>{{ selectedNode?.title ?? mindMap.centralTopic }}</h5>
          <p>{{ selectedNode?.description ?? mindMap.summary }}</p>
        </div>
        <ul v-if="selectedRelations.length" class="relation-list">
          <li v-for="relation in selectedRelations" :key="`${relation.sourceId}-${relation.targetId}-${relation.label}`">
            {{ relation.label }}
          </li>
        </ul>
      </footer>
    </template>

    <section v-else class="mind-map-error">
      <el-alert :title="parseError || '思维导图数据异常'" type="warning" show-icon :closable="false" />
      <details class="raw-content">
        <summary>查看原始内容</summary>
        <pre>{{ content }}</pre>
      </details>
    </section>
  </section>
</template>

<style scoped>
.mind-map-viewer {
  display: grid;
  gap: 14px;
  width: 100%;
}

.mind-map-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mind-map-header p,
.mind-map-header h4,
.mind-map-detail h5,
.mind-map-detail p,
.search-status,
.mind-node-popover p,
.mobile-node-popover p {
  margin: 0;
}

.mind-map-header p,
.mind-map-detail span,
.search-status,
.mind-node-popover span,
.mobile-node-popover span {
  color: var(--nl-text-subtle);
  font-size: 13px;
}

.mind-map-header h4 {
  margin-top: 2px;
  color: var(--nl-text);
  font-size: 18px;
  letter-spacing: 0;
}

.mind-map-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.mind-search {
  width: min(280px, 100%);
}

.mind-map-canvas {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  padding: 4px 0;
}

.mind-map-board {
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-md);
  background:
    linear-gradient(90deg, rgba(223, 228, 218, 0.38) 1px, transparent 1px),
    linear-gradient(180deg, rgba(223, 228, 218, 0.38) 1px, transparent 1px),
    #fbfcf8;
  background-size: 36px 36px;
}

.mind-map-board.focused {
  border-color: rgba(185, 120, 24, 0.44);
}

.mind-map-links {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.mind-link {
  fill: none;
  stroke: #d8c892;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.mind-link.level-1 {
  stroke: #d9a229;
  stroke-width: 2.6;
}

.mind-link.level-2 {
  stroke: #98b77a;
  stroke-width: 2;
}

.central-topic,
.mind-layout-node,
.mobile-central-topic {
  border: 0;
  font-family: inherit;
  letter-spacing: 0;
  cursor: pointer;
}

.central-topic {
  position: absolute;
  z-index: 3;
  display: grid;
  place-items: center;
  gap: 6px;
  padding: 18px;
  border: 1px solid rgba(25, 31, 35, 0.18);
  border-radius: 18px;
  background: var(--nl-deep);
  color: #ffffff;
  text-align: center;
  box-shadow: 0 18px 36px rgba(29, 27, 43, 0.2);
}

.central-topic:hover {
  box-shadow: 0 20px 40px rgba(29, 27, 43, 0.24);
}

.central-topic:focus-visible,
.mind-layout-node:focus-visible,
.mobile-central-topic:focus-visible {
  outline: none;
  box-shadow: var(--nl-focus-ring), 0 16px 34px rgba(32, 27, 61, 0.16);
}

.central-topic span,
.central-topic small,
.mobile-central-topic span,
.mobile-central-topic small {
  color: rgba(255, 255, 255, 0.74);
  font-size: 12px;
}

.central-topic strong,
.mobile-central-topic strong {
  overflow-wrap: anywhere;
  font-size: 22px;
  line-height: 1.2;
}

.central-topic small,
.mobile-central-topic small {
  line-height: 1.45;
}

.mind-layout-node {
  position: absolute;
  z-index: 4;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 15px;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--nl-border);
  border-radius: 14px;
  background: var(--nl-surface);
  color: var(--nl-text);
  text-align: left;
  box-shadow: 0 10px 22px rgba(35, 39, 38, 0.07);
  transition:
    border-color var(--nl-transition-fast),
    box-shadow var(--nl-transition-fast),
    background var(--nl-transition-fast),
    transform var(--nl-transition-fast);
}

.mind-layout-node.left {
  grid-template-columns: 15px minmax(0, 1fr) 24px;
  text-align: right;
}

.mind-layout-node:hover {
  border-color: var(--nl-primary-hover);
  box-shadow: 0 12px 24px rgba(35, 39, 38, 0.1);
}

.mind-layout-node.level-1 {
  border-color: rgba(214, 158, 42, 0.52);
  background: #fff6d8;
  box-shadow: 0 14px 28px rgba(185, 120, 24, 0.14);
}

.mind-layout-node.level-2 {
  background: #ffffff;
}

.mind-layout-node.level-3 {
  gap: 6px;
  padding: 7px 9px;
  border-radius: 999px;
  background: #f4f8ee;
  box-shadow: 0 8px 16px rgba(35, 39, 38, 0.06);
}

.mind-layout-node.selected {
  border-color: var(--nl-primary-hover);
  box-shadow: 0 0 0 3px rgba(243, 199, 77, 0.28), 0 12px 26px rgba(35, 39, 38, 0.1);
}

.mind-layout-node.matched {
  border-color: var(--nl-info);
  background: #eef7ff;
}

.mind-layout-node.focus-path:not(.selected) {
  border-color: rgba(91, 132, 68, 0.42);
}

.layout-node-icon {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: var(--nl-mint);
  color: var(--nl-deep);
}

.mind-layout-node.left .layout-node-icon {
  order: 3;
}

.mind-layout-node.left .layout-node-copy {
  order: 2;
}

.mind-layout-node.left .layout-expand-icon {
  order: 1;
}

.layout-node-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.layout-node-copy strong,
.layout-node-copy small {
  overflow-wrap: anywhere;
  letter-spacing: 0;
}

.layout-node-copy strong {
  font-size: 13px;
  line-height: 1.25;
}

.level-1 .layout-node-copy strong {
  font-size: 14px;
  font-weight: 800;
}

.level-3 .layout-node-copy strong {
  font-size: 12px;
}

.layout-node-copy small {
  color: var(--nl-text-subtle);
  font-size: 11px;
}

.layout-expand-icon {
  color: var(--nl-text-subtle);
  transition: transform var(--nl-transition-fast);
}

.mind-layout-node.left .layout-expand-icon {
  transform: rotate(180deg);
}

.mind-layout-node.right.expanded .layout-expand-icon {
  transform: rotate(90deg);
}

.mind-layout-node.left.expanded .layout-expand-icon {
  transform: rotate(90deg);
}

.mind-node-popover {
  position: absolute;
  z-index: 6;
  display: grid;
  gap: 5px;
  padding: 10px 12px;
  border: 1px solid rgba(185, 120, 24, 0.3);
  border-left: 3px solid var(--nl-primary-hover);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 16px 34px rgba(35, 39, 38, 0.14);
}

.mind-node-popover strong,
.mobile-node-popover strong {
  color: var(--nl-text);
  font-size: 13px;
  line-height: 1.35;
}

.mind-node-popover p,
.mobile-node-popover p {
  color: var(--nl-text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.mobile-mind-tree {
  display: grid;
  gap: 12px;
  padding: 12px;
}

.mobile-central-topic {
  display: grid;
  gap: 6px;
  padding: 16px;
  border-radius: 16px;
  background: var(--nl-deep);
  color: #ffffff;
  text-align: center;
  box-shadow: 0 14px 28px rgba(29, 27, 43, 0.18);
}

.mobile-branch-list {
  display: grid;
  gap: 10px;
  min-width: 0;
  margin: 0;
  padding: 0;
}

.mobile-node-popover {
  display: grid;
  gap: 5px;
  padding: 11px 12px;
  border: 1px solid rgba(185, 120, 24, 0.3);
  border-left: 3px solid var(--nl-primary-hover);
  border-radius: 12px;
  background: var(--nl-surface);
}

.mind-map-detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 0.35fr);
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-md);
  background: var(--nl-surface);
}

.mind-map-detail h5 {
  margin-top: 3px;
  font-size: 16px;
  letter-spacing: 0;
}

.mind-map-detail p {
  margin-top: 7px;
  color: var(--nl-text-muted);
  line-height: 1.7;
}

.relation-list {
  display: grid;
  align-content: start;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.relation-list li {
  padding: 7px 9px;
  border-radius: 10px;
  background: var(--nl-mint);
  color: var(--nl-deep);
  font-size: 12px;
}

.mind-map-error {
  display: grid;
  gap: 12px;
}

.raw-content {
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-md);
  background: var(--nl-surface);
}

.raw-content summary {
  padding: 12px 14px;
  cursor: pointer;
  color: var(--nl-text);
}

.raw-content pre {
  max-height: 360px;
  margin: 0;
  overflow: auto;
  padding: 14px;
  border-top: 1px solid var(--nl-border);
  color: var(--nl-code-text);
  background: var(--nl-code-bg);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (prefers-reduced-motion: reduce) {
  .mind-layout-node,
  .layout-expand-icon {
    transition: none;
  }
}

@media (max-width: 900px) {
  .layout-node-icon {
    width: 20px;
    height: 20px;
    border-radius: 8px;
  }

  .mind-layout-node {
    gap: 6px;
    padding: 7px 8px;
  }

  .layout-node-copy strong {
    font-size: 12px;
  }
}

@media (max-width: 767px) {
  .mind-map-board {
    background: #fbfcf8;
  }

  .mind-map-detail {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .mind-map-header {
    display: grid;
  }

  .mind-map-toolbar :deep(.el-button) {
    flex: 1 1 140px;
  }

  .mind-search {
    width: 100%;
  }
}
</style>
