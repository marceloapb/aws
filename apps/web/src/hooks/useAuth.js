import { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, removeToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('horizons_token')) {
      api.get('/admin/me').then(({ data }) => setUser(data)).catch(removeToken).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, senha) {
    const { data } = await api.post('/admin/login', { email, senha });
    setToken(data.token);
    setUser(data.admin);
    return data;
  }

  function logout() {
    removeToken();
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}

export default useAuth;
