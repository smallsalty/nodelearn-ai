<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  Delete,
  EditPen,
  Notebook,
  Plus,
  Search,
  Star,
  StarFilled
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import MarkdownContent from "@/components/MarkdownContent.vue";
import { courseApi } from "@/api/modules/course";
import { noteApi } from "@/api/modules/note";
import { getErrorMessage } from "@/api/client";
import { appState, notifyNotesChanged } from "@/stores";
import type { Course, KnowledgeNode } from "@/types/course";
import type { Note, NoteCreateRequest, NoteUpdateRequest } from "@/types/note";
import { DEFAULT_COURSE_ID, DEFAULT_USER_ID, formatDate } from "@/utils/format";

interface NoteDraft {
  title: string;
  content: string;
  tags: string[];
  courseId: string;
  nodeId: string;
  questionId: string;
  relationType: Note["relationType"];
  relationId: string;
  pinned: boolean;
}

const route = useRoute();
const router = useRouter();
const userId = computed(() => appState.currentUser?.id ?? DEFAULT_USER_ID);
const currentCourseId = computed(() => appState.currentCourse?.id ?? DEFAULT_COURSE_ID);

const courses = ref<Course[]>([]);
const nodes = ref<KnowledgeNode[]>([]);
const notes = ref<Note[]>([]);
const allUserNotes = ref<Note[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const keyword = ref("");
const courseFilter = ref("");
const nodeFilter = ref("");
const tagFilter = ref("");
const pinnedOnly = ref(false);
const selectedNoteId = ref<string | null>(null);
const isNewDraft = ref(false);
const mobileDetailVisible = ref(false);
const editorTab = ref<"edit" | "preview">("edit");
const loading = ref(false);
const contextLoading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const savedSignature = ref("");

const draft = reactive<NoteDraft>({
  title: "",
  content: "",
  tags: [],
  courseId: "",
  nodeId: "",
  questionId: "",
  relationType: null,
  relationId: "",
  pinned: false
});

const selectedNote = computed(() => allUserNotes.value.find((note) => note.id === selectedNoteId.value));
const hasDraft = computed(() => isNewDraft.value || Boolean(selectedNoteId.value));
const draftSignature = computed(() => JSON.stringify({
  title: draft.title,
  content: draft.content,
  tags: draft.tags,
  courseId: draft.courseId,
  nodeId: draft.nodeId,
  questionId: draft.questionId,
  relationType: draft.relationType,
  relationId: draft.relationId,
  pinned: draft.pinned
}));
const dirty = computed(() => hasDraft.value && draftSignature.value !== savedSignature.value);
const canSave = computed(() => Boolean(draft.title.trim() && draft.content.trim()) && dirty.value && !saving.value);
const tagOptions = computed(() => [...new Set(allUserNotes.value.flatMap((note) => note.tags))].sort((a, b) => a.localeCompare(b, "zh-CN")));
const visibleNodes = computed(() => {
  const targetCourseId = draft.courseId || courseFilter.value || currentCourseId.value;
  return nodes.value.filter((node) => node.courseId === targetCourseId);
});

onMounted(async () => {
  courseFilter.value = currentCourseId.value;
  await loadContext();
  await loadNotes();
  window.addEventListener("keydown", handleSaveShortcut);
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleSaveShortcut);
  window.removeEventListener("beforeunload", handleBeforeUnload);
});

onBeforeRouteLeave(async () => await confirmDiscard());

watch(
  () => appState.notesRevision,
  async () => {
    const preserveDraft = dirty.value;
    await loadNotes({ preserveSelection: true, preserveDraft });
  }
);

watch(
  () => route.query.noteId,
  async (noteId) => {
    if (typeof noteId !== "string" || noteId === selectedNoteId.value) return;
    await selectNoteById(noteId);
  }
);

async function loadContext() {
  contextLoading.value = true;
  try {
    const [courseResponse, nodeResponse] = await Promise.all([
      courseApi.getCourses({ page: 1, pageSize: 50 }),
      courseApi.getNodes(currentCourseId.value)
    ]);
    courses.value = courseResponse.data.list;
    nodes.value = nodeResponse.data;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    contextLoading.value = false;
  }
}

