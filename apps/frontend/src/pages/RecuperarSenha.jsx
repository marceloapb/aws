import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Check, Loader2 } from 'lucide-react';

const ACCENT = '#EA580C';
const API_URL = process.env.REACT_APP_API_URL || 'https://setvwal0cd.execute-api.us-east-1.amazonaws.com/prod';

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=identificação, 2=código+nova senha, 3=sucesso
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('mbf_logo_url') || '');

  // Step 1
  const [metodo, setMetodo] = useState('email'); // 'email' ou 'cpf'
  const [identificador, setIdentificador] = useState('');

  // Step 2
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!logoUrl) {
      fetch(`${API_URL}/public/site/config`)
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data) {
            const logo = json.data.logo_url || json.data.logo_dark_url;
            if (logo) { setLogoUrl(logo); localStorage.setItem('mbf_logo_url', logo); }
          }
        })
        .catch(() => {});
    }
  }, []);

  const formatCPF = (v) => {
    const n = (v || '').replace(/\D/g, '').slice(0, 14);
    if (n.length <= 11) {
      if (n.length > 9) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
      if (n.length > 6) return n.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
      if (n.length > 3) return n.replace(/(\d{3})(\d{1,3})/, '$1.$2');
      return n;
    }
    if (n.length > 12) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
    return n;
  };

  const handleStep1 = async (e) => {
    e.preventDefault();
    setError('');
    if (!identificador.trim()) {
      setError(metodo === 'email' ? 'Informe seu e-mail' : 'Informe seu CPF/CNPJ');
      return;
    }

    setLoading(true);
    try {
      const body = metodo === 'email'
        ? { email: identificador.trim() }
        : { cpf_cnpj: identificador.trim() };

      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao solicitar recuperação');

      setEmail(data.email || identificador.trim());
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    setError('');
    if (!code.trim() || code.trim().length < 6) { setError('Informe o código de 6 dígitos'); return; }
    if (novaSenha.length < 8) { setError('A nova senha deve ter no mínimo 8 caracteres'); return; }
    if (novaSenha !== confirmSenha) { setError('As senhas não coincidem'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/confirm-forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim(), novaSenha }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao redefinir senha');
      setStep(3);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-24 max-w-[220px] mx-auto mb-4 object-contain" />
          ) : (
            <div className="h-24" />
          )}
        </div>

        {/* Step 3: Sucesso */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check size={28} className="text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Senha alterada!</h2>
            <p className="text-sm text-gray-600">Sua nova senha foi definida com sucesso. Você já pode fazer login.</p>
            <button onClick={() => navigate('/login')} className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90" style={{ background: ACCENT }}>
              Ir para Login
            </button>
          </div>
        )}

        {/* Step 1: Identificação */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-lg font-bold text-gray-900">Recuperar Senha</h2>
              <p className="text-sm text-gray-500 mt-1">Informe seu e-mail ou CPF para receber o código</p>
            </div>

            {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

            {/* Toggle método */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button type="button" onClick={() => { setMetodo('email'); setIdentificador(''); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${metodo === 'email' ? 'bg-orange-50 text-orange-700' : 'text-gray-500 hover:bg-gray-50'}`}
                style={metodo === 'email' ? { color: ACCENT } : {}}>
                E-mail
              </button>
              <button type="button" onClick={() => { setMetodo('cpf'); setIdentificador(''); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${metodo === 'cpf' ? 'bg-orange-50 text-orange-700' : 'text-gray-500 hover:bg-gray-50'}`}
                style={metodo === 'cpf' ? { color: ACCENT } : {}}>
                CPF / CNPJ
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {metodo === 'email' ? 'E-mail cadastrado' : 'CPF ou CNPJ'}
              </label>
              <input
                type={metodo === 'email' ? 'email' : 'text'}
                value={identificador}
                onChange={e => setIdentificador(metodo === 'cpf' ? formatCPF(e.target.value) : e.target.value)}
                placeholder={metodo === 'email' ? 'seu@email.com' : '000.000.000-00'}
                inputMode={metodo === 'cpf' ? 'numeric' : 'email'}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
              />
            </div>

            <button type="submit" disabled={loading} style={{ background: ACCENT }}
              className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Buscando...</> : 'Enviar código de recuperação'}
            </button>

            <p className="text-center text-sm text-gray-500">
              <Link to="/login" className="font-medium hover:underline" style={{ color: ACCENT }}>
                <ArrowLeft size={14} className="inline mr-1" />Voltar ao login
              </Link>
            </p>
          </form>
        )}

        {/* Step 2: Código + Nova Senha */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-lg font-bold text-gray-900">Redefinir Senha</h2>
              <p className="text-sm text-gray-500 mt-1">Um código foi enviado para o seu e-mail. Verifique sua caixa de entrada e spam.</p>
            </div>

            {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de verificação</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" inputMode="numeric" maxLength={6}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none text-center text-lg tracking-widest font-mono" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres" minLength={8}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
              <input type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
            </div>

            <button type="submit" disabled={loading} style={{ background: ACCENT }}
              className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Redefinindo...</> : 'Redefinir Senha'}
            </button>

            <p className="text-center text-sm text-gray-500">
              <button type="button" onClick={() => { setStep(1); setError(''); }} className="font-medium hover:underline" style={{ color: ACCENT }}>
                <ArrowLeft size={14} className="inline mr-1" />Voltar
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
