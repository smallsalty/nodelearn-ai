<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import MetricCard from "@/components/cards/MetricCard.vue";
import StateBlock from "@/components/StateBlock.vue";
import { courseApi } from "@/api/modules/course";
import { profileApi } from "@/api/modules/profile";
import { getErrorMessage } from "@/api/client";
import { appState, setCurrentProfile } from "@/stores";
import type { ChatMessage } from "@/types/agent";
import type { Course, KnowledgeNode } from "@/types/course";
import type { StudentProfile } from "@/types/profile";
import {
  cognitiveStyleLabel,
  DEFAULT_COURSE_ID,
  DEFAULT_USER_ID,
  difficultyLabel,
  joinText,
  practicePreferenceLabel,
  profileUpdateSourceLabel,
  resourceTypeLabel
} from "@/utils/format";

const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const loading = ref(false);
const saving = ref(false);
const extracting = ref(false);
const errorMessage = ref("");
const inputMessage = ref("");
const currentProfile = ref<StudentProfile | null>(null);
const profileDraft = ref<Partial<StudentProfile>>({});
const messages = ref<ChatMessage[]>([]);
const courses = ref<Course[]>([]);
const nodes = ref<KnowledgeNode[]>([]);

const mergedProfile = computed<Partial<StudentProfile>>(() => ({
  ...(currentProfile.value ?? {}),
  ...profileDraft.value
}));

const courseNameMap = computed(() => new Map(courses.value.map((course) => [course.id, course.name])));
const nodeNameMap = computed(() => new Map(nodes.value.map((node) => [node.id, node.name])));
const legacyNodeNameMap: Record<string, string> = {
  node_array_001: "数组",
  node_linked_list_001: "链表",
  node_recursion_001: "递归",
  node_stack_001: "栈",
  node_queue_001: "队列",
  node_tree_001: "树",
  node_graph_001: "图",
  node_sort_001: "排序"
};
const currentCourseName = computed(() => {
  const id = mergedProfile.value.currentCourseId ?? appState.currentCourse?.id ?? DEFAULT_COURSE_ID;
  return courseNameMap.value.get(id) ?? appState.currentCourse?.name ?? "当前课程";
});
const weakNodeNames = computed(() =>
  (mergedProfile.value.weakNodeIds ?? []).map((id) => nodeNameMap.value.get(id) ?? legacyNodeNameMap[id] ?? "待确认的薄弱知识点")
);
const localizedProfileSummary = computed(() => {
  const profile = mergedProfile.value;
  const parts = [
    profile.major ? `专业为${profile.major}` : "",
    profile.grade ? `年级为${profile.grade}` : "",
    `当前学习${currentCourseName.value}`,
    profile.learningGoal ? `学习目标是${profile.learningGoal}` : "",
    profile.knowledgeBaseLevel ? `知识基础为${difficultyLabel(profile.knowledgeBaseLevel)}` : "",
    profile.learningProgress ? `当前进度为${profile.learningProgress}` : "",
    weakNodeNames.value.length ? `需要重点补强${weakNodeNames.value.join("、")}` : "",
    profile.cognitiveStyle ? `偏好${cognitiveStyleLabel(profile.cognitiveStyle)}` : "",
    profile.practicePreference ? `练习方式偏好${practicePreferenceLabel(profile.practicePreference)}` : "",
    profile.availableStudyTime ? `可用学习时间为${profile.availableStudyTime}` : ""
  ].filter(Boolean);
  return parts.length ? `${parts.join("；")}。` : "待补充";
});

const profileItems = computed(() => {
  const profile = mergedProfile.value;
  return [
    { key: "major", label: "专业 / 年级", value: [profile.major, profile.grade].filter(Boolean).join(" / ") || "待补充" },
    { key: "courseGoal", label: "课程与目标", value: [currentCourseName.value, profile.learningGoal].filter(Boolean).join(" / ") || "待补充" },
    { key: "knowledgeBaseLevel", label: "知识基础水平", value: difficultyLabel(profile.knowledgeBaseLevel) },
    { key: "learningProgress", label: "学习进度", value: profile.learningProgress ?? "待补充" },
    { key: "weakNodeIds", label: "薄弱知识点", value: joinText(weakNodeNames.value) },
    { key: "cognitiveStyle", label: "认知风格", value: cognitiveStyleLabel(profile.cognitiveStyle) },
    { key: "practicePreference", label: "练习偏好", value: practicePreferenceLabel(profile.practicePreference) },
    { key: "resourcePreference", label: "资源偏好", value: joinText(profile.resourcePreference?.map(resourceTypeLabel)) },
    { key: "commonMistakes", label: "常见错因", value: joinText(profile.commonMistakes) },
    { key: "availableStudyTime", label: "学习时间", value: profile.availableStudyTime ?? "待补充" },
    { key: "profileSummary", label: "画像摘要", value: localizedProfileSummary.value },
    { key: "lastUpdatedBy", label: "更新来源", value: profileUpdateSourceLabel(profile.lastUpdatedBy) }
  ];
});

const confidencePercent = computed(() => Math.round((mergedProfile.value.confidenceScore ?? 0) * 100));

onMounted(() => {
  messages.value = [
    createMessage("assistant", "请告诉我你的专业年级、当前课程、学习目标、薄弱点和偏好的学习方式。")
  ];
  void loadProfile();
});

