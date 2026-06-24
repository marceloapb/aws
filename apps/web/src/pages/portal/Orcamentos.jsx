import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatarMoeda, formatarData } from '../../lib/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function PortalOrcamentos() {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aprovando, setAprovando] = useState(null);

  useEffect(() => {
    api.get('/client/orcamentos')
      .then(({ data }) => setOrcamentos(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function aprovar(id) {
    if (!confirm('Confirmar aprovação deste orçamento?')) return;
    setAprovando(id);
    try {
      await api.post(`/client/orcamentos/${id}/aprovar`);
      const { data } = await api.get('/client/orcamentos');
      setOrcamentos(data || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setAprovando(null);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orçamentos 💰</h1>

      {orcamentos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-4xl mb-2">💰</p>
          <p className="text-gray-500">Nenhum orçamento disponível</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orcamentos.map((o) => (
            <div key={o.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium">{o.tipo_evento || 'Orçamento'}</p>
                  <p className="text-sm text-gray-500">{formatarData(o.data_evento)} • Criado: {formatarData(o.created)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold">{formatarMoeda(o.valor_total)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </div>

              {o.itens?.length > 0 && (
                <div className="bg-gray-50 rounded-md p-3 mb-3 text-sm">
                  {o.itens.map((item, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span>{item.descricao}</span>
                      <span>{formatarMoeda(item.valor)}</span>
                    </div>
                  ))}
                </div>
              )}

              {o.status === 'enviado' && (
                <div className="flex gap-3">
                  <button onClick={() => aprovar(o.id)} disabled={aprovando === o.id} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50">
                    {aprovando === o.id ? 'Aprovando...' : '✓ Aprovar Orçamento'}
                  </button>
                </div>
              )}

              {o.valido_ate && o.status === 'enviado' && (
                <p className="text-xs text-orange-500 mt-2">Válido até: {formatarData(o.valido_ate)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
