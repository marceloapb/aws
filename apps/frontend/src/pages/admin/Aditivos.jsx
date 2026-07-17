import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FilePlus2, Plus, X } from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_MAP = {
  pendente: { label: 'Pendente', color: 'text-yellow-600 bg-yellow-50' },
  aceito: { label: 'Aceito', color: 'text-green-600 bg-green-50' },
};

export default function Aditivos() {
  const { authFetch } = useAuth();
  const [aditivos, setAditivos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ contratoId: '', motivo: '', novoValor: '', alteracoes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [adRes, ctRes] = await Promise.all([
        authFetch('/admin/aditivos'),
        authFetch('/admin/contratos'),
      ]);
      const adJson = await adRes.json();
      const ctJson = await ctRes.json();
      if (adJson.success) setAditivos(adJson.data || []);
      if (ctJson.success) setContratos(ctJson.data || []);
      else if (Array.isArray(ctJson)) setContratos(ctJson);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch('/admin/aditivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setForm({ contratoId: '', motivo: '', novoValor: '', alteracoes: '' });
        loadData();
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const formatBRL = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FilePlus2 size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Aditivos</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} /> Criar Aditivo
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {aditivos.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum aditivo cadastrado.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contrato</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Motivo</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Novo Valor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {aditivos.map(a => {
                const st = STATUS_MAP[a.status] || STATUS_MAP.pendente;
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.contratoNome || a.contratoId || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{a.motivo || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{a.novoValor ? formatBRL(a.novoValor) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Criar Aditivo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Criar Aditivo</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrato</label>
                <select
                  required
                  value={form.contratoId}
                  onChange={(e) => setForm({ ...form, contratoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="">Selecionar contrato...</option>
                  {contratos.map(c => (
                    <option key={c.id} value={c.id}>{c.title || c.clientName || c.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input
                  type="text"
                  required
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="Ex: Alteracao de escopo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Novo Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.novoValor}
                  onChange={(e) => setForm({ ...form, novoValor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alteracoes</label>
                <textarea
                  value={form.alteracoes}
                  onChange={(e) => setForm({ ...form, alteracoes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="Descreva as alteracoes..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ background: ACCENT }}
                  className="flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Criar Aditivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
