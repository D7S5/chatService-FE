import axios from "axios";

axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});


let refreshPromise = null;
let requestQueue = [];


function resolveQueue(token) {
  requestQueue.forEach(p => p.resolve(token));
  requestQueue = [];
}

function rejectQueue(error) {
  requestQueue.forEach(p => p.reject(error));
  requestQueue = [];
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers = config.headers || {};
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

    if (!original) {
      return Promise.reject(error);
    }

    const isAuthApi =
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/refresh") ||
      original.url?.includes("/auth/register") ||
      original.url?.includes("/auth/oauth");

    if (status !== 401 || isAuthApi || original._retry) {
      return Promise.reject(error);
    }
    
    original._retry = true;

    if (refreshPromise) {
      return new Promise((resolve, reject) => {
        requestQueue.push({
          resolve: (token) => {
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    refreshPromise = api
      .post("/auth/refresh")
      .then((res) => {
        const newToken = res.data.accessToken;
        localStorage.setItem("accessToken", newToken);
        resolveQueue(newToken);
        return newToken;
      })
      .catch((err) => {
        rejectQueue(err);
        logout();
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });

    const newToken = await refreshPromise;

    original.headers = original.headers || {};
    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  }
);

export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch (_) {}

  localStorage.clear();
  window.location.href = "/";
}

export default api;
