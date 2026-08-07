import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const ACCENT = '#EA580C';
const API_URL = process.env.REACT_APP_API_URL || 'https://setvwal0cd.execute-api.us-east-1.amazonaws.com/prod';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('mbf_logo_url') || localStorage.getItem('mbf_logo_dark_url') || '');
  const [nomeSite, setNomeSite] = useState(() => localStorage.getItem('mbf_empresa_nome') || 'Marcelo Bloise Fotografia');
  const { login, setUser, setToken, loading } = useAuth();
  const navigate = useNavigate();

  // NEW_PASSWORD_REQUIRED state
  const [challenge, setChallenge] = useState(null); // { session, email }
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const loadSiteConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/public/site/config`);
        const json = await res.json();
        if (json.success && json.data) {
          // Use logo_url (fundo claro) preferencialmente, fallback para logo_dark_url
          const logo = json.data.logo_url || json.data.logo_dark_url;
          if (logo) {
            setLogoUrl(logo);
            localStorage.setItem('mbf_logo_url', json.data.logo_url || logo);
            if (json.data.logo_dark_url) localStorage.setItem('mbf_logo_dark_url', json.data.logo_dark_url);
          }
          if (json.data.nome) {
            setNomeSite(json.data.nome);
            localStorage.setItem('mbf_empresa_nome', json.data.nome);
          }
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
      // Check if server returned a challenge instead of tokens
      if (data.challenge === 'NEW_PASSWORD_REQUIRED') {
        setChallenge({ session: data.session, email: data.email || email });
        return;
      }
      navigate(data.user.role === 'admin' ? '/admin' : '/cliente');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNewPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('A nova senha deve ter no mínimo 8 caracteres'); return; }
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem'); return; }
    setChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/auth/new-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: challenge.email, session: challenge.session, newPassword }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Erro ao definir nova senha');
      // Login successful after password change
      setUser(data.user);
      setToken(data.token);
      navigate(data.user.role === 'admin' ? '/admin' : '/cliente');
    } catch (err) {
      setError(err.message);
    }
    setChangingPassword(false);
  };

  // ═══ NEW PASSWORD FORM ═══
  if (challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt={nomeSite} className="h-24 max-w-[220px] mx-auto mb-4 object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logo.svg'; }} />
            ) : (
              <img src="/logo.svg" alt="Marcelo Bloise Fotografia" className="h-24 max-w-[220px] mx-auto mb-4 object-contain" />
            )}
            <p className="text-gray-700 text-base font-medium">Crie sua nova senha</p>
            <p className="text-gray-500 text-sm mt-1">É necessário trocar a senha temporária</p>
          </div>

          <form onSubmit={handleNewPassword} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none pr-10" placeholder="Mínimo 8 caracteres" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none" placeholder="Repita a nova senha" />
            </div>

            <button type="submit" disabled={changingPassword} style={{ background: ACCENT }}
              className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
              {changingPassword ? 'Salvando...' : 'Definir Nova Senha'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium mb-6 hover:opacity-80 transition-opacity" style={{ color: ACCENT }}>
            ← Voltar ao site
          </Link>
          {logoUrl ? (
            <img src={logoUrl} alt={nomeSite} className="h-24 max-w-[220px] mx-auto mb-4 object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logo.svg'; }} />
          ) : (
            <img src="/logo.svg" alt="Marcelo Bloise Fotografia" className="h-24 max-w-[220px] mx-auto mb-4 object-contain" />
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
            <Link to="/recuperar-senha" className="font-medium" style={{ color: ACCENT }}>Esqueci minha senha</Link>
          </p>
          <p className="text-center text-sm text-gray-500">
            Não tem conta? <Link to="/cadastro" className="font-medium" style={{ color: ACCENT }}>Cadastre-se</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
