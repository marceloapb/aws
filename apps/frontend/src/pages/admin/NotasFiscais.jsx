import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Plus, XCircle, Filter, X } from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_MAP = {
  pendente: { label: 'Pendente', color: 'text-yellow-600 bg-yellow-50' },
  emitida: { label: 'Emitida', color: 'text-green-600 bg-green-50' },
  cancelada: { label: 'Cancelada', color: 'text-red-600 bg-red-50' },
};

export default function NotasFiscais() {
  const { authFetch } = useAuth();
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ orcamentoId: '', valor: '', descricao: '' });
  const [saving, setSaving] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await authFetch('/admin/notas-fiscais');
      const json = await res.json();
      if (json.success) setNotas(json.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleEmitir = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch('/admin/notas-fiscais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setForm({ orcamentoId: '', valor: '', descricao: '' });
        loadData();
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleCancelar = async (id) => {
    if (!window.confirm('Deseja cancelar esta nota fiscal?')) return;
    try {
      const res = await authFetch(`/admin/notas-fiscais/${id}/cancelar`, { method: 'PUT' });
      const json = await res.json();
      if (json.success) loadData();
    } catch (e) { console.error(e); }
  };

  const formatBRL = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filtered = notas.filter(n => {
    if (filtroStatus && n.status !== filtroStatus) return false;
    if (filtroInicio && n.createdAt < filtroInicio) return false;
    if (filtroFim && n.createdAt > filtroFim + 'T23:59:59') return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Notas Fiscais</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} /> Emitir NF
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="emitida">Emitida</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        <input
          type="date"
          value={filtroInicio}
          onChange={(e) => setFiltroInicio(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          placeholder="De"
        />
        <input
          type="date"
          value={filtroFim}
          onChange={(e) => setFiltroFim(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          placeholder="Ate"
        />
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma nota fiscal encontrada.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Numero</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Descricao</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(n => {
                const st = STATUS_MAP[n.status] || STATUS_MAP.pendente;
                return (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{n.numero || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{n.descricao || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatBRL(n.valor)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {n.status !== 'cancelada' && (
                        <button
                          onClick={() => handleCancelar(n.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                        >
                          <XCircle size={14} /> Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Emitir NF */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Emitir Nota Fiscal</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEmitir} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orcamento/Cobranca ID</label>
                <input
                  type="text"
                  required
                  value={form.orcamentoId}
                  onChange={(e) => setForm({ ...form, orcamentoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="ID do orcamento ou cobranca"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
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
                  {saving ? 'Emitindo...' : 'Emitir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
