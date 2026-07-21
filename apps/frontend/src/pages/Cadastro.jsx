import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Eye, EyeOff, User, Phone, Building2, Mail, Lock } from 'lucide-react';

const ACCENT = '#EA580C';

export default function Cadastro() {
  const [form, setForm] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    tipo_pessoa: 'PF',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 7) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setForm(prev => ({ ...prev, telefone: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.nome_completo || form.nome_completo.trim().length < 3) {
      return setError('Nome completo é obrigatório (mínimo 3 caracteres)');
    }
    const telLimpo = form.telefone.replace(/\D/g, '');
    if (telLimpo.length < 10 || telLimpo.length > 11) {
      return setError('Telefone inválido. Informe DDD + número');
    }
    if (!form.email) return setError('E-mail é obrigatório');
    if (form.password.length < 6) return setError('Senha deve ter pelo menos 6 caracteres');
    if (form.password !== form.confirm) return setError('Senhas não conferem');

    try {
      await register(form.nome_completo, form.email, form.password, form.telefone, form.tipo_pessoa);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Cadastro realizado!</h2>
          <p className="text-gray-500 mt-2">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <Camera size={32} style={{ color: ACCENT }} />
            <span className="text-2xl font-bold text-gray-900">MBFoto</span>
          </div>
          <p className="text-gray-500 text-sm">Crie sua conta de cliente</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

          {/* Nome completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5"><User size={14} /> Nome completo *</span>
            </label>
            <input name="nome_completo" value={form.nome_completo} onChange={handleChange} required
              placeholder="Seu nome completo"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5"><Mail size={14} /> E-mail *</span>
            </label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required
              placeholder="seu@email.com"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5"><Phone size={14} /> WhatsApp *</span>
            </label>
            <input value={form.telefone} onChange={handlePhoneChange}
              placeholder="(11) 99999-9999" inputMode="numeric" maxLength={15} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
          </div>

          {/* Tipo Pessoa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-1.5"><Building2 size={14} /> Tipo de pessoa *</span>
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setForm(prev => ({ ...prev, tipo_pessoa: 'PF' }))}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                  form.tipo_pessoa === 'PF'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                Pessoa Física
              </button>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, tipo_pessoa: 'PJ' }))}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                  form.tipo_pessoa === 'PJ'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                Pessoa Jurídica
              </button>
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5"><Lock size={14} /> Senha *</span>
            </label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} required
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirmar Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha *</label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} name="confirm" value={form.confirm} onChange={handleChange} required
                placeholder="Repita a senha"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ background: ACCENT }}
            className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Já é cliente? <Link to="/login" className="font-medium" style={{ color: ACCENT }}>Faça login aqui</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
