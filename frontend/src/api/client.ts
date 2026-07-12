import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import type { ApiResponse } from "@/types/contracts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiClientError extends Error {
  status?: number;
  code?: number;

  constructor(message: string, options: { status?: number; code?: number } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
  }
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const result = response.data as ApiResponse<unknown>;
    if (result && typeof result.code === "number" && result.code !== 200) {
      return Promise.reject(new ApiClientError(result.message || "请求失败", { code: result.code }));
    }
    return response;
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(new ApiClientError("登录状态已过期，请重新登录", { status: 401 }));
    }

    if (error.response?.status === 404) {
      return Promise.reject(new ApiClientError("接口未实现或路径不匹配", { status: 404 }));
    }

    if (error.code === "ECONNABORTED") {
      return Promise.reject(new ApiClientError("请求超时，请稍后重试或检查后端数据源状态"));
    }

    if (!error.response) {
      return Promise.reject(
        new ApiClientError("无法连接后端服务，请确认 http://localhost:8000 是否已启动")
      );
    }

    return Promise.reject(
      new ApiClientError(error.response.data?.message || error.message || "请求失败", {
        status: error.response.status
      })
    );
  }
);

export async function request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  const response = await http.request<ApiResponse<T>>(config);
  return response.data;
}

export function postKeepalive(path: string): void {
  const url = `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  if (typeof navigator.sendBeacon === "function") {
    const accepted = navigator.sendBeacon(url, new Blob([], { type: "text/plain;charset=UTF-8" }));
    if (accepted) return;
  }
  void fetch(url, {
    method: "POST",
    keepalive: true,
    credentials: "include"
  }).catch(() => undefined);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试";
}
