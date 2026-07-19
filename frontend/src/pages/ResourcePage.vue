<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import DigitalHumanChatPanel from "@/components/DigitalHumanChatPanel.vue";
import MarkdownContent from "@/components/MarkdownContent.vue";
import MindMapViewer from "@/components/mind-map/MindMapViewer.vue";
import MultimodalTaskProgress from "@/components/MultimodalTaskProgress.vue";
import ResourceTypeCard from "@/components/resource/ResourceTypeCard.vue";
import StateBlock from "@/components/StateBlock.vue";
import VideoLessonPlayer from "@/components/VideoLessonPlayer.vue";
import { useSelectedOptionAtTop } from "@/composables/useSelectedOptionAtTop";
import { courseApi } from "@/api/modules/course";
import { multimodalApi } from "@/api/modules/multimodal";
import { resourceApi } from "@/api/modules/resource";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { KnowledgeNode } from "@/types/course";
import type { ResourceType, VideoTheme } from "@/types/contracts";
import type { MultimodalTaskResult } from "@/types/multimodal";
import type { AnimationScriptContent, GeneratedResource, ResourceGenerateResult } from "@/types/resource";
import { sortNodesByCourseOrder } from "@/utils/courseOrder";
import {
  auditLabel,
  DEFAULT_COURSE_ID,
  DEFAULT_USER_ID,
  difficultyLabel,
  formatDate,
  resourceTypeLabel,
  statusLabel,
  statusTagType
} from "@/utils/format";

const RESOURCE_NODE_POPPER_CLASS = "resource-node-select-popper";
const RESOURCE_NODE_SELECT_ID = "resource-node-select";

