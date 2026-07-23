import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Eye, EyeOff } from 'lucide-react';

const ACCENT = '#EA580C';
const API_URL = process.env.REACT_APP_API_URL || 'https://setvwal0cd.execute-api.us-east-1.amazonaws.com/prod';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [nomeSite, setNomeSite] = useState('MBFoto');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadSiteConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/public/site/config`);
        const json = await res.json();
        if (json.success && json.data) {
          const logo = json.data.logo_url || json.data.logo_dark_url;
          if (logo) setLogoUrl(logo);
          if (json.data.nome) setNomeSite(json.data.nome);
        }
      } catch {}
    };
    loadSiteConfig();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(email, password);
      navigate(data.user.role === 'admin' ? '/admin' : '/cliente/orcamentos');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={nomeSite} className="h-16 mx-auto mb-2 object-contain" />
          ) : (
            <div className="inline-flex items-center gap-2 mb-2">
              <Camera size={32} style={{ color: ACCENT }} />
              <span className="text-2xl font-bold text-gray-900">{nomeSite}</span>
            </div>
          )}
          <p className="text-gray-500 text-sm">Acesse sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none" placeholder="seu@email.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ background: ACCENT }}
            className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Não tem conta? <Link to="/cadastro" className="font-medium" style={{ color: ACCENT }}>Cadastre-se</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
