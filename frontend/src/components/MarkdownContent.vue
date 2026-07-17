<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import katex from "katex";
import renderMathInElement from "katex/contrib/auto-render";

const props = defineProps<{ content: string }>();
const host = ref<HTMLElement | null>(null);
const instanceId = `markdown-${Math.random().toString(36).slice(2, 10)}`;
const languagePreferenceKey = "nodelearn:code-language";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
});

const defaultImageRule = markdown.renderer.rules.image;
markdown.renderer.rules.image = (tokens, index, options, env, self) => {
  tokens[index].attrSet("loading", "lazy");
  tokens[index].attrSet("decoding", "async");
  return defaultImageRule ? defaultImageRule(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
};

markdown.renderer.rules.link_open = (tokens, index, options, _env, self) => {
  const href = tokens[index].attrGet("href") ?? "";
  if (/^https?:\/\//i.test(href)) {
    tokens[index].attrSet("target", "_blank");
    tokens[index].attrSet("rel", "noopener noreferrer");
  }
  return self.renderToken(tokens, index, options);
};

interface CodePanel {
  label: string;
  language: string;
  sourceLanguage: string;
  code: string;
}

function escapeAttribute(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
}

function preferredLanguage() {
  try {
    return localStorage.getItem(languagePreferenceKey) || "cpp";
  } catch {
    return "cpp";
  }
}

function parseCodePanels(block: string): CodePanel[] {
  const panels: CodePanel[] = [];
  const panelPattern = /^@@(.+?)\|([^\n]+)\n```([^\n]*)\n([\s\S]*?)\n```\s*$/gm;
  for (const match of block.matchAll(panelPattern)) {
    panels.push({
      label: match[1].trim(),
      language: match[2].trim(),
      sourceLanguage: match[3].trim() || match[2].trim(),
      code: match[4]
    });
  }
  return panels;
}

function renderCodeTabs(panels: CodePanel[], groupIndex: number) {
  const preferred = preferredLanguage();
  const activeIndex = Math.max(0, panels.findIndex((panel) => panel.language === preferred));
  const groupId = `${instanceId}-code-${groupIndex}`;
  const tabs = panels.map((panel, index) => {
    const selected = index === activeIndex;
    return `<button type="button" class="markdown-code-tab" role="tab" id="${groupId}-tab-${index}" aria-controls="${groupId}-panel-${index}" aria-selected="${selected}" tabindex="${selected ? 0 : -1}" data-code-language="${escapeAttribute(panel.language)}">${escapeAttribute(panel.label)}</button>`;
  }).join("");
  const bodies = panels.map((panel, index) => {
    const selected = index === activeIndex;
    const codeHtml = markdown.render(`\`\`\`${panel.sourceLanguage}\n${panel.code}\n\`\`\``);
    return `<div class="markdown-code-panel" role="tabpanel" id="${groupId}-panel-${index}" aria-labelledby="${groupId}-tab-${index}"${selected ? "" : " hidden"}>${codeHtml}</div>`;
  }).join("");
  return `<section class="markdown-code-tabs" data-code-tabs><div class="markdown-code-tablist" role="tablist" aria-label="代码语言">${tabs}</div>${bodies}</section>`;
}

const rendered = computed(() => {
  const tabGroups: CodePanel[][] = [];
  const mathBlocks: string[] = [];
  let prepared = (props.content || "").replace(/^:::code-tabs\s*\n([\s\S]*?)^:::\s*$/gm, (_match, block: string) => {
    const panels = parseCodePanels(block);
    if (!panels.length) return block;
    const index = tabGroups.push(panels) - 1;
    return `\nNODELEARN_CODE_TABS_${index}\n`;
  });
  prepared = prepared.replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula: string) => {
    const index = mathBlocks.push(formula.trim()) - 1;
    return `\nNODELEARN_MATH_BLOCK_${index}\n`;
  });
  let html = markdown.render(prepared);
  tabGroups.forEach((panels, index) => {
    const placeholder = `<p>NODELEARN_CODE_TABS_${index}</p>`;
    html = html.replace(placeholder, renderCodeTabs(panels, index));
  });
  mathBlocks.forEach((formula, index) => {
    const placeholder = `NODELEARN_MATH_BLOCK_${index}`;
    html = html.split(placeholder).join(
      `<span class="markdown-math-block" data-math-source="${escapeAttribute(formula)}"></span>`
    );
  });
  return DOMPurify.sanitize(html, { ADD_ATTR: ["role", "aria-label", "aria-controls", "aria-selected", "aria-labelledby", "tabindex", "data-code-language", "data-code-tabs", "data-math-source"] });
});

function selectTab(tab: HTMLButtonElement, remember = true) {
  const group = tab.closest<HTMLElement>("[data-code-tabs]");
  if (!group) return;
  const language = tab.dataset.codeLanguage ?? "";
  group.querySelectorAll<HTMLButtonElement>("[role='tab']").forEach((candidate) => {
    const selected = candidate === tab;
    candidate.setAttribute("aria-selected", String(selected));
    candidate.tabIndex = selected ? 0 : -1;
    const panelId = candidate.getAttribute("aria-controls");
    const panel = panelId ? group.querySelector<HTMLElement>(`#${CSS.escape(panelId)}`) : null;
    if (panel) panel.hidden = !selected;
  });
  if (remember && language) {
    try {
      localStorage.setItem(languagePreferenceKey, language);
    } catch {
      // Reading remains usable when browser storage is unavailable.
    }
    document.querySelectorAll<HTMLButtonElement>(`[role='tab'][data-code-language='${CSS.escape(language)}']`).forEach((candidate) => {
      if (candidate !== tab) selectTab(candidate, false);
    });
  }
  tab.focus();
}

function onClick(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>(".markdown-code-tab") : null;
  if (target) selectTab(target);
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>(".markdown-code-tab") : null;
  if (!target || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = [...(target.closest("[role='tablist']")?.querySelectorAll<HTMLButtonElement>("[role='tab']") ?? [])];
  const current = tabs.indexOf(target);
  if (current < 0) return;
  event.preventDefault();
  let next = current;
  if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
  if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = tabs.length - 1;
  selectTab(tabs[next]);
}

async function renderMath() {
  await nextTick();
  if (!host.value) return;
  host.value.querySelectorAll<HTMLElement>(".markdown-math-block[data-math-source]").forEach((block) => {
    katex.render(block.dataset.mathSource ?? "", block, {
      displayMode: true,
      throwOnError: false,
      strict: "ignore"
    });
    delete block.dataset.mathSource;
  });
  renderMathInElement(host.value, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false },
      { left: "$", right: "$", display: false }
    ],
    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    throwOnError: false,
    strict: "ignore"
  });
}

watch(rendered, () => void renderMath(), { flush: "post" });

onMounted(() => {
  host.value?.addEventListener("click", onClick);
  host.value?.addEventListener("keydown", onKeydown);
  void renderMath();
});

onBeforeUnmount(() => {
  host.value?.removeEventListener("click", onClick);
  host.value?.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <article ref="host" class="markdown-content" v-html="rendered" />
</template>