const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const courseId = computed(() => appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const route = useRoute();
const generatorSectionRef = ref<HTMLElement | null>(null);
const nodes = ref<KnowledgeNode[]>([]);
const resources = ref<GeneratedResource[]>([]);
const { handleVisibleChange: handleNodeSelectVisibleChange } = useSelectedOptionAtTop(
  RESOURCE_NODE_POPPER_CLASS,
  RESOURCE_NODE_SELECT_ID
);
const selectedNodeId = ref(
  typeof route.query.nodeId === "string" ? route.query.nodeId : appState.selectedNodeId ?? "node_stack_001"
);
const selectedResourceId = ref<string | null>(null);
const selectedResource = ref<GeneratedResource | null>(null);
const resourceTypes = ref<ResourceType[]>(["lecture_doc", "reading_material"]);
const generatorMode = ref<"standard" | "knowledge_video" | "digital_human_video" | "digital_human_chat">("standard");
const learningGoal = ref("通过讲解文档和拓展阅读掌握当前知识点");
const customRequirement = ref("");
const durationSeconds = ref(120);
const videoTheme = ref<VideoTheme>("warm_academic");
const generationResult = ref<ResourceGenerateResult | null>(null);
const multimodalTask = ref<MultimodalTaskResult | null>(null);
const loading = ref(false);
const generating = ref(false);
const errorMessage = ref("");
let nodesReady = false;
let pageRequestId = 0;
let resourceRequestId = 0;

const resourceTypeOptions: Array<{ value: ResourceType; title: string; description: string }> = [
  { value: "lecture_doc", title: "讲解文档", description: "结构化概念说明" },
  { value: "reading_material", title: "拓展材料阅读", description: "补充材料和延伸理解" }
];

const routeAction = computed(() => (typeof route.query.action === "string" ? route.query.action : ""));
const routeResourceId = computed(() => (typeof route.query.resourceId === "string" ? route.query.resourceId : ""));
const isMindMapEntry = computed(() => routeAction.value === "mind_map");
const isKnowledgeVideoEntry = computed(() => routeAction.value === "knowledge_video");
const isDigitalHumanAnswer = computed(() => generatorMode.value === "digital_human_chat");
const allowedResourceTypes = computed<ResourceType[]>(() => {
  if (isDigitalHumanAnswer.value) return [];
  if (isMindMapEntry.value) return ["mind_map"];
  if (generatorMode.value === "knowledge_video") return ["knowledge_video"];
  if (generatorMode.value === "digital_human_video") return ["digital_human_video"];
  return ["lecture_doc", "reading_material"];
});
const resourceScopeDescription = computed(() => {
  if (isMindMapEntry.value) return "仅显示当前知识点已生成并通过审核的思维导图。";
  if (generatorMode.value === "knowledge_video") return "仅显示当前知识点已生成并通过审核的教学视频。";
  if (generatorMode.value === "digital_human_video") return "仅显示当前知识点已生成并通过审核的数字人讲解。";
  return "仅显示当前知识点已生成并通过审核的讲解文档和拓展阅读。";
});
const emptyResourceText = computed(() => {
  if (isMindMapEntry.value) return "当前知识点暂无可查看的思维导图";
  if (generatorMode.value === "knowledge_video") return "当前知识点暂无可查看的教学视频";
  if (generatorMode.value === "digital_human_video") return "当前知识点暂无可查看的数字人讲解";
  return "当前知识点暂无可查看的讲解文档或拓展阅读";
});
const pageTitle = computed(() => {
  if (isMindMapEntry.value) return "思维导图";
  if (isDigitalHumanAnswer.value) return "数字人解答";
  if (generatorMode.value === "knowledge_video") return "视频讲解";
  if (generatorMode.value === "digital_human_video") return "数字人讲解";
  return "资源中心";
});
const pageDescription = computed(() => {
  if (isMindMapEntry.value) return "当前知识点和思维导图类型已预选，确认学习目标后即可生成。";
  if (isDigitalHumanAnswer.value) return "围绕当前知识点与数字人实时对话。";
  if (generatorMode.value === "knowledge_video") return "当前知识点和视频类型已预选，确认学习目标和视频设置后即可生成。";
  if (generatorMode.value === "digital_human_video") return "兼容旧数字人讲解深链接与生成流程。";
  return "生成讲解文档与拓展材料阅读。";
});
const submitButtonText = computed(() => {
  if (isMindMapEntry.value) return "生成思维导图";
  if (isKnowledgeVideoEntry.value) return "生成讲解视频";
  if (generatorMode.value === "digital_human_video") return "生成数字人讲解";
  return "生成资源";
});

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

onMounted(async () => {
  applyRouteQuery();
  await loadPage();
  focusGeneratorForRouteAction();
});

watch(
  () => [route.query.nodeId, route.query.action, route.query.resourceId],
  () => {
    const previousNodeId = selectedNodeId.value;
    applyRouteQuery();
    if (nodesReady && previousNodeId === selectedNodeId.value) {
      void loadCurrentResources(routeResourceId.value ? [routeResourceId.value] : []);
    }
    focusGeneratorForRouteAction();
  }
);

watch(selectedNodeId, (nodeId) => {
  if (nodeId) {
    appState.selectedNodeId = nodeId;
  }
  if (nodesReady) {
    void loadCurrentResources(routeResourceId.value ? [routeResourceId.value] : []);
  }
});

watch(
  () => appState.selectedNodeId,
  (nodeId) => {
    if (nodeId && nodeId !== selectedNodeId.value && nodes.value.some((node) => node.id === nodeId)) {
      selectedNodeId.value = nodeId;
    }
  }
);

watch(courseId, () => {
  void loadPage();
});

function applyRouteQuery() {
  const nodeId = typeof route.query.nodeId === "string" ? route.query.nodeId : "";
  const action = typeof route.query.action === "string" ? route.query.action : "";
  if (nodeId) selectedNodeId.value = nodeId;
  generationResult.value = null;
  multimodalTask.value = null;
  if (action === "mind_map") {
    generatorMode.value = "standard";
    resourceTypes.value = ["mind_map"];
    learningGoal.value = "梳理当前知识点的核心概念、关键步骤、常见误区和知识关联";
    return;
  }
  if (action === "digital_human_chat") {
    generatorMode.value = "digital_human_chat";
    resourceTypes.value = [];
    return;
  }
  if (action === "knowledge_video") {
    generatorMode.value = "knowledge_video";
    resourceTypes.value = [];
    learningGoal.value = "通过动态过程讲清当前知识点的原理、步骤、例子和易错点";
    return;
  }
  if (action === "digital_human_video") {
    generatorMode.value = "digital_human_video";
    resourceTypes.value = [];
    return;
  }
  generatorMode.value = "standard";
  resourceTypes.value = ["lecture_doc", "reading_material"];
}

function focusGeneratorForRouteAction() {
  if (!route.query.action) return;
  void nextTick(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    generatorSectionRef.value?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });
}

async function loadPage() {
  const requestId = ++pageRequestId;
  const targetCourseId = courseId.value;
  let delegatedResourceLoading = false;
  nodesReady = false;
  resourceRequestId += 1;
  loading.value = true;
  errorMessage.value = "";
  clearResourceScope();
  try {
    const [chapterResponse, nodeResponse] = await Promise.all([
      courseApi.getChapters(targetCourseId),
      courseApi.getNodes(targetCourseId)
    ]);
    if (requestId !== pageRequestId || targetCourseId !== courseId.value) return;
    nodes.value = sortNodesByCourseOrder(chapterResponse.data, nodeResponse.data);
    const nextNodeId = nodes.value.some((node) => node.id === selectedNodeId.value)
      ? selectedNodeId.value
      : nodes.value[0]?.id ?? "";
    if (nextNodeId !== selectedNodeId.value) {
      selectedNodeId.value = nextNodeId;
      await nextTick();
    }
    appState.selectedNodeId = nextNodeId || null;
    nodesReady = true;
    delegatedResourceLoading = true;
    await loadCurrentResources(routeResourceId.value ? [routeResourceId.value] : []);
  } catch (error) {
    if (requestId === pageRequestId) {
      errorMessage.value = getErrorMessage(error);
    }
  } finally {
    if (requestId === pageRequestId && !delegatedResourceLoading) {
      loading.value = false;
    }
  }
}

