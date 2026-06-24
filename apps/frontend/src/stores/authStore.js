import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      setTokens: (tokens) => set({ tokens }),

      login: async (email, password) => {
        const { authService } = await import('../services/auth.service');
        const res = await authService.login(email, password);
        const { accessToken, idToken, refreshToken, expiresIn } = res.data;

        // Decodificar idToken para pegar dados do usuário
        const payload = JSON.parse(atob(idToken.split('.')[1]));

        set({
          tokens: { accessToken, idToken, refreshToken, expiresIn },
          user: { id: payload.sub, email: payload.email, name: payload.name },
          isAuthenticated: true
        });

        return res.data;
      },

      logout: () => {
        set({ user: null, tokens: null, isAuthenticated: false });
        window.location.href = '/login';
      },

      refreshToken: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) return;

        const { authService } = await import('../services/auth.service');
        const res = await authService.refresh(tokens.refreshToken);

        set({
          tokens: {
            ...tokens,
            accessToken: res.data.accessToken,
            idToken: res.data.idToken
          }
        });
      }
    }),
    {
      name: 'mbf-auth',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
