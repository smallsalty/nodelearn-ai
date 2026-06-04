<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

const props = defineProps<{
  content: string;
}>();

const container = ref<HTMLElement | null>(null);
const renderError = ref("");
let renderCount = 0;

watch(
  () => props.content,
  () => {
    void renderDiagram();
  },
  { immediate: true }
);

async function renderDiagram() {
  renderError.value = "";
  await nextTick();
  if (!container.value) return;

  try {
    ensureMermaidCompatibility();
    const { default: mermaid } = await import("mermaid");
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
    const { svg } = await mermaid.render(`mindmap-preview-${++renderCount}`, props.content);
    container.value.innerHTML = svg;
  } catch (error) {
    container.value.innerHTML = "";
    renderError.value = error instanceof Error ? error.message : "Mermaid 渲染失败";
  }
}

function ensureMermaidCompatibility() {
  const objectConstructor = Object as typeof Object & {
    hasOwn?: (target: object, key: PropertyKey) => boolean;
  };
  if (!objectConstructor.hasOwn) {
    objectConstructor.hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
  }

  const arrayPrototype = Array.prototype as unknown as { at?: (index: number) => unknown };
  if (!arrayPrototype.at) {
    Object.defineProperty(arrayPrototype, "at", {
      configurable: true,
      writable: true,
      value(this: unknown[], index: number) {
        return this[normalizeIndex(this.length, index)];
      }
    });
  }

  const stringPrototype = String.prototype as unknown as { at?: (index: number) => string | undefined };
  if (!stringPrototype.at) {
    Object.defineProperty(stringPrototype, "at", {
      configurable: true,
      writable: true,
      value(this: string, index: number) {
        const normalized = normalizeIndex(this.length, index);
        return normalized >= 0 && normalized < this.length ? this.charAt(normalized) : undefined;
      }
    });
  }
}

function normalizeIndex(length: number, index: number) {
  const integer = Math.trunc(index) || 0;
  return integer < 0 ? length + integer : integer;
}
</script>

<template>
  <section class="mermaid-panel">
    <div v-show="!renderError" ref="container" class="mermaid-svg" />
    <template v-if="renderError">
      <el-alert title="Mermaid 渲染失败，已回退为源码展示" type="warning" show-icon :closable="false" />
      <pre>{{ content }}</pre>
    </template>
  </section>
</template>

<style scoped>
.mermaid-panel {
  display: grid;
  gap: 10px;
}

.mermaid-svg {
  overflow: auto;
  padding: 12px;
  border: 1px solid #a5f3fc;
  border-radius: 8px;
  background: #ecfeff;
}

pre {
  margin: 0;
  padding: 12px;
  overflow: auto;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  white-space: pre-wrap;
}
</style>
