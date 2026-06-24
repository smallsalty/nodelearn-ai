<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import DigitalHumanChatPanel from "@/components/DigitalHumanChatPanel.vue";
import MarkdownContent from "@/components/MarkdownContent.vue";
import MultimodalTaskProgress from "@/components/MultimodalTaskProgress.vue";
import ResourceTypeCard from "@/components/resource/ResourceTypeCard.vue";
import StateBlock from "@/components/StateBlock.vue";
import VideoLessonPlayer from "@/components/VideoLessonPlayer.vue";
import { courseApi } from "@/api/modules/course";
import { multimodalApi } from "@/api/modules/multimodal";
import { resourceApi } from "@/api/modules/resource";
import { recommendationsApi } from "@/api/modules/recommendations";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { KnowledgeNode } from "@/types/course";
import type { ResourceType } from "@/types/contracts";
import type { MultimodalTaskResult } from "@/types/multimodal";
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
const route = useRoute();
const nodes = ref<KnowledgeNode[]>([]);
const resources = ref<GeneratedResource[]>([]);
const recommendations = ref<ResourceRecommendation[]>([]);
const selectedNodeId = ref("node_stack_001");
const selectedResourceId = ref<string | null>(null);
const selectedResource = ref<GeneratedResource | null>(null);
const resourceTypes = ref<ResourceType[]>(["lecture_doc", "mind_map"]);
const generatorMode = ref<"standard" | "knowledge_video" | "digital_human_video" | "digital_human_chat">("standard");
const learningGoal = ref("通过讲解、导图和练习掌握当前知识点");
const customRequirement = ref("");
const durationSeconds = ref(120);
const videoStyle = ref("clean_motion_graphics");
const useDigitalHuman = ref(false);
const generationResult = ref<ResourceGenerateResult | null>(null);
const multimodalTask = ref<MultimodalTaskResult | null>(null);
const loading = ref(false);
const generating = ref(false);
const errorMessage = ref("");

const generatorModes = [
  { key: "standard", title: "通用资源", description: "讲解文档、导图、练习、代码案例" },
  { key: "knowledge_video", title: "知识点教学视频", description: "脚本、分镜、语音、渲染和审计" },
  { key: "digital_human_video", title: "数字人讲解", description: "视频播放器、脚本大纲和字幕" },
  { key: "digital_human_chat", title: "数字人对话", description: "围绕当前知识点追问" }
] as const;

const resourceTypeOptions: Array<{ value: ResourceType; title: string; description: string }> = [
  { value: "lecture_doc", title: "讲解文档", description: "结构化概念说明" },
  { value: "mind_map", title: "思维导图", description: "Mermaid 知识结构" },
  { value: "practice_question", title: "练习题", description: "选择、简答和代码题" },
  { value: "code_case", title: "代码案例", description: "数据结构实现片段" },
  { value: "video_script", title: "视频脚本", description: "旧链路旁白脚本" },
  { value: "animation_script", title: "动画脚本", description: "旧链路分镜 JSON" },
  { value: "summary_note", title: "总结笔记", description: "可复习的要点记录" }
];

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
  applyRouteQuery();
  void loadPage();
});

function applyRouteQuery() {
  const nodeId = typeof route.query.nodeId === "string" ? route.query.nodeId : "";
  const action = typeof route.query.action === "string" ? route.query.action : "";
  if (nodeId) selectedNodeId.value = nodeId;
  if (action === "knowledge_video") generatorMode.value = "knowledge_video";
  if (action === "digital_human_video") generatorMode.value = "digital_human_video";
  if (action === "digital_human_chat") generatorMode.value = "digital_human_chat";
}

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
      learningGoal: learningGoal.value,
      customRequirement: customRequirement.value || undefined,
      videoOptions: isVideoGenerationSelected()
        ? {
            aspectRatio: "16:9",
            qualityPreset: "high",
            materialSource: "generated_motion_assets",
            versionCount: 1,
            subtitleEnabled: true,
            bgmEnabled: false,
            bgmVolume: 0
          }
        : undefined
    });
    generationResult.value = response.data;
    if (response.data.status === "running" || response.data.status === "pending") {
      await pollGenerationTask(response.data.taskId);
    }
    await loadPage();
    const firstResourceId = generationResult.value?.resourceIds[0];
    if (firstResourceId) await openResource(firstResourceId);
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    generating.value = false;
  }
}

async function submitGenerator() {
  if (generatorMode.value === "standard") {
    await generateResources();
    return;
  }
  if (generatorMode.value === "knowledge_video") {
    await generateKnowledgeVideo();
    return;
  }
  if (generatorMode.value === "digital_human_video") {
    await generateDigitalHumanExplain();
  }
}

async function generateKnowledgeVideo() {
  generating.value = true;
  errorMessage.value = "";
  try {
    const response = await multimodalApi.generateVideo({
      userId: userId.value,
      courseId: courseId.value,
      nodeId: selectedNodeId.value,
      learningGoal: learningGoal.value,
      difficulty: "medium",
      durationSeconds: durationSeconds.value,
      style: videoStyle.value,
      useDigitalHuman: useDigitalHuman.value,
      useRag: true,
      customRequirement: customRequirement.value || undefined
    });
    multimodalTask.value = response.data;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    generating.value = false;
  }
}

