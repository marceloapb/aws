import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Save, Lock } from 'lucide-react';

const ACCENT = '#EA580C';

function formatarTelefone(value) {
  const nums = (value || '').replace(/\D/g, '').slice(0, 11);
  if (nums.length > 7) return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  if (nums.length > 2) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length > 0) return `(${nums}`;
  return '';
}

function formatarCPF(value) {
  const nums = (value || '').replace(/\D/g, '').slice(0, 11);
  if (nums.length > 9) return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  if (nums.length > 6) return nums.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  if (nums.length > 3) return nums.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  return nums;
}

function formatarCNPJ(value) {
  const nums = (value || '').replace(/\D/g, '').slice(0, 14);
  if (nums.length > 12) return nums.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
  if (nums.length > 8) return nums.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
  if (nums.length > 5) return nums.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
  if (nums.length > 2) return nums.replace(/(\d{2})(\d{1,3})/, '$1.$2');
  return nums;
}

function formatarDocumento(value) {
  const nums = (value || '').replace(/\D/g, '');
  if (nums.length <= 11) return formatarCPF(nums);
  return formatarCNPJ(nums);
}

function formatarCEP(value) {
  const nums = (value || '').replace(/\D/g, '').slice(0, 8);
  if (nums.length > 5) return `${nums.slice(0, 5)}-${nums.slice(5)}`;
  return nums;
}

export default function MeuPerfil() {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf_cnpj: '',
    endereco_cep: '',
    endereco_rua: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_estado: '',
  });

  useEffect(() => {
    authFetch('/client/portal/perfil')
      .then(r => r.json())
      .then(json => {
        const d = json.data || json;
        setForm(prev => ({
          ...prev,
          nome: d.nome || '',
          email: d.email || '',
          telefone: formatarTelefone(d.telefone || ''),
          cpf_cnpj: formatarDocumento(d.cpf_cnpj || ''),
          endereco_cep: formatarCEP(d.endereco_cep || d.endereco?.cep || ''),
          endereco_rua: d.endereco_rua || d.endereco?.rua || d.endereco?.logradouro || '',
          endereco_numero: d.endereco_numero || d.endereco?.numero || '',
          endereco_complemento: d.endereco_complemento || d.endereco?.complemento || '',
          endereco_bairro: d.endereco_bairro || d.endereco?.bairro || '',
          endereco_cidade: d.endereco_cidade || d.endereco?.cidade || '',
          endereco_estado: d.endereco_estado || d.endereco?.estado || d.endereco?.uf || '',
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSuccess('');
    setError('');
  };

  const handleTelefoneChange = (e) => {
    handleChange('telefone', formatarTelefone(e.target.value));
  };

  const handleCepChange = async (e) => {
    const formatted = formatarCEP(e.target.value);
    handleChange('endereco_cep', formatted);

    const cepLimpo = formatted.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            endereco_rua: data.logradouro || prev.endereco_rua,
            endereco_bairro: data.bairro || prev.endereco_bairro,
            endereco_cidade: data.localidade || prev.endereco_cidade,
            endereco_estado: data.uf || prev.endereco_estado,
          }));
        }
      } catch {}
      setBuscandoCep(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        telefone: form.telefone.replace(/\D/g, ''),
      };
      const res = await authFetch('/client/portal/perfil', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setSuccess('Perfil atualizado com sucesso!');
    } catch {
      setError('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <User size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Nome */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input type="text" value={form.nome} onChange={e => handleChange('nome', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          {/* E-mail (readonly) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              E-mail <Lock size={12} className="text-gray-400" />
            </label>
            <input type="email" value={form.email} readOnly
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>

          {/* Telefone (com máscara) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input type="text" value={form.telefone} onChange={handleTelefoneChange}
              inputMode="numeric" maxLength={15} placeholder="(11) 99999-9999"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          {/* CPF/CNPJ (readonly com máscara) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              CPF / CNPJ <Lock size={12} className="text-gray-400" />
            </label>
            <input type="text" value={form.cpf_cnpj} readOnly
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>

          {/* CEP (com máscara + busca ViaCEP) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
            <input type="text" value={form.endereco_cep} onChange={handleCepChange}
              inputMode="numeric" maxLength={9} placeholder="00000-000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            {buscandoCep && <p className="text-xs text-gray-400 mt-1">Buscando endereço...</p>}
          </div>

          {/* Rua */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
            <input type="text" value={form.endereco_rua} onChange={e => handleChange('endereco_rua', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          {/* Número */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
            <input type="text" value={form.endereco_numero} onChange={e => handleChange('endereco_numero', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          {/* Complemento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
            <input type="text" value={form.endereco_complemento} onChange={e => handleChange('endereco_complemento', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          {/* Bairro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
            <input type="text" value={form.endereco_bairro} onChange={e => handleChange('endereco_bairro', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input type="text" value={form.endereco_cidade} onChange={e => handleChange('endereco_cidade', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input type="text" value={form.endereco_estado} onChange={e => handleChange('endereco_estado', e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2} placeholder="SP"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        {success && <p className="text-sm text-green-600 mt-4">{success}</p>}

        <button type="submit" disabled={saving} style={{ background: ACCENT }}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  );
}
