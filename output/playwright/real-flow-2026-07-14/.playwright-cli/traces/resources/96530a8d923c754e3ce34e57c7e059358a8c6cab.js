import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false, "VITE_API_BASE_URL": "http://localhost:8000/api/v1", "VITE_APP_NAME": "NodeLearn AI", "VITE_ENABLE_MOCK": "false", "VITE_ENABLE_STREAM": "true", "VITE_GRAPH_RENDERER": "echarts"};import axios from "/node_modules/.vite/deps/axios.js?v=787b53ae";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
export class ApiClientError extends Error {
  status;
  code;
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
  }
}
export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3e4
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
    const result = response.data;
    if (result && typeof result.code === "number" && result.code !== 200) {
      return Promise.reject(new ApiClientError(result.message || "请求失败", { code: result.code }));
    }
    return response;
  },
  (error) => {
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
export async function request(config) {
  const response = await http.request(config);
  return response.data;
}
export async function requestSseEvent(path, params) {
  const response = await http.get(path, { params, responseType: "text" });
  const dataLine = response.data.split(/\r?\n/).find((line) => line.startsWith("data:"));
  if (!dataLine) {
    throw new ApiClientError("流式接口未返回 data 事件");
  }
  return JSON.parse(dataLine.slice(5).trim());
}
export function postKeepalive(path) {
  const url = `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  if (typeof navigator.sendBeacon === "function") {
    const accepted = navigator.sendBeacon(url, new Blob([], { type: "text/plain;charset=UTF-8" }));
    if (accepted) return;
  }
  void fetch(url, {
    method: "POST",
    keepalive: true,
    credentials: "include"
  }).catch(() => void 0);
}
export function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试";
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNsaWVudC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXhpb3MsIHsgQXhpb3NFcnJvciwgdHlwZSBBeGlvc1JlcXVlc3RDb25maWcgfSBmcm9tIFwiYXhpb3NcIjtcclxuaW1wb3J0IHR5cGUgeyBBcGlSZXNwb25zZSB9IGZyb20gXCJAL3R5cGVzL2NvbnRyYWN0c1wiO1xyXG5cclxuY29uc3QgQVBJX0JBU0VfVVJMID0gaW1wb3J0Lm1ldGEuZW52LlZJVEVfQVBJX0JBU0VfVVJMID8/IFwiaHR0cDovL2xvY2FsaG9zdDo4MDAwL2FwaS92MVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFwaUNsaWVudEVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gIHN0YXR1cz86IG51bWJlcjtcclxuICBjb2RlPzogbnVtYmVyO1xyXG5cclxuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIG9wdGlvbnM6IHsgc3RhdHVzPzogbnVtYmVyOyBjb2RlPzogbnVtYmVyIH0gPSB7fSkge1xyXG4gICAgc3VwZXIobWVzc2FnZSk7XHJcbiAgICB0aGlzLm5hbWUgPSBcIkFwaUNsaWVudEVycm9yXCI7XHJcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzO1xyXG4gICAgdGhpcy5jb2RlID0gb3B0aW9ucy5jb2RlO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGh0dHAgPSBheGlvcy5jcmVhdGUoe1xyXG4gIGJhc2VVUkw6IEFQSV9CQVNFX1VSTCxcclxuICB0aW1lb3V0OiAzMDAwMFxyXG59KTtcclxuXHJcbmh0dHAuaW50ZXJjZXB0b3JzLnJlcXVlc3QudXNlKChjb25maWcpID0+IHtcclxuICBjb25zdCB0b2tlbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYWNjZXNzVG9rZW5cIik7XHJcbiAgaWYgKHRva2VuKSB7XHJcbiAgICBjb25maWcuaGVhZGVycy5BdXRob3JpemF0aW9uID0gYEJlYXJlciAke3Rva2VufWA7XHJcbiAgfVxyXG4gIHJldHVybiBjb25maWc7XHJcbn0pO1xyXG5cclxuaHR0cC5pbnRlcmNlcHRvcnMucmVzcG9uc2UudXNlKFxyXG4gIChyZXNwb25zZSkgPT4ge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gcmVzcG9uc2UuZGF0YSBhcyBBcGlSZXNwb25zZTx1bmtub3duPjtcclxuICAgIGlmIChyZXN1bHQgJiYgdHlwZW9mIHJlc3VsdC5jb2RlID09PSBcIm51bWJlclwiICYmIHJlc3VsdC5jb2RlICE9PSAyMDApIHtcclxuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBBcGlDbGllbnRFcnJvcihyZXN1bHQubWVzc2FnZSB8fCBcIuivt+axguWksei0pVwiLCB7IGNvZGU6IHJlc3VsdC5jb2RlIH0pKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXNwb25zZTtcclxuICB9LFxyXG4gIChlcnJvcjogQXhpb3NFcnJvcjxBcGlSZXNwb25zZTx1bmtub3duPj4pID0+IHtcclxuICAgIGlmIChlcnJvci5yZXNwb25zZT8uc3RhdHVzID09PSA0MDEpIHtcclxuICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oXCJhY2Nlc3NUb2tlblwiKTtcclxuICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oXCJyZWZyZXNoVG9rZW5cIik7XHJcbiAgICAgIGlmICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgIT09IFwiL2xvZ2luXCIpIHtcclxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFwiL2xvZ2luXCI7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBBcGlDbGllbnRFcnJvcihcIueZu+W9leeKtuaAgeW3sui/h+acn++8jOivt+mHjeaWsOeZu+W9lVwiLCB7IHN0YXR1czogNDAxIH0pKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZXJyb3IucmVzcG9uc2U/LnN0YXR1cyA9PT0gNDA0KSB7XHJcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgQXBpQ2xpZW50RXJyb3IoXCLmjqXlj6PmnKrlrp7njrDmiJbot6/lvoTkuI3ljLnphY1cIiwgeyBzdGF0dXM6IDQwNCB9KSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGVycm9yLmNvZGUgPT09IFwiRUNPTk5BQk9SVEVEXCIpIHtcclxuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBBcGlDbGllbnRFcnJvcihcIuivt+axgui2heaXtu+8jOivt+eojeWQjumHjeivleaIluajgOafpeWQjuerr+aVsOaNrua6kOeKtuaAgVwiKSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFlcnJvci5yZXNwb25zZSkge1xyXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoXHJcbiAgICAgICAgbmV3IEFwaUNsaWVudEVycm9yKFwi5peg5rOV6L+e5o6l5ZCO56uv5pyN5Yqh77yM6K+356Gu6K6kIGh0dHA6Ly9sb2NhbGhvc3Q6ODAwMCDmmK/lkKblt7LlkK/liqhcIilcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoXHJcbiAgICAgIG5ldyBBcGlDbGllbnRFcnJvcihlcnJvci5yZXNwb25zZS5kYXRhPy5tZXNzYWdlIHx8IGVycm9yLm1lc3NhZ2UgfHwgXCLor7fmsYLlpLHotKVcIiwge1xyXG4gICAgICAgIHN0YXR1czogZXJyb3IucmVzcG9uc2Uuc3RhdHVzXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG4gIH1cclxuKTtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1ZXN0PFQ+KGNvbmZpZzogQXhpb3NSZXF1ZXN0Q29uZmlnKTogUHJvbWlzZTxBcGlSZXNwb25zZTxUPj4ge1xuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGh0dHAucmVxdWVzdDxBcGlSZXNwb25zZTxUPj4oY29uZmlnKTtcbiAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1ZXN0U3NlRXZlbnQ8VD4ocGF0aDogc3RyaW5nLCBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiBQcm9taXNlPFQ+IHtcbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBodHRwLmdldDxzdHJpbmc+KHBhdGgsIHsgcGFyYW1zLCByZXNwb25zZVR5cGU6IFwidGV4dFwiIH0pO1xuICBjb25zdCBkYXRhTGluZSA9IHJlc3BvbnNlLmRhdGFcbiAgICAuc3BsaXQoL1xccj9cXG4vKVxuICAgIC5maW5kKChsaW5lKSA9PiBsaW5lLnN0YXJ0c1dpdGgoXCJkYXRhOlwiKSk7XG4gIGlmICghZGF0YUxpbmUpIHtcbiAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoXCLmtYHlvI/mjqXlj6PmnKrov5Tlm54gZGF0YSDkuovku7ZcIik7XG4gIH1cbiAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YUxpbmUuc2xpY2UoNSkudHJpbSgpKSBhcyBUO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcG9zdEtlZXBhbGl2ZShwYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgdXJsID0gYCR7QVBJX0JBU0VfVVJMLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vJHtwYXRoLnJlcGxhY2UoL15cXC8vLCBcIlwiKX1gO1xuICBpZiAodHlwZW9mIG5hdmlnYXRvci5zZW5kQmVhY29uID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBjb25zdCBhY2NlcHRlZCA9IG5hdmlnYXRvci5zZW5kQmVhY29uKHVybCwgbmV3IEJsb2IoW10sIHsgdHlwZTogXCJ0ZXh0L3BsYWluO2NoYXJzZXQ9VVRGLThcIiB9KSk7XG4gICAgaWYgKGFjY2VwdGVkKSByZXR1cm47XG4gIH1cbiAgdm9pZCBmZXRjaCh1cmwsIHtcbiAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgIGtlZXBhbGl2ZTogdHJ1ZSxcbiAgICBjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcbiAgfSkuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKTtcbn1cblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcclxuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiBlcnJvci5tZXNzYWdlKSB7XHJcbiAgICByZXR1cm4gZXJyb3IubWVzc2FnZTtcclxuICB9XHJcbiAgcmV0dXJuIFwi6K+35rGC5aSx6LSl77yM6K+356iN5ZCO6YeN6K+VXCI7XHJcbn1cclxuIl0sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLFdBQW9EO0FBRzNELE1BQU0sZUFBZSxZQUFZLElBQUkscUJBQXFCO0FBRW5ELGFBQU0sdUJBQXVCLE1BQU07QUFBQSxFQUN4QztBQUFBLEVBQ0E7QUFBQSxFQUVBLFlBQVksU0FBaUIsVUFBOEMsQ0FBQyxHQUFHO0FBQzdFLFVBQU0sT0FBTztBQUNiLFNBQUssT0FBTztBQUNaLFNBQUssU0FBUyxRQUFRO0FBQ3RCLFNBQUssT0FBTyxRQUFRO0FBQUEsRUFDdEI7QUFDRjtBQUVPLGFBQU0sT0FBTyxNQUFNLE9BQU87QUFBQSxFQUMvQixTQUFTO0FBQUEsRUFDVCxTQUFTO0FBQ1gsQ0FBQztBQUVELEtBQUssYUFBYSxRQUFRLElBQUksQ0FBQyxXQUFXO0FBQ3hDLFFBQU0sUUFBUSxhQUFhLFFBQVEsYUFBYTtBQUNoRCxNQUFJLE9BQU87QUFDVCxXQUFPLFFBQVEsZ0JBQWdCLFVBQVUsS0FBSztBQUFBLEVBQ2hEO0FBQ0EsU0FBTztBQUNULENBQUM7QUFFRCxLQUFLLGFBQWEsU0FBUztBQUFBLEVBQ3pCLENBQUMsYUFBYTtBQUNaLFVBQU0sU0FBUyxTQUFTO0FBQ3hCLFFBQUksVUFBVSxPQUFPLE9BQU8sU0FBUyxZQUFZLE9BQU8sU0FBUyxLQUFLO0FBQ3BFLGFBQU8sUUFBUSxPQUFPLElBQUksZUFBZSxPQUFPLFdBQVcsUUFBUSxFQUFFLE1BQU0sT0FBTyxLQUFLLENBQUMsQ0FBQztBQUFBLElBQzNGO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLENBQUMsVUFBNEM7QUFDM0MsUUFBSSxNQUFNLFVBQVUsV0FBVyxLQUFLO0FBQ2xDLG1CQUFhLFdBQVcsYUFBYTtBQUNyQyxtQkFBYSxXQUFXLGNBQWM7QUFDdEMsVUFBSSxPQUFPLFNBQVMsYUFBYSxVQUFVO0FBQ3pDLGVBQU8sU0FBUyxPQUFPO0FBQUEsTUFDekI7QUFDQSxhQUFPLFFBQVEsT0FBTyxJQUFJLGVBQWUsaUJBQWlCLEVBQUUsUUFBUSxJQUFJLENBQUMsQ0FBQztBQUFBLElBQzVFO0FBRUEsUUFBSSxNQUFNLFVBQVUsV0FBVyxLQUFLO0FBQ2xDLGFBQU8sUUFBUSxPQUFPLElBQUksZUFBZSxlQUFlLEVBQUUsUUFBUSxJQUFJLENBQUMsQ0FBQztBQUFBLElBQzFFO0FBRUEsUUFBSSxNQUFNLFNBQVMsZ0JBQWdCO0FBQ2pDLGFBQU8sUUFBUSxPQUFPLElBQUksZUFBZSxzQkFBc0IsQ0FBQztBQUFBLElBQ2xFO0FBRUEsUUFBSSxDQUFDLE1BQU0sVUFBVTtBQUNuQixhQUFPLFFBQVE7QUFBQSxRQUNiLElBQUksZUFBZSwwQ0FBMEM7QUFBQSxNQUMvRDtBQUFBLElBQ0Y7QUFFQSxXQUFPLFFBQVE7QUFBQSxNQUNiLElBQUksZUFBZSxNQUFNLFNBQVMsTUFBTSxXQUFXLE1BQU0sV0FBVyxRQUFRO0FBQUEsUUFDMUUsUUFBUSxNQUFNLFNBQVM7QUFBQSxNQUN6QixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDRjtBQUVBLHNCQUFzQixRQUFXLFFBQXFEO0FBQ3BGLFFBQU0sV0FBVyxNQUFNLEtBQUssUUFBd0IsTUFBTTtBQUMxRCxTQUFPLFNBQVM7QUFDbEI7QUFFQSxzQkFBc0IsZ0JBQW1CLE1BQWMsUUFBNEM7QUFDakcsUUFBTSxXQUFXLE1BQU0sS0FBSyxJQUFZLE1BQU0sRUFBRSxRQUFRLGNBQWMsT0FBTyxDQUFDO0FBQzlFLFFBQU0sV0FBVyxTQUFTLEtBQ3ZCLE1BQU0sT0FBTyxFQUNiLEtBQUssQ0FBQyxTQUFTLEtBQUssV0FBVyxPQUFPLENBQUM7QUFDMUMsTUFBSSxDQUFDLFVBQVU7QUFDYixVQUFNLElBQUksZUFBZSxpQkFBaUI7QUFBQSxFQUM1QztBQUNBLFNBQU8sS0FBSyxNQUFNLFNBQVMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDO0FBQzVDO0FBRU8sZ0JBQVMsY0FBYyxNQUFvQjtBQUNoRCxRQUFNLE1BQU0sR0FBRyxhQUFhLFFBQVEsT0FBTyxFQUFFLENBQUMsSUFBSSxLQUFLLFFBQVEsT0FBTyxFQUFFLENBQUM7QUFDekUsTUFBSSxPQUFPLFVBQVUsZUFBZSxZQUFZO0FBQzlDLFVBQU0sV0FBVyxVQUFVLFdBQVcsS0FBSyxJQUFJLEtBQUssQ0FBQyxHQUFHLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQyxDQUFDO0FBQzdGLFFBQUksU0FBVTtBQUFBLEVBQ2hCO0FBQ0EsT0FBSyxNQUFNLEtBQUs7QUFBQSxJQUNkLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLGFBQWE7QUFBQSxFQUNmLENBQUMsRUFBRSxNQUFNLE1BQU0sTUFBUztBQUMxQjtBQUVPLGdCQUFTLGdCQUFnQixPQUF3QjtBQUN0RCxNQUFJLGlCQUFpQixTQUFTLE1BQU0sU0FBUztBQUMzQyxXQUFPLE1BQU07QUFBQSxFQUNmO0FBQ0EsU0FBTztBQUNUOyIsIm5hbWVzIjpbXX0=