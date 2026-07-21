import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Camera, MapPin, Instagram, FileText, ArrowRight } from 'lucide-react';

const ACCENT = '#EA580C';

export default function CompletarCadastro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authFetch, setUser, user } = useAuth();

  const [form, setForm] = useState({
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    instagram: '',
    observacoes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCepChange = async (e) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5)}`;
    setForm(prev => ({ ...prev, cep: value }));

    // Buscar endereço via ViaCEP
    const cepLimpo = value.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf,
          }));
        }
      } catch {}
      setBuscandoCep(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await authFetch('/client/onboarding/complete-address', {
        method: 'POST',
        body: JSON.stringify({
          cep: form.cep.replace(/\D/g, ''),
          logradouro: form.logradouro,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
          cidade: form.cidade,
          uf: form.uf,
          instagram: form.instagram.replace('@', ''),
          observacoes: form.observacoes,
        }),
      });
      const data = await res.json();
      if (data.success) {
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

  const handlePular = async () => {
    // Marca perfil como completo mesmo sem preencher dados extras
    try {
      await authFetch('/client/onboarding/complete-address', {
        method: 'POST',
        body: JSON.stringify({})
      });
    } catch {}
    if (setUser && user) {
      setUser({ ...user, perfil_completo: true });
    }
    navigate('/cliente', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <Camera size={32} style={{ color: ACCENT }} />
            <span className="text-2xl font-bold text-gray-900">MBFoto</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Complete seu perfil</h1>
          <p className="text-gray-500 text-sm mt-1">Esses dados ajudam no seu atendimento (opcional)</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-1.5"><MapPin size={14} /> Endereço</span>
            </label>

            {/* CEP */}
            <div className="mb-3">
              <input value={form.cep} onChange={handleCepChange}
                placeholder="CEP (00000-000)" inputMode="numeric" maxLength={9}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none text-sm" />
              {buscandoCep && <p className="text-xs text-gray-400 mt-1">Buscando endereço...</p>}
            </div>

            {/* Logradouro + Número */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input value={form.logradouro} onChange={e => handleChange('logradouro', e.target.value)}
                placeholder="Rua / Av." className="col-span-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
              <input value={form.numero} onChange={e => handleChange('numero', e.target.value)}
                placeholder="Nº" className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
            </div>

            {/* Complemento */}
            <div className="mb-2">
              <input value={form.complemento} onChange={e => handleChange('complemento', e.target.value)}
                placeholder="Complemento (apto, bloco...)"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
            </div>

            {/* Bairro + Cidade + UF */}
            <div className="grid grid-cols-5 gap-2">
              <input value={form.bairro} onChange={e => handleChange('bairro', e.target.value)}
                placeholder="Bairro" className="col-span-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
              <input value={form.cidade} onChange={e => handleChange('cidade', e.target.value)}
                placeholder="Cidade" className="col-span-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none" />
              <input value={form.uf} onChange={e => handleChange('uf', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="UF" maxLength={2}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none text-center" />
            </div>
          </div>

          {/* Instagram */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5"><Instagram size={14} /> Instagram</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
              <input value={form.instagram} onChange={e => handleChange('instagram', e.target.value.replace(/\s/g, ''))}
                placeholder="seu_usuario"
                className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none text-sm" />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5"><FileText size={14} /> Observações</span>
            </label>
            <textarea value={form.observacoes} onChange={e => handleChange('observacoes', e.target.value)}
              rows={2} placeholder="Algo que queira nos contar (tipo de evento, preferências...)"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none text-sm resize-none" />
          </div>

          {/* Botões */}
          <div className="space-y-2 pt-2">
            <button type="submit" disabled={saving} style={{ background: ACCENT }}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity text-sm">
              {saving ? 'Salvando...' : 'Salvar e continuar'} <ArrowRight size={16} />
            </button>
            <button type="button" onClick={handlePular}
              className="w-full py-2.5 text-gray-500 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm">
              Pular por agora
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
