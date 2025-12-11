import axios from "axios";
import { toast } from "react-toastify";

const api = axios.create({ baseURL: "/api" });

// 토큰 재발행 중 여부
let isRefreshing = false;
let refreshQueue = [];

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 응답 인터셉터
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // 401 & 한 번도 리트라이 안 했을 때만
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      // 이미 다른 요청이 Refresh 중이면 큐에 넣기
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      // Refresh 시작
      isRefreshing = true;

      try {
        const res = await axios.post("http://localhost:9090/api/auth/refresh", {
          refreshToken,
        });

        const newAccess = res.data.accessToken;
        const newRefresh = res.data.refreshToken;

        localStorage.setItem("accessToken", newAccess);
        localStorage.setItem("refreshToken", newRefresh);

        // 큐 처리
        refreshQueue.forEach((cb) => cb(newAccess));
        refreshQueue = [];
        isRefreshing = false;

        // 원래 요청 재시도
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (err) {
        isRefreshing = false;
        refreshQueue = [];
        logout();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

function logout() {
  localStorage.clear();
  window.location.href = "/";
}

export default api;