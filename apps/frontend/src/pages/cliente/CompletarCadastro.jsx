import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Camera, User, Phone, Building2 } from 'lucide-react';

const ACCENT = '#EA580C';

export default function CompletarCadastro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authFetch, setUser, user } = useAuth();

  const [form, setForm] = useState({
    nome_completo: '',
    telefone: '',
    tipo_pessoa: 'PF',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      return setError('Telefone inválido. Informe DDD + número (10 ou 11 dígitos)');
    }

    setSaving(true);
    try {
      const res = await authFetch('/client/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify({
          nome_completo: form.nome_completo.trim(),
          telefone: form.telefone,
          tipo_pessoa: form.tipo_pessoa,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Atualizar user no contexto
        if (setUser && user) {
          setUser({ ...user, perfil_completo: true });
        }
        const returnUrl = searchParams.get('returnUrl') || '/cliente';
        navigate(returnUrl, { replace: true });
      } else {
        setError(data.message || 'Erro ao salvar');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Camera size={32} style={{ color: ACCENT }} />
            <span className="text-2xl font-bold text-gray-900">MBFoto</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Complete seu cadastro</h1>
          <p className="text-gray-500 text-sm mt-1">Precisamos de alguns dados para continuar</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

          {/* Nome completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5"><User size={14} /> Nome completo *</span>
            </label>
            <input type="text" value={form.nome_completo}
              onChange={e => setForm(prev => ({ ...prev, nome_completo: e.target.value }))}
              placeholder="Seu nome completo"
              required minLength={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5"><Phone size={14} /> WhatsApp *</span>
            </label>
            <input type="text" value={form.telefone} onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              inputMode="numeric" maxLength={15}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
          </div>

          {/* Tipo Pessoa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-1.5"><Building2 size={14} /> Tipo de pessoa *</span>
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setForm(prev => ({ ...prev, tipo_pessoa: 'PF' }))}
                className={`flex-1 py-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                  form.tipo_pessoa === 'PF'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                Pessoa Física
              </button>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, tipo_pessoa: 'PJ' }))}
                className={`flex-1 py-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                  form.tipo_pessoa === 'PJ'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                Pessoa Jurídica
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={saving} style={{ background: ACCENT }}
            className="w-full py-3 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity text-sm">
            {saving ? 'Salvando...' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
