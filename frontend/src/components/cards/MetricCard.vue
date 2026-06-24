<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
}>();
</script>

<template>
  <article class="metric-card" :class="tone ? `tone-${tone}` : 'tone-neutral'">
    <slot name="icon" />
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
    <small v-if="hint">{{ hint }}</small>
    <slot />
  </article>
</template>
