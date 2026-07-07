<script setup lang="ts">
import { computed } from "vue";
import { ArrowRight, Document, Reading } from "@element-plus/icons-vue";
import type { Course, KnowledgeNode } from "@/types/course";
import type { StudentProfile } from "@/types/profile";
import { difficultyLabel, masteryLabel } from "@/utils/format";

const props = defineProps<{
  mobileOpen: boolean;
  course?: Course | null;
  node?: KnowledgeNode | null;
  profile?: StudentProfile | null;
}>();

const emit = defineEmits<{ close: [] }>();

const weakNodes = computed(() => props.profile?.weakNodeIds?.slice(0, 4) ?? []);
</script>

<template>
  <aside class="context-panel context-panel-desktop" aria-label="学习上下文">
    <h2>学习上下文</h2>
    <section class="context-section">
      <h3>当前课程</h3>
      <p>{{ course?.name ?? "数据结构" }}</p>
      <el-tag v-if="course?.code" type="info" effect="plain">{{ course.code }}</el-tag>
    </section>

    <section class="context-section">
      <h3>当前知识点</h3>
      <p>{{ node?.name ?? "尚未选择知识点" }}</p>
      <div class="tag-row">
        <el-tag v-if="node?.difficulty" type="warning" effect="plain">{{ difficultyLabel(node.difficulty) }}</el-tag>
        <el-tag v-if="node?.masteryStatus" type="success" effect="plain">{{ masteryLabel(node.masteryStatus) }}</el-tag>
      </div>
    </section>

    <section class="context-section">
      <h3>学习画像</h3>
      <p>{{ profile?.profileSummary ?? "画像会根据对话、练习和学习行为逐步更新。" }}</p>
      <el-progress :percentage="Math.round((profile?.confidenceScore ?? 0) * 100)" />
    </section>

    <section class="context-section">
      <h3>薄弱节点</h3>
      <el-empty v-if="!weakNodes.length" description="暂无薄弱节点" />
      <div v-else class="context-actions">
        <RouterLink v-for="nodeId in weakNodes" :key="nodeId" class="list-button" :to="{ path: '/knowledge-graph' }">
          <el-icon><Reading /></el-icon>
          <strong>{{ nodeId }}</strong>
        </RouterLink>
      </div>
    </section>

    <section class="context-section">
      <h3>快速入口</h3>
      <div class="context-actions">
        <RouterLink class="list-button" to="/resources">
          <el-icon><Document /></el-icon>
          <strong>生成课程资源</strong>
          <span>讲解、导图、视频与数字人</span>
        </RouterLink>
        <RouterLink class="list-button" to="/learning-path">
          <el-icon><ArrowRight /></el-icon>
          <strong>查看学习路径</strong>
          <span>按依赖关系推进任务</span>
        </RouterLink>
      </div>
    </section>
  </aside>

  <el-drawer
    class="context-panel-mobile"
    :model-value="mobileOpen"
    title="学习上下文"
    direction="rtl"
    size="88%"
    @close="emit('close')"
  >
    <section class="context-section">
      <h3>当前课程</h3>
      <p>{{ course?.name ?? "数据结构" }}</p>
    </section>
    <section class="context-section">
      <h3>当前知识点</h3>
      <p>{{ node?.name ?? "尚未选择知识点" }}</p>
    </section>
    <section class="context-section">
      <h3>学习画像</h3>
      <p>{{ profile?.profileSummary ?? "画像会根据学习行为逐步更新。" }}</p>
      <el-progress :percentage="Math.round((profile?.confidenceScore ?? 0) * 100)" />
    </section>
  </el-drawer>
</template>
