import axios from 'axios';
import toast from 'react-hot-toast';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
});

// Auth endpoints never trigger "refresh and retry": a 401 there is a real answer
// (wrong password, expired refresh cookie), not an expired access token.
const AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh-token',
  '/auth/logout',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/google/exchange',
];
const isAuthCall = (url = '') => AUTH_PATHS.some((path) => url.startsWith(path));

// Request: attach token
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('streamlearn-auth');
    if (raw) {
      const { state } = JSON.parse(raw);
      if (state?.accessToken) config.headers.Authorization = `Bearer ${state.accessToken}`;
    }
  } catch {
    // corrupted storage: continue without a token
  }
  return config;
});

// One refresh at a time. Several requests failing together share the same refresh call
// (the refresh token rotates, so parallel refreshes would invalidate each other).
let refreshPromise = null;
const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh-token')
      .then((res) => res.data.data)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Response: refresh once on 401, then retry the original request
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const status = err.response?.status;

    if (status === 401 && original && !original._retry && !isAuthCall(original.url)) {
      original._retry = true;
      try {
        const data = await refreshAccessToken();
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().setToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().clearSession();
        if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
        return Promise.reject(err);
      }
    }

    // Show errors, except the silent refresh call itself
    const silent = original?.url?.startsWith('/auth/refresh-token');
    if (!silent) {
      const message = err.response?.data?.message || 'Something went wrong';
      toast.error(message);
    }
    return Promise.reject(err);
  }
);

export default api;
