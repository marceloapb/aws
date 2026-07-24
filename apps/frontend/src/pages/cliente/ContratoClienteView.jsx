import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, FileSignature, CheckCircle, AlertCircle } from 'lucide-react';

const ACCENT = '#EA580C';

export default function ContratoClienteView() {
  const { token } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assinando, setAssinando] = useState(false);
  const [nomeDigitado, setNomeDigitado] = useState('');
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    authFetch(`/client/contratos/${token}`)
      .then(r => r.json())
      .then(json => {
        const data = json.data || json;
        setContrato(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleAssinar = async () => {
    if (!nomeDigitado.trim()) { alert('Digite seu nome completo para assinar'); return; }
    if (!aceiteTermos) { alert('Aceite os termos para continuar'); return; }
    setAssinando(true);
    try {
      const res = await authFetch(`/client/contratos/${token}/assinar`, {
        method: 'POST',
        body: JSON.stringify({ nome_digitado: nomeDigitado, aceite_termos: aceiteTermos }),
      });
      const json = await res.json();
      if (json.success) {
        setSucesso(true);
      } else {
        alert(json.message || 'Erro ao assinar');
      }
    } catch (err) {
      alert('Erro ao assinar: ' + err.message);
    }
    setAssinando(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  if (!contrato) return <div className="text-center py-20 text-gray-400">Contrato não encontrado</div>;

  if (sucesso) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Contrato Assinado!</h2>
        <p className="text-gray-500 mb-6">Sua assinatura foi registrada com sucesso.</p>
        <button onClick={() => navigate('/cliente/contratos')} style={{ background: ACCENT }}
          className="px-6 py-2.5 text-white rounded-lg font-medium hover:opacity-90">
          Voltar aos Contratos
        </button>
      </div>
    );
  }

  const podeAssinar = contrato.status === 'enviado' || contrato.status === 'pendente_assinatura';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/cliente/contratos')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <FileSignature size={22} style={{ color: ACCENT }} />
          <h1 className="text-xl font-bold text-gray-900">Contrato {contrato.numero_contrato || ''}</h1>
        </div>
        {contrato.status === 'assinado' && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">Assinado</span>
        )}
      </div>

      {/* Conteúdo do contrato */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="prose prose-sm max-w-none" style={{ lineHeight: '1.8' }}
          dangerouslySetInnerHTML={{ __html: contrato.conteudo_html || '<p>Conteúdo não disponível</p>' }} />
      </div>

      {/* Assinatura do contratado (se já assinou) */}
      {contrato.assinatura_contratado && (
        <div className="bg-gray-50 rounded-xl border p-4 mb-6 text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-1">Assinado pelo Contratado:</p>
          <p>{contrato.assinatura_contratado.nome} — {contrato.assinado_contratado_em ? new Date(contrato.assinado_contratado_em).toLocaleString('pt-BR') : ''}</p>
        </div>
      )}

      {/* Bloco de assinatura */}
      {podeAssinar && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileSignature size={18} style={{ color: ACCENT }} /> Assinar Contrato
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Digite seu nome completo *</label>
              <input type="text" value={nomeDigitado} onChange={e => setNomeDigitado(e.target.value)}
                placeholder="Seu nome completo como assinatura"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
            </div>

            <div className="flex items-start gap-2">
              <input type="checkbox" id="aceite" checked={aceiteTermos} onChange={e => setAceiteTermos(e.target.checked)}
                className="mt-1 rounded border-gray-300" />
              <label htmlFor="aceite" className="text-sm text-gray-700">
                Li e concordo com todos os termos e condições descritos neste contrato.
              </label>
            </div>

            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-800">
                Ao assinar, você declara ter lido integralmente este contrato e concorda com todos os seus termos.
                Esta assinatura tem validade jurídica conforme MP 2.200-2/2001.
              </p>
            </div>

            <button onClick={handleAssinar} disabled={assinando || !nomeDigitado.trim() || !aceiteTermos}
              style={{ background: ACCENT }}
              className="w-full py-3.5 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {assinando ? 'Assinando...' : 'Assinar Contrato'}
            </button>
          </div>
        </div>
      )}

      {contrato.status === 'assinado' && contrato.assinado_em && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <CheckCircle size={24} className="text-green-600 mx-auto mb-2" />
          <p className="font-semibold text-green-800">Contrato assinado em {new Date(contrato.assinado_em).toLocaleString('pt-BR')}</p>
        </div>
      )}
    </div>
  );
}
