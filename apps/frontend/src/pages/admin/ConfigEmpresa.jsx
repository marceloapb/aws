import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Building2 } from 'lucide-react';

const ACCENT = '#EA580C';

export default function ConfigEmpresa() {
  const { authFetch } = useAuth();
  const [form, setForm] = useState({
    businessName: '', tradeName: '', cnpj: '', phone: '', email: '',
    address: '', city: '', state: '', zip: '',
    defaultDeliveryDays: 30, defaultPaymentTerms: 'Sinal + parcelas',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    authFetch('/config').then(r => r.json()).then(data => {
      if (data && data.businessName) setForm(data);
    }).catch(() => {});
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch('/config', { method: 'PUT', body: JSON.stringify(form) });
      if (res.ok) setMsg('Salvo com sucesso!');
      else setMsg('Erro ao salvar');
    } catch { setMsg('Erro ao salvar'); }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Building2 size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Configurações da Empresa</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {msg && <div className={`text-sm p-3 rounded-lg ${msg.includes('sucesso') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
            <input name="businessName" value={form.businessName} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
            <input name="tradeName" value={form.tradeName} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ/CPF</label>
            <input name="cnpj" value={form.cnpj} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input name="phone" value={form.phone} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" name="email" value={form.email} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
            <input name="zip" value={form.zip} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input name="address" value={form.address} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input name="city" value={form.city} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input name="state" value={form.state} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
          </div>
        </div>

        <hr className="border-gray-200" />

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prazo padrão de entrega (dias)</label>
            <input type="number" name="defaultDeliveryDays" value={form.defaultDeliveryDays} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condição de pagamento padrão</label>
            <input name="defaultPaymentTerms" value={form.defaultPaymentTerms} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none" />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} style={{ background: ACCENT }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