async function loadCurrentResources(preferredResourceIds: string[] = []) {
  const requestId = ++resourceRequestId;
  const targetCourseId = courseId.value;
  const targetNodeId = selectedNodeId.value;
  const targetTypes = [...allowedResourceTypes.value];
  clearResourceScope();

  if (isDigitalHumanAnswer.value || !targetNodeId || !targetTypes.length) {
    loading.value = false;
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await resourceApi.getNodeResources(targetNodeId);
    if (requestId !== resourceRequestId) return;

    const allowedTypes = new Set<ResourceType>(targetTypes);
    resources.value = response.data
      .filter(
        (resource) =>
          resource.courseId === targetCourseId &&
          resource.nodeId === targetNodeId &&
          allowedTypes.has(resource.resourceType) &&
          resource.status === "success" &&
          resource.auditStatus === "passed"
      )
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    const preferredResource = preferredResourceIds
      .map((resourceId) => resources.value.find((resource) => resource.id === resourceId))
      .find((resource): resource is GeneratedResource => Boolean(resource));
    selectResource(preferredResource?.id ?? resources.value[0]?.id ?? null);
  } catch (error) {
    if (requestId === resourceRequestId) {
      errorMessage.value = getErrorMessage(error);
    }
  } finally {
    if (requestId === resourceRequestId) {
      loading.value = false;
    }
  }
}

function clearSelectedResource() {
  selectedResourceId.value = null;
  selectedResource.value = null;
  appState.selectedResourceId = null;
}

function clearResourceScope() {
  resources.value = [];
  clearSelectedResource();
}

function selectResource(resourceId: string | null | undefined) {
  const resource = resources.value.find((item) => item.id === resourceId) ?? null;
  selectedResourceId.value = resource?.id ?? null;
  selectedResource.value = resource;
  appState.selectedResourceId = resource?.id ?? null;
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
    await loadCurrentResources(generationResult.value?.resourceIds ?? []);
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
      theme: videoTheme.value,
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
    await loadCurrentResources(response.data.resourceId ? [response.data.resourceId] : []);
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    generating.value = false;
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
  await loadCurrentResources(task.resourceId ? [task.resourceId] : []);
}

