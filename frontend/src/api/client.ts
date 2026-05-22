import axios, { type AxiosRequestConfig } from "axios";
import type { ApiResponse } from "@/types/contracts";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1",
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
  (response) => response.data,
  (error) => Promise.reject(error)
);

export function request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return http.request<ApiResponse<T>>(config) as unknown as Promise<ApiResponse<T>>;
}
