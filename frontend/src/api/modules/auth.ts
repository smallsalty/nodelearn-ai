import { request } from "@/api/client";
import type { AuthToken, LoginRequest, RegisterRequest, User, UserUpdateRequest } from "@/types/auth";

export const authApi = {
  register(payload: RegisterRequest) {
    return request<User>({ method: "POST", url: "/auth/register", data: payload });
  },
  login(payload: LoginRequest) {
    return request<AuthToken>({ method: "POST", url: "/auth/login", data: payload });
  },
  logout() {
    return request<boolean>({ method: "POST", url: "/auth/logout" });
  },
  refreshToken(refreshToken: string) {
    return request<AuthToken>({ method: "POST", url: "/auth/refresh-token", data: { refreshToken } });
  },
  getCurrentUser() {
    return request<User>({ method: "GET", url: "/users/me" });
  },
  updateCurrentUser(payload: UserUpdateRequest) {
    return request<User>({ method: "PUT", url: "/users/me", data: payload });
  }
};
