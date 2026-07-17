import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

const ACCENT = '#EA580C';

export default function ClienteForm() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [form, setForm] = useState({ nome: '', email: '', telefone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      const url = isEditing ? `/admin/clientes/${id}` : '/admin/clientes';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, body: JSON.stringify(form) });
      const json = await res.json();
      if (json.success) navigate('/admin/clientes');
      else setError(json.message || 'Erro ao salvar');
    } catch (e) { setError('Erro ao salvar'); }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/clientes')} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h1>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input type="text" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            placeholder="(11) 99999-9999" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg" />
        </div>
        <div className="flex gap-3 justify-end pt-4">
          <button type="button" onClick={() => navigate('/admin/clientes')} className="px-4 py-2.5 border rounded-lg text-sm">Cancelar</button>
          <button type="submit" disabled={saving} style={{ background: ACCENT }}
            className="px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
