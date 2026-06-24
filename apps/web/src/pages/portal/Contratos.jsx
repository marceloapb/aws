import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatarData } from '../../lib/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function PortalContratos() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contratoAberto, setContratoAberto] = useState(null);
  const [assinando, setAssinando] = useState(false);

  useEffect(() => {
    api.get('/client/contratos')
      .then(({ data }) => setContratos(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function assinarContrato(id) {
    if (!confirm('Ao confirmar, você está assinando digitalmente este contrato. Deseja continuar?')) return;
    setAssinando(true);
    try {
      await api.post(`/client/contratos/${id}/assinar`);
      const { data } = await api.get('/client/contratos');
      setContratos(data || []);
      setContratoAberto(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setAssinando(false);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meus Contratos 📄</h1>

      {contratos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-4xl mb-2">📄</p>
          <p className="text-gray-500">Nenhum contrato disponível</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contratos.map((contrato) => (
            <div key={contrato.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{contrato.tipo_evento}</p>
                <p className="text-xs text-gray-500">Criado em: {formatarData(contrato.created)}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={contrato.status} />
                {contrato.status === 'enviado' && (
                  <button onClick={() => setContratoAberto(contrato)} className="px-3 py-1 bg-primary-600 text-white rounded text-sm">
                    Ver e Assinar
                  </button>
                )}
                {contrato.status === 'assinado' && (
                  <span className="text-xs text-green-600 font-medium">✓ Assinado em {formatarData(contrato.data_assinatura)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {contratoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Contrato - {contratoAberto.tipo_evento}</h2>
            </div>
            <div className="p-6 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: contratoAberto.conteudo_html }} />
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setContratoAberto(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md">Fechar</button>
              <button onClick={() => assinarContrato(contratoAberto.id)} disabled={assinando} className="px-4 py-2 text-sm text-white bg-green-600 rounded-md disabled:opacity-50">
                {assinando ? 'Assinando...' : '✍️ Assinar Digitalmente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
