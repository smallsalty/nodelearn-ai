import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/mind-map/MindMapViewer.vue");import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
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
} from "/node_modules/.vite/deps/@element-plus_icons-vue.js?v=dfeb8a9b";
import MindMapNode from "/src/components/mind-map/MindMapNode.vue";
const DESKTOP_BREAKPOINT = 768;
const CENTER_ID = "__mind_map_center__";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "MindMapViewer",
  props: {
    content: { type: String, required: true }
  },
  setup(__props, { expose: __expose }) {
    __expose();
    const props = __props;
    const expandedIds = ref(/* @__PURE__ */ new Set());
    const selectedId = ref(null);
    const focusedNodeId = ref(null);
    const searchKeyword = ref("");
    const boardRef = ref(null);
    const boardWidth = ref(1120);
    const viewportWidth = ref(1024);
    let resizeObserver = null;
    const iconByType = {
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
    const allNodes = computed(() => mindMap.value ? flattenNodes(mindMap.value.branches) : []);
    const parentById = computed(() => buildParentMap(mindMap.value?.branches ?? []));
    const nodeById = computed(() => new Map(allNodes.value.map((node) => [node.id, node])));
    const selectedNode = computed(() => selectedId.value ? nodeById.value.get(selectedId.value) ?? null : null);
    const selectedRelations = computed(() => {
      if (!mindMap.value || !selectedId.value) return [];
      return mindMap.value.relations.filter(
        (relation) => relation.sourceId === selectedId.value || relation.targetId === selectedId.value
      );
    });
    const matchedIds = computed(() => {
      const keyword = searchKeyword.value.trim().toLowerCase();
      if (!keyword) return /* @__PURE__ */ new Set();
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
    const mindMapLayout = computed(() => createMindMapLayout());
    const boardStyle = computed(() => {
      if (isMobileLayout.value) return {};
      return { minHeight: `${mindMapLayout.value.height}px` };
    });
    const centralTopicStyle = computed(() => layoutBoxStyle(mindMapLayout.value.center));
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
      const preferredLeft = layoutNode.side === "right" ? layoutNode.x + layoutNode.width + sideOffset : layoutNode.x - width - sideOffset;
      const left = clamp(preferredLeft, metrics.edgeX, mindMapLayout.value.width - width - metrics.edgeX);
      const top = clamp(layoutNode.y + layoutNode.height / 2 - 42, metrics.edgeY, mindMapLayout.value.height - 112);
      return {
        title: selectedNode.value.title,
        description: selectedNode.value.description,
        style: {
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`
        }
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
    function handleNodeClick(node) {
      selectedId.value = node.id;
      if (node.children.length) {
        toggleNode(node);
      }
    }
    function selectNode(node) {
      selectedId.value = node.id;
    }
    function toggleNode(node) {
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
      expandedIds.value = /* @__PURE__ */ new Set();
    }
    function resetView() {
      expandedIds.value = /* @__PURE__ */ new Set();
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
    function revealNode(nodeId, includeSelf) {
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
    function createMindMapLayout() {
      const width = Math.max(320, boardWidth.value || 1120);
      const metrics = getLayoutMetrics(width);
      const center = {
        id: CENTER_ID,
        x: width / 2 - metrics.centerWidth / 2,
        y: metrics.minHeight / 2 - metrics.centerHeight / 2,
        width: metrics.centerWidth,
        height: metrics.centerHeight
      };
      if (!mindMap.value) {
        return { width, height: metrics.minHeight, center, nodes: [], connectors: [] };
      }
      const branchInfos = mindMap.value.branches.map((node, index) => ({ node, side: getBranchSide(index) })).filter((info) => !focusAllowedIds.value || focusAllowedIds.value.has(info.node.id));
      const leftBlocks = branchInfos.filter((info) => info.side === "left").map((info) => measureBlock(info.node, 1, metrics));
      const rightBlocks = branchInfos.filter((info) => info.side === "right").map((info) => measureBlock(info.node, 1, metrics));
      const leftTotal = getBlocksHeight(leftBlocks, metrics.branchGap);
      const rightTotal = getBlocksHeight(rightBlocks, metrics.branchGap);
      const height = Math.max(metrics.minHeight, Math.max(leftTotal, rightTotal) + metrics.edgeY * 2);
      const centeredCenter = {
        ...center,
        y: height / 2 - metrics.centerHeight / 2
      };
      const nodes = [];
      const connectors = [];
      placeSideBlocks("left", leftBlocks, leftTotal, centeredCenter, width, height, metrics, nodes, connectors);
      placeSideBlocks("right", rightBlocks, rightTotal, centeredCenter, width, height, metrics, nodes, connectors);
      return { width, height, center: centeredCenter, nodes, connectors };
    }
    function placeSideBlocks(side, blocks, totalHeight, center, width, height, metrics, nodes, connectors) {
      let top = height / 2 - totalHeight / 2;
      for (const block of blocks) {
        placeBlock(block, side, top, center, width, metrics, nodes, connectors);
        top += block.height + metrics.branchGap;
      }
    }
    function placeBlock(block, side, top, parent, width, metrics, nodes, connectors) {
      const size = getNodeSize(block.level, metrics);
      const visibleChildren = getVisibleChildren(block.node);
      const layoutNode = {
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
    function measureBlock(node, level, metrics) {
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
    function getVisibleChildren(node) {
      const allowedIds = focusAllowedIds.value;
      if (allowedIds) {
        return node.children.filter((child) => allowedIds.has(child.id));
      }
      if (!expandedIds.value.has(node.id)) return [];
      return node.children;
    }
    function getBlocksHeight(blocks, gap) {
      if (!blocks.length) return 0;
      return blocks.reduce((sum, block) => sum + block.height, 0) + gap * (blocks.length - 1);
    }
    function createConnector(parent, child, side) {
      const fromX = side === "right" ? parent.x + parent.width : parent.x;
      const fromY = parent.y + parent.height / 2;
      const toX = side === "right" ? child.x : child.x + child.width;
      const toY = child.y + child.height / 2;
      const distance = Math.abs(toX - fromX);
      const curve = clamp(distance * 0.55, 22, 84);
      const path = side === "right" ? `M ${fromX} ${fromY} C ${fromX + curve} ${fromY}, ${toX - curve} ${toY}, ${toX} ${toY}` : `M ${fromX} ${fromY} C ${fromX - curve} ${fromY}, ${toX + curve} ${toY}, ${toX} ${toY}`;
      return {
        key: `${parent.id}-${child.id}`,
        path,
        level: child.level,
        side
      };
    }
    function getBranchSide(index) {
      return index % 2 === 0 ? "right" : "left";
    }
    function getNodeSize(level, metrics) {
      if (level === 1) return { width: metrics.branchWidth, height: metrics.branchHeight };
      if (level === 2) return { width: metrics.childWidth, height: metrics.childHeight };
      return { width: metrics.leafWidth, height: metrics.leafHeight };
    }
    function getNodeX(level, side, nodeWidth, width, metrics) {
      const ratio = level === 1 ? metrics.branchRatio : level === 2 ? metrics.childRatio : metrics.leafRatio;
      const nodeCenterRatio = side === "right" ? ratio : 1 - ratio;
      return clamp(width * nodeCenterRatio - nodeWidth / 2, metrics.edgeX, width - metrics.edgeX - nodeWidth);
    }
    function getGapForLevel(level, metrics) {
      if (level <= 2) return metrics.childGap;
      return metrics.leafGap;
    }
    function getLayoutMetrics(width) {
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
    function layoutBoxStyle(box) {
      return {
        left: `${box.x}px`,
        top: `${box.y}px`,
        width: `${box.width}px`,
        minHeight: `${box.height}px`
      };
    }
    function layoutNodeStyle(node) {
      return layoutBoxStyle(node);
    }
    function layoutNodeClasses(node) {
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
    function getNodeIcon(branchType) {
      return iconByType[branchType] ?? Tickets;
    }
    function parseMindMap(content) {
      try {
        const parsed = JSON.parse(content);
        if (!isKnowledgeMindMap(parsed)) {
          return { map: null, error: "思维导图数据异常" };
        }
        return { map: parsed, error: null };
      } catch {
        return { map: null, error: "思维导图数据异常" };
      }
    }
    function isKnowledgeMindMap(value) {
      if (!isRecord(value)) return false;
      return typeof value.title === "string" && (value.scope === "chapter" || value.scope === "node") && typeof value.courseId === "string" && typeof value.centralTopic === "string" && typeof value.summary === "string" && Array.isArray(value.branches) && value.branches.every(isMindMapNode) && Array.isArray(value.relations) && value.relations.every(isMindMapRelation);
    }
    function isMindMapNode(value) {
      if (!isRecord(value)) return false;
      return typeof value.id === "string" && typeof value.title === "string" && typeof value.branchType === "string" && Array.isArray(value.children) && value.children.every(isMindMapNode);
    }
    function isMindMapRelation(value) {
      if (!isRecord(value)) return false;
      return typeof value.sourceId === "string" && typeof value.targetId === "string" && typeof value.relationType === "string" && typeof value.label === "string";
    }
    function isRecord(value) {
      return typeof value === "object" && value !== null;
    }
    function flattenNodes(nodes) {
      return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
    }
    function buildParentMap(nodes, parentId) {
      const result = /* @__PURE__ */ new Map();
      for (const node of nodes) {
        if (parentId) result.set(node.id, parentId);
        for (const [childId, nodeId] of buildParentMap(node.children, node.id)) {
          result.set(childId, nodeId);
        }
      }
      return result;
    }
    function findNodePath(nodes, nodeId) {
      for (const node of nodes) {
        if (node.id === nodeId) return [node];
        const childPath = findNodePath(node.children, nodeId);
        if (childPath.length) return [node, ...childPath];
      }
      return [];
    }
    function filterNodesByAllowedIds(nodes, allowedIds) {
      return nodes.filter((node) => allowedIds.has(node.id)).map((node) => ({
        ...node,
        children: filterNodesByAllowedIds(node.children, allowedIds)
      }));
    }
    function matchNode(node, keyword) {
      return [node.title, node.knowledgePoint, node.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword));
    }
    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }
    const __returned__ = { props, DESKTOP_BREAKPOINT, CENTER_ID, expandedIds, selectedId, focusedNodeId, searchKeyword, boardRef, boardWidth, viewportWidth, get resizeObserver() {
      return resizeObserver;
    }, set resizeObserver(v) {
      resizeObserver = v;
    }, iconByType, parsedResult, mindMap, parseError, allNodes, parentById, nodeById, selectedNode, selectedRelations, matchedIds, searchCount, isMobileLayout, focusPath, focusPathIds, focusAllowedIds, mobileBranches, mindMapLayout, boardStyle, centralTopicStyle, selectedLayoutNode, selectedPopover, measureBoard, handleNodeClick, selectNode, toggleNode, expandAll, collapseAll, resetView, focusSelected, selectFirstMatch, clearFocus, revealNode, createMindMapLayout, placeSideBlocks, placeBlock, measureBlock, getVisibleChildren, getBlocksHeight, createConnector, getBranchSide, getNodeSize, getNodeX, getGapForLevel, getLayoutMetrics, layoutBoxStyle, layoutNodeStyle, layoutNodeClasses, getNodeIcon, parseMindMap, isKnowledgeMindMap, isMindMapNode, isMindMapRelation, isRecord, flattenNodes, buildParentMap, findNodePath, filterNodesByAllowedIds, matchNode, clamp, get Aim() {
      return Aim;
    }, get ArrowRight() {
      return ArrowRight;
    }, get Expand() {
      return Expand;
    }, get Fold() {
      return Fold;
    }, get Refresh() {
      return Refresh;
    }, get Search() {
      return Search;
    }, MindMapNode };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, withKeys as _withKeys, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, createElementBlock as _createElementBlock, renderList as _renderList, Fragment as _Fragment, normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle, resolveDynamicComponent as _resolveDynamicComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _hoisted_1 = { class: "mind-map-viewer" };
const _hoisted_2 = { class: "mind-map-header" };
const _hoisted_3 = {
  class: "mind-map-toolbar",
  "aria-label": "思维导图工具栏"
};
const _hoisted_4 = {
  key: 0,
  class: "search-status"
};
const _hoisted_5 = { class: "mind-map-canvas" };
const _hoisted_6 = ["viewBox"];
const _hoisted_7 = ["d"];
const _hoisted_8 = ["aria-expanded", "onClick"];
const _hoisted_9 = { class: "layout-node-copy" };
const _hoisted_10 = { key: 0 };
const _hoisted_11 = {
  key: 1,
  class: "mobile-mind-tree"
};
const _hoisted_12 = { class: "mobile-branch-list" };
const _hoisted_13 = {
  key: 0,
  class: "mobile-node-popover"
};
const _hoisted_14 = { class: "mind-map-detail" };
const _hoisted_15 = {
  key: 0,
  class: "relation-list"
};
const _hoisted_16 = {
  key: 1,
  class: "mind-map-error"
};
const _hoisted_17 = { class: "raw-content" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_tag = _resolveComponent("el-tag");
  const _component_el_button = _resolveComponent("el-button");
  const _component_el_input = _resolveComponent("el-input");
  const _component_el_icon = _resolveComponent("el-icon");
  const _component_el_alert = _resolveComponent("el-alert");
  return _openBlock(), _createElementBlock("section", _hoisted_1, [
    $setup.mindMap ? (_openBlock(), _createElementBlock(
      _Fragment,
      { key: 0 },
      [
        _createElementVNode("header", _hoisted_2, [
          _createElementVNode("div", null, [
            _createElementVNode(
              "p",
              null,
              _toDisplayString($setup.mindMap.scope === "chapter" ? "章节知识点导图" : "知识点导图"),
              1
              /* TEXT */
            ),
            _createElementVNode(
              "h4",
              null,
              _toDisplayString($setup.mindMap.title),
              1
              /* TEXT */
            )
          ]),
          _createVNode(_component_el_tag, null, {
            default: _withCtx(() => [
              _createTextVNode(
                _toDisplayString($setup.allNodes.length) + " 个节点",
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })
        ]),
        _createElementVNode("div", _hoisted_3, [
          _createVNode(_component_el_button, {
            icon: $setup.Expand,
            onClick: $setup.expandAll
          }, {
            default: _withCtx(() => [..._cache[1] || (_cache[1] = [
              _createTextVNode(
                "全部展开",
                -1
                /* CACHED */
              )
            ])]),
            _: 1
            /* STABLE */
          }, 8, ["icon"]),
          _createVNode(_component_el_button, {
            icon: $setup.Fold,
            onClick: $setup.collapseAll
          }, {
            default: _withCtx(() => [..._cache[2] || (_cache[2] = [
              _createTextVNode(
                "全部收起",
                -1
                /* CACHED */
              )
            ])]),
            _: 1
            /* STABLE */
          }, 8, ["icon"]),
          _createVNode(_component_el_button, {
            icon: $setup.Refresh,
            onClick: $setup.resetView
          }, {
            default: _withCtx(() => [..._cache[3] || (_cache[3] = [
              _createTextVNode(
                "重置视图",
                -1
                /* CACHED */
              )
            ])]),
            _: 1
            /* STABLE */
          }, 8, ["icon"]),
          _createVNode(_component_el_input, {
            modelValue: $setup.searchKeyword,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.searchKeyword = $event),
            clearable: "",
            class: "mind-search",
            placeholder: "搜索知识点",
            "prefix-icon": $setup.Search,
            onKeyup: _withKeys($setup.selectFirstMatch, ["enter"]),
            onClear: $setup.clearFocus
          }, null, 8, ["modelValue", "prefix-icon"]),
          _createVNode(_component_el_button, {
            icon: $setup.Search,
            disabled: !$setup.searchKeyword.trim() || !$setup.searchCount,
            onClick: $setup.selectFirstMatch
          }, {
            default: _withCtx(() => [..._cache[4] || (_cache[4] = [
              _createTextVNode(
                "搜索",
                -1
                /* CACHED */
              )
            ])]),
            _: 1
            /* STABLE */
          }, 8, ["icon", "disabled"]),
          _createVNode(_component_el_button, {
            icon: $setup.Aim,
            disabled: !$setup.selectedNode,
            onClick: $setup.focusSelected
          }, {
            default: _withCtx(() => [..._cache[5] || (_cache[5] = [
              _createTextVNode(
                "聚焦当前节点",
                -1
                /* CACHED */
              )
            ])]),
            _: 1
            /* STABLE */
          }, 8, ["icon", "disabled"]),
          $setup.focusedNodeId ? (_openBlock(), _createBlock(_component_el_button, {
            key: 0,
            onClick: $setup.clearFocus
          }, {
            default: _withCtx(() => [..._cache[6] || (_cache[6] = [
              _createTextVNode(
                "取消聚焦",
                -1
                /* CACHED */
              )
            ])]),
            _: 1
            /* STABLE */
          })) : _createCommentVNode("v-if", true)
        ]),
        $setup.searchKeyword.trim() ? (_openBlock(), _createElementBlock(
          "p",
          _hoisted_4,
          " 已匹配 " + _toDisplayString($setup.searchCount) + " 个知识点 ",
          1
          /* TEXT */
        )) : _createCommentVNode("v-if", true),
        _createElementVNode("div", _hoisted_5, [
          _createElementVNode(
            "div",
            {
              ref: "boardRef",
              class: _normalizeClass(["mind-map-board", { focused: $setup.focusedNodeId, mobile: $setup.isMobileLayout }]),
              style: _normalizeStyle($setup.boardStyle)
            },
            [
              !$setup.isMobileLayout ? (_openBlock(), _createElementBlock(
                _Fragment,
                { key: 0 },
                [
                  (_openBlock(), _createElementBlock("svg", {
                    class: "mind-map-links",
                    viewBox: `0 0 ${$setup.mindMapLayout.width} ${$setup.mindMapLayout.height}`,
                    preserveAspectRatio: "none",
                    "aria-hidden": "true"
                  }, [
                    (_openBlock(true), _createElementBlock(
                      _Fragment,
                      null,
                      _renderList($setup.mindMapLayout.connectors, (connector) => {
                        return _openBlock(), _createElementBlock("path", {
                          key: connector.key,
                          class: _normalizeClass(["mind-link", [`level-${Math.min(connector.level, 3)}`, connector.side]]),
                          d: connector.path
                        }, null, 10, _hoisted_7);
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ], 8, _hoisted_6)),
                  _createElementVNode(
                    "button",
                    {
                      type: "button",
                      class: "central-topic",
                      style: _normalizeStyle($setup.centralTopicStyle),
                      "aria-label": "重置思维导图视图",
                      onClick: $setup.resetView
                    },
                    [
                      _cache[7] || (_cache[7] = _createElementVNode(
                        "span",
                        null,
                        "中心主题",
                        -1
                        /* CACHED */
                      )),
                      _createElementVNode(
                        "strong",
                        null,
                        _toDisplayString($setup.mindMap.centralTopic),
                        1
                        /* TEXT */
                      ),
                      _createElementVNode(
                        "small",
                        null,
                        _toDisplayString($setup.mindMap.summary),
                        1
                        /* TEXT */
                      )
                    ],
                    4
                    /* STYLE */
                  ),
                  (_openBlock(true), _createElementBlock(
                    _Fragment,
                    null,
                    _renderList($setup.mindMapLayout.nodes, (layoutNode) => {
                      return _openBlock(), _createElementBlock("button", {
                        key: layoutNode.id,
                        type: "button",
                        class: _normalizeClass(["mind-layout-node", $setup.layoutNodeClasses(layoutNode)]),
                        style: _normalizeStyle($setup.layoutNodeStyle(layoutNode)),
                        "aria-expanded": layoutNode.hasChildren ? layoutNode.isExpanded : void 0,
                        onClick: ($event) => $setup.handleNodeClick(layoutNode.node)
                      }, [
                        _createVNode(
                          _component_el_icon,
                          { class: "layout-node-icon" },
                          {
                            default: _withCtx(() => [
                              (_openBlock(), _createBlock(_resolveDynamicComponent($setup.getNodeIcon(layoutNode.node.branchType))))
                            ]),
                            _: 2
                            /* DYNAMIC */
                          },
                          1024
                          /* DYNAMIC_SLOTS */
                        ),
                        _createElementVNode("span", _hoisted_9, [
                          _createElementVNode(
                            "strong",
                            null,
                            _toDisplayString(layoutNode.node.title),
                            1
                            /* TEXT */
                          ),
                          layoutNode.level < 3 && layoutNode.node.knowledgePoint && layoutNode.node.knowledgePoint !== layoutNode.node.title ? (_openBlock(), _createElementBlock(
                            "small",
                            _hoisted_10,
                            _toDisplayString(layoutNode.node.knowledgePoint),
                            1
                            /* TEXT */
                          )) : _createCommentVNode("v-if", true)
                        ]),
                        layoutNode.hasChildren ? (_openBlock(), _createBlock(_component_el_icon, {
                          key: 0,
                          class: "layout-expand-icon"
                        }, {
                          default: _withCtx(() => [
                            _createVNode($setup["ArrowRight"])
                          ]),
                          _: 1
                          /* STABLE */
                        })) : _createCommentVNode("v-if", true)
                      ], 14, _hoisted_8);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  )),
                  $setup.selectedPopover ? (_openBlock(), _createElementBlock(
                    "aside",
                    {
                      key: 0,
                      class: "mind-node-popover",
                      style: _normalizeStyle($setup.selectedPopover.style)
                    },
                    [
                      _cache[8] || (_cache[8] = _createElementVNode(
                        "span",
                        null,
                        "节点说明",
                        -1
                        /* CACHED */
                      )),
                      _createElementVNode(
                        "strong",
                        null,
                        _toDisplayString($setup.selectedPopover.title),
                        1
                        /* TEXT */
                      ),
                      _createElementVNode(
                        "p",
                        null,
                        _toDisplayString($setup.selectedPopover.description),
                        1
                        /* TEXT */
                      )
                    ],
                    4
                    /* STYLE */
                  )) : _createCommentVNode("v-if", true)
                ],
                64
                /* STABLE_FRAGMENT */
              )) : (_openBlock(), _createElementBlock("div", _hoisted_11, [
                _createElementVNode("button", {
                  type: "button",
                  class: "mobile-central-topic",
                  onClick: $setup.resetView
                }, [
                  _cache[9] || (_cache[9] = _createElementVNode(
                    "span",
                    null,
                    "中心主题",
                    -1
                    /* CACHED */
                  )),
                  _createElementVNode(
                    "strong",
                    null,
                    _toDisplayString($setup.mindMap.centralTopic),
                    1
                    /* TEXT */
                  ),
                  _createElementVNode(
                    "small",
                    null,
                    _toDisplayString($setup.mindMap.summary),
                    1
                    /* TEXT */
                  )
                ]),
                _createElementVNode("ul", _hoisted_12, [
                  (_openBlock(true), _createElementBlock(
                    _Fragment,
                    null,
                    _renderList($setup.mobileBranches, (branch) => {
                      return _openBlock(), _createBlock($setup["MindMapNode"], {
                        key: branch.id,
                        node: branch,
                        level: 1,
                        side: "right",
                        "expanded-ids": $setup.expandedIds,
                        "selected-id": $setup.selectedId,
                        "matched-ids": $setup.matchedIds,
                        onSelect: $setup.selectNode,
                        onToggle: $setup.toggleNode
                      }, null, 8, ["node", "expanded-ids", "selected-id", "matched-ids"]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]),
                $setup.selectedNode?.description ? (_openBlock(), _createElementBlock("aside", _hoisted_13, [
                  _cache[10] || (_cache[10] = _createElementVNode(
                    "span",
                    null,
                    "节点说明",
                    -1
                    /* CACHED */
                  )),
                  _createElementVNode(
                    "strong",
                    null,
                    _toDisplayString($setup.selectedNode.title),
                    1
                    /* TEXT */
                  ),
                  _createElementVNode(
                    "p",
                    null,
                    _toDisplayString($setup.selectedNode.description),
                    1
                    /* TEXT */
                  )
                ])) : _createCommentVNode("v-if", true)
              ]))
            ],
            6
            /* CLASS, STYLE */
          )
        ]),
        _createElementVNode("footer", _hoisted_14, [
          _createElementVNode("div", null, [
            _createElementVNode(
              "span",
              null,
              _toDisplayString($setup.selectedNode ? "当前节点" : "导图摘要"),
              1
              /* TEXT */
            ),
            _createElementVNode(
              "h5",
              null,
              _toDisplayString($setup.selectedNode?.title ?? $setup.mindMap.centralTopic),
              1
              /* TEXT */
            ),
            _createElementVNode(
              "p",
              null,
              _toDisplayString($setup.selectedNode?.description ?? $setup.mindMap.summary),
              1
              /* TEXT */
            )
          ]),
          $setup.selectedRelations.length ? (_openBlock(), _createElementBlock("ul", _hoisted_15, [
            (_openBlock(true), _createElementBlock(
              _Fragment,
              null,
              _renderList($setup.selectedRelations, (relation) => {
                return _openBlock(), _createElementBlock(
                  "li",
                  {
                    key: `${relation.sourceId}-${relation.targetId}-${relation.label}`
                  },
                  _toDisplayString(relation.label),
                  1
                  /* TEXT */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])) : _createCommentVNode("v-if", true)
        ])
      ],
      64
      /* STABLE_FRAGMENT */
    )) : (_openBlock(), _createElementBlock("section", _hoisted_16, [
      _createVNode(_component_el_alert, {
        title: $setup.parseError || "思维导图数据异常",
        type: "warning",
        "show-icon": "",
        closable: false
      }, null, 8, ["title"]),
      _createElementVNode("details", _hoisted_17, [
        _cache[11] || (_cache[11] = _createElementVNode(
          "summary",
          null,
          "查看原始内容",
          -1
          /* CACHED */
        )),
        _createElementVNode(
          "pre",
          null,
          _toDisplayString($props.content),
          1
          /* TEXT */
        )
      ])
    ]))
  ]);
}
import "/src/components/mind-map/MindMapViewer.vue?vue&type=style&index=0&scoped=5215e2c9&lang.css";
_sfc_main.__hmrId = "5215e2c9";
typeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main);
import.meta.hot.on("file-changed", ({ file }) => {
  __VUE_HMR_RUNTIME__.CHANGED_FILE = file;
});
import.meta.hot.accept((mod) => {
  if (!mod) return;
  const { default: updated, _rerender_only } = mod;
  if (_rerender_only) {
    __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render);
  } else {
    __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated);
  }
});
import _export_sfc from "/@id/__x00__plugin-vue:export-helper";
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-5215e2c9"], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/components/mind-map/MindMapViewer.vue"]]);

//# sourceMappingURL=data:application/json;base64,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QkFBNUIsb0JBSUssTUFKTCxhQUlLO0FBQUEsK0JBSEg7QUFBQSxjQUVLO0FBQUE7QUFBQSwwQkFGa0IsMEJBQWlCLENBQTdCLGFBQVE7cUNBQW5CO0FBQUEsa0JBRUs7QUFBQTtBQUFBLG9CQUZzQyxLQUFHLEdBQUssU0FBUyxRQUFRLElBQUksU0FBUyxRQUFRLElBQUksU0FBUyxLQUFLO0FBQUE7bUNBQ3RHLFNBQVMsS0FBSztBQUFBO0FBQUE7QUFBQTtBQUFBOzs7Ozs7Ozs7d0JBTXpCLG9CQU1VLFdBTlYsYUFNVTtBQUFBLE1BTFIsYUFBeUY7QUFBQSxRQUE5RSxPQUFPLHFCQUFVO0FBQUEsUUFBZ0IsTUFBSztBQUFBLFFBQVU7QUFBQSxRQUFXLFVBQVU7QUFBQTtNQUNoRixvQkFHVSxXQUhWLGFBR1U7QUFBQSxvQ0FGUjtBQUFBLFVBQXlCO0FBQUE7QUFBQSxVQUFoQjtBQUFBLFVBQU07QUFBQTtBQUFBO0FBQUEsUUFDZjtBQUFBLFVBQXdCO0FBQUE7QUFBQSwyQkFBaEIsY0FBTztBQUFBO0FBQUE7QUFBQTtBQUFBIiwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJNaW5kTWFwVmlld2VyLnZ1ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0IHNldHVwIGxhbmc9XCJ0c1wiPlxuaW1wb3J0IHsgY29tcHV0ZWQsIG5leHRUaWNrLCBvbkJlZm9yZVVubW91bnQsIG9uTW91bnRlZCwgcmVmLCB3YXRjaCB9IGZyb20gXCJ2dWVcIjtcbmltcG9ydCB0eXBlIHsgQ29tcG9uZW50LCBDU1NQcm9wZXJ0aWVzIH0gZnJvbSBcInZ1ZVwiO1xuaW1wb3J0IHtcbiAgQWltLFxuICBBcnJvd1JpZ2h0LFxuICBDb25uZWN0aW9uLFxuICBDcHUsXG4gIEV4cGFuZCxcbiAgRm9sZCxcbiAgR3JpZCxcbiAgT3BlcmF0aW9uLFxuICBSZWZyZXNoLFxuICBTZWFyY2gsXG4gIFNoYXJlLFxuICBUaWNrZXRzXG59IGZyb20gXCJAZWxlbWVudC1wbHVzL2ljb25zLXZ1ZVwiO1xuaW1wb3J0IE1pbmRNYXBOb2RlIGZyb20gXCIuL01pbmRNYXBOb2RlLnZ1ZVwiO1xuaW1wb3J0IHR5cGUge1xuICBLbm93bGVkZ2VNaW5kTWFwLFxuICBLbm93bGVkZ2VNaW5kTWFwTm9kZSxcbiAgS25vd2xlZGdlTWluZE1hcFJlbGF0aW9uLFxuICBNaW5kTWFwQnJhbmNoVHlwZVxufSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBwcm9wcyA9IGRlZmluZVByb3BzPHtcbiAgY29udGVudDogc3RyaW5nO1xufT4oKTtcblxudHlwZSBNaW5kTWFwU2lkZSA9IFwibGVmdFwiIHwgXCJyaWdodFwiO1xuXG5pbnRlcmZhY2UgTm9kZVNpemUge1xuICB3aWR0aDogbnVtYmVyO1xuICBoZWlnaHQ6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIExheW91dE1ldHJpY3Mge1xuICBjZW50ZXJXaWR0aDogbnVtYmVyO1xuICBjZW50ZXJIZWlnaHQ6IG51bWJlcjtcbiAgYnJhbmNoV2lkdGg6IG51bWJlcjtcbiAgYnJhbmNoSGVpZ2h0OiBudW1iZXI7XG4gIGNoaWxkV2lkdGg6IG51bWJlcjtcbiAgY2hpbGRIZWlnaHQ6IG51bWJlcjtcbiAgbGVhZldpZHRoOiBudW1iZXI7XG4gIGxlYWZIZWlnaHQ6IG51bWJlcjtcbiAgZWRnZVg6IG51bWJlcjtcbiAgZWRnZVk6IG51bWJlcjtcbiAgbWluSGVpZ2h0OiBudW1iZXI7XG4gIGJyYW5jaEdhcDogbnVtYmVyO1xuICBjaGlsZEdhcDogbnVtYmVyO1xuICBsZWFmR2FwOiBudW1iZXI7XG4gIGJyYW5jaFJhdGlvOiBudW1iZXI7XG4gIGNoaWxkUmF0aW86IG51bWJlcjtcbiAgbGVhZlJhdGlvOiBudW1iZXI7XG4gIHBvcG92ZXJXaWR0aDogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgTGF5b3V0Qm94IHtcbiAgaWQ6IHN0cmluZztcbiAgeDogbnVtYmVyO1xuICB5OiBudW1iZXI7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgTGF5b3V0Tm9kZSBleHRlbmRzIExheW91dEJveCB7XG4gIG5vZGU6IEtub3dsZWRnZU1pbmRNYXBOb2RlO1xuICBsZXZlbDogbnVtYmVyO1xuICBzaWRlOiBNaW5kTWFwU2lkZTtcbiAgaGFzQ2hpbGRyZW46IGJvb2xlYW47XG4gIGlzRXhwYW5kZWQ6IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBMYXlvdXRDb25uZWN0b3Ige1xuICBrZXk6IHN0cmluZztcbiAgcGF0aDogc3RyaW5nO1xuICBsZXZlbDogbnVtYmVyO1xuICBzaWRlOiBNaW5kTWFwU2lkZTtcbn1cblxuaW50ZXJmYWNlIE1lYXN1cmVkQmxvY2sge1xuICBub2RlOiBLbm93bGVkZ2VNaW5kTWFwTm9kZTtcbiAgbGV2ZWw6IG51bWJlcjtcbiAgaGVpZ2h0OiBudW1iZXI7XG4gIGNoaWxkcmVuOiBNZWFzdXJlZEJsb2NrW107XG59XG5cbmludGVyZmFjZSBNaW5kTWFwTGF5b3V0IHtcbiAgd2lkdGg6IG51bWJlcjtcbiAgaGVpZ2h0OiBudW1iZXI7XG4gIGNlbnRlcjogTGF5b3V0Qm94O1xuICBub2RlczogTGF5b3V0Tm9kZVtdO1xuICBjb25uZWN0b3JzOiBMYXlvdXRDb25uZWN0b3JbXTtcbn1cblxuY29uc3QgREVTS1RPUF9CUkVBS1BPSU5UID0gNzY4O1xuY29uc3QgQ0VOVEVSX0lEID0gXCJfX21pbmRfbWFwX2NlbnRlcl9fXCI7XG5cbmNvbnN0IGV4cGFuZGVkSWRzID0gcmVmPFNldDxzdHJpbmc+PihuZXcgU2V0KCkpO1xuY29uc3Qgc2VsZWN0ZWRJZCA9IHJlZjxzdHJpbmcgfCBudWxsPihudWxsKTtcbmNvbnN0IGZvY3VzZWROb2RlSWQgPSByZWY8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG5jb25zdCBzZWFyY2hLZXl3b3JkID0gcmVmKFwiXCIpO1xuY29uc3QgYm9hcmRSZWYgPSByZWY8SFRNTEVsZW1lbnQgfCBudWxsPihudWxsKTtcbmNvbnN0IGJvYXJkV2lkdGggPSByZWYoMTEyMCk7XG5jb25zdCB2aWV3cG9ydFdpZHRoID0gcmVmKDEwMjQpO1xuXG5sZXQgcmVzaXplT2JzZXJ2ZXI6IFJlc2l6ZU9ic2VydmVyIHwgbnVsbCA9IG51bGw7XG5cbmNvbnN0IGljb25CeVR5cGU6IFJlY29yZDxNaW5kTWFwQnJhbmNoVHlwZSwgQ29tcG9uZW50PiA9IHtcbiAgZGVmaW5pdGlvbjogVGlja2V0cyxcbiAgc3RydWN0dXJlOiBHcmlkLFxuICBwcmluY2lwbGU6IENwdSxcbiAgY2xhc3NpZmljYXRpb246IFNoYXJlLFxuICBvcGVyYXRpb246IE9wZXJhdGlvbixcbiAgYWxnb3JpdGhtOiBPcGVyYXRpb24sXG4gIGNvbXBsZXhpdHk6IENvbm5lY3Rpb24sXG4gIHJlbGF0aW9uOiBTaGFyZSxcbiAgYXBwbGljYXRpb246IEFycm93UmlnaHRcbn07XG5cbmNvbnN0IHBhcnNlZFJlc3VsdCA9IGNvbXB1dGVkKCgpID0+IHBhcnNlTWluZE1hcChwcm9wcy5jb250ZW50KSk7XG5jb25zdCBtaW5kTWFwID0gY29tcHV0ZWQoKCkgPT4gcGFyc2VkUmVzdWx0LnZhbHVlLm1hcCk7XG5jb25zdCBwYXJzZUVycm9yID0gY29tcHV0ZWQoKCkgPT4gcGFyc2VkUmVzdWx0LnZhbHVlLmVycm9yKTtcbmNvbnN0IGFsbE5vZGVzID0gY29tcHV0ZWQoKCkgPT4gKG1pbmRNYXAudmFsdWUgPyBmbGF0dGVuTm9kZXMobWluZE1hcC52YWx1ZS5icmFuY2hlcykgOiBbXSkpO1xuY29uc3QgcGFyZW50QnlJZCA9IGNvbXB1dGVkKCgpID0+IGJ1aWxkUGFyZW50TWFwKG1pbmRNYXAudmFsdWU/LmJyYW5jaGVzID8/IFtdKSk7XG5jb25zdCBub2RlQnlJZCA9IGNvbXB1dGVkKCgpID0+IG5ldyBNYXAoYWxsTm9kZXMudmFsdWUubWFwKChub2RlKSA9PiBbbm9kZS5pZCwgbm9kZV0pKSk7XG5jb25zdCBzZWxlY3RlZE5vZGUgPSBjb21wdXRlZCgoKSA9PiAoc2VsZWN0ZWRJZC52YWx1ZSA/IG5vZGVCeUlkLnZhbHVlLmdldChzZWxlY3RlZElkLnZhbHVlKSA/PyBudWxsIDogbnVsbCkpO1xuY29uc3Qgc2VsZWN0ZWRSZWxhdGlvbnMgPSBjb21wdXRlZCgoKSA9PiB7XG4gIGlmICghbWluZE1hcC52YWx1ZSB8fCAhc2VsZWN0ZWRJZC52YWx1ZSkgcmV0dXJuIFtdO1xuICByZXR1cm4gbWluZE1hcC52YWx1ZS5yZWxhdGlvbnMuZmlsdGVyKFxuICAgIChyZWxhdGlvbikgPT4gcmVsYXRpb24uc291cmNlSWQgPT09IHNlbGVjdGVkSWQudmFsdWUgfHwgcmVsYXRpb24udGFyZ2V0SWQgPT09IHNlbGVjdGVkSWQudmFsdWVcbiAgKTtcbn0pO1xuY29uc3QgbWF0Y2hlZElkcyA9IGNvbXB1dGVkKCgpID0+IHtcbiAgY29uc3Qga2V5d29yZCA9IHNlYXJjaEtleXdvcmQudmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIGlmICgha2V5d29yZCkgcmV0dXJuIG5ldyBTZXQ8c3RyaW5nPigpO1xuICByZXR1cm4gbmV3IFNldChhbGxOb2Rlcy52YWx1ZS5maWx0ZXIoKG5vZGUpID0+IG1hdGNoTm9kZShub2RlLCBrZXl3b3JkKSkubWFwKChub2RlKSA9PiBub2RlLmlkKSk7XG59KTtcbmNvbnN0IHNlYXJjaENvdW50ID0gY29tcHV0ZWQoKCkgPT4gbWF0Y2hlZElkcy52YWx1ZS5zaXplKTtcbmNvbnN0IGlzTW9iaWxlTGF5b3V0ID0gY29tcHV0ZWQoKCkgPT4gdmlld3BvcnRXaWR0aC52YWx1ZSA8IERFU0tUT1BfQlJFQUtQT0lOVCk7XG5jb25zdCBmb2N1c1BhdGggPSBjb21wdXRlZCgoKSA9PiB7XG4gIGlmICghZm9jdXNlZE5vZGVJZC52YWx1ZSB8fCAhbWluZE1hcC52YWx1ZSkgcmV0dXJuIFtdO1xuICByZXR1cm4gZmluZE5vZGVQYXRoKG1pbmRNYXAudmFsdWUuYnJhbmNoZXMsIGZvY3VzZWROb2RlSWQudmFsdWUpO1xufSk7XG5jb25zdCBmb2N1c1BhdGhJZHMgPSBjb21wdXRlZCgoKSA9PiBuZXcgU2V0KGZvY3VzUGF0aC52YWx1ZS5tYXAoKG5vZGUpID0+IG5vZGUuaWQpKSk7XG5jb25zdCBmb2N1c0FsbG93ZWRJZHMgPSBjb21wdXRlZCgoKSA9PiB7XG4gIGlmICghZm9jdXNlZE5vZGVJZC52YWx1ZSB8fCAhZm9jdXNQYXRoLnZhbHVlLmxlbmd0aCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHJlc3VsdCA9IG5ldyBTZXQoZm9jdXNQYXRoLnZhbHVlLm1hcCgobm9kZSkgPT4gbm9kZS5pZCkpO1xuICBjb25zdCBmb2N1c2VkTm9kZSA9IGZvY3VzUGF0aC52YWx1ZVtmb2N1c1BhdGgudmFsdWUubGVuZ3RoIC0gMV07XG4gIGZvY3VzZWROb2RlLmNoaWxkcmVuLmZvckVhY2goKGNoaWxkKSA9PiByZXN1bHQuYWRkKGNoaWxkLmlkKSk7XG4gIHJldHVybiByZXN1bHQ7XG59KTtcbmNvbnN0IG1vYmlsZUJyYW5jaGVzID0gY29tcHV0ZWQoKCkgPT4ge1xuICBjb25zdCBicmFuY2hlcyA9IG1pbmRNYXAudmFsdWU/LmJyYW5jaGVzID8/IFtdO1xuICBpZiAoIWZvY3VzQWxsb3dlZElkcy52YWx1ZSkgcmV0dXJuIGJyYW5jaGVzO1xuICByZXR1cm4gZmlsdGVyTm9kZXNCeUFsbG93ZWRJZHMoYnJhbmNoZXMsIGZvY3VzQWxsb3dlZElkcy52YWx1ZSk7XG59KTtcbmNvbnN0IG1pbmRNYXBMYXlvdXQgPSBjb21wdXRlZDxNaW5kTWFwTGF5b3V0PigoKSA9PiBjcmVhdGVNaW5kTWFwTGF5b3V0KCkpO1xuY29uc3QgYm9hcmRTdHlsZSA9IGNvbXB1dGVkPENTU1Byb3BlcnRpZXM+KCgpID0+IHtcbiAgaWYgKGlzTW9iaWxlTGF5b3V0LnZhbHVlKSByZXR1cm4ge307XG4gIHJldHVybiB7IG1pbkhlaWdodDogYCR7bWluZE1hcExheW91dC52YWx1ZS5oZWlnaHR9cHhgIH07XG59KTtcbmNvbnN0IGNlbnRyYWxUb3BpY1N0eWxlID0gY29tcHV0ZWQ8Q1NTUHJvcGVydGllcz4oKCkgPT4gbGF5b3V0Qm94U3R5bGUobWluZE1hcExheW91dC52YWx1ZS5jZW50ZXIpKTtcbmNvbnN0IHNlbGVjdGVkTGF5b3V0Tm9kZSA9IGNvbXB1dGVkKCgpID0+IHtcbiAgaWYgKCFzZWxlY3RlZElkLnZhbHVlKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIG1pbmRNYXBMYXlvdXQudmFsdWUubm9kZXMuZmluZCgobm9kZSkgPT4gbm9kZS5pZCA9PT0gc2VsZWN0ZWRJZC52YWx1ZSkgPz8gbnVsbDtcbn0pO1xuY29uc3Qgc2VsZWN0ZWRQb3BvdmVyID0gY29tcHV0ZWQoKCkgPT4ge1xuICBpZiAoaXNNb2JpbGVMYXlvdXQudmFsdWUgfHwgIXNlbGVjdGVkTm9kZS52YWx1ZT8uZGVzY3JpcHRpb24gfHwgIXNlbGVjdGVkTGF5b3V0Tm9kZS52YWx1ZSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGxheW91dE5vZGUgPSBzZWxlY3RlZExheW91dE5vZGUudmFsdWU7XG4gIGNvbnN0IG1ldHJpY3MgPSBnZXRMYXlvdXRNZXRyaWNzKG1pbmRNYXBMYXlvdXQudmFsdWUud2lkdGgpO1xuICBjb25zdCB3aWR0aCA9IG1ldHJpY3MucG9wb3ZlcldpZHRoO1xuICBjb25zdCBzaWRlT2Zmc2V0ID0gMTI7XG4gIGNvbnN0IHByZWZlcnJlZExlZnQgPVxuICAgIGxheW91dE5vZGUuc2lkZSA9PT0gXCJyaWdodFwiID8gbGF5b3V0Tm9kZS54ICsgbGF5b3V0Tm9kZS53aWR0aCArIHNpZGVPZmZzZXQgOiBsYXlvdXROb2RlLnggLSB3aWR0aCAtIHNpZGVPZmZzZXQ7XG4gIGNvbnN0IGxlZnQgPSBjbGFtcChwcmVmZXJyZWRMZWZ0LCBtZXRyaWNzLmVkZ2VYLCBtaW5kTWFwTGF5b3V0LnZhbHVlLndpZHRoIC0gd2lkdGggLSBtZXRyaWNzLmVkZ2VYKTtcbiAgY29uc3QgdG9wID0gY2xhbXAobGF5b3V0Tm9kZS55ICsgbGF5b3V0Tm9kZS5oZWlnaHQgLyAyIC0gNDIsIG1ldHJpY3MuZWRnZVksIG1pbmRNYXBMYXlvdXQudmFsdWUuaGVpZ2h0IC0gMTEyKTtcbiAgcmV0dXJuIHtcbiAgICB0aXRsZTogc2VsZWN0ZWROb2RlLnZhbHVlLnRpdGxlLFxuICAgIGRlc2NyaXB0aW9uOiBzZWxlY3RlZE5vZGUudmFsdWUuZGVzY3JpcHRpb24sXG4gICAgc3R5bGU6IHtcbiAgICAgIGxlZnQ6IGAke2xlZnR9cHhgLFxuICAgICAgdG9wOiBgJHt0b3B9cHhgLFxuICAgICAgd2lkdGg6IGAke3dpZHRofXB4YFxuICAgIH0gc2F0aXNmaWVzIENTU1Byb3BlcnRpZXNcbiAgfTtcbn0pO1xuXG53YXRjaChcbiAgKCkgPT4gcHJvcHMuY29udGVudCxcbiAgKCkgPT4ge1xuICAgIHJlc2V0VmlldygpO1xuICAgIG5leHRUaWNrKG1lYXN1cmVCb2FyZCk7XG4gIH1cbik7XG5cbndhdGNoKHNlYXJjaEtleXdvcmQsICh2YWx1ZSkgPT4ge1xuICBjb25zdCBrZXl3b3JkID0gdmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIGlmICgha2V5d29yZCkgcmV0dXJuO1xuICBjb25zdCBmaXJzdE1hdGNoID0gYWxsTm9kZXMudmFsdWUuZmluZCgobm9kZSkgPT4gbWF0Y2hOb2RlKG5vZGUsIGtleXdvcmQpKTtcbiAgaWYgKGZpcnN0TWF0Y2gpIHtcbiAgICByZXZlYWxOb2RlKGZpcnN0TWF0Y2guaWQsIGZhbHNlKTtcbiAgfVxufSk7XG5cbm9uTW91bnRlZCgoKSA9PiB7XG4gIG1lYXN1cmVCb2FyZCgpO1xuICBpZiAodHlwZW9mIFJlc2l6ZU9ic2VydmVyICE9PSBcInVuZGVmaW5lZFwiICYmIGJvYXJkUmVmLnZhbHVlKSB7XG4gICAgcmVzaXplT2JzZXJ2ZXIgPSBuZXcgUmVzaXplT2JzZXJ2ZXIoKCkgPT4gbWVhc3VyZUJvYXJkKCkpO1xuICAgIHJlc2l6ZU9ic2VydmVyLm9ic2VydmUoYm9hcmRSZWYudmFsdWUpO1xuICB9XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIG1lYXN1cmVCb2FyZCk7XG59KTtcblxub25CZWZvcmVVbm1vdW50KCgpID0+IHtcbiAgcmVzaXplT2JzZXJ2ZXI/LmRpc2Nvbm5lY3QoKTtcbiAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgbWVhc3VyZUJvYXJkKTtcbn0pO1xuXG5mdW5jdGlvbiBtZWFzdXJlQm9hcmQoKSB7XG4gIHZpZXdwb3J0V2lkdGgudmFsdWUgPSB3aW5kb3cuaW5uZXJXaWR0aDtcbiAgY29uc3Qgd2lkdGggPSBib2FyZFJlZi52YWx1ZT8uY2xpZW50V2lkdGg7XG4gIGlmICh3aWR0aCAmJiBOdW1iZXIuaXNGaW5pdGUod2lkdGgpKSB7XG4gICAgYm9hcmRXaWR0aC52YWx1ZSA9IE1hdGgubWF4KDMyMCwgTWF0aC5yb3VuZCh3aWR0aCkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU5vZGVDbGljayhub2RlOiBLbm93bGVkZ2VNaW5kTWFwTm9kZSkge1xuICBzZWxlY3RlZElkLnZhbHVlID0gbm9kZS5pZDtcbiAgaWYgKG5vZGUuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgdG9nZ2xlTm9kZShub2RlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZWxlY3ROb2RlKG5vZGU6IEtub3dsZWRnZU1pbmRNYXBOb2RlKSB7XG4gIHNlbGVjdGVkSWQudmFsdWUgPSBub2RlLmlkO1xufVxuXG5mdW5jdGlvbiB0b2dnbGVOb2RlKG5vZGU6IEtub3dsZWRnZU1pbmRNYXBOb2RlKSB7XG4gIGlmICghbm9kZS5jaGlsZHJlbi5sZW5ndGgpIHJldHVybjtcbiAgY29uc3QgbmV4dCA9IG5ldyBTZXQoZXhwYW5kZWRJZHMudmFsdWUpO1xuICBpZiAobmV4dC5oYXMobm9kZS5pZCkpIHtcbiAgICBuZXh0LmRlbGV0ZShub2RlLmlkKTtcbiAgfSBlbHNlIHtcbiAgICBuZXh0LmFkZChub2RlLmlkKTtcbiAgfVxuICBleHBhbmRlZElkcy52YWx1ZSA9IG5leHQ7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZEFsbCgpIHtcbiAgZm9jdXNlZE5vZGVJZC52YWx1ZSA9IG51bGw7XG4gIGV4cGFuZGVkSWRzLnZhbHVlID0gbmV3IFNldChhbGxOb2Rlcy52YWx1ZS5maWx0ZXIoKG5vZGUpID0+IG5vZGUuY2hpbGRyZW4ubGVuZ3RoKS5tYXAoKG5vZGUpID0+IG5vZGUuaWQpKTtcbn1cblxuZnVuY3Rpb24gY29sbGFwc2VBbGwoKSB7XG4gIGZvY3VzZWROb2RlSWQudmFsdWUgPSBudWxsO1xuICBleHBhbmRlZElkcy52YWx1ZSA9IG5ldyBTZXQoKTtcbn1cblxuZnVuY3Rpb24gcmVzZXRWaWV3KCkge1xuICBleHBhbmRlZElkcy52YWx1ZSA9IG5ldyBTZXQoKTtcbiAgc2VsZWN0ZWRJZC52YWx1ZSA9IG51bGw7XG4gIGZvY3VzZWROb2RlSWQudmFsdWUgPSBudWxsO1xuICBzZWFyY2hLZXl3b3JkLnZhbHVlID0gXCJcIjtcbn1cblxuZnVuY3Rpb24gZm9jdXNTZWxlY3RlZCgpIHtcbiAgaWYgKCFzZWxlY3RlZElkLnZhbHVlKSByZXR1cm47XG4gIGZvY3VzZWROb2RlSWQudmFsdWUgPSBzZWxlY3RlZElkLnZhbHVlO1xuICByZXZlYWxOb2RlKHNlbGVjdGVkSWQudmFsdWUsIHRydWUpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3RGaXJzdE1hdGNoKCkge1xuICBjb25zdCBmaXJzdE1hdGNoID0gYWxsTm9kZXMudmFsdWUuZmluZCgobm9kZSkgPT4gbWF0Y2hlZElkcy52YWx1ZS5oYXMobm9kZS5pZCkpO1xuICBpZiAoIWZpcnN0TWF0Y2gpIHJldHVybjtcbiAgc2VsZWN0ZWRJZC52YWx1ZSA9IGZpcnN0TWF0Y2guaWQ7XG4gIHJldmVhbE5vZGUoZmlyc3RNYXRjaC5pZCwgZmFsc2UpO1xufVxuXG5mdW5jdGlvbiBjbGVhckZvY3VzKCkge1xuICBmb2N1c2VkTm9kZUlkLnZhbHVlID0gbnVsbDtcbn1cblxuZnVuY3Rpb24gcmV2ZWFsTm9kZShub2RlSWQ6IHN0cmluZywgaW5jbHVkZVNlbGY6IGJvb2xlYW4pIHtcbiAgY29uc3QgbmV4dCA9IG5ldyBTZXQoZXhwYW5kZWRJZHMudmFsdWUpO1xuICBsZXQgY3VycmVudCA9IHBhcmVudEJ5SWQudmFsdWUuZ2V0KG5vZGVJZCk7XG4gIHdoaWxlIChjdXJyZW50KSB7XG4gICAgbmV4dC5hZGQoY3VycmVudCk7XG4gICAgY3VycmVudCA9IHBhcmVudEJ5SWQudmFsdWUuZ2V0KGN1cnJlbnQpO1xuICB9XG4gIGlmIChpbmNsdWRlU2VsZiAmJiBub2RlQnlJZC52YWx1ZS5nZXQobm9kZUlkKT8uY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgbmV4dC5hZGQobm9kZUlkKTtcbiAgfVxuICBleHBhbmRlZElkcy52YWx1ZSA9IG5leHQ7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1pbmRNYXBMYXlvdXQoKTogTWluZE1hcExheW91dCB7XG4gIGNvbnN0IHdpZHRoID0gTWF0aC5tYXgoMzIwLCBib2FyZFdpZHRoLnZhbHVlIHx8IDExMjApO1xuICBjb25zdCBtZXRyaWNzID0gZ2V0TGF5b3V0TWV0cmljcyh3aWR0aCk7XG4gIGNvbnN0IGNlbnRlcjogTGF5b3V0Qm94ID0ge1xuICAgIGlkOiBDRU5URVJfSUQsXG4gICAgeDogd2lkdGggLyAyIC0gbWV0cmljcy5jZW50ZXJXaWR0aCAvIDIsXG4gICAgeTogbWV0cmljcy5taW5IZWlnaHQgLyAyIC0gbWV0cmljcy5jZW50ZXJIZWlnaHQgLyAyLFxuICAgIHdpZHRoOiBtZXRyaWNzLmNlbnRlcldpZHRoLFxuICAgIGhlaWdodDogbWV0cmljcy5jZW50ZXJIZWlnaHRcbiAgfTtcbiAgaWYgKCFtaW5kTWFwLnZhbHVlKSB7XG4gICAgcmV0dXJuIHsgd2lkdGgsIGhlaWdodDogbWV0cmljcy5taW5IZWlnaHQsIGNlbnRlciwgbm9kZXM6IFtdLCBjb25uZWN0b3JzOiBbXSB9O1xuICB9XG5cbiAgY29uc3QgYnJhbmNoSW5mb3MgPSBtaW5kTWFwLnZhbHVlLmJyYW5jaGVzXG4gICAgLm1hcCgobm9kZSwgaW5kZXgpID0+ICh7IG5vZGUsIHNpZGU6IGdldEJyYW5jaFNpZGUoaW5kZXgpIH0pKVxuICAgIC5maWx0ZXIoKGluZm8pID0+ICFmb2N1c0FsbG93ZWRJZHMudmFsdWUgfHwgZm9jdXNBbGxvd2VkSWRzLnZhbHVlLmhhcyhpbmZvLm5vZGUuaWQpKTtcbiAgY29uc3QgbGVmdEJsb2NrcyA9IGJyYW5jaEluZm9zXG4gICAgLmZpbHRlcigoaW5mbykgPT4gaW5mby5zaWRlID09PSBcImxlZnRcIilcbiAgICAubWFwKChpbmZvKSA9PiBtZWFzdXJlQmxvY2soaW5mby5ub2RlLCAxLCBtZXRyaWNzKSk7XG4gIGNvbnN0IHJpZ2h0QmxvY2tzID0gYnJhbmNoSW5mb3NcbiAgICAuZmlsdGVyKChpbmZvKSA9PiBpbmZvLnNpZGUgPT09IFwicmlnaHRcIilcbiAgICAubWFwKChpbmZvKSA9PiBtZWFzdXJlQmxvY2soaW5mby5ub2RlLCAxLCBtZXRyaWNzKSk7XG4gIGNvbnN0IGxlZnRUb3RhbCA9IGdldEJsb2Nrc0hlaWdodChsZWZ0QmxvY2tzLCBtZXRyaWNzLmJyYW5jaEdhcCk7XG4gIGNvbnN0IHJpZ2h0VG90YWwgPSBnZXRCbG9ja3NIZWlnaHQocmlnaHRCbG9ja3MsIG1ldHJpY3MuYnJhbmNoR2FwKTtcbiAgY29uc3QgaGVpZ2h0ID0gTWF0aC5tYXgobWV0cmljcy5taW5IZWlnaHQsIE1hdGgubWF4KGxlZnRUb3RhbCwgcmlnaHRUb3RhbCkgKyBtZXRyaWNzLmVkZ2VZICogMik7XG4gIGNvbnN0IGNlbnRlcmVkQ2VudGVyID0ge1xuICAgIC4uLmNlbnRlcixcbiAgICB5OiBoZWlnaHQgLyAyIC0gbWV0cmljcy5jZW50ZXJIZWlnaHQgLyAyXG4gIH07XG4gIGNvbnN0IG5vZGVzOiBMYXlvdXROb2RlW10gPSBbXTtcbiAgY29uc3QgY29ubmVjdG9yczogTGF5b3V0Q29ubmVjdG9yW10gPSBbXTtcblxuICBwbGFjZVNpZGVCbG9ja3MoXCJsZWZ0XCIsIGxlZnRCbG9ja3MsIGxlZnRUb3RhbCwgY2VudGVyZWRDZW50ZXIsIHdpZHRoLCBoZWlnaHQsIG1ldHJpY3MsIG5vZGVzLCBjb25uZWN0b3JzKTtcbiAgcGxhY2VTaWRlQmxvY2tzKFwicmlnaHRcIiwgcmlnaHRCbG9ja3MsIHJpZ2h0VG90YWwsIGNlbnRlcmVkQ2VudGVyLCB3aWR0aCwgaGVpZ2h0LCBtZXRyaWNzLCBub2RlcywgY29ubmVjdG9ycyk7XG5cbiAgcmV0dXJuIHsgd2lkdGgsIGhlaWdodCwgY2VudGVyOiBjZW50ZXJlZENlbnRlciwgbm9kZXMsIGNvbm5lY3RvcnMgfTtcbn1cblxuZnVuY3Rpb24gcGxhY2VTaWRlQmxvY2tzKFxuICBzaWRlOiBNaW5kTWFwU2lkZSxcbiAgYmxvY2tzOiBNZWFzdXJlZEJsb2NrW10sXG4gIHRvdGFsSGVpZ2h0OiBudW1iZXIsXG4gIGNlbnRlcjogTGF5b3V0Qm94LFxuICB3aWR0aDogbnVtYmVyLFxuICBoZWlnaHQ6IG51bWJlcixcbiAgbWV0cmljczogTGF5b3V0TWV0cmljcyxcbiAgbm9kZXM6IExheW91dE5vZGVbXSxcbiAgY29ubmVjdG9yczogTGF5b3V0Q29ubmVjdG9yW11cbikge1xuICBsZXQgdG9wID0gaGVpZ2h0IC8gMiAtIHRvdGFsSGVpZ2h0IC8gMjtcbiAgZm9yIChjb25zdCBibG9jayBvZiBibG9ja3MpIHtcbiAgICBwbGFjZUJsb2NrKGJsb2NrLCBzaWRlLCB0b3AsIGNlbnRlciwgd2lkdGgsIG1ldHJpY3MsIG5vZGVzLCBjb25uZWN0b3JzKTtcbiAgICB0b3AgKz0gYmxvY2suaGVpZ2h0ICsgbWV0cmljcy5icmFuY2hHYXA7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGxhY2VCbG9jayhcbiAgYmxvY2s6IE1lYXN1cmVkQmxvY2ssXG4gIHNpZGU6IE1pbmRNYXBTaWRlLFxuICB0b3A6IG51bWJlcixcbiAgcGFyZW50OiBMYXlvdXRCb3gsXG4gIHdpZHRoOiBudW1iZXIsXG4gIG1ldHJpY3M6IExheW91dE1ldHJpY3MsXG4gIG5vZGVzOiBMYXlvdXROb2RlW10sXG4gIGNvbm5lY3RvcnM6IExheW91dENvbm5lY3RvcltdXG4pIHtcbiAgY29uc3Qgc2l6ZSA9IGdldE5vZGVTaXplKGJsb2NrLmxldmVsLCBtZXRyaWNzKTtcbiAgY29uc3QgdmlzaWJsZUNoaWxkcmVuID0gZ2V0VmlzaWJsZUNoaWxkcmVuKGJsb2NrLm5vZGUpO1xuICBjb25zdCBsYXlvdXROb2RlOiBMYXlvdXROb2RlID0ge1xuICAgIGlkOiBibG9jay5ub2RlLmlkLFxuICAgIG5vZGU6IGJsb2NrLm5vZGUsXG4gICAgbGV2ZWw6IGJsb2NrLmxldmVsLFxuICAgIHNpZGUsXG4gICAgeDogZ2V0Tm9kZVgoYmxvY2subGV2ZWwsIHNpZGUsIHNpemUud2lkdGgsIHdpZHRoLCBtZXRyaWNzKSxcbiAgICB5OiB0b3AgKyBibG9jay5oZWlnaHQgLyAyIC0gc2l6ZS5oZWlnaHQgLyAyLFxuICAgIHdpZHRoOiBzaXplLndpZHRoLFxuICAgIGhlaWdodDogc2l6ZS5oZWlnaHQsXG4gICAgaGFzQ2hpbGRyZW46IGJsb2NrLm5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCxcbiAgICBpc0V4cGFuZGVkOiB2aXNpYmxlQ2hpbGRyZW4ubGVuZ3RoID4gMFxuICB9O1xuICBub2Rlcy5wdXNoKGxheW91dE5vZGUpO1xuICBjb25uZWN0b3JzLnB1c2goY3JlYXRlQ29ubmVjdG9yKHBhcmVudCwgbGF5b3V0Tm9kZSwgc2lkZSkpO1xuXG4gIGlmICghYmxvY2suY2hpbGRyZW4ubGVuZ3RoKSByZXR1cm47XG4gIGNvbnN0IGdhcCA9IGdldEdhcEZvckxldmVsKGJsb2NrLmxldmVsICsgMSwgbWV0cmljcyk7XG4gIGNvbnN0IGNoaWxkcmVuVG90YWwgPSBnZXRCbG9ja3NIZWlnaHQoYmxvY2suY2hpbGRyZW4sIGdhcCk7XG4gIGxldCBjaGlsZFRvcCA9IHRvcCArIGJsb2NrLmhlaWdodCAvIDIgLSBjaGlsZHJlblRvdGFsIC8gMjtcbiAgZm9yIChjb25zdCBjaGlsZCBvZiBibG9jay5jaGlsZHJlbikge1xuICAgIHBsYWNlQmxvY2soY2hpbGQsIHNpZGUsIGNoaWxkVG9wLCBsYXlvdXROb2RlLCB3aWR0aCwgbWV0cmljcywgbm9kZXMsIGNvbm5lY3RvcnMpO1xuICAgIGNoaWxkVG9wICs9IGNoaWxkLmhlaWdodCArIGdhcDtcbiAgfVxufVxuXG5mdW5jdGlvbiBtZWFzdXJlQmxvY2sobm9kZTogS25vd2xlZGdlTWluZE1hcE5vZGUsIGxldmVsOiBudW1iZXIsIG1ldHJpY3M6IExheW91dE1ldHJpY3MpOiBNZWFzdXJlZEJsb2NrIHtcbiAgY29uc3QgY2hpbGRyZW4gPSBnZXRWaXNpYmxlQ2hpbGRyZW4obm9kZSkubWFwKChjaGlsZCkgPT4gbWVhc3VyZUJsb2NrKGNoaWxkLCBsZXZlbCArIDEsIG1ldHJpY3MpKTtcbiAgY29uc3Qgb3duU2l6ZSA9IGdldE5vZGVTaXplKGxldmVsLCBtZXRyaWNzKTtcbiAgY29uc3QgZ2FwID0gZ2V0R2FwRm9yTGV2ZWwobGV2ZWwgKyAxLCBtZXRyaWNzKTtcbiAgY29uc3QgY2hpbGRyZW5IZWlnaHQgPSBnZXRCbG9ja3NIZWlnaHQoY2hpbGRyZW4sIGdhcCk7XG4gIHJldHVybiB7XG4gICAgbm9kZSxcbiAgICBsZXZlbCxcbiAgICBoZWlnaHQ6IE1hdGgubWF4KG93blNpemUuaGVpZ2h0LCBjaGlsZHJlbkhlaWdodCksXG4gICAgY2hpbGRyZW5cbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0VmlzaWJsZUNoaWxkcmVuKG5vZGU6IEtub3dsZWRnZU1pbmRNYXBOb2RlKTogS25vd2xlZGdlTWluZE1hcE5vZGVbXSB7XG4gIGNvbnN0IGFsbG93ZWRJZHMgPSBmb2N1c0FsbG93ZWRJZHMudmFsdWU7XG4gIGlmIChhbGxvd2VkSWRzKSB7XG4gICAgcmV0dXJuIG5vZGUuY2hpbGRyZW4uZmlsdGVyKChjaGlsZCkgPT4gYWxsb3dlZElkcy5oYXMoY2hpbGQuaWQpKTtcbiAgfVxuICBpZiAoIWV4cGFuZGVkSWRzLnZhbHVlLmhhcyhub2RlLmlkKSkgcmV0dXJuIFtdO1xuICByZXR1cm4gbm9kZS5jaGlsZHJlbjtcbn1cblxuZnVuY3Rpb24gZ2V0QmxvY2tzSGVpZ2h0KGJsb2NrczogTWVhc3VyZWRCbG9ja1tdLCBnYXA6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICghYmxvY2tzLmxlbmd0aCkgcmV0dXJuIDA7XG4gIHJldHVybiBibG9ja3MucmVkdWNlKChzdW0sIGJsb2NrKSA9PiBzdW0gKyBibG9jay5oZWlnaHQsIDApICsgZ2FwICogKGJsb2Nrcy5sZW5ndGggLSAxKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ29ubmVjdG9yKHBhcmVudDogTGF5b3V0Qm94LCBjaGlsZDogTGF5b3V0Tm9kZSwgc2lkZTogTWluZE1hcFNpZGUpOiBMYXlvdXRDb25uZWN0b3Ige1xuICBjb25zdCBmcm9tWCA9IHNpZGUgPT09IFwicmlnaHRcIiA/IHBhcmVudC54ICsgcGFyZW50LndpZHRoIDogcGFyZW50Lng7XG4gIGNvbnN0IGZyb21ZID0gcGFyZW50LnkgKyBwYXJlbnQuaGVpZ2h0IC8gMjtcbiAgY29uc3QgdG9YID0gc2lkZSA9PT0gXCJyaWdodFwiID8gY2hpbGQueCA6IGNoaWxkLnggKyBjaGlsZC53aWR0aDtcbiAgY29uc3QgdG9ZID0gY2hpbGQueSArIGNoaWxkLmhlaWdodCAvIDI7XG4gIGNvbnN0IGRpc3RhbmNlID0gTWF0aC5hYnModG9YIC0gZnJvbVgpO1xuICBjb25zdCBjdXJ2ZSA9IGNsYW1wKGRpc3RhbmNlICogMC41NSwgMjIsIDg0KTtcbiAgY29uc3QgcGF0aCA9XG4gICAgc2lkZSA9PT0gXCJyaWdodFwiXG4gICAgICA/IGBNICR7ZnJvbVh9ICR7ZnJvbVl9IEMgJHtmcm9tWCArIGN1cnZlfSAke2Zyb21ZfSwgJHt0b1ggLSBjdXJ2ZX0gJHt0b1l9LCAke3RvWH0gJHt0b1l9YFxuICAgICAgOiBgTSAke2Zyb21YfSAke2Zyb21ZfSBDICR7ZnJvbVggLSBjdXJ2ZX0gJHtmcm9tWX0sICR7dG9YICsgY3VydmV9ICR7dG9ZfSwgJHt0b1h9ICR7dG9ZfWA7XG4gIHJldHVybiB7XG4gICAga2V5OiBgJHtwYXJlbnQuaWR9LSR7Y2hpbGQuaWR9YCxcbiAgICBwYXRoLFxuICAgIGxldmVsOiBjaGlsZC5sZXZlbCxcbiAgICBzaWRlXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldEJyYW5jaFNpZGUoaW5kZXg6IG51bWJlcik6IE1pbmRNYXBTaWRlIHtcbiAgcmV0dXJuIGluZGV4ICUgMiA9PT0gMCA/IFwicmlnaHRcIiA6IFwibGVmdFwiO1xufVxuXG5mdW5jdGlvbiBnZXROb2RlU2l6ZShsZXZlbDogbnVtYmVyLCBtZXRyaWNzOiBMYXlvdXRNZXRyaWNzKTogTm9kZVNpemUge1xuICBpZiAobGV2ZWwgPT09IDEpIHJldHVybiB7IHdpZHRoOiBtZXRyaWNzLmJyYW5jaFdpZHRoLCBoZWlnaHQ6IG1ldHJpY3MuYnJhbmNoSGVpZ2h0IH07XG4gIGlmIChsZXZlbCA9PT0gMikgcmV0dXJuIHsgd2lkdGg6IG1ldHJpY3MuY2hpbGRXaWR0aCwgaGVpZ2h0OiBtZXRyaWNzLmNoaWxkSGVpZ2h0IH07XG4gIHJldHVybiB7IHdpZHRoOiBtZXRyaWNzLmxlYWZXaWR0aCwgaGVpZ2h0OiBtZXRyaWNzLmxlYWZIZWlnaHQgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Tm9kZVgobGV2ZWw6IG51bWJlciwgc2lkZTogTWluZE1hcFNpZGUsIG5vZGVXaWR0aDogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBtZXRyaWNzOiBMYXlvdXRNZXRyaWNzKTogbnVtYmVyIHtcbiAgY29uc3QgcmF0aW8gPSBsZXZlbCA9PT0gMSA/IG1ldHJpY3MuYnJhbmNoUmF0aW8gOiBsZXZlbCA9PT0gMiA/IG1ldHJpY3MuY2hpbGRSYXRpbyA6IG1ldHJpY3MubGVhZlJhdGlvO1xuICBjb25zdCBub2RlQ2VudGVyUmF0aW8gPSBzaWRlID09PSBcInJpZ2h0XCIgPyByYXRpbyA6IDEgLSByYXRpbztcbiAgcmV0dXJuIGNsYW1wKHdpZHRoICogbm9kZUNlbnRlclJhdGlvIC0gbm9kZVdpZHRoIC8gMiwgbWV0cmljcy5lZGdlWCwgd2lkdGggLSBtZXRyaWNzLmVkZ2VYIC0gbm9kZVdpZHRoKTtcbn1cblxuZnVuY3Rpb24gZ2V0R2FwRm9yTGV2ZWwobGV2ZWw6IG51bWJlciwgbWV0cmljczogTGF5b3V0TWV0cmljcyk6IG51bWJlciB7XG4gIGlmIChsZXZlbCA8PSAyKSByZXR1cm4gbWV0cmljcy5jaGlsZEdhcDtcbiAgcmV0dXJuIG1ldHJpY3MubGVhZkdhcDtcbn1cblxuZnVuY3Rpb24gZ2V0TGF5b3V0TWV0cmljcyh3aWR0aDogbnVtYmVyKTogTGF5b3V0TWV0cmljcyB7XG4gIGlmICh3aWR0aCA+PSAxMTgwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNlbnRlcldpZHRoOiAyMzAsXG4gICAgICBjZW50ZXJIZWlnaHQ6IDEzMCxcbiAgICAgIGJyYW5jaFdpZHRoOiAxOTgsXG4gICAgICBicmFuY2hIZWlnaHQ6IDY0LFxuICAgICAgY2hpbGRXaWR0aDogMTcyLFxuICAgICAgY2hpbGRIZWlnaHQ6IDU0LFxuICAgICAgbGVhZldpZHRoOiAxNDIsXG4gICAgICBsZWFmSGVpZ2h0OiA0MixcbiAgICAgIGVkZ2VYOiAyNixcbiAgICAgIGVkZ2VZOiAzOCxcbiAgICAgIG1pbkhlaWdodDogNTQwLFxuICAgICAgYnJhbmNoR2FwOiAzMCxcbiAgICAgIGNoaWxkR2FwOiAxNCxcbiAgICAgIGxlYWZHYXA6IDEwLFxuICAgICAgYnJhbmNoUmF0aW86IDAuNjYsXG4gICAgICBjaGlsZFJhdGlvOiAwLjgsXG4gICAgICBsZWFmUmF0aW86IDAuOTIsXG4gICAgICBwb3BvdmVyV2lkdGg6IDI2OFxuICAgIH07XG4gIH1cbiAgaWYgKHdpZHRoID49IDk0MCkge1xuICAgIHJldHVybiB7XG4gICAgICBjZW50ZXJXaWR0aDogMTk2LFxuICAgICAgY2VudGVySGVpZ2h0OiAxMjAsXG4gICAgICBicmFuY2hXaWR0aDogMTY2LFxuICAgICAgYnJhbmNoSGVpZ2h0OiA1OCxcbiAgICAgIGNoaWxkV2lkdGg6IDEzNixcbiAgICAgIGNoaWxkSGVpZ2h0OiA1MCxcbiAgICAgIGxlYWZXaWR0aDogMTEyLFxuICAgICAgbGVhZkhlaWdodDogNDAsXG4gICAgICBlZGdlWDogMTYsXG4gICAgICBlZGdlWTogMzIsXG4gICAgICBtaW5IZWlnaHQ6IDUxMCxcbiAgICAgIGJyYW5jaEdhcDogMjQsXG4gICAgICBjaGlsZEdhcDogMTIsXG4gICAgICBsZWFmR2FwOiA4LFxuICAgICAgYnJhbmNoUmF0aW86IDAuNjgsXG4gICAgICBjaGlsZFJhdGlvOiAwLjgzLFxuICAgICAgbGVhZlJhdGlvOiAwLjk0LFxuICAgICAgcG9wb3ZlcldpZHRoOiAyMzZcbiAgICB9O1xuICB9XG4gIHJldHVybiB7XG4gICAgY2VudGVyV2lkdGg6IDE1OCxcbiAgICBjZW50ZXJIZWlnaHQ6IDExMixcbiAgICBicmFuY2hXaWR0aDogMTI2LFxuICAgIGJyYW5jaEhlaWdodDogNTYsXG4gICAgY2hpbGRXaWR0aDogMTA2LFxuICAgIGNoaWxkSGVpZ2h0OiA0OCxcbiAgICBsZWFmV2lkdGg6IDg4LFxuICAgIGxlYWZIZWlnaHQ6IDM4LFxuICAgIGVkZ2VYOiAxMCxcbiAgICBlZGdlWTogMjgsXG4gICAgbWluSGVpZ2h0OiA1MDAsXG4gICAgYnJhbmNoR2FwOiAyMCxcbiAgICBjaGlsZEdhcDogMTAsXG4gICAgbGVhZkdhcDogOCxcbiAgICBicmFuY2hSYXRpbzogMC42OSxcbiAgICBjaGlsZFJhdGlvOiAwLjg1LFxuICAgIGxlYWZSYXRpbzogMC45NixcbiAgICBwb3BvdmVyV2lkdGg6IDIxMFxuICB9O1xufVxuXG5mdW5jdGlvbiBsYXlvdXRCb3hTdHlsZShib3g6IExheW91dEJveCk6IENTU1Byb3BlcnRpZXMge1xuICByZXR1cm4ge1xuICAgIGxlZnQ6IGAke2JveC54fXB4YCxcbiAgICB0b3A6IGAke2JveC55fXB4YCxcbiAgICB3aWR0aDogYCR7Ym94LndpZHRofXB4YCxcbiAgICBtaW5IZWlnaHQ6IGAke2JveC5oZWlnaHR9cHhgXG4gIH07XG59XG5cbmZ1bmN0aW9uIGxheW91dE5vZGVTdHlsZShub2RlOiBMYXlvdXROb2RlKTogQ1NTUHJvcGVydGllcyB7XG4gIHJldHVybiBsYXlvdXRCb3hTdHlsZShub2RlKTtcbn1cblxuZnVuY3Rpb24gbGF5b3V0Tm9kZUNsYXNzZXMobm9kZTogTGF5b3V0Tm9kZSkge1xuICByZXR1cm4gW1xuICAgIGBsZXZlbC0ke01hdGgubWluKG5vZGUubGV2ZWwsIDMpfWAsXG4gICAgbm9kZS5zaWRlLFxuICAgIHtcbiAgICAgIHNlbGVjdGVkOiBzZWxlY3RlZElkLnZhbHVlID09PSBub2RlLmlkLFxuICAgICAgbWF0Y2hlZDogbWF0Y2hlZElkcy52YWx1ZS5oYXMobm9kZS5pZCksXG4gICAgICBleHBhbmRhYmxlOiBub2RlLmhhc0NoaWxkcmVuLFxuICAgICAgZXhwYW5kZWQ6IG5vZGUuaXNFeHBhbmRlZCxcbiAgICAgIFwiZm9jdXMtcGF0aFwiOiBmb2N1c1BhdGhJZHMudmFsdWUuaGFzKG5vZGUuaWQpXG4gICAgfVxuICBdO1xufVxuXG5mdW5jdGlvbiBnZXROb2RlSWNvbihicmFuY2hUeXBlOiBNaW5kTWFwQnJhbmNoVHlwZSk6IENvbXBvbmVudCB7XG4gIHJldHVybiBpY29uQnlUeXBlW2JyYW5jaFR5cGVdID8/IFRpY2tldHM7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTWluZE1hcChjb250ZW50OiBzdHJpbmcpOiB7IG1hcDogS25vd2xlZGdlTWluZE1hcCB8IG51bGw7IGVycm9yOiBzdHJpbmcgfCBudWxsIH0ge1xuICB0cnkge1xuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UoY29udGVudCkgYXMgdW5rbm93bjtcbiAgICBpZiAoIWlzS25vd2xlZGdlTWluZE1hcChwYXJzZWQpKSB7XG4gICAgICByZXR1cm4geyBtYXA6IG51bGwsIGVycm9yOiBcIuaAnee7tOWvvOWbvuaVsOaNruW8guW4uFwiIH07XG4gICAgfVxuICAgIHJldHVybiB7IG1hcDogcGFyc2VkLCBlcnJvcjogbnVsbCB9O1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4geyBtYXA6IG51bGwsIGVycm9yOiBcIuaAnee7tOWvvOWbvuaVsOaNruW8guW4uFwiIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNLbm93bGVkZ2VNaW5kTWFwKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgS25vd2xlZGdlTWluZE1hcCB7XG4gIGlmICghaXNSZWNvcmQodmFsdWUpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiAoXG4gICAgdHlwZW9mIHZhbHVlLnRpdGxlID09PSBcInN0cmluZ1wiICYmXG4gICAgKHZhbHVlLnNjb3BlID09PSBcImNoYXB0ZXJcIiB8fCB2YWx1ZS5zY29wZSA9PT0gXCJub2RlXCIpICYmXG4gICAgdHlwZW9mIHZhbHVlLmNvdXJzZUlkID09PSBcInN0cmluZ1wiICYmXG4gICAgdHlwZW9mIHZhbHVlLmNlbnRyYWxUb3BpYyA9PT0gXCJzdHJpbmdcIiAmJlxuICAgIHR5cGVvZiB2YWx1ZS5zdW1tYXJ5ID09PSBcInN0cmluZ1wiICYmXG4gICAgQXJyYXkuaXNBcnJheSh2YWx1ZS5icmFuY2hlcykgJiZcbiAgICB2YWx1ZS5icmFuY2hlcy5ldmVyeShpc01pbmRNYXBOb2RlKSAmJlxuICAgIEFycmF5LmlzQXJyYXkodmFsdWUucmVsYXRpb25zKSAmJlxuICAgIHZhbHVlLnJlbGF0aW9ucy5ldmVyeShpc01pbmRNYXBSZWxhdGlvbilcbiAgKTtcbn1cblxuZnVuY3Rpb24gaXNNaW5kTWFwTm9kZSh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIEtub3dsZWRnZU1pbmRNYXBOb2RlIHtcbiAgaWYgKCFpc1JlY29yZCh2YWx1ZSkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIChcbiAgICB0eXBlb2YgdmFsdWUuaWQgPT09IFwic3RyaW5nXCIgJiZcbiAgICB0eXBlb2YgdmFsdWUudGl0bGUgPT09IFwic3RyaW5nXCIgJiZcbiAgICB0eXBlb2YgdmFsdWUuYnJhbmNoVHlwZSA9PT0gXCJzdHJpbmdcIiAmJlxuICAgIEFycmF5LmlzQXJyYXkodmFsdWUuY2hpbGRyZW4pICYmXG4gICAgdmFsdWUuY2hpbGRyZW4uZXZlcnkoaXNNaW5kTWFwTm9kZSlcbiAgKTtcbn1cblxuZnVuY3Rpb24gaXNNaW5kTWFwUmVsYXRpb24odmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBLbm93bGVkZ2VNaW5kTWFwUmVsYXRpb24ge1xuICBpZiAoIWlzUmVjb3JkKHZhbHVlKSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gKFxuICAgIHR5cGVvZiB2YWx1ZS5zb3VyY2VJZCA9PT0gXCJzdHJpbmdcIiAmJlxuICAgIHR5cGVvZiB2YWx1ZS50YXJnZXRJZCA9PT0gXCJzdHJpbmdcIiAmJlxuICAgIHR5cGVvZiB2YWx1ZS5yZWxhdGlvblR5cGUgPT09IFwic3RyaW5nXCIgJiZcbiAgICB0eXBlb2YgdmFsdWUubGFiZWwgPT09IFwic3RyaW5nXCJcbiAgKTtcbn1cblxuZnVuY3Rpb24gaXNSZWNvcmQodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgdmFsdWUgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGZsYXR0ZW5Ob2Rlcyhub2RlczogS25vd2xlZGdlTWluZE1hcE5vZGVbXSk6IEtub3dsZWRnZU1pbmRNYXBOb2RlW10ge1xuICByZXR1cm4gbm9kZXMuZmxhdE1hcCgobm9kZSkgPT4gW25vZGUsIC4uLmZsYXR0ZW5Ob2Rlcyhub2RlLmNoaWxkcmVuKV0pO1xufVxuXG5mdW5jdGlvbiBidWlsZFBhcmVudE1hcChub2RlczogS25vd2xlZGdlTWluZE1hcE5vZGVbXSwgcGFyZW50SWQ/OiBzdHJpbmcpIHtcbiAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgaWYgKHBhcmVudElkKSByZXN1bHQuc2V0KG5vZGUuaWQsIHBhcmVudElkKTtcbiAgICBmb3IgKGNvbnN0IFtjaGlsZElkLCBub2RlSWRdIG9mIGJ1aWxkUGFyZW50TWFwKG5vZGUuY2hpbGRyZW4sIG5vZGUuaWQpKSB7XG4gICAgICByZXN1bHQuc2V0KGNoaWxkSWQsIG5vZGVJZCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGZpbmROb2RlUGF0aChub2RlczogS25vd2xlZGdlTWluZE1hcE5vZGVbXSwgbm9kZUlkOiBzdHJpbmcpOiBLbm93bGVkZ2VNaW5kTWFwTm9kZVtdIHtcbiAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgaWYgKG5vZGUuaWQgPT09IG5vZGVJZCkgcmV0dXJuIFtub2RlXTtcbiAgICBjb25zdCBjaGlsZFBhdGggPSBmaW5kTm9kZVBhdGgobm9kZS5jaGlsZHJlbiwgbm9kZUlkKTtcbiAgICBpZiAoY2hpbGRQYXRoLmxlbmd0aCkgcmV0dXJuIFtub2RlLCAuLi5jaGlsZFBhdGhdO1xuICB9XG4gIHJldHVybiBbXTtcbn1cblxuZnVuY3Rpb24gZmlsdGVyTm9kZXNCeUFsbG93ZWRJZHMoXG4gIG5vZGVzOiBLbm93bGVkZ2VNaW5kTWFwTm9kZVtdLFxuICBhbGxvd2VkSWRzOiBTZXQ8c3RyaW5nPlxuKTogS25vd2xlZGdlTWluZE1hcE5vZGVbXSB7XG4gIHJldHVybiBub2Rlc1xuICAgIC5maWx0ZXIoKG5vZGUpID0+IGFsbG93ZWRJZHMuaGFzKG5vZGUuaWQpKVxuICAgIC5tYXAoKG5vZGUpID0+ICh7XG4gICAgICAuLi5ub2RlLFxuICAgICAgY2hpbGRyZW46IGZpbHRlck5vZGVzQnlBbGxvd2VkSWRzKG5vZGUuY2hpbGRyZW4sIGFsbG93ZWRJZHMpXG4gICAgfSkpO1xufVxuXG5mdW5jdGlvbiBtYXRjaE5vZGUobm9kZTogS25vd2xlZGdlTWluZE1hcE5vZGUsIGtleXdvcmQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gW25vZGUudGl0bGUsIG5vZGUua25vd2xlZGdlUG9pbnQsIG5vZGUuZGVzY3JpcHRpb25dXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5zb21lKCh2YWx1ZSkgPT4gU3RyaW5nKHZhbHVlKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGtleXdvcmQpKTtcbn1cblxuZnVuY3Rpb24gY2xhbXAodmFsdWU6IG51bWJlciwgbWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIE1hdGgubWluKE1hdGgubWF4KHZhbHVlLCBtaW4pLCBtYXgpO1xufVxuPC9zY3JpcHQ+XG5cbjx0ZW1wbGF0ZT5cbiAgPHNlY3Rpb24gY2xhc3M9XCJtaW5kLW1hcC12aWV3ZXJcIj5cbiAgICA8dGVtcGxhdGUgdi1pZj1cIm1pbmRNYXBcIj5cbiAgICAgIDxoZWFkZXIgY2xhc3M9XCJtaW5kLW1hcC1oZWFkZXJcIj5cbiAgICAgICAgPGRpdj5cbiAgICAgICAgICA8cD57eyBtaW5kTWFwLnNjb3BlID09PSBcImNoYXB0ZXJcIiA/IFwi56ug6IqC55+l6K+G54K55a+85Zu+XCIgOiBcIuefpeivhueCueWvvOWbvlwiIH19PC9wPlxuICAgICAgICAgIDxoND57eyBtaW5kTWFwLnRpdGxlIH19PC9oND5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxlbC10YWc+e3sgYWxsTm9kZXMubGVuZ3RoIH19IOS4quiKgueCuTwvZWwtdGFnPlxuICAgICAgPC9oZWFkZXI+XG5cbiAgICAgIDxkaXYgY2xhc3M9XCJtaW5kLW1hcC10b29sYmFyXCIgYXJpYS1sYWJlbD1cIuaAnee7tOWvvOWbvuW3peWFt+agj1wiPlxuICAgICAgICA8ZWwtYnV0dG9uIDppY29uPVwiRXhwYW5kXCIgQGNsaWNrPVwiZXhwYW5kQWxsXCI+5YWo6YOo5bGV5byAPC9lbC1idXR0b24+XG4gICAgICAgIDxlbC1idXR0b24gOmljb249XCJGb2xkXCIgQGNsaWNrPVwiY29sbGFwc2VBbGxcIj7lhajpg6jmlLbotbc8L2VsLWJ1dHRvbj5cbiAgICAgICAgPGVsLWJ1dHRvbiA6aWNvbj1cIlJlZnJlc2hcIiBAY2xpY2s9XCJyZXNldFZpZXdcIj7ph43nva7op4blm748L2VsLWJ1dHRvbj5cbiAgICAgICAgPGVsLWlucHV0XG4gICAgICAgICAgdi1tb2RlbD1cInNlYXJjaEtleXdvcmRcIlxuICAgICAgICAgIGNsZWFyYWJsZVxuICAgICAgICAgIGNsYXNzPVwibWluZC1zZWFyY2hcIlxuICAgICAgICAgIHBsYWNlaG9sZGVyPVwi5pCc57Si55+l6K+G54K5XCJcbiAgICAgICAgICA6cHJlZml4LWljb249XCJTZWFyY2hcIlxuICAgICAgICAgIEBrZXl1cC5lbnRlcj1cInNlbGVjdEZpcnN0TWF0Y2hcIlxuICAgICAgICAgIEBjbGVhcj1cImNsZWFyRm9jdXNcIlxuICAgICAgICAvPlxuICAgICAgICA8ZWwtYnV0dG9uIDppY29uPVwiU2VhcmNoXCIgOmRpc2FibGVkPVwiIXNlYXJjaEtleXdvcmQudHJpbSgpIHx8ICFzZWFyY2hDb3VudFwiIEBjbGljaz1cInNlbGVjdEZpcnN0TWF0Y2hcIj7mkJzntKI8L2VsLWJ1dHRvbj5cbiAgICAgICAgPGVsLWJ1dHRvbiA6aWNvbj1cIkFpbVwiIDpkaXNhYmxlZD1cIiFzZWxlY3RlZE5vZGVcIiBAY2xpY2s9XCJmb2N1c1NlbGVjdGVkXCI+6IGa54Sm5b2T5YmN6IqC54K5PC9lbC1idXR0b24+XG4gICAgICAgIDxlbC1idXR0b24gdi1pZj1cImZvY3VzZWROb2RlSWRcIiBAY2xpY2s9XCJjbGVhckZvY3VzXCI+5Y+W5raI6IGa54SmPC9lbC1idXR0b24+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPHAgdi1pZj1cInNlYXJjaEtleXdvcmQudHJpbSgpXCIgY2xhc3M9XCJzZWFyY2gtc3RhdHVzXCI+XG4gICAgICAgIOW3suWMuemFjSB7eyBzZWFyY2hDb3VudCB9fSDkuKrnn6Xor4bngrlcbiAgICAgIDwvcD5cblxuICAgICAgPGRpdiBjbGFzcz1cIm1pbmQtbWFwLWNhbnZhc1wiPlxuICAgICAgICA8ZGl2XG4gICAgICAgICAgcmVmPVwiYm9hcmRSZWZcIlxuICAgICAgICAgIGNsYXNzPVwibWluZC1tYXAtYm9hcmRcIlxuICAgICAgICAgIDpjbGFzcz1cInsgZm9jdXNlZDogZm9jdXNlZE5vZGVJZCwgbW9iaWxlOiBpc01vYmlsZUxheW91dCB9XCJcbiAgICAgICAgICA6c3R5bGU9XCJib2FyZFN0eWxlXCJcbiAgICAgICAgPlxuICAgICAgICAgIDx0ZW1wbGF0ZSB2LWlmPVwiIWlzTW9iaWxlTGF5b3V0XCI+XG4gICAgICAgICAgICA8c3ZnXG4gICAgICAgICAgICAgIGNsYXNzPVwibWluZC1tYXAtbGlua3NcIlxuICAgICAgICAgICAgICA6dmlld0JveD1cImAwIDAgJHttaW5kTWFwTGF5b3V0LndpZHRofSAke21pbmRNYXBMYXlvdXQuaGVpZ2h0fWBcIlxuICAgICAgICAgICAgICBwcmVzZXJ2ZUFzcGVjdFJhdGlvPVwibm9uZVwiXG4gICAgICAgICAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxwYXRoXG4gICAgICAgICAgICAgICAgdi1mb3I9XCJjb25uZWN0b3IgaW4gbWluZE1hcExheW91dC5jb25uZWN0b3JzXCJcbiAgICAgICAgICAgICAgICA6a2V5PVwiY29ubmVjdG9yLmtleVwiXG4gICAgICAgICAgICAgICAgY2xhc3M9XCJtaW5kLWxpbmtcIlxuICAgICAgICAgICAgICAgIDpjbGFzcz1cIltgbGV2ZWwtJHtNYXRoLm1pbihjb25uZWN0b3IubGV2ZWwsIDMpfWAsIGNvbm5lY3Rvci5zaWRlXVwiXG4gICAgICAgICAgICAgICAgOmQ9XCJjb25uZWN0b3IucGF0aFwiXG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L3N2Zz5cblxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgY2xhc3M9XCJjZW50cmFsLXRvcGljXCJcbiAgICAgICAgICAgICAgOnN0eWxlPVwiY2VudHJhbFRvcGljU3R5bGVcIlxuICAgICAgICAgICAgICBhcmlhLWxhYmVsPVwi6YeN572u5oCd57u05a+85Zu+6KeG5Zu+XCJcbiAgICAgICAgICAgICAgQGNsaWNrPVwicmVzZXRWaWV3XCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPHNwYW4+5Lit5b+D5Li76aKYPC9zcGFuPlxuICAgICAgICAgICAgICA8c3Ryb25nPnt7IG1pbmRNYXAuY2VudHJhbFRvcGljIH19PC9zdHJvbmc+XG4gICAgICAgICAgICAgIDxzbWFsbD57eyBtaW5kTWFwLnN1bW1hcnkgfX08L3NtYWxsPlxuICAgICAgICAgICAgPC9idXR0b24+XG5cbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgdi1mb3I9XCJsYXlvdXROb2RlIGluIG1pbmRNYXBMYXlvdXQubm9kZXNcIlxuICAgICAgICAgICAgICA6a2V5PVwibGF5b3V0Tm9kZS5pZFwiXG4gICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICBjbGFzcz1cIm1pbmQtbGF5b3V0LW5vZGVcIlxuICAgICAgICAgICAgICA6Y2xhc3M9XCJsYXlvdXROb2RlQ2xhc3NlcyhsYXlvdXROb2RlKVwiXG4gICAgICAgICAgICAgIDpzdHlsZT1cImxheW91dE5vZGVTdHlsZShsYXlvdXROb2RlKVwiXG4gICAgICAgICAgICAgIDphcmlhLWV4cGFuZGVkPVwibGF5b3V0Tm9kZS5oYXNDaGlsZHJlbiA/IGxheW91dE5vZGUuaXNFeHBhbmRlZCA6IHVuZGVmaW5lZFwiXG4gICAgICAgICAgICAgIEBjbGljaz1cImhhbmRsZU5vZGVDbGljayhsYXlvdXROb2RlLm5vZGUpXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPGVsLWljb24gY2xhc3M9XCJsYXlvdXQtbm9kZS1pY29uXCI+XG4gICAgICAgICAgICAgICAgPGNvbXBvbmVudCA6aXM9XCJnZXROb2RlSWNvbihsYXlvdXROb2RlLm5vZGUuYnJhbmNoVHlwZSlcIiAvPlxuICAgICAgICAgICAgICA8L2VsLWljb24+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGF5b3V0LW5vZGUtY29weVwiPlxuICAgICAgICAgICAgICAgIDxzdHJvbmc+e3sgbGF5b3V0Tm9kZS5ub2RlLnRpdGxlIH19PC9zdHJvbmc+XG4gICAgICAgICAgICAgICAgPHNtYWxsXG4gICAgICAgICAgICAgICAgICB2LWlmPVwiXG4gICAgICAgICAgICAgICAgICAgIGxheW91dE5vZGUubGV2ZWwgPCAzICYmXG4gICAgICAgICAgICAgICAgICAgIGxheW91dE5vZGUubm9kZS5rbm93bGVkZ2VQb2ludCAmJlxuICAgICAgICAgICAgICAgICAgICBsYXlvdXROb2RlLm5vZGUua25vd2xlZGdlUG9pbnQgIT09IGxheW91dE5vZGUubm9kZS50aXRsZVxuICAgICAgICAgICAgICAgICAgXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICB7eyBsYXlvdXROb2RlLm5vZGUua25vd2xlZGdlUG9pbnQgfX1cbiAgICAgICAgICAgICAgICA8L3NtYWxsPlxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgIDxlbC1pY29uIHYtaWY9XCJsYXlvdXROb2RlLmhhc0NoaWxkcmVuXCIgY2xhc3M9XCJsYXlvdXQtZXhwYW5kLWljb25cIj5cbiAgICAgICAgICAgICAgICA8QXJyb3dSaWdodCAvPlxuICAgICAgICAgICAgICA8L2VsLWljb24+XG4gICAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgICAgPGFzaWRlIHYtaWY9XCJzZWxlY3RlZFBvcG92ZXJcIiBjbGFzcz1cIm1pbmQtbm9kZS1wb3BvdmVyXCIgOnN0eWxlPVwic2VsZWN0ZWRQb3BvdmVyLnN0eWxlXCI+XG4gICAgICAgICAgICAgIDxzcGFuPuiKgueCueivtOaYjjwvc3Bhbj5cbiAgICAgICAgICAgICAgPHN0cm9uZz57eyBzZWxlY3RlZFBvcG92ZXIudGl0bGUgfX08L3N0cm9uZz5cbiAgICAgICAgICAgICAgPHA+e3sgc2VsZWN0ZWRQb3BvdmVyLmRlc2NyaXB0aW9uIH19PC9wPlxuICAgICAgICAgICAgPC9hc2lkZT5cbiAgICAgICAgICA8L3RlbXBsYXRlPlxuXG4gICAgICAgICAgPGRpdiB2LWVsc2UgY2xhc3M9XCJtb2JpbGUtbWluZC10cmVlXCI+XG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cIm1vYmlsZS1jZW50cmFsLXRvcGljXCIgQGNsaWNrPVwicmVzZXRWaWV3XCI+XG4gICAgICAgICAgICAgIDxzcGFuPuS4reW/g+S4u+mimDwvc3Bhbj5cbiAgICAgICAgICAgICAgPHN0cm9uZz57eyBtaW5kTWFwLmNlbnRyYWxUb3BpYyB9fTwvc3Ryb25nPlxuICAgICAgICAgICAgICA8c21hbGw+e3sgbWluZE1hcC5zdW1tYXJ5IH19PC9zbWFsbD5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPHVsIGNsYXNzPVwibW9iaWxlLWJyYW5jaC1saXN0XCI+XG4gICAgICAgICAgICAgIDxNaW5kTWFwTm9kZVxuICAgICAgICAgICAgICAgIHYtZm9yPVwiYnJhbmNoIGluIG1vYmlsZUJyYW5jaGVzXCJcbiAgICAgICAgICAgICAgICA6a2V5PVwiYnJhbmNoLmlkXCJcbiAgICAgICAgICAgICAgICA6bm9kZT1cImJyYW5jaFwiXG4gICAgICAgICAgICAgICAgOmxldmVsPVwiMVwiXG4gICAgICAgICAgICAgICAgc2lkZT1cInJpZ2h0XCJcbiAgICAgICAgICAgICAgICA6ZXhwYW5kZWQtaWRzPVwiZXhwYW5kZWRJZHNcIlxuICAgICAgICAgICAgICAgIDpzZWxlY3RlZC1pZD1cInNlbGVjdGVkSWRcIlxuICAgICAgICAgICAgICAgIDptYXRjaGVkLWlkcz1cIm1hdGNoZWRJZHNcIlxuICAgICAgICAgICAgICAgIEBzZWxlY3Q9XCJzZWxlY3ROb2RlXCJcbiAgICAgICAgICAgICAgICBAdG9nZ2xlPVwidG9nZ2xlTm9kZVwiXG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgPGFzaWRlIHYtaWY9XCJzZWxlY3RlZE5vZGU/LmRlc2NyaXB0aW9uXCIgY2xhc3M9XCJtb2JpbGUtbm9kZS1wb3BvdmVyXCI+XG4gICAgICAgICAgICAgIDxzcGFuPuiKgueCueivtOaYjjwvc3Bhbj5cbiAgICAgICAgICAgICAgPHN0cm9uZz57eyBzZWxlY3RlZE5vZGUudGl0bGUgfX08L3N0cm9uZz5cbiAgICAgICAgICAgICAgPHA+e3sgc2VsZWN0ZWROb2RlLmRlc2NyaXB0aW9uIH19PC9wPlxuICAgICAgICAgICAgPC9hc2lkZT5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGZvb3RlciBjbGFzcz1cIm1pbmQtbWFwLWRldGFpbFwiPlxuICAgICAgICA8ZGl2PlxuICAgICAgICAgIDxzcGFuPnt7IHNlbGVjdGVkTm9kZSA/IFwi5b2T5YmN6IqC54K5XCIgOiBcIuWvvOWbvuaRmOimgVwiIH19PC9zcGFuPlxuICAgICAgICAgIDxoNT57eyBzZWxlY3RlZE5vZGU/LnRpdGxlID8/IG1pbmRNYXAuY2VudHJhbFRvcGljIH19PC9oNT5cbiAgICAgICAgICA8cD57eyBzZWxlY3RlZE5vZGU/LmRlc2NyaXB0aW9uID8/IG1pbmRNYXAuc3VtbWFyeSB9fTwvcD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDx1bCB2LWlmPVwic2VsZWN0ZWRSZWxhdGlvbnMubGVuZ3RoXCIgY2xhc3M9XCJyZWxhdGlvbi1saXN0XCI+XG4gICAgICAgICAgPGxpIHYtZm9yPVwicmVsYXRpb24gaW4gc2VsZWN0ZWRSZWxhdGlvbnNcIiA6a2V5PVwiYCR7cmVsYXRpb24uc291cmNlSWR9LSR7cmVsYXRpb24udGFyZ2V0SWR9LSR7cmVsYXRpb24ubGFiZWx9YFwiPlxuICAgICAgICAgICAge3sgcmVsYXRpb24ubGFiZWwgfX1cbiAgICAgICAgICA8L2xpPlxuICAgICAgICA8L3VsPlxuICAgICAgPC9mb290ZXI+XG4gICAgPC90ZW1wbGF0ZT5cblxuICAgIDxzZWN0aW9uIHYtZWxzZSBjbGFzcz1cIm1pbmQtbWFwLWVycm9yXCI+XG4gICAgICA8ZWwtYWxlcnQgOnRpdGxlPVwicGFyc2VFcnJvciB8fCAn5oCd57u05a+85Zu+5pWw5o2u5byC5bi4J1wiIHR5cGU9XCJ3YXJuaW5nXCIgc2hvdy1pY29uIDpjbG9zYWJsZT1cImZhbHNlXCIgLz5cbiAgICAgIDxkZXRhaWxzIGNsYXNzPVwicmF3LWNvbnRlbnRcIj5cbiAgICAgICAgPHN1bW1hcnk+5p+l55yL5Y6f5aeL5YaF5a65PC9zdW1tYXJ5PlxuICAgICAgICA8cHJlPnt7IGNvbnRlbnQgfX08L3ByZT5cbiAgICAgIDwvZGV0YWlscz5cbiAgICA8L3NlY3Rpb24+XG4gIDwvc2VjdGlvbj5cbjwvdGVtcGxhdGU+XG5cbjxzdHlsZSBzY29wZWQ+XG4ubWluZC1tYXAtdmlld2VyIHtcbiAgZGlzcGxheTogZ3JpZDtcbiAgZ2FwOiAxNHB4O1xuICB3aWR0aDogMTAwJTtcbn1cblxuLm1pbmQtbWFwLWhlYWRlciB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGFsaWduLWl0ZW1zOiBmbGV4LXN0YXJ0O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gIGdhcDogMTJweDtcbn1cblxuLm1pbmQtbWFwLWhlYWRlciBwLFxuLm1pbmQtbWFwLWhlYWRlciBoNCxcbi5taW5kLW1hcC1kZXRhaWwgaDUsXG4ubWluZC1tYXAtZGV0YWlsIHAsXG4uc2VhcmNoLXN0YXR1cyxcbi5taW5kLW5vZGUtcG9wb3ZlciBwLFxuLm1vYmlsZS1ub2RlLXBvcG92ZXIgcCB7XG4gIG1hcmdpbjogMDtcbn1cblxuLm1pbmQtbWFwLWhlYWRlciBwLFxuLm1pbmQtbWFwLWRldGFpbCBzcGFuLFxuLnNlYXJjaC1zdGF0dXMsXG4ubWluZC1ub2RlLXBvcG92ZXIgc3Bhbixcbi5tb2JpbGUtbm9kZS1wb3BvdmVyIHNwYW4ge1xuICBjb2xvcjogdmFyKC0tbmwtdGV4dC1zdWJ0bGUpO1xuICBmb250LXNpemU6IDEzcHg7XG59XG5cbi5taW5kLW1hcC1oZWFkZXIgaDQge1xuICBtYXJnaW4tdG9wOiAycHg7XG4gIGNvbG9yOiB2YXIoLS1ubC10ZXh0KTtcbiAgZm9udC1zaXplOiAxOHB4O1xuICBsZXR0ZXItc3BhY2luZzogMDtcbn1cblxuLm1pbmQtbWFwLXRvb2xiYXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LXdyYXA6IHdyYXA7XG4gIGdhcDogOHB4O1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xufVxuXG4ubWluZC1zZWFyY2gge1xuICB3aWR0aDogbWluKDI4MHB4LCAxMDAlKTtcbn1cblxuLm1pbmQtbWFwLWNhbnZhcyB7XG4gIHdpZHRoOiAxMDAlO1xuICBtYXgtd2lkdGg6IDEwMCU7XG4gIG92ZXJmbG93OiBoaWRkZW47XG4gIHBhZGRpbmc6IDRweCAwO1xufVxuXG4ubWluZC1tYXAtYm9hcmQge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIHdpZHRoOiAxMDAlO1xuICBtaW4td2lkdGg6IDA7XG4gIG92ZXJmbG93OiBoaWRkZW47XG4gIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW5sLWJvcmRlcik7XG4gIGJvcmRlci1yYWRpdXM6IHZhcigtLW5sLXJhZGl1cy1tZCk7XG4gIGJhY2tncm91bmQ6XG4gICAgbGluZWFyLWdyYWRpZW50KDkwZGVnLCByZ2JhKDIyMywgMjI4LCAyMTgsIDAuMzgpIDFweCwgdHJhbnNwYXJlbnQgMXB4KSxcbiAgICBsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCByZ2JhKDIyMywgMjI4LCAyMTgsIDAuMzgpIDFweCwgdHJhbnNwYXJlbnQgMXB4KSxcbiAgICAjZmJmY2Y4O1xuICBiYWNrZ3JvdW5kLXNpemU6IDM2cHggMzZweDtcbn1cblxuLm1pbmQtbWFwLWJvYXJkLmZvY3VzZWQge1xuICBib3JkZXItY29sb3I6IHJnYmEoMTg1LCAxMjAsIDI0LCAwLjQ0KTtcbn1cblxuLm1pbmQtbWFwLWxpbmtzIHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICBpbnNldDogMDtcbiAgei1pbmRleDogMTtcbiAgd2lkdGg6IDEwMCU7XG4gIGhlaWdodDogMTAwJTtcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG59XG5cbi5taW5kLWxpbmsge1xuICBmaWxsOiBub25lO1xuICBzdHJva2U6ICNkOGM4OTI7XG4gIHN0cm9rZS1saW5lY2FwOiByb3VuZDtcbiAgc3Ryb2tlLWxpbmVqb2luOiByb3VuZDtcbiAgc3Ryb2tlLXdpZHRoOiAxLjg7XG59XG5cbi5taW5kLWxpbmsubGV2ZWwtMSB7XG4gIHN0cm9rZTogI2Q5YTIyOTtcbiAgc3Ryb2tlLXdpZHRoOiAyLjY7XG59XG5cbi5taW5kLWxpbmsubGV2ZWwtMiB7XG4gIHN0cm9rZTogIzk4Yjc3YTtcbiAgc3Ryb2tlLXdpZHRoOiAyO1xufVxuXG4uY2VudHJhbC10b3BpYyxcbi5taW5kLWxheW91dC1ub2RlLFxuLm1vYmlsZS1jZW50cmFsLXRvcGljIHtcbiAgYm9yZGVyOiAwO1xuICBmb250LWZhbWlseTogaW5oZXJpdDtcbiAgbGV0dGVyLXNwYWNpbmc6IDA7XG4gIGN1cnNvcjogcG9pbnRlcjtcbn1cblxuLmNlbnRyYWwtdG9waWMge1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIHotaW5kZXg6IDM7XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIHBsYWNlLWl0ZW1zOiBjZW50ZXI7XG4gIGdhcDogNnB4O1xuICBwYWRkaW5nOiAxOHB4O1xuICBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDI1LCAzMSwgMzUsIDAuMTgpO1xuICBib3JkZXItcmFkaXVzOiAxOHB4O1xuICBiYWNrZ3JvdW5kOiB2YXIoLS1ubC1kZWVwKTtcbiAgY29sb3I6ICNmZmZmZmY7XG4gIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgYm94LXNoYWRvdzogMCAxOHB4IDM2cHggcmdiYSgyOSwgMjcsIDQzLCAwLjIpO1xufVxuXG4uY2VudHJhbC10b3BpYzpob3ZlciB7XG4gIGJveC1zaGFkb3c6IDAgMjBweCA0MHB4IHJnYmEoMjksIDI3LCA0MywgMC4yNCk7XG59XG5cbi5jZW50cmFsLXRvcGljOmZvY3VzLXZpc2libGUsXG4ubWluZC1sYXlvdXQtbm9kZTpmb2N1cy12aXNpYmxlLFxuLm1vYmlsZS1jZW50cmFsLXRvcGljOmZvY3VzLXZpc2libGUge1xuICBvdXRsaW5lOiBub25lO1xuICBib3gtc2hhZG93OiB2YXIoLS1ubC1mb2N1cy1yaW5nKSwgMCAxNnB4IDM0cHggcmdiYSgzMiwgMjcsIDYxLCAwLjE2KTtcbn1cblxuLmNlbnRyYWwtdG9waWMgc3Bhbixcbi5jZW50cmFsLXRvcGljIHNtYWxsLFxuLm1vYmlsZS1jZW50cmFsLXRvcGljIHNwYW4sXG4ubW9iaWxlLWNlbnRyYWwtdG9waWMgc21hbGwge1xuICBjb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjc0KTtcbiAgZm9udC1zaXplOiAxMnB4O1xufVxuXG4uY2VudHJhbC10b3BpYyBzdHJvbmcsXG4ubW9iaWxlLWNlbnRyYWwtdG9waWMgc3Ryb25nIHtcbiAgb3ZlcmZsb3ctd3JhcDogYW55d2hlcmU7XG4gIGZvbnQtc2l6ZTogMjJweDtcbiAgbGluZS1oZWlnaHQ6IDEuMjtcbn1cblxuLmNlbnRyYWwtdG9waWMgc21hbGwsXG4ubW9iaWxlLWNlbnRyYWwtdG9waWMgc21hbGwge1xuICBsaW5lLWhlaWdodDogMS40NTtcbn1cblxuLm1pbmQtbGF5b3V0LW5vZGUge1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIHotaW5kZXg6IDQ7XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIGdyaWQtdGVtcGxhdGUtY29sdW1uczogMjRweCBtaW5tYXgoMCwgMWZyKSAxNXB4O1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBnYXA6IDhweDtcbiAgcGFkZGluZzogOHB4IDEwcHg7XG4gIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW5sLWJvcmRlcik7XG4gIGJvcmRlci1yYWRpdXM6IDE0cHg7XG4gIGJhY2tncm91bmQ6IHZhcigtLW5sLXN1cmZhY2UpO1xuICBjb2xvcjogdmFyKC0tbmwtdGV4dCk7XG4gIHRleHQtYWxpZ246IGxlZnQ7XG4gIGJveC1zaGFkb3c6IDAgMTBweCAyMnB4IHJnYmEoMzUsIDM5LCAzOCwgMC4wNyk7XG4gIHRyYW5zaXRpb246XG4gICAgYm9yZGVyLWNvbG9yIHZhcigtLW5sLXRyYW5zaXRpb24tZmFzdCksXG4gICAgYm94LXNoYWRvdyB2YXIoLS1ubC10cmFuc2l0aW9uLWZhc3QpLFxuICAgIGJhY2tncm91bmQgdmFyKC0tbmwtdHJhbnNpdGlvbi1mYXN0KSxcbiAgICB0cmFuc2Zvcm0gdmFyKC0tbmwtdHJhbnNpdGlvbi1mYXN0KTtcbn1cblxuLm1pbmQtbGF5b3V0LW5vZGUubGVmdCB7XG4gIGdyaWQtdGVtcGxhdGUtY29sdW1uczogMTVweCBtaW5tYXgoMCwgMWZyKSAyNHB4O1xuICB0ZXh0LWFsaWduOiByaWdodDtcbn1cblxuLm1pbmQtbGF5b3V0LW5vZGU6aG92ZXIge1xuICBib3JkZXItY29sb3I6IHZhcigtLW5sLXByaW1hcnktaG92ZXIpO1xuICBib3gtc2hhZG93OiAwIDEycHggMjRweCByZ2JhKDM1LCAzOSwgMzgsIDAuMSk7XG59XG5cbi5taW5kLWxheW91dC1ub2RlLmxldmVsLTEge1xuICBib3JkZXItY29sb3I6IHJnYmEoMjE0LCAxNTgsIDQyLCAwLjUyKTtcbiAgYmFja2dyb3VuZDogI2ZmZjZkODtcbiAgYm94LXNoYWRvdzogMCAxNHB4IDI4cHggcmdiYSgxODUsIDEyMCwgMjQsIDAuMTQpO1xufVxuXG4ubWluZC1sYXlvdXQtbm9kZS5sZXZlbC0yIHtcbiAgYmFja2dyb3VuZDogI2ZmZmZmZjtcbn1cblxuLm1pbmQtbGF5b3V0LW5vZGUubGV2ZWwtMyB7XG4gIGdhcDogNnB4O1xuICBwYWRkaW5nOiA3cHggOXB4O1xuICBib3JkZXItcmFkaXVzOiA5OTlweDtcbiAgYmFja2dyb3VuZDogI2Y0ZjhlZTtcbiAgYm94LXNoYWRvdzogMCA4cHggMTZweCByZ2JhKDM1LCAzOSwgMzgsIDAuMDYpO1xufVxuXG4ubWluZC1sYXlvdXQtbm9kZS5zZWxlY3RlZCB7XG4gIGJvcmRlci1jb2xvcjogdmFyKC0tbmwtcHJpbWFyeS1ob3Zlcik7XG4gIGJveC1zaGFkb3c6IDAgMCAwIDNweCByZ2JhKDI0MywgMTk5LCA3NywgMC4yOCksIDAgMTJweCAyNnB4IHJnYmEoMzUsIDM5LCAzOCwgMC4xKTtcbn1cblxuLm1pbmQtbGF5b3V0LW5vZGUubWF0Y2hlZCB7XG4gIGJvcmRlci1jb2xvcjogdmFyKC0tbmwtaW5mbyk7XG4gIGJhY2tncm91bmQ6ICNlZWY3ZmY7XG59XG5cbi5taW5kLWxheW91dC1ub2RlLmZvY3VzLXBhdGg6bm90KC5zZWxlY3RlZCkge1xuICBib3JkZXItY29sb3I6IHJnYmEoOTEsIDEzMiwgNjgsIDAuNDIpO1xufVxuXG4ubGF5b3V0LW5vZGUtaWNvbiB7XG4gIGRpc3BsYXk6IGlubGluZS1mbGV4O1xuICB3aWR0aDogMjRweDtcbiAgaGVpZ2h0OiAyNHB4O1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgYm9yZGVyLXJhZGl1czogOXB4O1xuICBiYWNrZ3JvdW5kOiB2YXIoLS1ubC1taW50KTtcbiAgY29sb3I6IHZhcigtLW5sLWRlZXApO1xufVxuXG4ubWluZC1sYXlvdXQtbm9kZS5sZWZ0IC5sYXlvdXQtbm9kZS1pY29uIHtcbiAgb3JkZXI6IDM7XG59XG5cbi5taW5kLWxheW91dC1ub2RlLmxlZnQgLmxheW91dC1ub2RlLWNvcHkge1xuICBvcmRlcjogMjtcbn1cblxuLm1pbmQtbGF5b3V0LW5vZGUubGVmdCAubGF5b3V0LWV4cGFuZC1pY29uIHtcbiAgb3JkZXI6IDE7XG59XG5cbi5sYXlvdXQtbm9kZS1jb3B5IHtcbiAgZGlzcGxheTogZ3JpZDtcbiAgbWluLXdpZHRoOiAwO1xuICBnYXA6IDJweDtcbn1cblxuLmxheW91dC1ub2RlLWNvcHkgc3Ryb25nLFxuLmxheW91dC1ub2RlLWNvcHkgc21hbGwge1xuICBvdmVyZmxvdy13cmFwOiBhbnl3aGVyZTtcbiAgbGV0dGVyLXNwYWNpbmc6IDA7XG59XG5cbi5sYXlvdXQtbm9kZS1jb3B5IHN0cm9uZyB7XG4gIGZvbnQtc2l6ZTogMTNweDtcbiAgbGluZS1oZWlnaHQ6IDEuMjU7XG59XG5cbi5sZXZlbC0xIC5sYXlvdXQtbm9kZS1jb3B5IHN0cm9uZyB7XG4gIGZvbnQtc2l6ZTogMTRweDtcbiAgZm9udC13ZWlnaHQ6IDgwMDtcbn1cblxuLmxldmVsLTMgLmxheW91dC1ub2RlLWNvcHkgc3Ryb25nIHtcbiAgZm9udC1zaXplOiAxMnB4O1xufVxuXG4ubGF5b3V0LW5vZGUtY29weSBzbWFsbCB7XG4gIGNvbG9yOiB2YXIoLS1ubC10ZXh0LXN1YnRsZSk7XG4gIGZvbnQtc2l6ZTogMTFweDtcbn1cblxuLmxheW91dC1leHBhbmQtaWNvbiB7XG4gIGNvbG9yOiB2YXIoLS1ubC10ZXh0LXN1YnRsZSk7XG4gIHRyYW5zaXRpb246IHRyYW5zZm9ybSB2YXIoLS1ubC10cmFuc2l0aW9uLWZhc3QpO1xufVxuXG4ubWluZC1sYXlvdXQtbm9kZS5sZWZ0IC5sYXlvdXQtZXhwYW5kLWljb24ge1xuICB0cmFuc2Zvcm06IHJvdGF0ZSgxODBkZWcpO1xufVxuXG4ubWluZC1sYXlvdXQtbm9kZS5yaWdodC5leHBhbmRlZCAubGF5b3V0LWV4cGFuZC1pY29uIHtcbiAgdHJhbnNmb3JtOiByb3RhdGUoOTBkZWcpO1xufVxuXG4ubWluZC1sYXlvdXQtbm9kZS5sZWZ0LmV4cGFuZGVkIC5sYXlvdXQtZXhwYW5kLWljb24ge1xuICB0cmFuc2Zvcm06IHJvdGF0ZSg5MGRlZyk7XG59XG5cbi5taW5kLW5vZGUtcG9wb3ZlciB7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgei1pbmRleDogNjtcbiAgZGlzcGxheTogZ3JpZDtcbiAgZ2FwOiA1cHg7XG4gIHBhZGRpbmc6IDEwcHggMTJweDtcbiAgYm9yZGVyOiAxcHggc29saWQgcmdiYSgxODUsIDEyMCwgMjQsIDAuMyk7XG4gIGJvcmRlci1sZWZ0OiAzcHggc29saWQgdmFyKC0tbmwtcHJpbWFyeS1ob3Zlcik7XG4gIGJvcmRlci1yYWRpdXM6IDEycHg7XG4gIGJhY2tncm91bmQ6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC45Nik7XG4gIGJveC1zaGFkb3c6IDAgMTZweCAzNHB4IHJnYmEoMzUsIDM5LCAzOCwgMC4xNCk7XG59XG5cbi5taW5kLW5vZGUtcG9wb3ZlciBzdHJvbmcsXG4ubW9iaWxlLW5vZGUtcG9wb3ZlciBzdHJvbmcge1xuICBjb2xvcjogdmFyKC0tbmwtdGV4dCk7XG4gIGZvbnQtc2l6ZTogMTNweDtcbiAgbGluZS1oZWlnaHQ6IDEuMzU7XG59XG5cbi5taW5kLW5vZGUtcG9wb3ZlciBwLFxuLm1vYmlsZS1ub2RlLXBvcG92ZXIgcCB7XG4gIGNvbG9yOiB2YXIoLS1ubC10ZXh0LW11dGVkKTtcbiAgZm9udC1zaXplOiAxMnB4O1xuICBsaW5lLWhlaWdodDogMS41NTtcbn1cblxuLm1vYmlsZS1taW5kLXRyZWUge1xuICBkaXNwbGF5OiBncmlkO1xuICBnYXA6IDEycHg7XG4gIHBhZGRpbmc6IDEycHg7XG59XG5cbi5tb2JpbGUtY2VudHJhbC10b3BpYyB7XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIGdhcDogNnB4O1xuICBwYWRkaW5nOiAxNnB4O1xuICBib3JkZXItcmFkaXVzOiAxNnB4O1xuICBiYWNrZ3JvdW5kOiB2YXIoLS1ubC1kZWVwKTtcbiAgY29sb3I6ICNmZmZmZmY7XG4gIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgYm94LXNoYWRvdzogMCAxNHB4IDI4cHggcmdiYSgyOSwgMjcsIDQzLCAwLjE4KTtcbn1cblxuLm1vYmlsZS1icmFuY2gtbGlzdCB7XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIGdhcDogMTBweDtcbiAgbWluLXdpZHRoOiAwO1xuICBtYXJnaW46IDA7XG4gIHBhZGRpbmc6IDA7XG59XG5cbi5tb2JpbGUtbm9kZS1wb3BvdmVyIHtcbiAgZGlzcGxheTogZ3JpZDtcbiAgZ2FwOiA1cHg7XG4gIHBhZGRpbmc6IDExcHggMTJweDtcbiAgYm9yZGVyOiAxcHggc29saWQgcmdiYSgxODUsIDEyMCwgMjQsIDAuMyk7XG4gIGJvcmRlci1sZWZ0OiAzcHggc29saWQgdmFyKC0tbmwtcHJpbWFyeS1ob3Zlcik7XG4gIGJvcmRlci1yYWRpdXM6IDEycHg7XG4gIGJhY2tncm91bmQ6IHZhcigtLW5sLXN1cmZhY2UpO1xufVxuXG4ubWluZC1tYXAtZGV0YWlsIHtcbiAgZGlzcGxheTogZ3JpZDtcbiAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiBtaW5tYXgoMCwgMWZyKSBtaW5tYXgoMTgwcHgsIDAuMzVmcik7XG4gIGdhcDogMTRweDtcbiAgcGFkZGluZzogMTRweDtcbiAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tbmwtYm9yZGVyKTtcbiAgYm9yZGVyLXJhZGl1czogdmFyKC0tbmwtcmFkaXVzLW1kKTtcbiAgYmFja2dyb3VuZDogdmFyKC0tbmwtc3VyZmFjZSk7XG59XG5cbi5taW5kLW1hcC1kZXRhaWwgaDUge1xuICBtYXJnaW4tdG9wOiAzcHg7XG4gIGZvbnQtc2l6ZTogMTZweDtcbiAgbGV0dGVyLXNwYWNpbmc6IDA7XG59XG5cbi5taW5kLW1hcC1kZXRhaWwgcCB7XG4gIG1hcmdpbi10b3A6IDdweDtcbiAgY29sb3I6IHZhcigtLW5sLXRleHQtbXV0ZWQpO1xuICBsaW5lLWhlaWdodDogMS43O1xufVxuXG4ucmVsYXRpb24tbGlzdCB7XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIGFsaWduLWNvbnRlbnQ6IHN0YXJ0O1xuICBnYXA6IDZweDtcbiAgbWFyZ2luOiAwO1xuICBwYWRkaW5nOiAwO1xuICBsaXN0LXN0eWxlOiBub25lO1xufVxuXG4ucmVsYXRpb24tbGlzdCBsaSB7XG4gIHBhZGRpbmc6IDdweCA5cHg7XG4gIGJvcmRlci1yYWRpdXM6IDEwcHg7XG4gIGJhY2tncm91bmQ6IHZhcigtLW5sLW1pbnQpO1xuICBjb2xvcjogdmFyKC0tbmwtZGVlcCk7XG4gIGZvbnQtc2l6ZTogMTJweDtcbn1cblxuLm1pbmQtbWFwLWVycm9yIHtcbiAgZGlzcGxheTogZ3JpZDtcbiAgZ2FwOiAxMnB4O1xufVxuXG4ucmF3LWNvbnRlbnQge1xuICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ubC1ib3JkZXIpO1xuICBib3JkZXItcmFkaXVzOiB2YXIoLS1ubC1yYWRpdXMtbWQpO1xuICBiYWNrZ3JvdW5kOiB2YXIoLS1ubC1zdXJmYWNlKTtcbn1cblxuLnJhdy1jb250ZW50IHN1bW1hcnkge1xuICBwYWRkaW5nOiAxMnB4IDE0cHg7XG4gIGN1cnNvcjogcG9pbnRlcjtcbiAgY29sb3I6IHZhcigtLW5sLXRleHQpO1xufVxuXG4ucmF3LWNvbnRlbnQgcHJlIHtcbiAgbWF4LWhlaWdodDogMzYwcHg7XG4gIG1hcmdpbjogMDtcbiAgb3ZlcmZsb3c6IGF1dG87XG4gIHBhZGRpbmc6IDE0cHg7XG4gIGJvcmRlci10b3A6IDFweCBzb2xpZCB2YXIoLS1ubC1ib3JkZXIpO1xuICBjb2xvcjogdmFyKC0tbmwtY29kZS10ZXh0KTtcbiAgYmFja2dyb3VuZDogdmFyKC0tbmwtY29kZS1iZyk7XG4gIHdoaXRlLXNwYWNlOiBwcmUtd3JhcDtcbiAgb3ZlcmZsb3ctd3JhcDogYW55d2hlcmU7XG59XG5cbkBtZWRpYSAocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjogcmVkdWNlKSB7XG4gIC5taW5kLWxheW91dC1ub2RlLFxuICAubGF5b3V0LWV4cGFuZC1pY29uIHtcbiAgICB0cmFuc2l0aW9uOiBub25lO1xuICB9XG59XG5cbkBtZWRpYSAobWF4LXdpZHRoOiA5MDBweCkge1xuICAubGF5b3V0LW5vZGUtaWNvbiB7XG4gICAgd2lkdGg6IDIwcHg7XG4gICAgaGVpZ2h0OiAyMHB4O1xuICAgIGJvcmRlci1yYWRpdXM6IDhweDtcbiAgfVxuXG4gIC5taW5kLWxheW91dC1ub2RlIHtcbiAgICBnYXA6IDZweDtcbiAgICBwYWRkaW5nOiA3cHggOHB4O1xuICB9XG5cbiAgLmxheW91dC1ub2RlLWNvcHkgc3Ryb25nIHtcbiAgICBmb250LXNpemU6IDEycHg7XG4gIH1cbn1cblxuQG1lZGlhIChtYXgtd2lkdGg6IDc2N3B4KSB7XG4gIC5taW5kLW1hcC1ib2FyZCB7XG4gICAgYmFja2dyb3VuZDogI2ZiZmNmODtcbiAgfVxuXG4gIC5taW5kLW1hcC1kZXRhaWwge1xuICAgIGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyO1xuICB9XG59XG5cbkBtZWRpYSAobWF4LXdpZHRoOiA1NjBweCkge1xuICAubWluZC1tYXAtaGVhZGVyIHtcbiAgICBkaXNwbGF5OiBncmlkO1xuICB9XG5cbiAgLm1pbmQtbWFwLXRvb2xiYXIgOmRlZXAoLmVsLWJ1dHRvbikge1xuICAgIGZsZXg6IDEgMSAxNDBweDtcbiAgfVxuXG4gIC5taW5kLXNlYXJjaCB7XG4gICAgd2lkdGg6IDEwMCU7XG4gIH1cbn1cbjwvc3R5bGU+XG4iXSwiZmlsZSI6IkQ6L2ZpcnN0bW9uZXkvbm9kZWxlYXJuLWFpL2Zyb250ZW5kL3NyYy9jb21wb25lbnRzL21pbmQtbWFwL01pbmRNYXBWaWV3ZXIudnVlIn0=