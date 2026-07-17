import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Send, CheckCircle, Copy, FileText, Edit2 } from 'lucide-react';

const ACCENT = '#EA580C';
const STATUS_MAP = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  enviado: { label: 'Enviado', color: 'bg-blue-50 text-blue-700' },
  aceito: { label: 'Aceito', color: 'bg-green-50 text-green-700' },
  confirmado: { label: 'Confirmado', color: 'bg-green-50 text-green-700' },
  recusado: { label: 'Recusado', color: 'bg-red-50 text-red-700' },
  expirado: { label: 'Expirado', color: 'bg-yellow-50 text-yellow-700' },
};

export default function OrcamentoDetalhe() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [orc, setOrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrc(); }, [id]);

  const loadOrc = async () => {
    try {
      const res = await authFetch(`/admin/orcamentos/${id}`);
      const json = await res.json();
      if (json.success) setOrc(json.data);
    } catch {}
    setLoading(false);
  };

  const handleAction = async (action) => {
    try {
      if (action === 'enviar') await authFetch(`/admin/orcamentos/${id}/enviar`, { method: 'POST' });
      else if (action === 'aprovar') await authFetch(`/admin/orcamentos/${id}/aprovar`, { method: 'POST' });
      else if (action === 'duplicar') { await authFetch(`/admin/orcamentos/${id}/duplicar`, { method: 'POST' }); navigate('/admin/orcamentos'); return; }
      else if (action === 'excluir') { await authFetch(`/admin/orcamentos/${id}`, { method: 'DELETE' }); navigate('/admin/orcamentos'); return; }
      loadOrc();
    } catch {}
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  if (!orc) return <div className="text-center py-20 text-gray-400">Orçamento não encontrado</div>;

  const st = STATUS_MAP[orc.status] || STATUS_MAP.rascunho;

  return (
    <div>
      <button onClick={() => navigate('/admin/orcamentos')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamento #{id?.slice(0, 8)}</h1>
          <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
        </div>
        <div className="flex gap-2">
          {orc.status === 'rascunho' && (
            <>
              <button onClick={() => navigate(`/admin/orcamentos/${id}/editar`)} className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                <Edit2 size={14} /> Editar
              </button>
              <button onClick={() => handleAction('enviar')} style={{ background: ACCENT }}
                className="inline-flex items-center gap-1 px-4 py-2 text-white rounded-lg text-sm hover:opacity-90">
                <Send size={14} /> Enviar
              </button>
            </>
          )}
          {orc.status === 'enviado' && (
            <button onClick={() => handleAction('aprovar')} className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              <CheckCircle size={14} /> Marcar Aceito
            </button>
          )}
          {(orc.status === 'aceito' || orc.status === 'confirmado') && (
            <button onClick={() => navigate(`/admin/contratos/novo?orcamento_id=${id}`)} style={{ background: ACCENT }}
              className="inline-flex items-center gap-1 px-4 py-2 text-white rounded-lg text-sm hover:opacity-90">
              <FileText size={14} /> Gerar Contrato
            </button>
          )}
          <button onClick={() => handleAction('duplicar')} className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
            <Copy size={14} /> Duplicar
          </button>
        </div>
      </div>

      {/* Dados */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Info evento */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Evento</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Tipo:</span> <span className="font-medium">{orc.tipo_evento || '-'}</span></div>
              <div><span className="text-gray-500">Data:</span> <span className="font-medium">{orc.data_evento ? new Date(orc.data_evento).toLocaleDateString('pt-BR') : '-'}</span></div>
              <div><span className="text-gray-500">Local:</span> <span className="font-medium">{orc.local || '-'}</span></div>
              <div><span className="text-gray-500">Duração:</span> <span className="font-medium">{orc.duracao ? `${orc.duracao}h` : '-'}</span></div>
            </div>
          </div>

          {/* Itens */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Itens</h3>
            {(orc.itens || []).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum item</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left py-2">Item</th><th className="text-center py-2">Qtd</th><th className="text-right py-2">Unitário</th><th className="text-right py-2">Subtotal</th></tr></thead>
                <tbody>
                  {(orc.itens || []).map((it, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2">{it.nome}</td>
                      <td className="text-center py-2">{it.qtd}</td>
                      <td className="text-right py-2">R$ {(it.valor_unitario || 0).toLocaleString('pt-BR')}</td>
                      <td className="text-right py-2 font-medium">R$ {((it.qtd || 1) * (it.valor_unitario || 0)).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Observações */}
          {orc.observacoes && (
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Observações</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{orc.observacoes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Resumo</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>R$ {(orc.subtotal || orc.valor_total || 0).toLocaleString('pt-BR')}</span></div>
              {orc.desconto > 0 && <div className="flex justify-between"><span className="text-gray-500">Desconto</span><span className="text-red-500">- R$ {(orc.desconto || 0).toLocaleString('pt-BR')}</span></div>}
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold" style={{ color: ACCENT }}>R$ {(orc.valor_total || 0).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Condições</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Pagamento:</span> <span className="font-medium">{orc.condicao_pagamento || '-'}</span></div>
              <div><span className="text-gray-500">Parcelas:</span> <span className="font-medium">{orc.parcelas || '-'}x</span></div>
              <div><span className="text-gray-500">Validade:</span> <span className="font-medium">{orc.validade_dias || 7} dias</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-3 text-sm">
              {orc.created && <div className="text-gray-500">Criado em {new Date(orc.created).toLocaleDateString('pt-BR')}</div>}
              {orc.enviado_em && <div className="text-blue-600">Enviado em {new Date(orc.enviado_em).toLocaleDateString('pt-BR')}</div>}
              {orc.aprovado_em && <div className="text-green-600">Aceito em {new Date(orc.aprovado_em).toLocaleDateString('pt-BR')}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
