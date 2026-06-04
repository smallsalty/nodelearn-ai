<template>
  <el-config-provider>
    <a href="#main-content" class="skip-link">跳到主内容</a>
    <RouterView v-slot="{ Component, route }">
      <component :is="Component" v-if="route.meta.public" />
      <AppLayout v-else>
        <component :is="Component" />
      </AppLayout>
    </RouterView>
    <FloatingMenu v-if="!route.meta.public" />
  </el-config-provider>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import AppLayout from "@/components/AppLayout.vue";
import FloatingMenu from "@/components/FloatingMenu.vue";

const route = useRoute();
</script>
