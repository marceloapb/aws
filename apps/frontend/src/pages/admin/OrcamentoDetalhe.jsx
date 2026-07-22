import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft, Send, CheckCircle, Copy, FileText, Edit2, Download,
  Trash2, RefreshCw, RotateCcw, Phone, Mail, Star, Clock, XCircle, MapPin, AlertTriangle,
  DollarSign, Calendar, Hash, Tag, Info
} from 'lucide-react';
import DistanceBadge from '../../components/DistanceBadge';
import MapEmbed from '../../components/MapEmbed';
import { MapLink } from '../../components/MapLink';

const ACCENT = '#EA580C';

const STATUS_MAP = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  em_revisao: { label: 'Em Revisão', color: 'bg-blue-50 text-blue-700' },
  pronto_enviar: { label: 'Pronto p/ Enviar', color: 'bg-purple-50 text-purple-700' },
  enviado: { label: 'Enviado', color: 'bg-orange-50 text-orange-700' },
  aceito: { label: 'Aceito', color: 'bg-green-50 text-green-700' },
  recusado: { label: 'Recusado', color: 'bg-red-50 text-red-700' },
  expirado: { label: 'Expirado', color: 'bg-yellow-50 text-yellow-800' },
  contrato_gerado: { label: 'Contrato Gerado', color: 'bg-emerald-50 text-emerald-700' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;

export default function OrcamentoDetalhe() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [orc, setOrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => { loadOrc(); }, [id]);

  const loadOrc = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/admin/orcamentos/${id}`);
      const json = await res.json();
      if (json.success) setOrc(json.data);
    } catch {} finally { setLoading(false); }
  };

  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      if (action === 'enviar') await authFetch(`/admin/orcamentos/${id}/enviar`, { method: 'POST' });
      else if (action === 'aprovar') await authFetch(`/admin/orcamentos/${id}/aprovar`, { method: 'POST' });
      else if (action === 'duplicar') { await authFetch(`/admin/orcamentos/${id}/duplicar`, { method: 'POST' }); navigate('/admin/orcamentos'); return; }
      else if (action === 'cancelar') await authFetch(`/admin/orcamentos/${id}/cancelar`, { method: 'POST' });
      else if (action === 'reabrir') await authFetch(`/admin/orcamentos/${id}/reabrir`, { method: 'POST' });
      else if (action === 'excluir') { await authFetch(`/admin/orcamentos/${id}`, { method: 'DELETE' }); navigate('/admin/orcamentos'); return; }
      loadOrc();
    } catch {} finally { setActionLoading(''); }
  };

  const handlePDF = async () => {
    setActionLoading('pdf');
    try {
      const r = await authFetch(`/admin/orcamentos/${id}/pdf`, { method: 'POST' });
      const j = await r.json();
      if (j.success && j.data?.url) window.open(j.data.url, '_blank');
    } catch {} finally { setActionLoading(''); }
  };

  // Validade countdown
  const validadeInfo = useMemo(() => {
    if (!orc?.validade_dias || !orc?.created) return null;
    const criado = new Date(orc.created);
    const expira = new Date(criado.getTime() + orc.validade_dias * 86400000);
    const diasRestantes = Math.ceil((expira - Date.now()) / 86400000);
    return { expira, diasRestantes };
  }, [orc]);

  // Calcula o valor total consolidado (maior valor entre as opções ou valor_total do orçamento)
  const valorTotalConsolidado = useMemo(() => {
    if (!orc) return 0;
    if (orc.valor_total) return orc.valor_total;
    const opcs = orc.opcoes || [];
    if (opcs.length === 0) return 0;
    const calcOpcaoTotal = (op) => {
      const sub = (op.itens_snapshot || []).reduce((s, i) => s + (i.valor_unitario || 0) * (i.quantidade || 1), 0);
      const desc = op.desconto_tipo === 'pct' ? sub * ((op.desconto_valor || 0) / 100) : (op.desconto_valor || 0);
      return Math.max(0, sub - desc);
    };
    // Se tem opção destacada/recomendada, usa ela; senão usa o maior valor
    const destaque = opcs.find(op => op.destaque);
    if (destaque) return calcOpcaoTotal(destaque);
    return Math.max(...opcs.map(calcOpcaoTotal));
  }, [orc]);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  if (!orc) return <div className="text-center py-20 text-gray-400">Orçamento não encontrado</div>;

  const st = STATUS_MAP[orc.status] || STATUS_MAP.rascunho;
  const cliente = orc.cliente || {};
  const opcoes = orc.opcoes || [];

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => navigate('/admin/orcamentos')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <FileText size={24} style={{ color: '#EA580C' }} />
          <h1 className="text-2xl font-bold text-gray-900">{orc.titulo || `Orçamento #${id?.slice(0, 8)}`}</h1>
          <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Ações contextuais */}
          {(orc.status === 'rascunho' || orc.status === 'em_revisao' || orc.status === 'pronto_enviar') && (
            <>
              <Btn icon={Edit2} label="Editar" onClick={() => navigate(`/admin/orcamentos/${id}/editar`)} />
              <Btn icon={Send} label="Enviar" accent onClick={() => handleAction('enviar')} loading={actionLoading === 'enviar'} />
              <Btn icon={Trash2} label="Excluir" danger onClick={() => handleAction('excluir')} loading={actionLoading === 'excluir'} />
            </>
          )}
          {orc.status === 'enviado' && (
            <>
              <Btn icon={RefreshCw} label="Reenviar" onClick={() => handleAction('enviar')} loading={actionLoading === 'enviar'} />
              <Btn icon={CheckCircle} label="Marcar Aceito" accent onClick={() => handleAction('aprovar')} loading={actionLoading === 'aprovar'} />
              <Btn icon={XCircle} label="Cancelar" danger onClick={() => handleAction('cancelar')} loading={actionLoading === 'cancelar'} />
            </>
          )}
          {orc.status === 'aceito' && (
            <Btn icon={FileText} label="Gerar Contrato" accent onClick={() => navigate(`/admin/contratos/novo?orcamento_id=${id}`)} />
          )}
          {(orc.status === 'recusado' || orc.status === 'expirado') && (
            <>
              <Btn icon={RotateCcw} label="Reabrir" onClick={() => handleAction('reabrir')} loading={actionLoading === 'reabrir'} />
            </>
          )}
          {/* Sempre visíveis */}
          <Btn icon={Copy} label="Duplicar" onClick={() => handleAction('duplicar')} loading={actionLoading === 'duplicar'} />
          <Btn icon={Download} label="PDF" onClick={handlePDF} loading={actionLoading === 'pdf'} />
        </div>
      </div>

      {/* ─── VALIDADE COUNTDOWN ─── */}
      {validadeInfo && !['aceito', 'contrato_gerado', 'cancelado', 'expirado'].includes(orc.status) && (
        <div className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          validadeInfo.diasRestantes <= 2 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
        }`}>
          <Clock size={16} />
          {validadeInfo.diasRestantes > 0
            ? `Expira em ${validadeInfo.diasRestantes} dia${validadeInfo.diasRestantes > 1 ? 's' : ''} (${fmtDate(validadeInfo.expira)})`
            : 'Expirado'}
        </div>
      )}

      {/* ─── RESUMO DO ORÇAMENTO ─── */}
      <div className="bg-white rounded-xl border p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Info size={18} /> Resumo do Orçamento</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Valor Total */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-medium mb-1">Valor Total</span>
            <span className="text-lg font-bold" style={{ color: ACCENT }}>
              {fmtBRL(valorTotalConsolidado)}
            </span>
          </div>
          {/* Data de Criação */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-medium mb-1">Criado em</span>
            <span className="text-sm font-medium text-gray-800">{fmtDate(orc.created)}</span>
          </div>
          {/* Validade */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-medium mb-1">Validade</span>
            <span className="text-sm font-medium text-gray-800">
              {orc.validade_dias ? `${orc.validade_dias} dias` : '-'}
              {validadeInfo && validadeInfo.diasRestantes > 0 && (
                <span className={`ml-1 text-xs ${validadeInfo.diasRestantes <= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                  ({validadeInfo.diasRestantes}d restantes)
                </span>
              )}
              {validadeInfo && validadeInfo.diasRestantes <= 0 && (
                <span className="ml-1 text-xs text-red-600">(expirado)</span>
              )}
            </span>
          </div>
          {/* Quantidade de Opções */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-medium mb-1">Opções</span>
            <span className="text-sm font-medium text-gray-800">{opcoes.length} opç{opcoes.length === 1 ? 'ão' : 'ões'}</span>
          </div>
          {/* Canal de Origem */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-medium mb-1">Origem</span>
            <span className="text-sm font-medium text-gray-800">
              {orc.origem_canal === 'whatsapp' ? '📱 WhatsApp'
                : orc.origem_canal === 'instagram' ? '📷 Instagram'
                : orc.origem_canal === 'site' ? '🌐 Site'
                : orc.origem_canal === 'indicacao' ? '🤝 Indicação'
                : orc.origem_canal === 'telefone' ? '📞 Telefone'
                : orc.origem_canal || 'Manual'}
            </span>
          </div>
        </div>

        {/* Informações adicionais em linha */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
          {orc.id && (
            <span className="flex items-center gap-1"><Hash size={12} /> ID: {orc.id.slice(0, 8)}...</span>
          )}
          {orc.tipo_evento && (
            <span className="flex items-center gap-1"><Tag size={12} /> {orc.tipo_evento}</span>
          )}
          {orc.data_evento && (
            <span className="flex items-center gap-1"><Calendar size={12} /> Evento: {fmtDate(orc.data_evento)}</span>
          )}
          {orc.nome_evento && (
            <span className="flex items-center gap-1"><FileText size={12} /> {orc.nome_evento}</span>
          )}
          {orc.updatedAt && orc.updatedAt !== orc.created && (
            <span className="flex items-center gap-1"><RefreshCw size={12} /> Atualizado: {fmtDateTime(orc.updatedAt)}</span>
          )}
        </div>
      </div>

      {/* ─── DADOS DO CLIENTE ─── */}
      <div className="bg-white rounded-xl border p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Cliente</h3>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-gray-800">{cliente.nome || '-'}</span>
          {cliente.email && (
            <span className="flex items-center gap-1 text-gray-500"><Mail size={14} /> {cliente.email}</span>
          )}
          {cliente.telefone && (
            <span className="flex items-center gap-1 text-gray-500"><Phone size={14} /> {cliente.telefone}</span>
          )}
          {cliente.telefone && (
            <a href={`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14l-.29-.174-3.01.79.8-2.93-.19-.3A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* ─── LOCAL DO EVENTO (MAP-06) ─── */}
      {(orc.local_evento || orc.local) && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MapPin size={18} /> Local do Evento</h3>
          <p className="text-sm text-gray-700 mb-2">{orc.local_evento || orc.local}</p>
          <DistanceBadge
            distancia_km={orc.distancia_km}
            duracao_minutos={orc.duracao_minutos}
            endereco={orc.local_evento || orc.local}
          />
          {orc.distancia_km > 100 && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
              <div className="text-xs text-red-700">
                <p className="font-semibold">Distância acima de 100km</p>
                <p>Considere taxa de deslocamento. Sugestão: R$ {Math.round(orc.distancia_km * 1.5)},00 (R$ 1,50/km)</p>
              </div>
            </div>
          )}
          {orc.distancia_km > 30 && orc.distancia_km <= 100 && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
              <div className="text-xs text-yellow-700">
                <p className="font-semibold">Distância acima de 30km</p>
                <p>Considere taxa de deslocamento. Sugestão: R$ {Math.round(orc.distancia_km * 1.5)},00 (R$ 1,50/km)</p>
              </div>
            </div>
          )}
          <div className="mt-3">
            <MapEmbed endereco={orc.local_evento || orc.local} lat={orc.local_lat} lng={orc.local_lng} altura={180} />
          </div>
        </div>
      )}

      {/* ─── OPÇÕES (ORC-03) ─── */}
      {opcoes.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Opções do Orçamento</h3>
          <div className={`grid gap-4 ${opcoes.length === 1 ? 'grid-cols-1' : opcoes.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {opcoes.map((op, idx) => {
              const subtotal = (op.itens_snapshot || []).reduce((s, i) => s + (i.valor_unitario || 0) * (i.quantidade || 1), 0);
              const desconto = op.desconto_tipo === 'pct' ? subtotal * ((op.desconto_valor || 0) / 100) : (op.desconto_valor || 0);
              const total = Math.max(0, subtotal - desconto);
              const isEscolhida = orc.opcao_aceita_id === op.id || orc.opcao_escolhida === idx;

              return (
                <div key={op.id || idx} className={`bg-white rounded-xl border-2 p-5 relative ${
                  isEscolhida ? 'border-green-500 ring-2 ring-green-100' : op.destaque ? 'border-orange-300' : 'border-gray-200'
                }`}>
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold text-gray-900">{op.nome || `Opção ${idx + 1}`}</h4>
                    {op.destaque && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-700">
                        <Star size={10} fill="currentColor" /> Recomendada
                      </span>
                    )}
                  </div>
                  {isEscolhida && orc.status === 'aceito' && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full uppercase">
                      <CheckCircle size={10} /> Escolhida
                    </div>
                  )}

                  {/* Itens */}
                  {(op.itens_snapshot || []).length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Itens</p>
                      <div className="space-y-1">
                        {op.itens_snapshot.map((it, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-700">
                            <span>{it.nome} <span className="text-gray-400">×{it.quantidade || 1}</span></span>
                            <span>{fmtBRL((it.valor_unitario || 0) * (it.quantidade || 1))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Eventos */}
                  {(op.eventos || []).length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Eventos</p>
                      <div className="space-y-1">
                        {op.eventos.map((ev, i) => (
                          <div key={i} className="text-xs text-gray-600">
                            <span className="font-medium">{ev.tipo}</span>
                            {ev.data && <> • {fmtDate(ev.data)}</>}
                            {ev.hora_inicio && <> {ev.hora_inicio}{ev.hora_fim && `–${ev.hora_fim}`}</>}
                            {ev.local && <> • {ev.local}</>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Valores */}
                  <div className="pt-3 border-t mt-auto">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span><span>{fmtBRL(subtotal)}</span>
                    </div>
                    {desconto > 0 && (
                      <div className="flex justify-between text-xs text-red-500">
                        <span>Desconto</span><span>-{fmtBRL(desconto)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline mt-2">
                      <span className="text-sm font-medium text-gray-700">Total</span>
                      <span className="text-xl font-bold" style={{ color: ACCENT }}>{fmtBRL(total)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── CONDIÇÕES DE PAGAMENTO ─── */}
      {orc.condicoes && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Condições de Pagamento</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {orc.condicoes.avista?.ativo && (() => {
              const base = orc.valor_total || valorTotalConsolidado || 0;
              const desc = base * ((orc.condicoes.avista.desconto_pct || 0) / 100);
              return (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-800 uppercase mb-1">À Vista</p>
                  <p className="text-lg font-bold text-green-700">{fmtBRL(base - desc)}</p>
                  {desc > 0 && <p className="text-xs text-green-600">{orc.condicoes.avista.desconto_pct}% de desconto</p>}
                </div>
              );
            })()}
            {orc.condicoes.sem_juros?.ativo && (() => {
              const base = orc.valor_total || valorTotalConsolidado || 0;
              const parc = orc.condicoes.sem_juros.max_parcelas || 6;
              return (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-800 uppercase mb-1">Sem Juros</p>
                  <p className="text-lg font-bold text-blue-700">{parc}× de {fmtBRL(base / parc)}</p>
                  <p className="text-xs text-blue-600">Total: {fmtBRL(base)}</p>
                </div>
              );
            })()}
            {orc.condicoes.com_juros?.ativo && (() => {
              const base = orc.valor_total || valorTotalConsolidado || 0;
              const parc = orc.condicoes.com_juros.max_parcelas || 12;
              const taxa = (orc.condicoes.com_juros.taxa_mensal || 1.99) / 100;
              const parcela = taxa > 0 ? base * (taxa * Math.pow(1 + taxa, parc)) / (Math.pow(1 + taxa, parc) - 1) : base / parc;
              return (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs font-semibold text-purple-800 uppercase mb-1">Com Juros</p>
                  <p className="text-lg font-bold text-purple-700">{parc}× de {fmtBRL(parcela)}</p>
                  <p className="text-xs text-purple-600">Taxa: {orc.condicoes.com_juros.taxa_mensal}% a.m.</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── TIMELINE ─── */}
      <div className="bg-white rounded-xl border p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <TimelineStep label="Criado" date={orc.created} active />
          <TimelineStep label="Enviado" date={orc.enviado_em} active={!!orc.enviado_em} />
          <TimelineStep label="Visualizado" date={orc.visualizado_em} active={!!orc.visualizado_em} />
          <TimelineStep label="Aceito" date={orc.aprovado_em} active={!!orc.aprovado_em} />
        </div>
      </div>

      {/* ─── OBSERVAÇÕES / MENSAGEM ─── */}
      {(orc.mensagem || orc.observacoes) && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          {orc.mensagem && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Mensagem ao Cliente</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{orc.mensagem}</p>
            </div>
          )}
          {orc.observacoes && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Observações Internas</h3>
              <p className="text-sm text-gray-500 whitespace-pre-wrap">{orc.observacoes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function Btn({ icon: Icon, label, onClick, accent, danger, loading }) {
  const base = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50';
  const style = accent
    ? `${base} text-white hover:opacity-90`
    : danger
    ? `${base} border border-red-200 text-red-600 hover:bg-red-50`
    : `${base} border border-gray-200 text-gray-700 hover:bg-gray-50`;

  return (
    <button onClick={onClick} disabled={loading} className={style}
      style={accent ? { background: ACCENT } : undefined}>
      {loading ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}

function TimelineStep({ label, date, active }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
      <div>
        <span className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
        {date && <span className="ml-1.5 text-xs text-gray-400">{fmtDateTime(date)}</span>}
      </div>
    </div>
  );
}
