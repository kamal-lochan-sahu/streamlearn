import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      activeProfileIndex: 0,

      login: async (credentials) => {
        const { data } = await api.post('/auth/login', credentials);
        set({
          user: data.data.user,
          accessToken: data.data.accessToken,
          isAuthenticated: true,
          activeProfileIndex: data.data.user.activeProfile || 0,
        });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.data.accessToken}`;
        return data;
      },

      register: async (payload) => {
        const { data } = await api.post('/auth/register', payload);
        set({
          user: data.data.user,
          accessToken: data.data.accessToken,
          isAuthenticated: true,
        });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.data.accessToken}`;
        return data;
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {}
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
      setToken: (token) => {
        set({ accessToken: token });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },
      switchProfile: (index) => set({ activeProfileIndex: index }),
    }),
    {
      name: 'streamlearn-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
);
