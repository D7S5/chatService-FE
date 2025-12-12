import axios from "axios";

axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

let isRefreshing = false;
let refreshQueue = [];

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

        return Promise.resolve(null);
      }
    }
    if (status === 401) {
      return Promise.resolve(null);
    }
    return Promise.resolve(null);
  }
);

// 로그아웃
async function logout() {
  try {
    await api.post("/auth/logout");
  } catch (_) {}

  localStorage.clear();
  window.location.href = "/";
}

export default api;
