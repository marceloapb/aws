import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import PageHeader from '../../components/PageHeader.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import DataTable from '../../components/DataTable.jsx';

export default function Fotografos() {
  const [fotografos, setFotografos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', especialidade: '', comissao_percentual: '10' });

  useEffect(() => { loadFotografos(); }, []);

  async function loadFotografos() {
    try {
      const { data } = await api.get('/admin/fotografos');
      setFotografos(data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/admin/fotografos', { ...form, comissao_percentual: parseFloat(form.comissao_percentual) });
      setShowModal(false);
      setForm({ nome: '', email: '', especialidade: '', comissao_percentual: '10' });
      loadFotografos();
    } catch (err) {
      alert(err.message);
    }
  }

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'especialidade', label: 'Especialidade' },
    { key: 'comissao_percentual', label: 'Comissão', render: (v) => `${v}%` },
    { key: 'total_eventos', label: 'Eventos', render: (v) => v || 0 },
  ];

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader
        title="Fotógrafos"
        subtitle="Equipe e comissões"
        actions={
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium">
            + Novo Fotógrafo
          </button>
        }
      />
      <DataTable columns={columns} data={fotografos} />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Novo Fotógrafo</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome *</label>
                <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Especialidade</label>
                <input type="text" value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} placeholder="Ex: Casamentos, Ensaios" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Comissão (%)</label>
                <input type="number" step="0.5" value={form.comissao_percentual} onChange={(e) => setForm({ ...form, comissao_percentual: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
