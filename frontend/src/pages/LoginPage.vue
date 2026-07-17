<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authApi } from "@/api/modules/auth";
import { usersApi } from "@/api/modules/users";
import { getErrorMessage } from "@/api/client";
import { setCurrentUser } from "@/stores";

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const errorMessage = ref("");
const form = reactive({
  username: "demo_student",
  password: "demo_password"
});

const canSubmit = computed(() => form.username.trim().length > 0 && form.password.trim().length > 0);

async function login() {
  if (!canSubmit.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const tokenResponse = await authApi.login({
      username: form.username.trim(),
      password: form.password.trim()
    });
    localStorage.setItem("accessToken", tokenResponse.data.accessToken);
    localStorage.setItem("refreshToken", tokenResponse.data.refreshToken);
    const userResponse = await usersApi.getCurrentUser();
    setCurrentUser(userResponse.data);
    const redirect = typeof route.query.redirect === "string" && route.query.redirect.startsWith("/")
      ? route.query.redirect
      : "/home";
    await router.push(redirect);
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

function fillDemo() {
  form.username = "demo_student";
  form.password = "demo_password";
}
</script>

<template>
  <main class="login-page">
    <section class="login-hero">
      <div class="login-copy">
        <h1>NodeLearn</h1>
        <p>面向数据结构课程的个性化学习工作台。</p>
        <ul>
          <li>真实连接后端 API，不默认使用本地 Mock。</li>
          <li>画像、路径、资源、练习和报告全链路可演示。</li>
          <li>后端不可用时显示明确错误状态。</li>
        </ul>
      </div>

      <el-card class="login-card" shadow="never">
        <template #header>
          <div>
            <h2>登录学习空间</h2>
            <p>使用后端认证接口进入系统</p>
          </div>
        </template>

        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          show-icon
          :closable="false"
          class="mb-16"
        />

        <el-form label-position="top" @submit.prevent="login">
          <el-form-item label="用户名">
            <el-input v-model.trim="form.username" autocomplete="username" placeholder="demo_student" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input
              v-model.trim="form.password"
              autocomplete="current-password"
              placeholder="demo_password"
              show-password
              @keydown.enter.prevent="login"
            />
          </el-form-item>
          <el-button type="primary" size="large" :loading="loading" :disabled="!canSubmit" @click="login">
            登录
          </el-button>
          <el-button size="large" plain @click="fillDemo">填入演示账号</el-button>
        </el-form>
      </el-card>
    </section>
  </main>
</template>
