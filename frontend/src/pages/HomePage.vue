<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import MetricCard from "@/components/cards/MetricCard.vue";
import StateBlock from "@/components/StateBlock.vue";
import { usersApi } from "@/api/modules/users";
import { courseApi } from "@/api/modules/course";
import { profileApi } from "@/api/modules/profile";
import { learningPathApi } from "@/api/modules/learningPath";
import { recommendationsApi } from "@/api/modules/recommendations";
import { recordsApi } from "@/api/modules/records";
import { resourceApi } from "@/api/modules/resource";
import { getErrorMessage } from "@/api/client";
import { appState, setCurrentCourse, setCurrentProfile, setCurrentUser } from "@/stores";
import type { User } from "@/types/auth";
import type { Course } from "@/types/course";
import type { LearningPath } from "@/types/learningPath";
import type { StudentProfile } from "@/types/profile";
import type { LearningEvaluation } from "@/types/report";
import type { GeneratedResource, ResourceRecommendation } from "@/types/resource";
import { DEFAULT_COURSE_ID, DEFAULT_USER_ID, joinText, percent, resourceTypeLabel } from "@/utils/format";

type PanelKey = "user" | "courses" | "profile" | "paths" | "recommendations" | "evaluation" | "resources";

const user = ref<User | null>(null);
const courses = ref<Course[]>([]);
const profile = ref<StudentProfile | null>(null);
const paths = ref<LearningPath[]>([]);
const recommendations = ref<ResourceRecommendation[]>([]);
const evaluation = ref<LearningEvaluation | null>(null);
const recentResources = ref<GeneratedResource[]>([]);
const loading = ref(false);
const errors = reactive<Record<PanelKey, string>>({
  user: "",
  courses: "",
  profile: "",
  paths: "",
  recommendations: "",
  evaluation: "",
  resources: ""
});

const currentCourse = computed(() => courses.value[0] ?? appState.currentCourse);
const currentPath = computed(() => paths.value[0]);
const weakNodes = computed(() => evaluation.value?.weakNodeIds ?? profile.value?.weakNodeIds ?? []);

onMounted(() => {
  void loadDashboard();
});

async function loadDashboard() {
  loading.value = true;
  clearErrors();
  await Promise.all([
    loadUser(),
    loadCourses()
  ]);
  await Promise.all([
    loadProfile(),
    loadPaths(),
    loadRecommendations(),
    loadEvaluation(),
    loadRecentResources()
  ]);
  loading.value = false;
}

async function loadUser() {
  try {
    const response = await usersApi.getCurrentUser();
    user.value = response.data;
    setCurrentUser(response.data);
  } catch (error) {
    errors.user = getErrorMessage(error);
  }
}

async function loadCourses() {
  try {
    const response = await courseApi.getCourses({ page: 1, pageSize: 10 });
    courses.value = response.data.list;
    setCurrentCourse(courses.value[0] ?? null);
  } catch (error) {
    errors.courses = getErrorMessage(error);
  }
}

async function loadProfile() {
  try {
    const response = await profileApi.getProfile(user.value?.id ?? DEFAULT_USER_ID);
    profile.value = response.data;
    setCurrentProfile(response.data);
  } catch (error) {
    errors.profile = getErrorMessage(error);
  }
}

async function loadPaths() {
  try {
    const response = await learningPathApi.getUserLearningPaths(user.value?.id ?? DEFAULT_USER_ID);
    paths.value = response.data;
  } catch (error) {
    errors.paths = getErrorMessage(error);
  }
}

async function loadRecommendations() {
  try {
    const response = await recommendationsApi.getUserRecommendations(user.value?.id ?? DEFAULT_USER_ID);
    recommendations.value = response.data;
  } catch (error) {
    errors.recommendations = getErrorMessage(error);
  }
}

async function loadEvaluation() {
  try {
    const response = await recordsApi.getEvaluation(
      user.value?.id ?? DEFAULT_USER_ID,
      currentCourse.value?.id ?? DEFAULT_COURSE_ID
    );
    evaluation.value = response.data;
  } catch (error) {
    errors.evaluation = getErrorMessage(error);
  }
}

async function loadRecentResources() {
  try {
    const response = await resourceApi.getUserResources(user.value?.id ?? DEFAULT_USER_ID, { page: 1, pageSize: 6 });
    recentResources.value = response.data.list;
  } catch (error) {
    errors.resources = getErrorMessage(error);
  }
}