async function generateDigitalHumanExplain() {
  generating.value = true;
  errorMessage.value = "";
  try {
    const response = await multimodalApi.explainWithDigitalHuman({
      userId: userId.value,
      courseId: courseId.value,
      nodeId: selectedNodeId.value,
      useRag: true,
      customRequirement: customRequirement.value || learningGoal.value
    });
    multimodalTask.value = {
      taskId: response.data.taskId,
      status: response.data.status,
      progress: response.data.progress,
      resourceId: response.data.resourceId,
      videoUrl: response.data.videoUrl,
      fileUrl: response.data.videoUrl,
      script: response.data.script,
      currentStep: response.data.status === "success" ? "done" : "queued",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await loadPage();
    if (response.data.resourceId) await openResource(response.data.resourceId);
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
  return (
    resource.resourceType === "video_script" ||
    resource.resourceType === "animation_script" ||
    resource.resourceType === "knowledge_video" ||
    resource.resourceType === "digital_human_video"
  );
}

function isVideoGenerationSelected() {
  return resourceTypes.value.some((resourceType) => resourceType === "video_script" || resourceType === "animation_script");
}

async function pollGenerationTask(taskId: string) {
  for (let index = 0; index < 180; index += 1) {
    await sleep(1500);
    const response = await resourceApi.getGenerationTask(taskId);
    generationResult.value = response.data;
    if (response.data.status !== "running" && response.data.status !== "pending") return;
  }
}

async function handleMultimodalCompleted(task: MultimodalTaskResult) {
  multimodalTask.value = task;
  await loadPage();
  if (task.resourceId) await openResource(task.resourceId);
}

function sleep(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function isMarkdownResource(resource: GeneratedResource) {
  return resource.resourceType === "lecture_doc" || resource.resourceType === "summary_note" || resource.resourceType === "mind_map";
}

function toggleResourceType(resourceType: ResourceType) {
  if (resourceTypes.value.includes(resourceType)) {
    resourceTypes.value = resourceTypes.value.filter((item) => item !== resourceType);
    return;
  }
  resourceTypes.value = [...resourceTypes.value, resourceType];
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
          <el-form-item label="生成模式">
            <div class="mode-grid" role="radiogroup" aria-label="资源生成模式">
              <button
                v-for="mode in generatorModes"
                :key="mode.key"
                type="button"
                class="mode-card"
                :class="{ active: generatorMode === mode.key }"
                @click="generatorMode = mode.key"
              >
                <strong>{{ mode.title }}</strong>
                <span>{{ mode.description }}</span>
              </button>
            </div>
          </el-form-item>
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
          <el-form-item v-if="generatorMode === 'standard'" label="资源类型">
            <div class="resource-type-grid">
              <ResourceTypeCard
                v-for="option in resourceTypeOptions"
                :key="option.value"
                :title="option.title"
                :description="option.description"
                :active="resourceTypes.includes(option.value)"
                @toggle="toggleResourceType(option.value)"
              />
            </div>
          </el-form-item>
          <el-form-item label="学习目标">
            <el-input v-model="learningGoal" />
          </el-form-item>
          <template v-if="generatorMode !== 'digital_human_chat'">
            <el-form-item label="补充要求">
              <el-input v-model="customRequirement" type="textarea" :rows="2" placeholder="可填写讲解风格、薄弱点、例子要求" />
            </el-form-item>
            <div class="option-grid">
              <el-form-item label="时长">
                <el-input-number v-model="durationSeconds" :min="30" :max="1200" :step="30" />
              </el-form-item>
              <el-form-item label="讲解风格">
                <el-select v-model="videoStyle">
                  <el-option label="清爽动态图解" value="clean_motion_graphics" />
                  <el-option label="课堂板书" value="classroom_board" />
                  <el-option label="案例演示" value="case_demo" />
                </el-select>
              </el-form-item>
              <el-form-item label="使用数字人">
                <el-switch v-model="useDigitalHuman" />
              </el-form-item>
            </div>
          </template>
          <div class="button-row">
            <el-button
              v-if="generatorMode !== 'digital_human_chat'"
              type="primary"
              :loading="generating"
              :disabled="generatorMode === 'standard' && !resourceTypes.length"
              @click="submitGenerator"
            >
              生成资源
            </el-button>
            <el-button :loading="generating" @click="generateVideoLesson">旧链路动态讲解视频</el-button>
          </div>
        </el-form>
        <section v-if="generationResult" class="generation-progress">
          <div class="generation-title">
            <strong>任务 {{ generationResult.taskId }}</strong>
            <el-tag :type="statusTagType(generationResult.status)">{{ statusLabel(generationResult.status) }}</el-tag>
          </div>
          <el-progress :percentage="Math.round(generationResult.progress ?? 0)" />
          <p v-if="generationResult.currentStage">stage: {{ generationResult.currentStage }}</p>
          <el-alert v-if="generationResult.errorMessage" :title="generationResult.errorMessage" type="error" show-icon :closable="false" />
        </section>
        <MultimodalTaskProgress
          v-if="multimodalTask?.taskId"
          :task-id="multimodalTask.taskId"
          :initial-task="multimodalTask"
          @completed="handleMultimodalCompleted"
          @failed="multimodalTask = $event"
        />
        <DigitalHumanChatPanel
          v-if="generatorMode === 'digital_human_chat'"
          :user-id="userId"
          :course-id="courseId"
          :node-id="selectedNodeId"
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

<style scoped>
.generation-progress {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-md);
  background: var(--nl-bg);
}

.generation-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.generation-progress p {
  margin: 0;
  color: var(--nl-text-subtle);
  font-size: 13px;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 760px) {
  .option-grid {
    grid-template-columns: 1fr;
  }
}
</style>
