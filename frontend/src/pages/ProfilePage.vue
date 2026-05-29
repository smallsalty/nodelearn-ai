<template>
  <main class="page-shell">
    <section class="profile-layout">
      <aside class="profile-panel">
        <div class="panel-heading">
          <h1 class="page-title">学生画像</h1>
          <el-tag size="small" type="success">{{ confidencePercent }}%</el-tag>
        </div>

        <el-descriptions :column="1" border>
          <el-descriptions-item
            v-for="item in profileItems"
            :key="item.key"
            :label="item.label"
          >
            {{ item.value }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="profile-actions">
          <el-button type="primary" :loading="saving" @click="saveProfile">确认保存</el-button>
          <el-button :loading="loading" @click="loadProfile">刷新</el-button>
        </div>

        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          show-icon
          :closable="false"
        />
      </aside>

      <section class="chat-panel">
        <div class="chat-list">
          <article
            v-for="message in messages"
            :key="message.id"
            class="chat-message"
            :class="message.role"
          >
            <span class="message-role">{{ message.role === "user" ? "我" : "画像智能体" }}</span>
            <p>{{ message.content }}</p>
          </article>
        </div>

        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="5"
          resize="none"
          placeholder="例如：我是计算机专业大二学生，准备数据结构期末考试，数组已学完，链表学习中，喜欢图解和代码案例，每天晚上30分钟。"
          @keydown.ctrl.enter.prevent="sendMessage"
        />

        <div class="chat-actions">
          <el-button type="primary" :loading="extracting" @click="sendMessage">发送</el-button>
          <el-button @click="useSample">填入示例</el-button>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { profileApi } from "@/api/modules/profile";
import type { ChatMessage } from "@/types/agent";
import type { StudentProfile } from "@/types/profile";

const userId = "user_demo_001";
const loading = ref(false);
const saving = ref(false);
const extracting = ref(false);
const errorMessage = ref("");
const inputMessage = ref("");
const currentProfile = ref<StudentProfile | null>(null);
const profileDraft = ref<Partial<StudentProfile>>({});
const messages = ref<ChatMessage[]>([
  {
    id: "message_profile_welcome",
    sessionId: "session_profile_demo_001",
    userId,
    role: "assistant",
    content: "我们先建立你的学习画像。请告诉我你的专业年级、当前课程、学习目标、薄弱点和偏好的学习方式。",
    contentType: "text",
    agentType: "profile_agent",
    createdAt: new Date().toISOString()
  }
]);

const profileItems = computed(() => {
  const profile = mergedProfile.value;
  return [
    { key: "id", label: "身份标识", value: profile.id ?? "待补充" },
    { key: "userId", label: "用户关联", value: profile.userId ?? "待补充" },
    { key: "major", label: "专业 / 年级", value: joinText([profile.major, profile.grade]) },
    { key: "courseGoal", label: "课程与目标", value: joinText([profile.currentCourseId, profile.learningGoal]) },
    { key: "knowledgeBaseLevel", label: "知识基础水平", value: profile.knowledgeBaseLevel ?? "待补充" },
    { key: "learningProgress", label: "学习进度", value: profile.learningProgress ?? "待补充" },
    { key: "weakNodeIds", label: "薄弱知识点", value: joinText(profile.weakNodeIds) },
    { key: "cognitiveStyle", label: "认知风格", value: profile.cognitiveStyle ?? "待补充" },
    { key: "practicePreference", label: "练习偏好", value: profile.practicePreference ?? "待补充" },
    { key: "commonMistakes", label: "常见易错点", value: joinText(profile.commonMistakes) },
    { key: "availableStudyTime", label: "学习时间安排", value: profile.availableStudyTime ?? "待补充" },
    { key: "resourcePreference", label: "资源偏好", value: joinText(profile.resourcePreference) },
    { key: "profileSummary", label: "画像摘要", value: profile.profileSummary ?? "待补充" },
    { key: "lastUpdatedBy", label: "更新来源", value: profile.lastUpdatedBy ?? "待补充" },
    { key: "createdAt", label: "创建时间", value: profile.createdAt ?? "待补充" },
    { key: "updatedAt", label: "更新时间", value: profile.updatedAt ?? "待补充" }
  ];
});

const mergedProfile = computed<Partial<StudentProfile>>(() => ({
  ...(currentProfile.value ?? {}),
  ...profileDraft.value
}));

const confidencePercent = computed(() => {
  const confidenceScore = profileDraft.value.confidenceScore ?? currentProfile.value?.confidenceScore ?? 0;
  return Math.round(confidenceScore * 100);
});

onMounted(() => {
  void loadProfile();
});

async function loadProfile() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await profileApi.getProfile(userId);
    currentProfile.value = response.data;
    profileDraft.value = {};
  } catch {
    errorMessage.value = "画像读取失败";
  } finally {
    loading.value = false;
  }
}

async function sendMessage() {
  const content = inputMessage.value.trim();
  if (!content) {
    return;
  }

  const userMessage = createMessage("user", content);
  messages.value.push(userMessage);
  inputMessage.value = "";
  extracting.value = true;
  errorMessage.value = "";

  try {
    const response = await profileApi.extractProfile({
      userId,
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
  } catch {
    errorMessage.value = "画像抽取失败";
  } finally {
    extracting.value = false;
  }
}

async function saveProfile() {
  saving.value = true;
  errorMessage.value = "";
  try {
    const response = await profileApi.updateProfile(userId, profileDraft.value);
    currentProfile.value = response.data;
    profileDraft.value = {};
    messages.value.push(createMessage("assistant", "画像已保存，后续学习路径和资源推荐会优先参考这些信息。"));
  } catch {
    errorMessage.value = "画像保存失败";
  } finally {
    saving.value = false;
  }
}

function useSample() {
  inputMessage.value = "我是计算机科学与技术专业大二学生，当前在学习数据结构，准备数据结构期末考试。我的基础偏弱，数组已学完，链表学习中，链表和递归比较薄弱，常犯链表指针断链、递归终止条件错误和数组下标越界。更喜欢图解和代码案例，练习偏好编程题，每天晚上30分钟。";
}

function createMessage(role: "user" | "assistant", content: string): ChatMessage {
  return {
    id: `message_profile_${Date.now()}_${messages.value.length}`,
    sessionId: "session_profile_demo_001",
    userId,
    role,
    content,
    contentType: "text",
    agentType: role === "assistant" ? "profile_agent" : undefined,
    createdAt: new Date().toISOString()
  };
}

function joinText(values?: Array<string | undefined> | string[]) {
  const text = (values ?? []).filter(Boolean).join(" / ");
  return text || "待补充";
}
</script>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: minmax(320px, 460px) minmax(0, 1fr);
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.profile-panel,
.chat-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
}

.panel-heading,
.profile-actions,
.chat-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-heading {
  justify-content: space-between;
  margin-bottom: 16px;
}

.profile-actions,
.chat-actions {
  margin-top: 16px;
}

.chat-panel {
  display: grid;
  grid-template-rows: minmax(360px, 1fr) auto auto;
  min-height: 680px;
}

.chat-list {
  overflow: auto;
  padding-right: 4px;
}

.chat-message {
  max-width: 78%;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.chat-message.user {
  margin-left: auto;
  background: #eef6ff;
  border-color: #bfdbfe;
}

.message-role {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #6b7280;
}

.chat-message p {
  margin: 0;
  line-height: 1.7;
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }

  .chat-panel {
    min-height: 560px;
  }
}
</style>
