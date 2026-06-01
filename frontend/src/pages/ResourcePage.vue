<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import VideoLessonPlayer from "@/components/VideoLessonPlayer.vue";
import { courseApi } from "@/api/modules/course";
import { resourceApi } from "@/api/modules/resource";
import type { KnowledgeNode } from "@/types/course";
import type { AnimationScriptContent, GeneratedResource } from "@/types/resource";

const userId = "user_demo_001";
const courseId = "course_ds_001";
const nodes = ref<KnowledgeNode[]>([]);
const resources = ref<GeneratedResource[]>([]);
const selectedNodeId = ref("node_stack_001");
const selectedResourceId = ref<string | null>(null);
const selectedResource = ref<GeneratedResource | null>(null);
const loading = ref(false);
const generating = ref(false);
const errorMessage = ref("");

const selectedVideoContent = computed<AnimationScriptContent | null>(() => {
  const content = selectedResource.value?.content;
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as AnimationScriptContent;
    return Array.isArray(parsed.scenes) ? parsed : null;
  } catch {
    return null;
  }
});

onMounted(() => {
  void loadPage();
});

async function loadPage() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [nodeResponse, resourceResponse] = await Promise.all([
      courseApi.listNodes(courseId),
      resourceApi.listUserResources(userId, { page: 1, pageSize: 30 })
    ]);
    nodes.value = nodeResponse.data;
    resources.value = resourceResponse.data.list;
    if (!nodes.value.some((node) => node.id === selectedNodeId.value) && nodes.value[0]) {
      selectedNodeId.value = nodes.value[0].id;
    }
  } catch {
    errorMessage.value = "资源页面加载失败";
  } finally {
    loading.value = false;
  }
}

async function generateVideoLesson() {
  generating.value = true;
  errorMessage.value = "";
  try {
    const response = await resourceApi.generateResource({
      userId,
      courseId,
      nodeId: selectedNodeId.value,
      resourceTypes: ["video_script", "animation_script"],
      learningGoal: "通过动态讲解掌握当前知识点"
    });
    await loadPage();
    if (response.data.resourceIds[0]) {
      await openResource(response.data.resourceIds[0]);
    }
    if (response.data.status === "failed") {
      errorMessage.value = response.message;
    }
  } catch {
    errorMessage.value = "视频生成请求失败";
  } finally {
    generating.value = false;
  }
}

async function openResource(resourceId: string) {
  selectedResourceId.value = resourceId;
  errorMessage.value = "";
  try {
    const response = await resourceApi.getResource(resourceId);
    selectedResource.value = response.data;
  } catch {
    errorMessage.value = "资源详情读取失败";
  }
}

function isVideoResource(resource: GeneratedResource) {
  return resource.resourceType === "video_script" || resource.resourceType === "animation_script";
}
</script>

<template>
  <main class="page-shell">
    <section class="resource-page">
      <header class="resource-header">
        <div>
          <p class="eyebrow">Multimodal Resource</p>
          <h1 class="page-title">知识点动态讲解视频</h1>
          <p>通过 RAG、讲解脚本、豆包旁白和 Remotion 导出生成可播放资源。</p>
        </div>
        <el-button :loading="loading" @click="loadPage">刷新资源</el-button>
      </header>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        :closable="false"
      />

      <section class="resource-layout">
        <aside class="resource-sidebar">
          <el-card shadow="never">
            <template #header>生成知识点讲解视频</template>
            <el-select v-model="selectedNodeId" filterable placeholder="选择知识点">
              <el-option v-for="node in nodes" :key="node.id" :label="node.name" :value="node.id" />
            </el-select>
            <el-button type="primary" :loading="generating" class="generate-button" @click="generateVideoLesson">
              生成真实视频
            </el-button>
            <p class="helper-text">同步生成会等待 TTS、MP4 渲染和审计完成。</p>
          </el-card>

          <el-card shadow="never">
            <template #header>GeneratedResource 列表</template>
            <el-empty v-if="!resources.length" description="暂无资源" />
            <button
              v-for="resource in resources"
              v-else
              :key="resource.id"
              class="resource-item"
              :class="{ active: resource.id === selectedResourceId }"
              @click="openResource(resource.id)"
            >
              <span>{{ resource.title }}</span>
              <small>{{ resource.resourceType }}</small>
              <el-tag :type="resource.status === 'success' ? 'success' : 'danger'" size="small">
                {{ resource.status }}
              </el-tag>
            </button>
          </el-card>
        </aside>

        <section class="resource-detail">
          <el-empty v-if="!selectedResource" description="选择一个资源查看详情" />
          <template v-else>
            <el-card shadow="never">
              <template #header>
                <div class="detail-title">
                  <span>{{ selectedResource.title }}</span>
                  <div>
                    <el-tag>{{ selectedResource.resourceType }}</el-tag>
                    <el-tag :type="selectedResource.auditStatus === 'passed' ? 'success' : 'warning'">
                      {{ selectedResource.auditStatus }}
                    </el-tag>
                  </div>
                </div>
              </template>

              <template v-if="isVideoResource(selectedResource)">
                <video
                  v-if="selectedResource.fileUrl"
                  class="mp4-player"
                  :src="selectedResource.fileUrl"
                  controls
                />
                <VideoLessonPlayer
                  v-else-if="selectedResource.auditStatus === 'passed' && selectedVideoContent?.scenes.length"
                  :content="selectedResource.content"
                />
                <el-alert
                  v-else
                  title="该视频尚未通过完整生成与审计流程"
                  type="warning"
                  show-icon
                  :closable="false"
                />
              </template>
              <pre v-else class="resource-content">{{ selectedResource.content }}</pre>
            </el-card>
          </template>
        </section>
      </section>
    </section>
  </main>
</template>

<style scoped>
.resource-page {
  display: grid;
  gap: 18px;
  max-width: 1440px;
  margin: 0 auto;
}

.resource-header,
.detail-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.resource-header {
  padding: 22px;
  border: 1px solid #dbe5ef;
  border-radius: 12px;
  background: #ffffff;
}

.resource-header p {
  margin: 4px 0 0;
  color: #64748b;
}

.eyebrow {
  color: #0f766e !important;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.resource-layout {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 18px;
}

.resource-sidebar {
  display: grid;
  align-content: start;
  gap: 14px;
}

.generate-button {
  width: 100%;
  margin-top: 12px;
}

.helper-text {
  margin: 12px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.resource-item {
  display: grid;
  justify-items: start;
  gap: 6px;
  width: 100%;
  margin-bottom: 8px;
  padding: 11px;
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2937;
  text-align: left;
  cursor: pointer;
}

.resource-item.active {
  border-color: #0f766e;
  background: #f0fdfa;
}

.resource-item small {
  color: #64748b;
}

.detail-title > div {
  display: flex;
  gap: 8px;
}

.mp4-player {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  background: #071426;
}

.resource-content {
  overflow: auto;
  white-space: pre-wrap;
}

@media (max-width: 980px) {
  .resource-layout {
    grid-template-columns: 1fr;
  }
}
</style>