function clearErrors() {
  (Object.keys(errors) as PanelKey[]).forEach((key) => {
    errors[key] = "";
  });
}
</script>

<template>
  <section class="dashboard-page">
    <header class="hero-panel">
      <div>
        <p class="section-label">Learning Console</p>
        <h2>{{ user?.username ?? appState.currentUser?.username ?? "学习者" }}，继续推进数据结构学习</h2>
        <p>
          当前课程：{{ currentCourse?.name ?? "数据结构" }}。工作台结合画像、知识图谱、课程材料和练习结果给出下一步建议。
        </p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadDashboard">刷新总览</el-button>
    </header>

    <section class="metric-grid">
      <MetricCard label="完成率" :value="percent(evaluation?.completionRate)" tone="primary">
        <el-progress :percentage="Math.round((evaluation?.completionRate ?? 0) * 100)" :show-text="false" />
      </MetricCard>
      <MetricCard
        label="平均掌握度"
        :value="Math.round(evaluation?.averageMasteryScore ?? ((profile?.confidenceScore ?? 0) * 100))"
        :hint="profile?.knowledgeBaseLevel ? `基础水平：${profile.knowledgeBaseLevel}` : '等待画像更新'"
        tone="success"
      />
      <MetricCard label="正确率" :value="percent(evaluation?.correctRate)" :hint="evaluation?.advice ?? '完成练习后生成改进建议'" tone="warning" />
      <MetricCard label="薄弱节点" :value="weakNodes.length" :hint="joinText(weakNodes.slice(0, 3))" tone="danger" />
    </section>

    <section class="dashboard-grid">
      <StateBlock :loading="loading" :error="errors.profile" :empty="!profile" empty-text="暂无画像" @retry="loadProfile">
        <el-card class="learning-card" shadow="never">
          <template #header>学生画像摘要</template>
          <p class="large-text">{{ profile?.profileSummary ?? "画像正在等待对话抽取。" }}</p>
          <div class="tag-row">
            <el-tag>{{ profile?.cognitiveStyle ?? "mixed" }}</el-tag>
            <el-tag type="success">{{ profile?.practicePreference ?? "mixed" }}</el-tag>
            <el-tag type="warning">{{ Math.round((profile?.confidenceScore ?? 0) * 100) }}%</el-tag>
          </div>
        </el-card>
      </StateBlock>

      <StateBlock :loading="loading" :error="errors.paths" :empty="!currentPath" empty-text="暂无学习路径" @retry="loadPaths">
        <el-card class="learning-card" shadow="never">
          <template #header>当前学习路径</template>
          <h3>{{ currentPath?.title }}</h3>
          <p>{{ currentPath?.description ?? currentPath?.targetGoal }}</p>
          <el-steps :active="Math.max(1, currentPath?.pathNodeIds.length ? 2 : 1)" simple>
            <el-step title="画像" />
            <el-step title="规划" />
            <el-step title="资源" />
            <el-step title="练习" />
          </el-steps>
        </el-card>
      </StateBlock>

      <StateBlock
        :loading="loading"
        :error="errors.recommendations"
        :empty="!recommendations.length"
        empty-text="暂无推荐资源"
        @retry="loadRecommendations"
      >
        <el-card class="learning-card span-2" shadow="never">
          <template #header>推荐资源</template>
          <div class="resource-strip">
            <article v-for="item in recommendations.slice(0, 4)" :key="item.id" class="resource-chip-card">
              <strong>{{ item.title }}</strong>
              <span>{{ resourceTypeLabel(item.resourceType) }}</span>
              <p>{{ item.reason }}</p>
            </article>
          </div>
        </el-card>
      </StateBlock>

      <StateBlock
        :loading="loading"
        :error="errors.resources"
        :empty="!recentResources.length"
        empty-text="暂无最近资源"
        @retry="loadRecentResources"
      >
        <el-card class="learning-card span-2" shadow="never">
          <template #header>最近资源</template>
          <div class="resource-strip">
            <article v-for="item in recentResources.slice(0, 6)" :key="item.id" class="resource-chip-card">
              <strong>{{ item.title }}</strong>
              <span>{{ resourceTypeLabel(item.resourceType) }}</span>
              <p>{{ item.auditStatus }} · {{ item.status }}</p>
            </article>
          </div>
        </el-card>
      </StateBlock>
    </section>
  </section>
</template>
