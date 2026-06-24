import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth.service';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      loading: false,

      login: async (email, password) => {
        set({ loading: true });
        try {
          const tokens = await authService.login(email, password);
          set({
            tokens,
            isAuthenticated: true,
            loading: false
          });
          return tokens;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false
        });
      },

      setTokens: (tokens) => {
        set({ tokens, isAuthenticated: true });
      },

      refreshToken: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) return;

        try {
          const newTokens = await authService.refresh(tokens.refreshToken);
          set({
            tokens: { ...tokens, ...newTokens },
            isAuthenticated: true
          });
        } catch (error) {
          get().logout();
        }
      }
    }),
    {
      name: 'mbf-auth',
      partialize: (state) => ({
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
        user: state.user
      })
    }
  )
);
