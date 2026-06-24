import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { formatarMoeda, formatarData } from '../../lib/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function PortalHome() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/client/albuns'),
      api.get('/client/pagamentos'),
      api.get('/client/orcamentos'),
    ]).then(([albRes, cobRes, orcRes]) => {
      setDados({ albuns: albRes.data || [], cobrancas: cobRes.data || [], orcamentos: orcRes.data || [] });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  const pendentes = dados.cobrancas.filter((c) => c.status === 'pendente');
  const orcPendentes = dados.orcamentos.filter((o) => o.status === 'enviado');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bem-vindo! 📷</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/portal/albuns" className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <p className="text-3xl mb-1">📸</p>
          <p className="text-2xl font-bold">{dados.albuns.length}</p>
          <p className="text-sm text-gray-500">Álbuns disponíveis</p>
        </Link>
        <Link to="/portal/pagamentos" className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <p className="text-3xl mb-1">💳</p>
          <p className="text-2xl font-bold">{pendentes.length}</p>
          <p className="text-sm text-gray-500">Pagamentos pendentes</p>
        </Link>
        <Link to="/portal/orcamentos" className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <p className="text-3xl mb-1">💰</p>
          <p className="text-2xl font-bold">{orcPendentes.length}</p>
          <p className="text-sm text-gray-500">Orçamentos para aprovar</p>
        </Link>
      </div>

      {pendentes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Pagamentos Pendentes</h3>
          {pendentes.map((c) => (
            <div key={c.id} className="flex justify-between items-center py-2 border-t border-yellow-100">
              <span className="text-sm">{c.descricao || 'Cobrança'} • Vence: {formatarData(c.data_vencimento)}</span>
              <span className="font-bold text-yellow-800">{formatarMoeda(c.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
