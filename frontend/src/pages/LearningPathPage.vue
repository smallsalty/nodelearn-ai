<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import StateBlock from "@/components/StateBlock.vue";
import { learningPathApi } from "@/api/modules/learningPath";
import { profileApi } from "@/api/modules/profile";
import { getErrorMessage } from "@/api/client";
import { appState, setCurrentProfile } from "@/stores";
import type { LearningPath, LearningTask } from "@/types/learningPath";
import type { TaskStatus } from "@/types/contracts";
import { DEFAULT_COURSE_ID, DEFAULT_USER_ID, formatDate, statusLabel, statusTagType } from "@/utils/format";

const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const courseId = computed(() => appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const paths = ref<LearningPath[]>([]);
const selectedPathId = ref("");
const tasks = ref<LearningTask[]>([]);
const targetGoal = ref("准备数据结构期末考试，优先补强栈、递归和哈希表");
const timeBudget = ref("每天晚上30分钟");
const loading = ref(false);
const generating = ref(false);
const errorMessage = ref("");

const currentPath = computed(() => paths.value.find((path) => path.id === selectedPathId.value) ?? paths.value[0]);

onMounted(() => {
  void loadPage();
});

async function loadPage() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [pathResponse, profileResponse] = await Promise.all([
      learningPathApi.getUserLearningPaths(userId.value),
      profileApi.getProfile(userId.value)
    ]);
    paths.value = pathResponse.data;
    setCurrentProfile(profileResponse.data);
    if (!selectedPathId.value && paths.value[0]) selectedPathId.value = paths.value[0].id;
    await loadTasks();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function loadTasks() {
  if (!currentPath.value) {
    tasks.value = [];
    return;
  }
  const response = await learningPathApi.getLearningTasks(currentPath.value.id);
  tasks.value = response.data;
}

async function generatePath() {
  generating.value = true;
  errorMessage.value = "";
  try {
    const response = await learningPathApi.generateLearningPath({
      userId: userId.value,
      courseId: courseId.value,
      targetGoal: targetGoal.value,
      timeBudget: timeBudget.value,
      weakNodeIds: appState.currentProfile?.weakNodeIds
    });
    paths.value = [response.data, ...paths.value.filter((item) => item.id !== response.data.id)];
    selectedPathId.value = response.data.id;
    await loadTasks();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    generating.value = false;
  }
}

async function updateTask(task: LearningTask, status: TaskStatus) {
  const response = await learningPathApi.updateLearningTaskStatus(task.id, {
    status,
    completedAt: status === "success" ? new Date().toISOString() : undefined
  });
  tasks.value = tasks.value.map((item) => (item.id === task.id ? response.data : item));
}
</script>

<template>
  <section class="learning-path-page two-column-page">
    <section class="panel-card">
      <header class="panel-header">
        <div>
          <h2>个性化学习路径</h2>
          <p>根据学生画像、薄弱点和课程图谱生成阶段化任务。</p>
        </div>
        <el-button :loading="loading" @click="loadPage">刷新</el-button>
      </header>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="mb-16" />

      <el-form class="compact-form" label-position="top">
        <el-form-item label="学习目标">
          <el-input v-model="targetGoal" />
        </el-form-item>
        <el-form-item label="时间预算">
          <el-input v-model="timeBudget" />
        </el-form-item>
        <el-button type="primary" :loading="generating" @click="generatePath">生成路径</el-button>
      </el-form>

      <StateBlock :loading="loading" :error="errorMessage" :empty="!currentPath" empty-text="暂无学习路径" @retry="loadPage">
        <section v-if="currentPath" class="path-summary">
          <el-select v-model="selectedPathId" placeholder="选择路径" @change="loadTasks">
            <el-option v-for="path in paths" :key="path.id" :label="path.title" :value="path.id" />
          </el-select>
          <h3>{{ currentPath.title }}</h3>
          <p>{{ currentPath.description ?? currentPath.targetGoal }}</p>
          <div class="tag-row">
            <el-tag>{{ currentPath.currentStage }}</el-tag>
            <el-tag :type="statusTagType(currentPath.status)">{{ statusLabel(currentPath.status) }}</el-tag>
            <el-tag type="info">{{ currentPath.pathNodeIds.length }} 个节点</el-tag>
          </div>
        </section>
      </StateBlock>
    </section>

    <aside class="panel-card">
      <header class="panel-header">
        <div>
          <h2>路径任务</h2>
          <p>任务状态会通过契约接口更新。</p>
        </div>
      </header>
      <el-empty v-if="!tasks.length" description="暂无任务" />
      <el-timeline v-else>
        <el-timeline-item v-for="task in tasks" :key="task.id" :timestamp="formatDate(task.createdAt)">
          <article class="task-card">
            <header>
              <strong>{{ task.title }}</strong>
              <el-tag size="small" :type="statusTagType(task.status)">{{ statusLabel(task.status) }}</el-tag>
            </header>
            <p>{{ task.taskType }} · {{ task.nodeId }}</p>
            <div class="button-row">
              <el-button size="small" plain @click="updateTask(task, 'running')">开始</el-button>
              <el-button size="small" type="success" plain @click="updateTask(task, 'success')">完成</el-button>
            </div>
          </article>
        </el-timeline-item>
      </el-timeline>
    </aside>
  </section>
</template>
