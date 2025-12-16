import axios from "axios";
import { isTokenExpired } from "./jwtUtil";

axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

let isRefreshing = false;
let refreshQueue = [];

let refreshingPromise = null;

api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("accessToken");

    // refresh 요청은 인터셉터에서 제외
    if (config.url.includes("/auth/refresh")) {
      return config;
    }

    if (token && isTokenExpired(token)) {
      if (!refreshingPromise) {
        refreshingPromise = api
          .post("/auth/refresh", {}, { withCredentials: true })
          .then((res) => {
            const newToken = res.data.accessToken;
            localStorage.setItem("accessToken", newToken);
            return newToken;
          })
          .catch(() => {
            localStorage.clear();
            window.location.href = "/";
          })
          .finally(() => {
            refreshingPromise = null;
          });
      }
      const newToken = await refreshingPromise;
      config.headers.Authorization = `Bearer ${newToken}`;
      return config;
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((newToken) => {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;  

      try {

        const res = await api.post("/auth/refresh", {}, { withCredentials: true });
        const newAccess = res.data.accessToken;
        localStorage.setItem("accessToken", newAccess);
      
        refreshQueue.forEach((cb) => cb(newAccess));
        refreshQueue = [];
        isRefreshing = false;

        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);

      } catch (refreshError) {
        isRefreshing = false;
        refreshQueue = [];
        await logout();

        return Promise.reject(error);
      }
    }
    if (status === 401) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// 로그아웃
export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch (_) {}

  localStorage.clear();
  window.location.href = "/";
}

export default api;