async function loadNotes(options: { preserveSelection?: boolean; preserveDraft?: boolean } = {}) {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [listResponse, allResponse] = await Promise.all([
      noteApi.listNotes({
        userId: userId.value,
        page: page.value,
        pageSize,
        keyword: keyword.value.trim() || undefined,
        courseId: courseFilter.value || undefined,
        nodeId: nodeFilter.value || undefined,
        tag: tagFilter.value || undefined,
        pinned: pinnedOnly.value || undefined
      }),
      noteApi.getUserNotes(userId.value)
    ]);
    notes.value = listResponse.data.list;
    total.value = listResponse.data.total;
    allUserNotes.value = allResponse.data;

    const deepLinkedId = typeof route.query.noteId === "string" ? route.query.noteId : null;
    const nextId = options.preserveSelection
      ? selectedNoteId.value
      : deepLinkedId ?? selectedNoteId.value ?? notes.value[0]?.id ?? null;
    const stillExists = nextId && allUserNotes.value.some((note) => note.id === nextId);
    if (!stillExists && !isNewDraft.value) {
      selectedNoteId.value = notes.value[0]?.id ?? null;
    } else if (stillExists) {
      selectedNoteId.value = nextId;
    }
    appState.selectedNoteId = selectedNoteId.value;
    if (!options.preserveDraft && selectedNoteId.value && !isNewDraft.value) {
      applyNoteToDraft(allUserNotes.value.find((note) => note.id === selectedNoteId.value)!);
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function runSearch() {
  page.value = 1;
  await loadNotes();
}

async function resetFilters() {
  keyword.value = "";
  courseFilter.value = currentCourseId.value;
  nodeFilter.value = "";
  tagFilter.value = "";
  pinnedOnly.value = false;
  page.value = 1;
  await loadNotes();
}

async function changePage(nextPage: number) {
  page.value = nextPage;
  await loadNotes();
}

async function selectNote(note: Note) {
  if (note.id === selectedNoteId.value && !isNewDraft.value) {
    mobileDetailVisible.value = true;
    await replaceDeepLink(note.id);
    return;
  }
  if (!(await confirmDiscard())) return;
  isNewDraft.value = false;
  selectedNoteId.value = note.id;
  appState.selectedNoteId = note.id;
  applyNoteToDraft(note);
  mobileDetailVisible.value = true;
  await replaceDeepLink(note.id);
}

async function selectNoteById(noteId: string) {
  if (!(await confirmDiscard())) return;
  try {
    const response = await noteApi.getNote(noteId);
    if (response.data.userId !== userId.value) return;
    isNewDraft.value = false;
    selectedNoteId.value = response.data.id;
    appState.selectedNoteId = response.data.id;
    applyNoteToDraft(response.data);
    mobileDetailVisible.value = true;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function startNewNote() {
  if (!(await confirmDiscard())) return;
  selectedNoteId.value = null;
  appState.selectedNoteId = null;
  isNewDraft.value = true;
  Object.assign(draft, {
    title: "",
    content: "",
    tags: [],
    courseId: currentCourseId.value,
    nodeId: appState.selectedNodeId ?? "",
    questionId: appState.selectedQuestionId ?? "",
    relationType: appState.selectedQuestionId ? "question" : appState.selectedNodeId ? "node" : null,
    relationId: appState.selectedQuestionId ?? appState.selectedNodeId ?? "",
    pinned: false
  } satisfies NoteDraft);
  savedSignature.value = draftSignature.value;
  editorTab.value = "edit";
  mobileDetailVisible.value = true;
  await replaceDeepLink(null);
}

function applyNoteToDraft(note: Note) {
  Object.assign(draft, {
    title: note.title,
    content: note.content,
    tags: [...note.tags],
    courseId: note.courseId ?? "",
    nodeId: note.nodeId ?? "",
    questionId: note.questionId ?? "",
    relationType: note.relationType ?? null,
    relationId: note.relationId ?? "",
    pinned: note.pinned
  } satisfies NoteDraft);
  savedSignature.value = draftSignature.value;
}

function changeDraftNode(nodeId: string) {
  draft.nodeId = nodeId;
  if (nodeId) {
    draft.relationType = "node";
    draft.relationId = nodeId;
  } else if (draft.relationType === "node") {
    draft.relationType = null;
    draft.relationId = "";
  }
}

async function saveNote() {
  if (!draft.title.trim() || !draft.content.trim() || saving.value) return;
  saving.value = true;
  errorMessage.value = "";
  try {
    let saved: Note;
    if (isNewDraft.value) {
      const shouldPin = draft.pinned;
      const payload: NoteCreateRequest = {
        userId: userId.value,
        courseId: draft.courseId || undefined,
        nodeId: draft.nodeId || undefined,
        questionId: draft.questionId || undefined,
        title: draft.title.trim(),
        content: draft.content.trim(),
        tags: draft.tags,
        relationType: draft.relationType || undefined,
        relationId: draft.relationId || undefined
      };
      saved = (await noteApi.createNote(payload)).data;
      if (shouldPin) saved = (await noteApi.pinNote(saved.id, { pinned: true })).data;
    } else if (selectedNoteId.value) {
      const payload: NoteUpdateRequest = {
        courseId: draft.courseId || null,
        nodeId: draft.nodeId || null,
        questionId: draft.questionId || null,
        title: draft.title.trim(),
        content: draft.content.trim(),
        tags: draft.tags,
        relationType: draft.relationType || null,
        relationId: draft.relationId || null
      };
      saved = (await noteApi.updateNote(selectedNoteId.value, payload)).data;
    } else {
      return;
    }
    isNewDraft.value = false;
    selectedNoteId.value = saved.id;
    appState.selectedNoteId = saved.id;
    applyNoteToDraft(saved);
    await replaceDeepLink(saved.id);
    notifyNotesChanged();
    ElMessage.success("笔记已保存");
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    saving.value = false;
  }
}

async function togglePin(note: Note) {
  try {
    const updated = (await noteApi.pinNote(note.id, { pinned: !note.pinned })).data;
    if (updated.id === selectedNoteId.value && !dirty.value) applyNoteToDraft(updated);
    notifyNotesChanged();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function toggleDraftPin() {
  if (isNewDraft.value) {
    draft.pinned = !draft.pinned;
    return;
  }
  const note = selectedNote.value;
  if (!note) return;
  try {
    const updated = (await noteApi.pinNote(note.id, { pinned: !note.pinned })).data;
    applyNoteToDraft(updated);
    notifyNotesChanged();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function deleteCurrentNote() {
  if (!selectedNoteId.value || isNewDraft.value) return;
  try {
    await ElMessageBox.confirm("删除后无法恢复，确定删除这条学习笔记吗？", "删除笔记", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning"
    });
    await noteApi.deleteNote(selectedNoteId.value);
    selectedNoteId.value = null;
    appState.selectedNoteId = null;
    isNewDraft.value = false;
    savedSignature.value = "";
    mobileDetailVisible.value = false;
    await replaceDeepLink(null);
    notifyNotesChanged();
    ElMessage.success("笔记已删除");
  } catch (error) {
    if (error === "cancel" || error === "close") return;
    errorMessage.value = getErrorMessage(error);
  }
}

async function closeMobileDetail() {
  if (!(await confirmDiscard())) return;
  mobileDetailVisible.value = false;
  await replaceDeepLink(null);
}

async function confirmDiscard(): Promise<boolean> {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm("当前笔记还有未保存内容，放弃这些修改吗？", "未保存的笔记", {
      confirmButtonText: "放弃修改",
      cancelButtonText: "继续编辑",
      type: "warning"
    });
    discardDraftChanges();
    return true;
  } catch {
    return false;
  }
}

function discardDraftChanges() {
  if (isNewDraft.value) {
    isNewDraft.value = false;
    selectedNoteId.value = null;
    appState.selectedNoteId = null;
    Object.assign(draft, {
      title: "",
      content: "",
      tags: [],
      courseId: "",
      nodeId: "",
      questionId: "",
      relationType: null,
      relationId: "",
      pinned: false
    } satisfies NoteDraft);
    savedSignature.value = draftSignature.value;
    return;
  }

  const note = selectedNote.value;
  if (note) applyNoteToDraft(note);
  else savedSignature.value = draftSignature.value;
}

function handleSaveShortcut(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
  event.preventDefault();
  if (canSave.value) void saveNote();
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = "";
}

async function replaceDeepLink(noteId: string | null) {
  const query = { ...route.query };
  if (noteId) query.noteId = noteId;
  else delete query.noteId;
  await router.replace({ path: "/notes", query });
}
</script>

<template>
  <section class="note-page">
    <header class="note-page-header">
      <div>
        <div class="eyebrow"><el-icon><Notebook /></el-icon><span>记录 · 整理 · 回顾</span></div>
        <h2>学习笔记</h2>
        <p>把课程结论、代码思路和易错点留在对应知识点下，随时从学习浮窗继续记录。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="startNewNote">新建笔记</el-button>
    </header>

    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

    <section class="note-filters" aria-label="笔记筛选">
      <el-input
        v-model="keyword"
        clearable
        placeholder="搜索标题、正文或标签"
        aria-label="搜索学习笔记"
        @keyup.enter="runSearch"
        @clear="runSearch"
      >
        <template #append><el-button :icon="Search" aria-label="执行搜索" @click="runSearch" /></template>
      </el-input>
      <el-select v-model="courseFilter" aria-label="按课程筛选" @change="nodeFilter = ''; runSearch()">
        <el-option label="全部课程" value="" />
        <el-option v-for="course in courses" :key="course.id" :label="course.name" :value="course.id" />
      </el-select>
      <el-select v-model="nodeFilter" clearable filterable placeholder="全部知识点" aria-label="按知识点筛选" @change="runSearch">
        <el-option v-for="node in nodes" :key="node.id" :label="node.name" :value="node.id" />
      </el-select>
      <el-select v-model="tagFilter" clearable filterable placeholder="全部标签" aria-label="按标签筛选" @change="runSearch">
        <el-option v-for="tag in tagOptions" :key="tag" :label="tag" :value="tag" />
      </el-select>
      <el-checkbox v-model="pinnedOnly" border @change="runSearch">仅看置顶</el-checkbox>
      <el-button text @click="resetFilters">重置</el-button>
    </section>

    <section class="note-workspace" :class="{ 'mobile-detail-visible': mobileDetailVisible }">
      <aside class="note-list-pane" aria-label="学习笔记列表">
        <div class="note-list-summary">
          <strong>笔记列表</strong>
          <span>共 {{ total }} 条</span>
        </div>
        <el-skeleton v-if="loading" :rows="6" animated />
        <div v-else-if="notes.length" class="note-list">
          <button
            v-for="note in notes"
            :key="note.id"
            v-memo="[note.id, note.updatedAt, note.pinned, selectedNoteId]"
            type="button"
            class="note-list-item"
            :class="{ active: note.id === selectedNoteId && !isNewDraft }"
            @click="selectNote(note)"
          >
            <span class="note-item-title-row">
              <strong>{{ note.title }}</strong>
              <span
                class="pin-action"
                role="button"
                tabindex="0"
                :aria-label="note.pinned ? '取消置顶' : '置顶笔记'"
                @click.stop="togglePin(note)"
                @keydown.enter.stop.prevent="togglePin(note)"
              >
                <el-icon><StarFilled v-if="note.pinned" /><Star v-else /></el-icon>
              </span>
            </span>
            <span class="note-excerpt">{{ note.content }}</span>
            <span v-if="note.tags.length" class="note-tags">
              <el-tag v-for="tag in note.tags.slice(0, 3)" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
            </span>
            <span class="note-meta">
              <span>{{ nodes.find((node) => node.id === note.nodeId)?.name ?? '课程笔记' }}</span>
              <time>{{ formatDate(note.updatedAt) }}</time>
            </span>
          </button>
        </div>
        <el-empty v-else description="还没有符合条件的笔记">
          <el-button type="primary" :icon="Plus" @click="startNewNote">记录第一条笔记</el-button>
        </el-empty>
        <el-pagination
          v-if="total > pageSize"
          small
          background
          layout="prev, pager, next"
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          @current-change="changePage"
        />
      </aside>

      <section class="note-editor-pane" aria-label="笔记编辑区">
        <template v-if="hasDraft">
          <header class="note-editor-header">
            <div class="editor-title-row">
              <el-button class="mobile-back" text :icon="ArrowLeft" @click="closeMobileDetail">返回列表</el-button>
              <div>
                <strong>{{ isNewDraft ? '新建学习笔记' : '编辑学习笔记' }}</strong>
                <span :class="{ dirty }">{{ dirty ? '有未保存修改' : '已与服务端同步' }}</span>
              </div>
            </div>
            <div class="editor-actions">
              <el-button
                :icon="draft.pinned ? StarFilled : Star"
                :disabled="saving"
                @click="toggleDraftPin"
              >{{ draft.pinned ? '已置顶' : '置顶' }}</el-button>
              <el-button v-if="!isNewDraft" type="danger" plain :icon="Delete" @click="deleteCurrentNote">删除</el-button>
              <el-button type="primary" :icon="EditPen" :loading="saving" :disabled="!canSave" @click="saveNote">保存</el-button>
            </div>
          </header>

          <section class="note-fields">
            <el-input v-model="draft.title" size="large" maxlength="255" show-word-limit placeholder="笔记标题" aria-label="笔记标题" />
            <div class="note-context-fields">
              <el-select v-model="draft.courseId" :loading="contextLoading" placeholder="选择课程" aria-label="笔记课程" @change="changeDraftNode('')">
                <el-option v-for="course in courses" :key="course.id" :label="course.name" :value="course.id" />
              </el-select>
              <el-select
                :model-value="draft.nodeId"
                clearable
                filterable
                placeholder="关联知识点（可选）"
                aria-label="笔记知识点"
                @change="changeDraftNode"
              >
                <el-option v-for="node in visibleNodes" :key="node.id" :label="node.name" :value="node.id" />
              </el-select>
              <el-select
                v-model="draft.tags"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="添加标签"
                aria-label="笔记标签"
              >
                <el-option v-for="tag in tagOptions" :key="tag" :label="tag" :value="tag" />
              </el-select>
            </div>
          </section>

          <el-tabs v-model="editorTab" class="editor-mobile-tabs">
            <el-tab-pane label="编辑" name="edit" />
            <el-tab-pane label="预览" name="preview" />
          </el-tabs>

          <section class="markdown-workspace" :class="`show-${editorTab}`">
            <div class="markdown-editor-column">
              <label for="note-markdown-editor">Markdown 正文</label>
              <el-input
                id="note-markdown-editor"
                v-model="draft.content"
                type="textarea"
                :rows="18"
                resize="none"
                placeholder="记录课程结论、代码思路、公式或易错点……"
              />
            </div>
            <div class="markdown-preview-column">
              <span>安全预览</span>
              <div class="markdown-preview-scroll">
                <MarkdownContent v-if="draft.content.trim()" :content="draft.content" />
                <el-empty v-else description="输入正文后在这里预览" :image-size="72" />
              </div>
            </div>
          </section>
          <footer class="note-save-footer">
            <span>按 Ctrl / Cmd + S 保存</span>
            <el-button type="primary" :loading="saving" :disabled="!canSave" @click="saveNote">保存笔记</el-button>
          </footer>
        </template>
        <el-empty v-else description="从左侧选择一条笔记，或新建笔记开始记录">
          <el-button type="primary" :icon="Plus" @click="startNewNote">新建笔记</el-button>
        </el-empty>
      </section>
    </section>
  </section>
</template>

<style scoped>
.note-page {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.note-page-header,
.note-editor-header,
.note-list-summary,
.note-meta,
.note-save-footer,
.editor-title-row,
.editor-actions {
  display: flex;
  align-items: center;
}

.note-page-header {
  justify-content: space-between;
  gap: 24px;
  padding: 20px 22px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-lg);
  background: var(--nl-surface);
}

.note-page-header h2 {
  margin: 5px 0 6px;
}

.note-page-header p {
  margin: 0;
  color: var(--nl-text-muted);
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--nl-warning);
  font-size: 13px;
  font-weight: 700;
}

.note-filters {
  display: grid;
  grid-template-columns: minmax(240px, 1.6fr) repeat(3, minmax(140px, 0.75fr)) auto auto;
  gap: 9px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-lg);
  background: var(--nl-surface);
}

.note-workspace {
  display: grid;
  grid-template-columns: minmax(260px, 330px) minmax(0, 1fr);
  gap: 12px;
  min-height: 680px;
}

.note-list-pane,
.note-editor-pane {
  min-width: 0;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-lg);
  background: var(--nl-surface);
}

.note-list-pane {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 10px;
  padding: 12px;
}

.note-list-summary,
.note-save-footer {
  justify-content: space-between;
}

.note-list-summary span,
.note-save-footer span,
.note-editor-header span {
  color: var(--nl-text-muted);
  font-size: 12px;
}

.note-list {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 0;
  overflow: auto;
}

.note-list-item {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 13px;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-md);
  background: var(--nl-surface);
  color: var(--nl-text);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--nl-transition-fast), background var(--nl-transition-fast);
}

.note-list-item:hover,
.note-list-item:focus-visible,
.note-list-item.active {
  border-color: var(--nl-primary-hover);
  background: var(--nl-primary-tint);
  outline: none;
}

.note-list-item:focus-visible {
  box-shadow: var(--nl-focus-ring);
}

.note-item-title-row,
.note-meta,
.note-tags {
  display: flex;
  align-items: center;
  gap: 6px;
}

.note-item-title-row {
  justify-content: space-between;
}

.note-item-title-row strong,
.note-excerpt {
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-item-title-row strong {
  white-space: nowrap;
}

.pin-action {
  display: grid;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 9px;
  color: var(--nl-warning);
}

.pin-action:hover,
.pin-action:focus-visible {
  background: var(--nl-primary-soft);
  outline: none;
}

.note-excerpt {
  display: -webkit-box;
  color: var(--nl-text-muted);
  font-size: 13px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.note-tags {
  flex-wrap: wrap;
}

.note-meta {
  justify-content: space-between;
  color: var(--nl-text-subtle);
  font-size: 11px;
}

.note-editor-pane {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 16px;
  overflow: hidden;
}

.note-editor-header {
  justify-content: space-between;
  gap: 16px;
}

.editor-title-row,
.editor-actions {
  gap: 9px;
}

.editor-title-row > div {
  display: grid;
  gap: 3px;
}

.note-editor-header span.dirty {
  color: var(--nl-warning);
  font-weight: 700;
}

.note-fields {
  display: grid;
  gap: 10px;
}

.note-context-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.markdown-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  min-height: 430px;
}

.markdown-editor-column,
.markdown-preview-column {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 7px;
  min-width: 0;
}

.markdown-editor-column > label,
.markdown-preview-column > span {
  color: var(--nl-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.markdown-preview-scroll {
  min-height: 430px;
  max-height: 54vh;
  padding: 14px;
  overflow: auto;
  border: 1px solid var(--nl-border);
  border-radius: var(--nl-radius-md);
  background: var(--nl-workbench-bg);
}

.markdown-workspace.show-edit .markdown-preview-column,
.markdown-workspace.show-preview .markdown-editor-column {
  display: none;
}

.note-save-footer {
  position: sticky;
  bottom: 0;
  gap: 12px;
  padding: 10px 0 0;
  background: var(--nl-surface);
}

.mobile-back {
  display: none;
}

@media (min-width: 1200px) {
  .editor-mobile-tabs {
    display: none;
  }

  .markdown-workspace,
  .markdown-workspace.show-edit,
  .markdown-workspace.show-preview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .markdown-workspace.show-edit .markdown-preview-column,
  .markdown-workspace.show-preview .markdown-editor-column {
    display: grid;
  }
}

@media (max-width: 1199px) {
  .note-filters {
    grid-template-columns: minmax(220px, 1.4fr) repeat(2, minmax(130px, 1fr));
  }

  .note-context-fields {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1099px) {
  .note-workspace {
    grid-template-columns: 1fr;
    min-height: 620px;
  }

  .note-editor-pane {
    display: none;
  }

  .note-workspace.mobile-detail-visible .note-list-pane {
    display: none;
  }

  .note-workspace.mobile-detail-visible .note-editor-pane {
    display: grid;
  }

  .mobile-back {
    display: inline-flex;
  }
}

@media (max-width: 767px) {
  .note-page-header,
  .note-editor-header {
    align-items: stretch;
    flex-direction: column;
  }

  .note-filters {
    grid-template-columns: 1fr;
  }

  .editor-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .note-editor-pane {
    padding: 12px;
  }

  .note-save-footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
