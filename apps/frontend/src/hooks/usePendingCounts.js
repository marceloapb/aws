import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * DSH-07: Hook para contar pendências e exibir badges no menu
 * Polling a cada 60s para manter badges atualizados
 */
export default function usePendingCounts() {
  const { authFetch } = useAuth();
  const [counts, setCounts] = useState({
    orcamentos: 0,
    contratos: 0,
    financeiro: 0,
    albuns: 0,
    notificacoes: 0,
  });

  const fetchCounts = useCallback(async () => {
    try {
      const res = await authFetch('/admin/dashboard/badges');
      const json = await res.json();
      if (json.success) {
        setCounts(json.data);
      }
    } catch {
      // Silencioso — badges são secondary info
    }
  }, [authFetch]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // 60s polling
    return () => clearInterval(interval);
  }, [fetchCounts]);

  return counts;
}
