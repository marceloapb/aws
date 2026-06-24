import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatarData } from '../../lib/formatters.js';
import PageHeader from '../../components/PageHeader.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function Contratos() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadContratos(); }, []);

  async function loadContratos() {
    try {
      const { data } = await api.get('/admin/contratos');
      setContratos(data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  async function enviarContrato(id) {
    try {
      await api.post(`/admin/contratos/${id}/enviar`);
      loadContratos();
    } catch (err) {
      alert(err.message);
    }
  }

  const columns = [
    { key: 'cliente_nome', label: 'Cliente' },
    { key: 'tipo_evento', label: 'Evento' },
    { key: 'created', label: 'Criado em', render: (v) => formatarData(v) },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'id', label: 'Ações', render: (v, row) => row.status === 'rascunho' ? (
      <button onClick={(e) => { e.stopPropagation(); enviarContrato(v); }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">
        📤 Enviar
      </button>
    ) : null },
  ];

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Contratos" subtitle={`${contratos.length} contratos`} />
      <DataTable columns={columns} data={contratos} />
    </div>
  );
}
