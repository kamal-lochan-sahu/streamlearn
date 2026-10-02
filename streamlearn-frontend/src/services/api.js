import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 30000,
});

// Request: attach token
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('streamlearn-auth');
  if (raw) {
    const { state } = JSON.parse(raw);
    if (state?.accessToken) config.headers.Authorization = `Bearer ${state.accessToken}`;
  }
  return config;
});

// Response: handle 401 / errors
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await api.post('/auth/refresh-token');
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().setToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    const message = err.response?.data?.message || 'Something went wrong';
    if (err.response?.status !== 401) toast.error(message);
    return Promise.reject(err);
  }
);

export default api;
