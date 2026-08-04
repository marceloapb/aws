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
  const [form, setForm] = useState({ nome: '', tipo: '', marca: '', modelo: '', numero_serie: '', valor_aquisicao: '', data_aquisicao: '', descricao: '' });
  const [buscandoIA, setBuscandoIA] = useState(false);

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
      setForm({ nome: '', tipo: '', marca: '', modelo: '', numero_serie: '', valor_aquisicao: '', data_aquisicao: '', descricao: '' });
      loadEquipamentos();
    } catch (err) {
      alert(err.message);
    }
  }

  async function buscarComIA() {
    if (!form.nome || form.nome.trim().length < 3) {
      alert('Digite pelo menos 3 caracteres no nome para buscar com IA.');
      return;
    }
    setBuscandoIA(true);
    try {
      const { data } = await api.post('/admin/equipamentos/identificar-nome', { nome: form.nome });
      if (data?.data) {
        const resultado = data.data;
        setForm((prev) => ({
          ...prev,
          nome: resultado.nome || prev.nome,
          marca: resultado.marca || prev.marca,
          modelo: resultado.modelo || prev.modelo,
          tipo: mapCategoriaTipo(resultado.categoria) || prev.tipo,
          valor_aquisicao: resultado.valor_estimado ? String(resultado.valor_estimado) : prev.valor_aquisicao,
          descricao: resultado.descricao || prev.descricao,
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Erro ao buscar com IA');
    } finally {
      setBuscandoIA(false);
    }
  }

  function mapCategoriaTipo(categoria) {
    const mapa = {
      'Câmeras': 'camera',
      'Lentes': 'lente',
      'Flash': 'flash',
      'Iluminação': 'iluminacao',
      'Tripés': 'tripe',
      'Drones': 'drone',
      'Estabilizadores': 'acessorio',
      'Áudio': 'acessorio',
      'Acessórios': 'acessorio',
      'Outros': '',
    };
    return mapa[categoria] || '';
  }

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'marca', label: 'Marca/Modelo', render: (v, row) => `${v || ''} ${row.modelo || ''}`.trim() },
    { key: 'valor_aquisicao', label: 'Valor', render: (v) => formatarMoeda(v) },
    { key: 'status', label: 'Status', align: 'center', render: (v) => <StatusBadge status={v || 'ativo'} /> },
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
                <div className="flex gap-2 mt-1">
                  <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required placeholder="Ex: Canon EOS R5" className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  <button type="button" onClick={buscarComIA} disabled={buscandoIA} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap" title="Buscar informações com IA">
                    {buscandoIA ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.789l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    )}
                    {buscandoIA ? 'Buscando...' : 'IA'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="">Selecione...</option>
                    {['acessorio','camera','drone','flash','iluminacao','lente','tripe'].map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Marca</label>
                  <input type="text" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Modelo</label>
                  <input type="text" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nº Série</label>
                  <input type="text" value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Estimado</label>
                  <input type="number" step="0.01" value={form.valor_aquisicao} onChange={(e) => setForm({ ...form, valor_aquisicao: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Aquisição</label>
                  <input type="date" value={form.data_aquisicao} onChange={(e) => setForm({ ...form, data_aquisicao: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} placeholder="Características e observações do equipamento" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
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
