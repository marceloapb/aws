import { useState, useEffect } from 'react';

const STORAGE_KEY = 'mbf_dashboard_prefs';

const DEFAULTS = {
  showProximasSessiones: true,
  showPendencias: true,
  showAtividade: true,
  showKPIs: true,
  showAcoesRapidas: true,
  maxEventos: 5,
  maxPendencias: 6,
};

/**
 * DSH-09: Preferências do Dashboard (persistido em localStorage)
 */
export default function useDashboardPreferences() {
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const updatePref = (key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  const resetPrefs = () => {
    setPrefs(DEFAULTS);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { prefs, updatePref, resetPrefs };
}
