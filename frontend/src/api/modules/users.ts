import { request } from "@/api/client";
import type { User, UserUpdateRequest } from "@/types/auth";

export const usersApi = {
  getCurrentUser() {
    return request<User>({ method: "GET", url: "/users/me" });
  },
  updateCurrentUser(payload: UserUpdateRequest) {
    return request<User>({ method: "PUT", url: "/users/me", data: payload });
  }
};

