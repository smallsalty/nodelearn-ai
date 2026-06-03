<script setup lang="ts">
import { computed } from "vue";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

const props = defineProps<{ content: string }>();

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
});

const rendered = computed(() => DOMPurify.sanitize(markdown.render(props.content || "")));
</script>

<template>
  <article class="markdown-content" v-html="rendered" />
</template>
