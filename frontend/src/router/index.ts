import { createRouter, createWebHistory } from 'vue-router';
import HomeLoginView from '../views/HomeLoginView.vue';
import ChatLearningView from '../views/ChatLearningView.vue';
import StudentProfileView from '../views/StudentProfileView.vue';
import LearningPathView from '../views/LearningPathView.vue';
import ResourceGenerationView from '../views/ResourceGenerationView.vue';
import KnowledgeGraphView from '../views/KnowledgeGraphView.vue';
import LearningReportView from '../views/LearningReportView.vue';
import FloatingNotesQaView from '../views/FloatingNotesQaView.vue';
import EvaluationFeedbackView from '../views/EvaluationFeedbackView.vue';
import AdminKnowledgeBaseView from '../views/AdminKnowledgeBaseView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home-login', component: HomeLoginView },
    { path: '/chat-learning', name: 'chat-learning', component: ChatLearningView },
    { path: '/student-profile', name: 'student-profile', component: StudentProfileView },
    { path: '/learning-path', name: 'learning-path', component: LearningPathView },
    { path: '/resource-generation', name: 'resource-generation', component: ResourceGenerationView },
    { path: '/knowledge-graph', name: 'knowledge-graph', component: KnowledgeGraphView },
    { path: '/learning-report', name: 'learning-report', component: LearningReportView },
    { path: '/floating-notes-qa', name: 'floating-notes-qa', component: FloatingNotesQaView },
    { path: '/evaluation-feedback', name: 'evaluation-feedback', component: EvaluationFeedbackView },
    { path: '/admin/knowledge-base', name: 'admin-knowledge-base', component: AdminKnowledgeBaseView },
  ],
});

export default router;
