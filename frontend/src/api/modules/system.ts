import { request } from "@/api/client";
import type { HealthCheckResult, SystemConfig } from "@/types/contracts";

export const systemApi = {
  health() {
    return request<HealthCheckResult>({ method: "GET", url: "/system/health" });
  },
  config() {
    return request<SystemConfig>({ method: "GET", url: "/system/config" });
  },
  version() {
    return request<{ version: string }>({ method: "GET", url: "/system/version" });
  }
};

