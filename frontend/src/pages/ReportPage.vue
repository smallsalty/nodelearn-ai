<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import * as echarts from "echarts";
import MetricCard from "@/components/cards/MetricCard.vue";
import StateBlock from "@/components/StateBlock.vue";
import { reportApi } from "@/api/modules/report";
import { recordsApi } from "@/api/modules/records";
import { getErrorMessage } from "@/api/client";
import { appState } from "@/stores";
import type { LearningEvaluation, StudyReport } from "@/types/report";
import { DEFAULT_COURSE_ID, DEFAULT_USER_ID, formatDate, joinText, percent } from "@/utils/format";

const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const courseId = computed(() => appState.currentCourse?.id ?? DEFAULT_COURSE_ID);
const evaluation = ref<LearningEvaluation | null>(null);
const reports = ref<StudyReport[]>([]);
const selectedReport = ref<StudyReport | null>(null);
const loading = ref(false);
const generating = ref(false);
const errorMessage = ref("");
const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;

onMounted(() => {
  void loadPage();
});

onBeforeUnmount(() => {
  chart?.dispose();
});

async function loadPage() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [evaluationResponse, reportResponse] = await Promise.all([
      recordsApi.getEvaluation(userId.value, courseId.value),
      reportApi.getUserReports(userId.value)
    ]);
    evaluation.value = evaluationResponse.data;
    reports.value = reportResponse.data;
    selectedReport.value = reports.value[0] ?? null;
    await nextTick();
    renderTrend();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function generateReport() {
  generating.value = true;
  errorMessage.value = "";
  try {
    const response = await reportApi.generateReport({
      userId: userId.value,
      courseId: courseId.value,
      includeChart: true,
      exportPdf: false
    });
    reports.value = [response.data, ...reports.value.filter((item) => item.id !== response.data.id)];
    selectedReport.value = response.data;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    generating.value = false;
  }
}

async function exportPdf(report: StudyReport) {
  try {
    const response = await reportApi.exportPdf(report.id);
    selectedReport.value = { ...report, pdfUrl: response.data.pdfUrl };
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

function renderTrend() {
  if (!chartRef.value || !evaluation.value) return;
  chart ??= echarts.init(chartRef.value);
  chart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: 36, right: 20, top: 32, bottom: 28 },
    xAxis: {
      type: "category",
      data: evaluation.value.progressTrend.map((_, index) => `阶段 ${index + 1}`),
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisLabel: { color: "#475569" }
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      splitLine: { lineStyle: { color: "#e2e8f0" } },
      axisLabel: { color: "#475569" }
    },
    series: [
      {
        name: "掌握趋势",
        type: "line",
        smooth: true,
        areaStyle: { opacity: 0.08, color: "#2563eb" },
        lineStyle: { width: 3, color: "#2563eb" },
        itemStyle: { color: "#2563eb" },
        data: evaluation.value.progressTrend
      }
    ]
  });
}
</script>

<template>
  <section class="reports-page two-column-page">
    <section class="panel-card">
      <header class="panel-header">
        <div>
          <h2>学习报告</h2>
          <p>聚合完成率、正确率、薄弱节点和改进建议。</p>
        </div>
        <div class="button-row">
          <el-button :loading="loading" @click="loadPage">刷新</el-button>
          <el-button type="primary" :loading="generating" @click="generateReport">生成报告</el-button>
        </div>
      </header>

      <StateBlock :loading="loading" :error="errorMessage" :empty="!evaluation" empty-text="暂无评估数据" @retry="loadPage">
        <section class="metric-grid compact">
          <MetricCard label="完成率" :value="percent(evaluation?.completionRate)" tone="primary" />
          <MetricCard label="正确率" :value="percent(evaluation?.correctRate)" tone="success" />
          <MetricCard label="平均掌握" :value="Math.round(evaluation?.averageMasteryScore ?? 0)" tone="warning" />
        </section>
        <div ref="chartRef" class="trend-chart" role="img" aria-label="学习掌握趋势图" />
        <el-alert
          :title="evaluation?.advice ?? '暂无建议'"
          type="success"
          show-icon
          :closable="false"
          class="mb-16"
        />
      </StateBlock>
    </section>

    <aside class="side-stack">
      <el-card shadow="never">
        <template #header>报告列表</template>
        <el-empty v-if="!reports.length" description="暂无报告" />
        <button
          v-for="report in reports"
          :key="report.id"
          type="button"
          class="list-button"
          :class="{ active: report.id === selectedReport?.id }"
          @click="selectedReport = report"
        >
          <strong>{{ report.title }}</strong>
          <span>{{ formatDate(report.createdAt) }}</span>
        </button>
      </el-card>

      <el-card shadow="never">
        <template #header>报告详情</template>
        <el-empty v-if="!selectedReport" description="选择或生成报告" />
        <article v-else class="report-detail">
          <h3>{{ selectedReport.title }}</h3>
          <p>{{ selectedReport.summary }}</p>
          <p><strong>薄弱节点：</strong>{{ selectedReport.weakNodeSummary || joinText(evaluation?.weakNodeIds) }}</p>
          <p><strong>改进建议：</strong>{{ selectedReport.improvementAdvice }}</p>
          <el-button type="primary" plain @click="exportPdf(selectedReport)">导出 PDF</el-button>
          <el-link v-if="selectedReport.pdfUrl" :href="selectedReport.pdfUrl" target="_blank">查看 PDF</el-link>
        </article>
      </el-card>
    </aside>
  </section>
</template>
