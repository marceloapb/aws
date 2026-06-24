import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatarData } from '../../lib/formatters.js';
import PageHeader from '../../components/PageHeader.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const PRIORIDADE_COR = { alta: 'border-l-red-500', media: 'border-l-yellow-500', baixa: 'border-l-green-500' };

export default function Pendencias() {
  const [pendencias, setPendencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'media', data_limite: '' });

  useEffect(() => { loadPendencias(); }, []);

  async function loadPendencias() {
    try {
      const { data } = await api.get('/admin/pendencias');
      setPendencias(data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/admin/pendencias', form);
      setShowModal(false);
      setForm({ titulo: '', descricao: '', prioridade: 'media', data_limite: '' });
      loadPendencias();
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleConcluida(id, concluida) {
    try {
      await api.put(`/admin/pendencias/${id}`, { concluida: !concluida });
      loadPendencias();
    } catch (err) {
      alert(err.message);
    }
  }

  async function deletePendencia(id) {
    if (!confirm('Excluir esta pendência?')) return;
    try {
      await api.delete(`/admin/pendencias/${id}`);
      loadPendencias();
    } catch (err) {
      alert(err.message);
    }
  }

  const pendentes = pendencias.filter((p) => !p.concluida);
  const concluidas = pendencias.filter((p) => p.concluida);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader
        title="Pendências"
        subtitle={`${pendentes.length} pendentes • ${concluidas.length} concluídas`}
        actions={
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium">
            + Nova Pendência
          </button>
        }
      />

      <div className="space-y-2 mb-8">
        {pendentes.map((p) => (
          <div key={p.id} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${PRIORIDADE_COR[p.prioridade]} p-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={false} onChange={() => toggleConcluida(p.id, p.concluida)} className="w-4 h-4 rounded" />
              <div>
                <p className="font-medium text-sm">{p.titulo}</p>
                {p.descricao && <p className="text-xs text-gray-500">{p.descricao}</p>}
                {p.data_limite && <p className="text-xs text-gray-400">Prazo: {formatarData(p.data_limite)}</p>}
              </div>
            </div>
            <button onClick={() => deletePendencia(p.id)} className="text-red-400 hover:text-red-600 text-sm">🗑️</button>
          </div>
        ))}
      </div>

      {concluidas.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Concluídas ({concluidas.length})</h3>
          <div className="space-y-2">
            {concluidas.slice(0, 10).map((p) => (
              <div key={p.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex items-center gap-3 opacity-60">
                <input type="checkbox" checked={true} onChange={() => toggleConcluida(p.id, p.concluida)} className="w-4 h-4 rounded" />
                <p className="text-sm line-through">{p.titulo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Nova Pendência</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Título *</label>
                <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prioridade</label>
                  <select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prazo</label>
                  <input type="date" value={form.data_limite} onChange={(e) => setForm({ ...form, data_limite: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
