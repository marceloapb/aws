import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatarMoeda, formatarData } from '../../lib/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function PortalOrcamentos() {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orcamentoAberto, setOrcamentoAberto] = useState(null);

  useEffect(() => {
    api.get('/client/orcamentos')
      .then(({ data }) => setOrcamentos(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function aprovar(id) {
    if (!confirm('Deseja aprovar este orçamento?')) return;
    try {
      await api.post(`/client/orcamentos/${id}/aprovar`);
      const { data } = await api.get('/client/orcamentos');
      setOrcamentos(data || []);
      setOrcamentoAberto(null);
    } catch (err) {
      alert(err.message);
    }
  }

  async function recusar(id) {
    const motivo = prompt('Motivo da recusa (opcional):');
    try {
      await api.post(`/client/orcamentos/${id}/recusar`, { motivo });
      const { data } = await api.get('/client/orcamentos');
      setOrcamentos(data || []);
      setOrcamentoAberto(null);
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meus Orçamentos 💰</h1>

      {orcamentos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-4xl mb-2">💰</p>
          <p className="text-gray-500">Nenhum orçamento disponível</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orcamentos.map((orc) => (
            <div key={orc.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{orc.tipo_evento}</p>
                <p className="text-xs text-gray-500">Data: {formatarData(orc.data_evento)} • Criado: {formatarData(orc.created)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">{formatarMoeda(orc.valor_total)}</span>
                <StatusBadge status={orc.status} />
                {orc.status === 'enviado' && (
                  <button onClick={() => setOrcamentoAberto(orc)} className="px-3 py-1 bg-primary-600 text-white rounded text-sm">
                    Ver Detalhes
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {orcamentoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Orçamento - {orcamentoAberto.tipo_evento}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><p className="text-xs text-gray-500">Data do Evento</p><p className="font-medium">{formatarData(orcamentoAberto.data_evento)}</p></div>
                <div><p className="text-xs text-gray-500">Valor Total</p><p className="text-xl font-bold text-green-600">{formatarMoeda(orcamentoAberto.valor_total)}</p></div>
              </div>
              {orcamentoAberto.descricao && (
                <div><p className="text-xs text-gray-500 mb-1">Descrição</p><p className="text-sm text-gray-700">{orcamentoAberto.descricao}</p></div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setOrcamentoAberto(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md">Fechar</button>
              <button onClick={() => recusar(orcamentoAberto.id)} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700">✗ Recusar</button>
              <button onClick={() => aprovar(orcamentoAberto.id)} className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700">✓ Aprovar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
