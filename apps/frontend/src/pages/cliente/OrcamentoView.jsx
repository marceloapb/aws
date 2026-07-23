import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, FileText, Check, Clock } from 'lucide-react';

const ACCENT = '#EA580C';
const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

export default function OrcamentoView() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [orc, setOrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aprovando, setAprovando] = useState(false);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState(null);

  useEffect(() => {
    authFetch(`/client/orcamentos/${id}`)
      .then(r => r.json())
      .then(json => { if (json.success) setOrc(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAprovar = async () => {
    if (!opcaoSelecionada && orc.opcoes?.length > 1) return;
    setAprovando(true);
    try {
      const res = await authFetch(`/client/orcamentos/${id}/aprovar`, {
        method: 'POST',
        body: JSON.stringify({ opcao_escolhida: opcaoSelecionada }),
      });
      const json = await res.json();
      if (json.success) navigate('/cliente/orcamentos');
    } catch {}
    setAprovando(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  if (!orc) return <div className="text-center py-20 text-gray-400">Orçamento não encontrado</div>;

  const opcoes = orc.opcoes || [];
  const podeAprovar = orc.status === 'enviado';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/cliente/orcamentos')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <FileText size={22} style={{ color: ACCENT }} />
          <h1 className="text-xl font-bold text-gray-900">{orc.titulo || orc.tipo_evento || 'Orçamento'}</h1>
        </div>
      </div>

      {/* Info do evento */}
      <div className="bg-white rounded-xl border p-5 mb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {orc.data_evento && <div><span className="text-gray-500">Data:</span> <span className="font-medium">{fmtDate(orc.data_evento)}</span></div>}
          {orc.local && <div className="col-span-2"><span className="text-gray-500">Local:</span> <span className="font-medium">{orc.local}</span></div>}
          {orc.validade_dias && <div><span className="text-gray-500">Validade:</span> <span className="font-medium">{orc.validade_dias} dias</span></div>}
        </div>
      </div>

      {/* Mensagem do fotógrafo */}
      {orc.mensagem && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{orc.mensagem}</p>
        </div>
      )}

      {/* Opções */}
      {opcoes.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="font-semibold text-gray-900">
            {opcoes.length === 1 ? 'Sua Proposta' : `Escolha uma das ${opcoes.length} opções`}
          </h2>
          {opcoes.map((op, idx) => {
            const isSelected = opcaoSelecionada === idx;
            const subtotal = (op.itens_snapshot || []).reduce((s, i) => s + (i.valor_unitario || 0) * (i.quantidade || 1), 0);
            const valorFinal = op.valor_total || subtotal;

            return (
              <div
                key={op.id || idx}
                onClick={() => podeAprovar && opcoes.length > 1 && setOpcaoSelecionada(idx)}
                className={`bg-white rounded-xl border-2 p-5 transition-all ${
                  isSelected ? 'border-orange-500 ring-2 ring-orange-100' :
                  podeAprovar && opcoes.length > 1 ? 'border-gray-200 hover:border-gray-300 cursor-pointer' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{op.nome || `Opção ${idx + 1}`}</h3>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: ACCENT }}>
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Itens */}
                {(op.itens_snapshot || []).length > 0 && (
                  <div className="space-y-1 mb-3">
                    {op.itens_snapshot.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-600">
                        <span>{item.nome} {item.quantidade > 1 && `×${item.quantidade}`}</span>
                        <span>{fmtBRL((item.valor_unitario || 0) * (item.quantidade || 1))}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Horas adicionais */}
                {op.horas_extras > 0 && op.valor_hora_extra > 0 && (
                  <div className="flex justify-between text-sm text-orange-600 mb-3">
                    <span>Horas Adicionais ({op.horas_extras}h)</span>
                    <span>+{fmtBRL(op.subtotal_horas_extras || op.horas_extras * op.valor_hora_extra)}</span>
                  </div>
                )}

                {/* Total da opção */}
                <div className="pt-3 border-t flex justify-between items-baseline">
                  <span className="text-sm font-medium text-gray-700">Total</span>
                  <span className="text-xl font-bold" style={{ color: ACCENT }}>{fmtBRL(valorFinal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Condições de pagamento */}
      {orc.condicoes_pagamento && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Condições de Pagamento</h3>
          <div className="space-y-2 text-sm">
            {orc.condicoes_pagamento.avista?.ativo && (
              <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-green-800">À vista{orc.condicoes_pagamento.avista.desconto_pct > 0 && ` (${orc.condicoes_pagamento.avista.desconto_pct}% de desconto)`}</span>
                <span className="font-bold text-green-700">{fmtBRL((orc.valor_total || 0) * (1 - (orc.condicoes_pagamento.avista.desconto_pct || 0) / 100))}</span>
              </div>
            )}
            {orc.condicoes_pagamento.sem_juros?.ativo && (
              <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-800">{orc.condicoes_pagamento.sem_juros.max_parcelas}× sem juros</span>
                <span className="font-bold text-blue-700">{fmtBRL((orc.valor_total || 0) / (orc.condicoes_pagamento.sem_juros.max_parcelas || 1))}/mês</span>
              </div>
            )}
            {orc.condicoes_pagamento.com_juros?.ativo && (
              <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-purple-800">{orc.condicoes_pagamento.com_juros.max_parcelas}× ({orc.condicoes_pagamento.com_juros.taxa_mensal}% a.m.)</span>
                <span className="font-bold text-purple-700">consulte</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão Aprovar */}
      {podeAprovar && (
        <button
          onClick={handleAprovar}
          disabled={aprovando || (opcoes.length > 1 && opcaoSelecionada === null)}
          style={{ background: ACCENT }}
          className="w-full py-4 text-white rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {aprovando ? 'Aprovando...' : opcoes.length > 1 ? 'Aprovar Opção Selecionada' : 'Aprovar Orçamento'}
        </button>
      )}

      {orc.status === 'aceito' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <Check size={24} className="text-green-600 mx-auto mb-2" />
          <p className="font-semibold text-green-800">Orçamento Aprovado!</p>
        </div>
      )}
    </div>
  );
}
