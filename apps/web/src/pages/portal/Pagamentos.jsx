import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatarMoeda, formatarData } from '../../lib/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function PortalPagamentos() {
  const [cobrancas, setCobrancas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/client/pagamentos')
      .then(({ data }) => setCobrancas(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  const total = cobrancas.filter((c) => c.status === 'pago').reduce((s, c) => s + (c.valor || 0), 0);
  const pendente = cobrancas.filter((c) => c.status === 'pendente').reduce((s, c) => s + (c.valor || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pagamentos 💳</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600">Total pago</p>
          <p className="text-xl font-bold text-green-700">{formatarMoeda(total)}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-600">Pendente</p>
          <p className="text-xl font-bold text-yellow-700">{formatarMoeda(pendente)}</p>
        </div>
      </div>

      {cobrancas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-4xl mb-2">💳</p>
          <p className="text-gray-500">Nenhuma cobrança encontrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {cobrancas.map((c) => (
            <div key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{c.descricao || 'Cobrança'}</p>
                <p className="text-xs text-gray-500">
                  {c.meio_pagamento && `${c.meio_pagamento} • `}
                  {c.status === 'pago' ? `Pago em: ${formatarData(c.data_pagamento)}` : `Vence: ${formatarData(c.data_vencimento)}`}
                </p>
                {c.status === 'pendente' && c.link_pagamento && (
                  <a href={c.link_pagamento} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline mt-1 block">
                    Pagar agora →
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">{formatarMoeda(c.valor)}</span>
                <StatusBadge status={c.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
