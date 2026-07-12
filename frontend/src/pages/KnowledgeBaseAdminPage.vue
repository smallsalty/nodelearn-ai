<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import StateBlock from "@/components/StateBlock.vue";
import { courseApi } from "@/api/modules/course";
import { filesApi } from "@/api/modules/files";
import { getErrorMessage } from "@/api/client";
import { appState, setCurrentCourse } from "@/stores";
import type { Course, KnowledgeNode } from "@/types/course";
import type { KnowledgeBuildTask, RetrievedDocument, UploadedFile } from "@/types/resource";
import { DEFAULT_COURSE_ID, difficultyLabel, formatDate, statusLabel, statusTagType } from "@/utils/format";

const courseId = computed(() => selectedCourseId.value || appState.currentCourse?.id || DEFAULT_COURSE_ID);
const courses = ref<Course[]>([]);
const nodes = ref<KnowledgeNode[]>([]);
const files = ref<UploadedFile[]>([]);
const buildTask = ref<KnowledgeBuildTask | null>(null);
const retrievedDocuments = ref<RetrievedDocument[]>([]);
const selectedCourseId = ref(DEFAULT_COURSE_ID);
const selectedFileIds = ref<string[]>([]);
const searchQuery = ref("栈的后进先出特性");
const loading = ref(false);
const uploading = ref(false);
const building = ref(false);
const searching = ref(false);
const errorMessage = ref("");
const nodeForm = reactive({
  name: "哈希表开放寻址",
  description: "用于演示知识库管理入口的契约节点",
  difficulty: "medium" as const,
  learningValue: 80
});

onMounted(() => {
  void loadPage();
});

async function loadPage() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const courseResponse = await courseApi.getCourses({ page: 1, pageSize: 20 });
    courses.value = courseResponse.data.list;
    if (courses.value[0]) {
      selectedCourseId.value = courses.value[0].id;
      setCurrentCourse(courses.value[0]);
    }
    await loadNodes();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function loadNodes() {
  const response = await courseApi.getNodes(courseId.value);
  nodes.value = response.data;
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  uploading.value = true;
  errorMessage.value = "";
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await filesApi.uploadFile(formData);
    files.value = [response.data, ...files.value];
    selectedFileIds.value = [response.data.id, ...selectedFileIds.value];
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    uploading.value = false;
    input.value = "";
  }
}

async function buildKnowledgeBase() {
  building.value = true;
  errorMessage.value = "";
  try {
    const response = await filesApi.buildKnowledgeBase({
      courseId: courseId.value,
      fileIds: selectedFileIds.value,
      buildMode: "append"
    });
    buildTask.value = response.data;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    building.value = false;
  }
}

async function searchKnowledgeBase() {
  searching.value = true;
  errorMessage.value = "";
  try {
    const response = await filesApi.searchKnowledgeBase({
      courseId: courseId.value,
      nodeId: appState.selectedNodeId ?? undefined,
      query: searchQuery.value,
      topK: 5
    });
    retrievedDocuments.value = response.data;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    searching.value = false;
  }
}

async function createNode() {
  errorMessage.value = "";
  try {
    await courseApi.createNode(courseId.value, {
      courseId: courseId.value,
      name: nodeForm.name,
      description: nodeForm.description,
      nodeType: "concept",
      difficulty: nodeForm.difficulty,
      learningValue: nodeForm.learningValue,
      prerequisiteNodeIds: [],
      nextNodeIds: [],
      commonMistakes: [],
      recommendedPracticeIds: []
    });
    await loadNodes();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}
</script>

<template>
  <section class="admin-page">
    <section class="panel-card">
      <header class="panel-header">
        <div>
          <h2>知识库管理</h2>
          <p>上传课程材料、构建知识库，并对 Hello Algo 材料做 RAG 检索验证。</p>
        </div>
        <el-button :loading="loading" @click="loadPage">刷新</el-button>
      </header>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="mb-16" />

      <StateBlock :loading="loading" :error="errorMessage" :empty="!courses.length" empty-text="暂无课程" @retry="loadPage">
        <el-form label-position="top" class="compact-form">
          <el-form-item label="课程">
            <el-select v-model="selectedCourseId" filterable @change="loadNodes">
              <el-option v-for="course in courses" :key="course.id" :label="course.name" :value="course.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="上传课程文件">
            <input class="file-input" type="file" @change="handleFileChange" />
            <el-button :loading="uploading" plain>等待选择文件</el-button>
          </el-form-item>
          <el-form-item label="构建知识库">
            <el-button type="primary" :loading="building" @click="buildKnowledgeBase">构建知识库</el-button>
          </el-form-item>
        </el-form>
      </StateBlock>

      <el-card v-if="buildTask" shadow="never" class="mt-16">
        <template #header>构建任务</template>
        <div class="tag-row">
          <el-tag :type="statusTagType(buildTask.status)">{{ statusLabel(buildTask.status) }}</el-tag>
          <el-tag>{{ buildTask.progress }}%</el-tag>
          <el-tag type="info">{{ formatDate(buildTask.createdAt) }}</el-tag>
        </div>
        <el-progress :percentage="buildTask.progress" />
        <p v-if="buildTask.errorMessage">{{ buildTask.errorMessage }}</p>
      </el-card>

      <el-card shadow="never" class="mt-16">
        <template #header>RAG 检索测试</template>
        <div class="inline-form">
          <el-input v-model="searchQuery" placeholder="输入检索问题" />
          <el-button type="primary" :loading="searching" @click="searchKnowledgeBase">检索</el-button>
        </div>
        <article v-for="doc in retrievedDocuments" :key="doc.id" class="mini-list-item">
          <strong>{{ doc.title }}</strong>
          <span>score {{ doc.score.toFixed(2) }}</span>
          <p>{{ doc.content.slice(0, 180) }}</p>
        </article>
      </el-card>
    </section>

    <el-tabs class="page-tabs">
      <el-tab-pane label="知识节点" name="nodes">
        <el-empty v-if="!nodes.length" description="暂无节点" />
        <section v-else class="soft-card-grid">
          <button
            v-for="node in nodes.slice(0, 30)"
            :key="node.id"
            type="button"
            class="list-button"
            @click="appState.selectedNodeId = node.id"
          >
            <strong>{{ node.name }}</strong>
            <span>{{ node.nodeType }} · {{ difficultyLabel(node.difficulty) }}</span>
          </button>
        </section>
      </el-tab-pane>

      <el-tab-pane label="新增节点占位" name="create">
        <el-form label-position="top" class="compact-form">
          <el-form-item label="名称">
            <el-input v-model="nodeForm.name" />
          </el-form-item>
          <el-form-item label="说明">
            <el-input v-model="nodeForm.description" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="学习价值">
            <el-input-number v-model="nodeForm.learningValue" :min="1" :max="100" />
          </el-form-item>
          <el-button type="primary" plain @click="createNode">创建节点</el-button>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>