async function loadProfile() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [profileResponse, courseResponse, nodeResponse] = await Promise.all([
      profileApi.getProfile(userId.value),
      courseApi.getCourses({ page: 1, pageSize: 50 }),
      courseApi.getNodes(appState.currentCourse?.id ?? DEFAULT_COURSE_ID)
    ]);
    currentProfile.value = profileResponse.data;
    courses.value = courseResponse.data.list;
    nodes.value = nodeResponse.data;
    profileDraft.value = {};
    setCurrentProfile(profileResponse.data);
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function sendMessage() {
  const content = inputMessage.value.trim();
  if (!content) return;
  messages.value.push(createMessage("user", content));
  inputMessage.value = "";
  extracting.value = true;
  errorMessage.value = "";
  try {
    const response = await profileApi.extractProfile({
      userId: userId.value,
      message: content,
      historyMessages: messages.value
    });
    profileDraft.value = {
      ...profileDraft.value,
      ...response.data.extractedFields,
      confidenceScore: response.data.confidenceScore
    };
    const reply = response.data.followUpQuestions.length
      ? response.data.followUpQuestions.join(" ")
      : "画像信息已经比较完整，可以确认保存。";
    messages.value.push(createMessage("assistant", reply));
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    extracting.value = false;
  }
}

async function saveProfile() {
  saving.value = true;
  errorMessage.value = "";
  try {
    const response = await profileApi.updateProfile(userId.value, profileDraft.value);
    currentProfile.value = response.data;
    profileDraft.value = {};
    setCurrentProfile(response.data);
    messages.value.push(createMessage("assistant", "画像已保存，后续学习路径和资源推荐会优先参考这些信息。"));
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    saving.value = false;
  }
}

function useSample() {
  inputMessage.value = "我是计算机科学与技术专业大二学生，当前在学习数据结构，准备数据结构期末考试。链表和递归比较薄弱，常犯链表指针断链、递归终止条件错误和数组下标越界。更喜欢图解和代码案例，练习偏好编程题，每天晚上30分钟。";
}

function createMessage(role: "user" | "assistant", content: string): ChatMessage {
  return {
    id: `message_profile_${Date.now()}_${messages.value.length}`,
    sessionId: "session_profile_demo_001",
    userId: userId.value,
    role,
    content,
    contentType: "text",
    agentType: role === "assistant" ? "profile_agent" : undefined,
    createdAt: new Date().toISOString()
  };
}
</script>

<template>
  <section class="profile-page">
    <section class="panel-card">
      <header class="panel-header">
        <div>
          <h2>学生画像</h2>
          <p>通过自然语言抽取画像字段，再由学生确认保存。</p>
        </div>
        <div class="tag-row">
          <el-tag type="success">{{ confidencePercent }}%</el-tag>
          <el-button :loading="loading" @click="loadProfile">刷新</el-button>
        </div>
      </header>

      <StateBlock :loading="loading" :error="errorMessage" :empty="!mergedProfile.userId" empty-text="暂无画像" @retry="loadProfile">
        <section class="metric-grid compact mb-16">
          <MetricCard label="画像完整度" :value="`${confidencePercent}%`" :hint="mergedProfile.lastUpdatedBy ? `来源：${profileUpdateSourceLabel(mergedProfile.lastUpdatedBy)}` : '等待更新'" tone="primary">
            <el-progress :percentage="confidencePercent" :show-text="false" />
          </MetricCard>
          <MetricCard label="薄弱知识点" :value="mergedProfile.weakNodeIds?.length ?? 0" :hint="joinText(weakNodeNames.slice(0, 3))" tone="warning" />
          <MetricCard label="学习时间" :value="mergedProfile.availableStudyTime ?? '待补充'" :hint="mergedProfile.learningProgress ?? '暂无进度记录'" tone="success" />
        </section>

        <section class="profile-grid">
          <article v-for="item in profileItems" :key="item.key" class="mini-list-item">
            <strong>{{ item.label }}</strong>
            <p>{{ item.value }}</p>
          </article>
        </section>
        <div class="button-row mt-16">
          <el-button type="primary" :loading="saving" :disabled="!Object.keys(profileDraft).length" @click="saveProfile">
            确认保存
          </el-button>
          <el-button plain @click="profileDraft = {}">清空草稿</el-button>
        </div>
      </StateBlock>
    </section>

    <section class="panel-card chat-main-card">
      <header class="panel-header">
        <div>
          <h2>画像对话</h2>
          <p>请输入学习背景。</p>
        </div>
      </header>

      <div class="message-list compact">
        <article v-for="message in messages" :key="message.id" class="chat-bubble" :class="message.role">
          <strong>{{ message.role === "user" ? "我" : "画像智能体" }}</strong>
          <p>{{ message.content }}</p>
        </article>
      </div>

      <footer class="chat-composer">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="5"
          resize="none"
          placeholder="描述你的专业、目标、薄弱点和学习偏好"
          @keydown.ctrl.enter.prevent="sendMessage"
        />
        <div class="button-row">
          <el-button type="primary" :loading="extracting" @click="sendMessage">发送</el-button>
          <el-button plain @click="useSample">填入示例</el-button>
        </div>
      </footer>
    </section>
  </section>
</template>
