import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const API_URL = process.env.REACT_APP_API_URL || 'https://setvwal0cd.execute-api.us-east-1.amazonaws.com/prod';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mbf_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('mbf_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem('mbf_user', JSON.stringify(user));
    else localStorage.removeItem('mbf_user');
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem('mbf_token', token);
    else localStorage.removeItem('mbf_token');
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao fazer login');
      setUser(data.user);
      setToken(data.token);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, phone, tipo_pessoa, documento) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: name, email, senha: password, phone, tipo_pessoa, documento }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao cadastrar');
      // Se auto-login veio na resposta, setar user e token
      if (data.auto_login && data.token && data.user) {
        setUser(data.user);
        setToken(data.token);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mbf_user');
    localStorage.removeItem('mbf_token');
  };

  const authFetch = async (path, options = {}) => {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    if (res.status === 401) logout();
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
