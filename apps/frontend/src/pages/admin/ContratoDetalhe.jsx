import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Send, CheckCircle, FileText, Download } from 'lucide-react';

const ACCENT = '#EA580C';

export default function ContratoDetalhe() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadContrato(); }, [id]);

  const loadContrato = async () => {
    try {
      const res = await authFetch(`/admin/contratos/${id}`);
      const json = await res.json();
      if (json.success) setContrato(json.data);
    } catch {}
    setLoading(false);
  };

  const handleEnviar = async () => {
    await authFetch(`/admin/contratos/${id}/enviar`, { method: 'POST' });
    loadContrato();
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  if (!contrato) return <div className="text-center py-20 text-gray-400">Contrato não encontrado</div>;

  const statusColor = {
    gerado: 'bg-yellow-50 text-yellow-700',
    enviado: 'bg-blue-50 text-blue-700',
    assinado: 'bg-green-50 text-green-700',
    expirado: 'bg-red-50 text-red-700',
  };

  return (
    <div>
      <button onClick={() => navigate('/admin/contratos')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrato #{id?.slice(0, 8)}</h1>
          <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[contrato.status] || 'bg-gray-100 text-gray-600'}`}>
            {contrato.status}
          </span>
        </div>
        <div className="flex gap-2">
          {contrato.status === 'gerado' && (
            <button onClick={handleEnviar} style={{ background: ACCENT }}
              className="inline-flex items-center gap-1 px-4 py-2 text-white rounded-lg text-sm hover:opacity-90">
              <Send size={14} /> Enviar para Assinatura
            </button>
          )}
          {contrato.pdf_s3_key && (
            <button className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
              <Download size={14} /> Baixar PDF
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Conteúdo do Contrato</h3>
            {contrato.conteudo_html ? (
              <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: contrato.conteudo_html }} />
            ) : (
              <p className="text-sm text-gray-400">Conteúdo não disponível</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Informações</h3>
            <div className="space-y-3 text-sm">
              <div><span className="text-gray-500">Orçamento:</span> <span className="font-medium">#{contrato.orcamento_id?.slice(0, 8)}</span></div>
              <div><span className="text-gray-500">Gerado em:</span> <span className="font-medium">{contrato.gerado_em ? new Date(contrato.gerado_em).toLocaleDateString('pt-BR') : contrato.created ? new Date(contrato.created).toLocaleDateString('pt-BR') : '-'}</span></div>
              {contrato.expira_em && <div><span className="text-gray-500">Expira em:</span> <span className="font-medium">{new Date(contrato.expira_em).toLocaleDateString('pt-BR')}</span></div>}
              {contrato.aceite_em && (
                <>
                  <div className="pt-3 border-t"><span className="text-gray-500">Assinado em:</span> <span className="font-medium text-green-600">{new Date(contrato.aceite_em).toLocaleDateString('pt-BR')}</span></div>
                  <div><span className="text-gray-500">IP:</span> <span className="font-medium">{contrato.aceite_ip || '-'}</span></div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
