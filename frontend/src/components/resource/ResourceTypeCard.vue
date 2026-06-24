<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  active?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();
</script>

<template>
  <button
    type="button"
    class="resource-type-card"
    :class="{ active }"
    :disabled="disabled"
    @click="emit('toggle')"
  >
    <strong>{{ title }}</strong>
    <span>{{ description }}</span>
  </button>
</template>
