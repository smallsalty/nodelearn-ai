import { reactive } from "vue";
import type { User } from "@/types/auth";
import type { Course } from "@/types/course";
import type { FloatingMenuState } from "@/types/note";
import type { StudentProfile } from "@/types/profile";

export const appState = reactive({
  currentUser: null as User | null,
  currentCourse: null as Course | null,
  currentProfile: null as StudentProfile | null,
  selectedChapterId: null as string | null,
  selectedNodeId: null as string | null,
  graphOverviewRequestId: 0,
  selectedResourceId: null as string | null,
  selectedQuestionId: null as string | null,
  selectedNoteId: null as string | null,
  loading: false,
  errorMessage: "",
  streamContent: "",
  floatingMenuState: {
    visible: false,
    activeTab: "qa",
    positionX: 960,
    positionY: 120,
    width: 420,
    height: 620,
    collapsed: false
  } as FloatingMenuState
});

export function setCurrentUser(user: User | null) {
  appState.currentUser = user;
}

export function setCurrentCourse(course: Course | null) {
  appState.currentCourse = course;
}

export function setCurrentProfile(profile: StudentProfile | null) {
  appState.currentProfile = profile;
}

export function requestGraphOverview(): void {
  appState.selectedChapterId = null;
  appState.selectedNodeId = null;
  appState.graphOverviewRequestId += 1;
}

export function openFloatingMenu(): void {
  appState.floatingMenuState.visible = true;
}

export function closeFloatingMenu(): void {
  appState.floatingMenuState.visible = false;
}

export function toggleFloatingMenu(): void {
  appState.floatingMenuState.visible = !appState.floatingMenuState.visible;
}

export function switchFloatingTab(tab: FloatingMenuState["activeTab"]): void {
  appState.floatingMenuState.activeTab = tab;
  appState.floatingMenuState.visible = true;
}

export function updateFloatingPosition(x: number, y: number): void {
  appState.floatingMenuState.positionX = x;
  appState.floatingMenuState.positionY = y;
}

export function clearAuthState() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  setCurrentUser(null);
  setCurrentCourse(null);
  setCurrentProfile(null);
  appState.selectedChapterId = null;
  appState.selectedNodeId = null;
}
