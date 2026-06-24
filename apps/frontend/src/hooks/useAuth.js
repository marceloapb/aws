import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { user, isAuthenticated, tokens, login, logout, refreshToken } = useAuthStore();

  useEffect(() => {
    // Auto-refresh token a cada 45 minutos
    if (!isAuthenticated || !tokens?.refreshToken) return;

    const interval = setInterval(() => {
      refreshToken();
    }, 45 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, tokens?.refreshToken, refreshToken]);

  return { user, isAuthenticated, login, logout };
}
