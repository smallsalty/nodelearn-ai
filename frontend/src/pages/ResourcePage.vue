<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import MarkdownContent from "@/components/MarkdownContent.vue";
import StateBlock from "@/components/StateBlock.vue";
import VideoLessonPlayer from "@/components/VideoLessonPlayer.vue";
import { courseApi } from "@/api/modules/course";
import { resourceApi } from "@/api/modules/resource";
import { recommendationsApi } from "@/api/modules/recommendations";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { KnowledgeNode } from "@/types/course";
import type { ResourceType } from "@/types/contracts";
import type { AnimationScriptContent, GeneratedResource, ResourceGenerateResult, ResourceRecommendation } from "@/types/resource";
import {
  auditLabel,
  DEFAULT_COURSE_ID,
  DEFAULT_USER_ID,
  difficultyLabel,
  resourceTypeLabel,
  statusLabel,
  statusTagType
} from "@/utils/format";

const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const courseId = computed(() => appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const nodes = ref<KnowledgeNode[]>([]);
const resources = ref<GeneratedResource[]>([]);
const recommendations = ref<ResourceRecommendation[]>([]);
const selectedNodeId = ref("node_stack_001");
const selectedResourceId = ref<string | null>(null);
const selectedResource = ref<GeneratedResource | null>(null);
const resourceTypes = ref<ResourceType[]>(["lecture_doc", "mind_map"]);
const learningGoal = ref("通过讲解、导图和练习掌握当前知识点");
const generationResult = ref<ResourceGenerateResult | null>(null);
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
    const [nodeResponse, resourceResponse, recommendationResponse] = await Promise.all([
      courseApi.getNodes(courseId.value),
      resourceApi.getUserResources(userId.value, { page: 1, pageSize: 40 }),
      recommendationsApi.getUserRecommendations(userId.value)
    ]);
    nodes.value = nodeResponse.data;
    resources.value = resourceResponse.data.list;
    recommendations.value = recommendationResponse.data;
    if (!nodes.value.some((node) => node.id === selectedNodeId.value) && nodes.value[0]) {
      selectedNodeId.value = nodes.value[0].id;
    }
    if (!selectedResource.value && resources.value[0]) {
      await openResource(resources.value[0].id);
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function generateResources() {
  generating.value = true;
  errorMessage.value = "";
  try {
    const response = await resourceApi.generateResources({
      userId: userId.value,
      courseId: courseId.value,
      nodeId: selectedNodeId.value,
      resourceTypes: resourceTypes.value,
      difficulty: "medium",
      learningGoal: learningGoal.value
    });
    generationResult.value = response.data;
    await loadPage();
    if (response.data.resourceIds[0]) await openResource(response.data.resourceIds[0]);
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    generating.value = false;
  }
}

async function generateVideoLesson() {
  resourceTypes.value = ["video_script", "animation_script"];
  learningGoal.value = "通过动态讲解掌握当前知识点";
  await generateResources();
}

async function openResource(resourceId: string) {
  selectedResourceId.value = resourceId;
  appState.selectedResourceId = resourceId;
  errorMessage.value = "";
  try {
    const response = await resourceApi.getResource(resourceId);
    selectedResource.value = response.data;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

function isVideoResource(resource: GeneratedResource) {
  return resource.resourceType === "video_script" || resource.resourceType === "animation_script";
}

function isMarkdownResource(resource: GeneratedResource) {
  return resource.resourceType === "lecture_doc" || resource.resourceType === "summary_note" || resource.resourceType === "mind_map";
}
</script>

<template>
  <section class="resource-page two-column-page wide-left">
    <section class="panel-card">
      <header class="panel-header">
        <div>
          <h2>资源中心</h2>
          <p>生成资源必须经过后端资源接口和审计状态，不把未通过审计的内容显示为可直接使用。</p>
        </div>
        <el-button :loading="loading" @click="loadPage">刷新</el-button>
      </header>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="mb-16" />

      <section class="generator-card">
        <el-form label-position="top">
          <el-form-item label="知识点">
            <el-select v-model="selectedNodeId" filterable placeholder="选择知识点">
              <el-option
                v-for="node in nodes"
                :key="node.id"
                :label="`${node.name} · ${difficultyLabel(node.difficulty)}`"
                :value="node.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="资源类型">
            <el-select v-model="resourceTypes" multiple>
              <el-option label="讲解文档" value="lecture_doc" />
              <el-option label="思维导图" value="mind_map" />
              <el-option label="练习题" value="practice_question" />
              <el-option label="代码案例" value="code_case" />
              <el-option label="视频脚本" value="video_script" />
              <el-option label="动画脚本" value="animation_script" />
              <el-option label="总结笔记" value="summary_note" />
            </el-select>
          </el-form-item>
          <el-form-item label="学习目标">
            <el-input v-model="learningGoal" />
          </el-form-item>
          <div class="button-row">
            <el-button type="primary" :loading="generating" @click="generateResources">生成资源</el-button>
            <el-button :loading="generating" @click="generateVideoLesson">生成动态讲解视频</el-button>
          </div>
        </el-form>
        <el-alert
          v-if="generationResult"
          :title="`任务 ${generationResult.taskId}：${statusLabel(generationResult.status)}`"
          type="success"
          show-icon
          :closable="false"
        />
      </section>

      <StateBlock :loading="loading" :error="errorMessage" :empty="!resources.length" empty-text="暂无资源" @retry="loadPage">
        <section class="resource-list-grid">
          <button
            v-for="resource in resources"
            :key="resource.id"
            type="button"
            class="resource-card"
            :class="{ active: resource.id === selectedResourceId }"
            @click="openResource(resource.id)"
          >
            <strong>{{ resource.title }}</strong>
            <span>{{ resourceTypeLabel(resource.resourceType) }}</span>
            <div class="tag-row">
              <el-tag size="small" :type="statusTagType(resource.status)">{{ statusLabel(resource.status) }}</el-tag>
              <el-tag size="small" :type="resource.auditStatus === 'passed' ? 'success' : 'warning'">
                {{ auditLabel(resource.auditStatus) }}
              </el-tag>
            </div>
          </button>
        </section>
      </StateBlock>
    </section>

    <aside class="side-stack">
      <el-card shadow="never">
        <template #header>资源详情</template>
        <el-empty v-if="!selectedResource" description="选择一个资源查看详情" />
        <article v-else class="resource-detail">
          <header class="detail-title">
            <h3>{{ selectedResource.title }}</h3>
            <div class="tag-row">
              <el-tag>{{ resourceTypeLabel(selectedResource.resourceType) }}</el-tag>
              <el-tag :type="selectedResource.auditStatus === 'passed' ? 'success' : 'warning'">
                {{ auditLabel(selectedResource.auditStatus) }}
              </el-tag>
            </div>
          </header>

          <el-alert
            v-if="selectedResource.auditStatus !== 'passed'"
            title="该资源尚未通过审计，不应作为可直接使用内容发布。"
            type="warning"
            show-icon
            :closable="false"
            class="mb-16"
          />

          <template v-if="isVideoResource(selectedResource)">
            <video v-if="selectedResource.fileUrl" class="mp4-player" :src="selectedResource.fileUrl" controls />
            <VideoLessonPlayer
              v-else-if="selectedVideoContent?.scenes.length"
              :content="selectedResource.content"
            />
            <el-alert v-else title="视频资源 JSON 无法解析或尚未生成媒体文件" type="warning" show-icon :closable="false" />
          </template>
          <MarkdownContent v-else-if="isMarkdownResource(selectedResource)" :content="selectedResource.content" />
          <pre v-else class="resource-content">{{ selectedResource.content }}</pre>
        </article>
      </el-card>

      <el-card shadow="never">
        <template #header>推荐资源</template>
        <el-empty v-if="!recommendations.length" description="暂无推荐" />
        <article v-for="item in recommendations" :key="item.id" class="mini-list-item">
          <strong>{{ item.title }}</strong>
          <span>{{ resourceTypeLabel(item.resourceType) }} · {{ Math.round(item.score * 100) }}%</span>
          <p>{{ item.reason }}</p>
        </article>
      </el-card>
    </aside>
  </section>
</template>
