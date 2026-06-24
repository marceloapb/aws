import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatarMoeda } from '../../lib/formatters.js';
import PageHeader from '../../components/PageHeader.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function Equipamentos() {
  const [equipamentos, setEquipamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: '', marca: '', modelo: '', numero_serie: '', valor_aquisicao: '', data_aquisicao: '' });

  useEffect(() => { loadEquipamentos(); }, []);

  async function loadEquipamentos() {
    try {
      const { data } = await api.get('/admin/equipamentos');
      setEquipamentos(data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/admin/equipamentos', { ...form, valor_aquisicao: parseFloat(form.valor_aquisicao || 0) });
      setShowModal(false);
      setForm({ nome: '', tipo: '', marca: '', modelo: '', numero_serie: '', valor_aquisicao: '', data_aquisicao: '' });
      loadEquipamentos();
    } catch (err) {
      alert(err.message);
    }
  }

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'marca', label: 'Marca/Modelo', render: (v, row) => `${v || ''} ${row.modelo || ''}`.trim() },
    { key: 'valor_aquisicao', label: 'Valor', render: (v) => formatarMoeda(v) },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v || 'ativo'} /> },
  ];

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader
        title="Equipamentos"
        subtitle="Inventário e manutenção"
        actions={
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium">
            + Novo Equipamento
          </button>
        }
      />
      <DataTable columns={columns} data={equipamentos} />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Novo Equipamento</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome *</label>
                <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required placeholder="Ex: Canon EOS R5" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="">Selecione...</option>
                    {['camera','lente','flash','tripe','iluminacao','drone','acessorio'].map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Marca</label>
                  <input type="text" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Aquisição</label>
                  <input type="number" step="0.01" value={form.valor_aquisicao} onChange={(e) => setForm({ ...form, valor_aquisicao: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Aquisição</label>
                  <input type="date" value={form.data_aquisicao} onChange={(e) => setForm({ ...form, data_aquisicao: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
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
