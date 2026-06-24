import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatarData } from '../../lib/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function PortalContratos() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contratoAtivo, setContratoAtivo] = useState(null);
  const [assinando, setAssinando] = useState(false);
  const [nomeDigitado, setNomeDigitado] = useState('');
  const [aceite, setAceite] = useState(false);

  useEffect(() => {
    api.get('/client/contratos')
      .then(({ data }) => setContratos(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function assinar(token) {
    if (!aceite || !nomeDigitado.trim()) {
      alert('Confirme o nome e aceite os termos');
      return;
    }
    setAssinando(true);
    try {
      await api.post(`/client/contratos/${token}/assinar`, {
        nome_digitado: nomeDigitado,
        aceite_termos: aceite,
      });
      setContratoAtivo(null);
      setNomeDigitado('');
      setAceite(false);
      const { data } = await api.get('/client/contratos');
      setContratos(data || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setAssinando(false);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Contratos 📄</h1>

      {contratos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-4xl mb-2">📄</p>
          <p className="text-gray-500">Nenhum contrato disponível</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contratos.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{c.tipo_evento || 'Contrato'}</p>
                <p className="text-sm text-gray-500">Criado em: {formatarData(c.created)}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={c.status} />
                {c.status === 'enviado' && (
                  <button onClick={() => setContratoAtivo(c)} className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700">
                    ✍️ Assinar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {contratoAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Assinar Contrato</h2>
            <div className="bg-gray-50 rounded-md p-4 mb-4 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
              {contratoAtivo.conteudo || 'Conteúdo do contrato...'}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Digite seu nome completo para assinar *</label>
                <input type="text" value={nomeDigitado} onChange={(e) => setNomeDigitado(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Seu nome completo" />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="w-4 h-4 mt-0.5 rounded" />
                <span>Li e aceito os termos deste contrato e confirmo que as informações estão corretas.</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setContratoAtivo(null); setNomeDigitado(''); setAceite(false); }} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md">Cancelar</button>
              <button onClick={() => assinar(contratoAtivo.token_assinatura)} disabled={assinando || !aceite || !nomeDigitado.trim()} className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md disabled:opacity-50">
                {assinando ? 'Assinando...' : '✍️ Assinar Agora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
