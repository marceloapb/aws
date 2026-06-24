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

  function abrirPagamento(cobranca) {
    if (cobranca.link_pagamento) {
      window.open(cobranca.link_pagamento, '_blank');
    } else if (cobranca.pix_copia_cola) {
      navigator.clipboard.writeText(cobranca.pix_copia_cola);
      alert('Código PIX copiado!');
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  const pendentes = cobrancas.filter((c) => c.status === 'pendente');
  const pagas = cobrancas.filter((c) => c.status === 'pago');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meus Pagamentos 💳</h1>

      {pendentes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Pendentes</h2>
          <div className="space-y-3">
            {pendentes.map((c) => (
              <div key={c.id} className="bg-white rounded-lg border border-yellow-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.descricao || 'Cobrança'}</p>
                  <p className="text-xs text-gray-500">Vence: {formatarData(c.data_vencimento)} • {c.meio_pagamento?.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">{formatarMoeda(c.valor)}</span>
                  <button onClick={() => abrirPagamento(c)} className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
                    Pagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pagas.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Pagas</h2>
          <div className="space-y-2">
            {pagas.map((c) => (
              <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between opacity-75">
                <div>
                  <p className="font-medium">{c.descricao || 'Cobrança'}</p>
                  <p className="text-xs text-gray-500">Pago em: {formatarData(c.data_pagamento)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-green-600">{formatarMoeda(c.valor)}</span>
                  <StatusBadge status="pago" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cobrancas.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-4xl mb-2">💳</p>
          <p className="text-gray-500">Nenhum pagamento registrado</p>
        </div>
      )}
    </div>
  );
}
