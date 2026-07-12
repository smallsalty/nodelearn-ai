<script setup lang="ts">
import { computed } from "vue";
import { ArrowRight, Connection, Cpu, Grid, Operation, Share, Tickets } from "@element-plus/icons-vue";
import type { KnowledgeMindMapNode, MindMapBranchType } from "./types";

defineOptions({ name: "MindMapNode" });

const props = defineProps<{
  node: KnowledgeMindMapNode;
  level: number;
  side: "left" | "right";
  expandedIds: Set<string>;
  selectedId?: string | null;
  matchedIds: Set<string>;
}>();

const emit = defineEmits<{
  select: [node: KnowledgeMindMapNode];
  toggle: [node: KnowledgeMindMapNode];
}>();

const hasChildren = computed(() => props.node.children.length > 0);
const isExpanded = computed(() => props.expandedIds.has(props.node.id));
const iconByType: Record<MindMapBranchType, unknown> = {
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

function handleClick() {
  emit("select", props.node);
  if (hasChildren.value) {
    emit("toggle", props.node);
  }
}
</script>

<template>
  <li class="mind-node-item" :class="[`level-${level}`, side]">
    <button
      type="button"
      class="mind-node"
      :class="{
        selected: selectedId === node.id,
        matched: matchedIds.has(node.id),
        expandable: hasChildren,
        expanded: isExpanded
      }"
      :aria-expanded="hasChildren ? isExpanded : undefined"
      @click="handleClick"
    >
      <el-icon class="node-icon">
        <component :is="iconByType[node.branchType]" />
      </el-icon>
      <span class="node-copy">
        <strong>{{ node.title }}</strong>
        <small v-if="node.knowledgePoint && node.knowledgePoint !== node.title">{{ node.knowledgePoint }}</small>
      </span>
      <el-icon v-if="hasChildren" class="expand-icon">
        <ArrowRight />
      </el-icon>
    </button>

    <ul v-if="hasChildren && isExpanded" class="mind-node-children">
      <MindMapNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :level="level + 1"
        :side="side"
        :expanded-ids="expandedIds"
        :selected-id="selectedId"
        :matched-ids="matchedIds"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
      />
    </ul>
  </li>
</template>

<style scoped>
.mind-node-item {
  position: relative;
  display: grid;
  gap: 8px;
  list-style: none;
}

.mind-node {
  position: relative;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 46px;
  padding: 9px 10px;
  border: 1px solid var(--nl-border);
  border-radius: 12px;
  background: var(--nl-surface);
  color: var(--nl-text);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--nl-transition-fast), box-shadow var(--nl-transition-fast), background var(--nl-transition-fast), transform var(--nl-transition-fast);
}

.mind-node:hover {
  border-color: var(--nl-primary-hover);
  box-shadow: 0 8px 18px rgba(29, 27, 43, 0.08);
}

.mind-node:focus-visible {
  outline: none;
  box-shadow: var(--nl-focus-ring);
}

.mind-node.selected {
  border-color: var(--nl-primary-hover);
  background: var(--nl-primary-tint);
  box-shadow: 0 10px 22px rgba(185, 120, 24, 0.14);
}

.mind-node.matched {
  border-color: var(--nl-info);
}

.node-icon {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--nl-mint);
  color: var(--nl-deep);
}

.node-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.node-copy strong,
.node-copy small {
  overflow-wrap: anywhere;
  letter-spacing: 0;
}

.node-copy strong {
  font-size: 13px;
  line-height: 1.3;
}

.node-copy small {
  color: var(--nl-text-subtle);
  font-size: 12px;
}

.expand-icon {
  color: var(--nl-text-subtle);
  transition: transform var(--nl-transition-fast);
}

.mind-node.expanded .expand-icon {
  transform: rotate(90deg);
}

.mind-node-children {
  position: relative;
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0 0 0 18px;
}

.left .mind-node-children {
  padding: 0 18px 0 0;
}

.mind-node-children::before {
  position: absolute;
  top: 0;
  bottom: 22px;
  left: 7px;
  width: 1px;
  background: var(--nl-border-strong);
  content: "";
}

.left > .mind-node-children::before {
  right: 7px;
  left: auto;
}

.level-2 .mind-node {
  background: var(--nl-surface-muted);
}

@media (max-width: 760px) {
  .left .mind-node-children,
  .mind-node-children {
    padding: 0 0 0 14px;
  }

  .left > .mind-node-children::before {
    right: auto;
    left: 6px;
  }
}
</style>
