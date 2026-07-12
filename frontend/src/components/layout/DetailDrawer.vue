<script setup lang="ts">
import { computed } from "vue";
import { ArrowRight, Document, Reading } from "@element-plus/icons-vue";
import type { Course, KnowledgeNode } from "@/types/course";
import type { StudentProfile } from "@/types/profile";
import { difficultyLabel, masteryLabel } from "@/utils/format";

const props = defineProps<{
  modelValue: boolean;
  course?: Course | null;
  node?: KnowledgeNode | null;
  profile?: StudentProfile | null;
}>();

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const weakNodes = computed(() => props.profile?.weakNodeIds?.slice(0, 6) ?? []);

function closeDrawer() {
  emit("update:modelValue", false);
}
</script>

<template>
  <el-drawer
    class="detail-drawer"
    :model-value="modelValue"
    title="学习上下文"
    direction="rtl"
    size="min(440px, 92vw)"
    @close="closeDrawer"
  >
    <section class="context-overview-grid">
      <article class="context-card">
        <span>当前课程</span>
        <strong>{{ course?.name ?? "数据结构" }}</strong>
        <p>{{ course?.description ?? course?.code ?? "围绕课程材料、知识图谱和练习记录推进学习。" }}</p>
      </article>

      <article class="context-card">
        <span>当前节点</span>
        <strong>{{ node?.name ?? "尚未选择知识点" }}</strong>
        <div class="tag-row">
          <el-tag v-if="node?.difficulty" type="warning" effect="plain">{{ difficultyLabel(node.difficulty) }}</el-tag>
          <el-tag v-if="node?.masteryStatus" type="success" effect="plain">{{ masteryLabel(node.masteryStatus) }}</el-tag>
        </div>
        <p>{{ node?.description ?? "选择知识节点后，这里会展示节点说明、掌握状态和快捷操作。" }}</p>
      </article>

      <article class="context-card">
        <span>学生画像</span>
        <strong>{{ Math.round((profile?.confidenceScore ?? 0) * 100) }}% 完整度</strong>
        <p>{{ profile?.profileSummary ?? "画像会根据对话、练习和学习行为逐步更新。" }}</p>
        <el-progress :percentage="Math.round((profile?.confidenceScore ?? 0) * 100)" />
      </article>

      <article class="context-card">
        <span>薄弱节点</span>
        <el-empty v-if="!weakNodes.length" description="暂无薄弱节点" />
        <div v-else class="context-actions">
          <RouterLink v-for="nodeId in weakNodes" :key="nodeId" class="list-button" to="/knowledge-graph">
            <el-icon><Reading /></el-icon>
            <strong>{{ nodeId }}</strong>
          </RouterLink>
        </div>
      </article>

      <article class="context-card">
        <span>快捷操作</span>
        <div class="context-actions">
          <RouterLink class="list-button" to="/resources">
            <el-icon><Document /></el-icon>
            <strong>生成学习资源</strong>
            <span>讲解文档、导图、练习、视频与数字人讲解</span>
          </RouterLink>
          <RouterLink class="list-button" to="/learning-path">
            <el-icon><ArrowRight /></el-icon>
            <strong>查看学习路径</strong>
            <span>按图谱依赖和画像薄弱点推进任务</span>
          </RouterLink>
        </div>
      </article>
    </section>
  </el-drawer>
</template>
