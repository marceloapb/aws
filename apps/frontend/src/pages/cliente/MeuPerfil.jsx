import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Save } from 'lucide-react';

const ACCENT = '#EA580C';

export default function MeuPerfil() {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
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
      .then(d => {
        setForm(prev => ({
          ...prev,
          nome: d.nome || '',
          email: d.email || '',
          telefone: d.telefone || '',
          cpf_cnpj: d.cpf_cnpj || '',
          endereco_cep: d.endereco_cep || d.endereco?.cep || '',
          endereco_rua: d.endereco_rua || d.endereco?.rua || '',
          endereco_numero: d.endereco_numero || d.endereco?.numero || '',
          endereco_complemento: d.endereco_complemento || d.endereco?.complemento || '',
          endereco_bairro: d.endereco_bairro || d.endereco?.bairro || '',
          endereco_cidade: d.endereco_cidade || d.endereco?.cidade || '',
          endereco_estado: d.endereco_estado || d.endereco?.estado || '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await authFetch('/client/portal/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  const Field = ({ label, field, type = 'text', readOnly = false, span = 1 }) => (
    <div className={span === 2 ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[field]}
        onChange={e => handleChange(field, e.target.value)}
        readOnly={readOnly}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 ${
          readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
        }`}
      />
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <User size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Nome" field="nome" span={2} />
          <Field label="E-mail" field="email" type="email" readOnly />
          <Field label="Telefone" field="telefone" />
          <Field label="CPF / CNPJ" field="cpf_cnpj" />
          <Field label="CEP" field="endereco_cep" />
          <Field label="Rua" field="endereco_rua" span={2} />
          <Field label="Número" field="endereco_numero" />
          <Field label="Complemento" field="endereco_complemento" />
          <Field label="Bairro" field="endereco_bairro" />
          <Field label="Cidade" field="endereco_cidade" />
          <Field label="Estado" field="endereco_estado" />
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
