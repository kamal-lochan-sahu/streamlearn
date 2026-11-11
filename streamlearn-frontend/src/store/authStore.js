import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => {
      // Every way of signing in (password, email code, Google, new account, password reset)
      // ends the same way: the server answers with { user, accessToken }.
      const applySession = (data) => {
        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
          activeProfileIndex: data.user.activeProfile || 0,
        });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      };

      return {
        user: null,
        accessToken: null,
        isAuthenticated: false,
        activeProfileIndex: 0,

        applySession,

        login: async (credentials) => {
          const { data } = await api.post('/auth/login', credentials);
          applySession(data.data);
          return data;
        },

        register: async (payload) => {
          const { data } = await api.post('/auth/register', payload);
          applySession(data.data);
          return data;
        },

        googleLogin: async (code) => {
          const { data } = await api.post('/auth/google/exchange', { code });
          applySession(data.data);
          return data;
        },

        // Sign in with the 6 digit code that was sent by email
        otpLogin: async ({ email, otp }) => {
          const { data } = await api.post('/auth/verify-otp', { email, otp });
          applySession(data.data);
          return data;
        },

        // Set a new password with the link from the email; the server signs the user in
        resetPassword: async (token, password) => {
          const { data } = await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, {
            password,
          });
          applySession(data.data);
          return data;
        },

        // The saved user can be old (role, subscription, profiles changed on the server).
        // Called when the app opens and after changes that affect the account.
        refreshUser: async () => {
          const { data } = await api.get('/users/profile', { silent: true });
          set({ user: data.data, activeProfileIndex: data.data.activeProfile || 0 });
        },

        // Local-only: forget the session without calling the API (used when the refresh failed)
        clearSession: () => {
          delete api.defaults.headers.common['Authorization'];
          set({ user: null, accessToken: null, isAuthenticated: false, activeProfileIndex: 0 });
        },

        logout: async () => {
          try {
            await api.post('/auth/logout');
          } catch {
            // even if the server is unreachable we still sign out locally
          }
          get().clearSession();
        },

        updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
        setToken: (token) => {
          set({ accessToken: token });
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        },

        // The server decides which profile is active (continue watching, watchlist and
        // recommendations follow it), so ask it first and only then change the screen.
        switchProfile: async (index) => {
          await api.put(`/users/profiles/${index}/switch`);
          set((state) => ({
            activeProfileIndex: index,
            user: { ...state.user, activeProfile: index },
          }));
        },
      };
    },
    {
      name: 'streamlearn-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        activeProfileIndex: s.activeProfileIndex,
      }),
    }
  )
);