function sleep(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function isMarkdownResource(resource: GeneratedResource) {
  return (
    resource.resourceType === "lecture_doc" ||
    resource.resourceType === "summary_note" ||
    resource.resourceType === "reading_material"
  );
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
  <section class="resource-page">
    <section class="panel-card">
      <header class="panel-header">
        <div>
          <h2>{{ pageTitle }}</h2>
          <p>{{ pageDescription }}</p>
        </div>
        <el-button :loading="loading" @click="loadPage()">刷新</el-button>
      </header>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="mb-16" />

      <section ref="generatorSectionRef" class="generator-card" tabindex="-1">
        <el-form label-position="top">
          <el-form-item label="知识点">
            <el-select
              :id="RESOURCE_NODE_SELECT_ID"
              v-model="selectedNodeId"
              :popper-class="RESOURCE_NODE_POPPER_CLASS"
              filterable
              placeholder="选择知识点"
              @visible-change="handleNodeSelectVisibleChange"
            >
              <el-option
                v-for="node in nodes"
                :key="node.id"
                :label="`${node.name} · ${difficultyLabel(node.difficulty)}`"
                :value="node.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="generatorMode === 'standard' && !isMindMapEntry" label="资源类型">
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
          <el-alert
            v-if="isMindMapEntry"
            title="已选择思维导图，无需再次选择资源类型"
            type="success"
            show-icon
            :closable="false"
            class="mb-16"
          />
          <el-alert
            v-if="isKnowledgeVideoEntry"
            title="已选择视频讲解，无需再次选择资源类型"
            type="success"
            show-icon
            :closable="false"
            class="mb-16"
          />
          <el-form-item v-if="!isDigitalHumanAnswer" label="学习目标">
            <el-input v-model="learningGoal" />
          </el-form-item>
          <template v-if="!isDigitalHumanAnswer">
            <el-form-item label="补充要求">
              <el-input v-model="customRequirement" type="textarea" :rows="2" placeholder="可填写讲解风格、薄弱点、例子要求" />
            </el-form-item>
            <div v-if="generatorMode === 'knowledge_video'" class="option-grid">
              <el-form-item label="时长">
                <el-input-number v-model="durationSeconds" :min="30" :max="1200" :step="30" />
              </el-form-item>
              <el-form-item label="科普主题">
                <el-select v-model="videoTheme">
                  <el-option label="暖白学院" value="warm_academic" />
                  <el-option label="黑板讲解" value="chalk_classroom" />
                  <el-option label="技术蓝图" value="technical_blueprint" />
                </el-select>
              </el-form-item>
            </div>
          </template>
          <div class="button-row">
            <el-button
              v-if="!isDigitalHumanAnswer"
              type="primary"
              :loading="generating"
              :disabled="generatorMode === 'standard' && !resourceTypes.length"
              @click="submitGenerator"
            >
              {{ submitButtonText }}
            </el-button>
          </div>
        </el-form>
        <section v-if="generationResult && !isDigitalHumanAnswer" class="generation-progress">
          <div class="generation-title">
            <strong>任务 {{ generationResult.taskId }}</strong>
            <el-tag :type="statusTagType(generationResult.status)">{{ statusLabel(generationResult.status) }}</el-tag>
          </div>
          <el-progress :percentage="Math.round(generationResult.progress ?? 0)" />
          <p v-if="generationResult.currentStage">stage: {{ generationResult.currentStage }}</p>
          <el-alert v-if="generationResult.errorMessage" :title="generationResult.errorMessage" type="error" show-icon :closable="false" />
        </section>
        <MultimodalTaskProgress
          v-if="multimodalTask?.taskId && !isDigitalHumanAnswer"
          :task-id="multimodalTask.taskId"
          :initial-task="multimodalTask"
          @completed="handleMultimodalCompleted"
          @failed="multimodalTask = $event"
        />
        <DigitalHumanChatPanel
          v-if="isDigitalHumanAnswer"
          :user-id="userId"
          :course-id="courseId"
          :node-id="selectedNodeId"
        />
      </section>

    </section>

    <section v-if="!isDigitalHumanAnswer" class="panel-card resource-detail-panel">
      <header class="resource-detail-toolbar">
        <div>
          <h2>资源详情</h2>
          <p>{{ resourceScopeDescription }}</p>
        </div>
        <label class="resource-picker">
          <span>当前知识点资源</span>
          <el-select
            :model-value="selectedResourceId"
            :disabled="loading || !resources.length"
            placeholder="暂无可查看资源"
            aria-label="选择当前知识点资源"
            @change="selectResource"
          >
            <el-option
              v-for="resource in resources"
              :key="resource.id"
              :label="`${resourceTypeLabel(resource.resourceType)} · ${resource.title} · ${formatDate(resource.createdAt)}`"
              :value="resource.id"
            />
          </el-select>
        </label>
      </header>

      <StateBlock
        :loading="loading"
        :error="errorMessage"
        :empty="!resources.length || !selectedResource"
        :empty-text="emptyResourceText"
        @retry="loadCurrentResources()"
      >
        <article v-if="selectedResource" class="resource-detail">
          <header class="detail-title">
            <h3>{{ selectedResource.title }}</h3>
            <div class="tag-row">
              <el-tag>{{ resourceTypeLabel(selectedResource.resourceType) }}</el-tag>
              <el-tag type="success">{{ auditLabel(selectedResource.auditStatus) }}</el-tag>
            </div>
          </header>

          <template v-if="isVideoResource(selectedResource)">
            <video v-if="selectedResource.fileUrl" class="mp4-player" :src="selectedResource.fileUrl" controls />
            <VideoLessonPlayer
              v-else-if="selectedVideoContent?.scenes.length"
              :content="selectedResource.content"
            />
            <el-alert v-else title="视频资源 JSON 无法解析或尚未生成媒体文件" type="warning" show-icon :closable="false" />
          </template>
          <MindMapViewer v-else-if="selectedResource.resourceType === 'mind_map'" :content="selectedResource.content" />
          <MarkdownContent v-else-if="isMarkdownResource(selectedResource)" :content="selectedResource.content" />
          <pre v-else class="resource-content">{{ selectedResource.content }}</pre>
        </article>
      </StateBlock>
    </section>
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

.resource-detail-panel {
  min-width: 0;
}

.resource-detail-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.resource-detail-toolbar h2,
.resource-detail-toolbar p {
  margin: 0;
}

.resource-detail-toolbar p {
  margin-top: 6px;
  color: var(--nl-text-muted);
}

.resource-picker {
  display: grid;
  flex: 0 1 520px;
  gap: 6px;
  min-width: 260px;
  color: var(--nl-text-muted);
  font-size: 13px;
  font-weight: 700;
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

  .resource-detail-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .resource-picker {
    flex-basis: auto;
    min-width: 0;
    width: 100%;
  }
}
</style>
