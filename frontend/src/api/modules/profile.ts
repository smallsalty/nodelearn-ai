import { request } from "@/api/client";
import type {
  ProfileExtractRequest,
  ProfileExtractResult,
  ProfileUpdateByBehaviorRequest,
  ProfileUpdateByPracticeRequest,
  StudentProfile
} from "@/types/profile";

export const profileApi = {
  getProfile(userId: string) {
    return request<StudentProfile>({ method: "GET", url: `/profiles/${userId}` });
  },
  updateProfile(userId: string, payload: Partial<StudentProfile>) {
    return request<StudentProfile>({ method: "PUT", url: `/profiles/${userId}`, data: payload });
  },
  extractProfile(payload: ProfileExtractRequest) {
    return request<ProfileExtractResult>({ method: "POST", url: "/profiles/extract", data: payload });
  },
  updateByBehavior(payload: ProfileUpdateByBehaviorRequest) {
    return request<StudentProfile>({ method: "POST", url: "/profiles/update-by-behavior", data: payload });
  },
  updateByPractice(payload: ProfileUpdateByPracticeRequest) {
    return request<StudentProfile>({ method: "POST", url: "/profiles/update-by-practice", data: payload });
  }
};
