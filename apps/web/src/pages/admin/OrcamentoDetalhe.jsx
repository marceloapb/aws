import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';
import { formatarMoeda, formatarData, formatarDataHora } from '../../lib/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';

const ACCENT = '#EA580C';

const STATUS_MAP = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  em_revisao: { label: 'Em Revisao', color: 'bg-blue-50 text-blue-700' },
  pronto_enviar: { label: 'Pronto p/ Enviar', color: 'bg-purple-50 text-purple-700' },
  enviado: { label: 'Enviado', color: 'bg-orange-50 text-orange-700' },
  aceito: { label: 'Aceito', color: 'bg-green-50 text-green-700' },
  recusado: { label: 'Recusado', color: 'bg-red-50 text-red-700' },
  expirado: { label: 'Expirado', color: 'bg-yellow-50 text-yellow-800' },
  contrato_gerado: { label: 'Contrato Gerado', color: 'bg-emerald-50 text-emerald-700' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};


export default function OrcamentoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orc, setOrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, action: null });

  useEffect(() => { loadOrc(); }, [id]);

  const loadOrc = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/admin/orcamentos/${id}`);
      if (data.success) setOrc(data.data);
      else setError(data.message || 'Erro ao carregar orcamento');
    } catch (err) {
      setError(err.message || 'Erro ao carregar orcamento');
    } finally {
      setLoading(false);
    }
  };


  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      if (action === 'enviar') await api.post(`/admin/orcamentos/${id}/enviar`);
      else if (action === 'aprovar') await api.post(`/admin/orcamentos/${id}/aprovar`);
      else if (action === 'duplicar') {
        await api.post(`/admin/orcamentos/${id}/duplicar`);
        navigate('/admin/orcamentos');
        return;
      } else if (action === 'cancelar') {
        await api.post(`/admin/orcamentos/${id}/cancelar`);
      } else if (action === 'reabrir') {
        await api.post(`/admin/orcamentos/${id}/reabrir`);
      } else if (action === 'excluir') {
        await api.delete(`/admin/orcamentos/${id}`);
        navigate('/admin/orcamentos');
        return;
      }
      loadOrc();
    } catch (err) {
      console.error(`Erro na acao ${action}:`, err);
    } finally {
      setActionLoading('');
      setConfirmModal({ open: false, action: null });
    }
  };

  const handlePDF = async () => {
    setActionLoading('pdf');
    try {
      const data = await api.post(`/admin/orcamentos/${id}/pdf`);
      if (data.success && data.data?.url) window.open(data.data.url, '_blank');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setActionLoading('');
    }
  };


  const validadeInfo = useMemo(() => {
    if (!orc?.validade_dias || !orc?.created) return null;
    const criado = new Date(orc.created);
    const expira = new Date(criado.getTime() + orc.validade_dias * 86400000);
    const diasRestantes = Math.ceil((expira - Date.now()) / 86400000);
    return { expira, diasRestantes };
  }, [orc]);

  const valorTotalConsolidado = useMemo(() => {
    if (!orc) return 0;
    if (orc.valor_total) return orc.valor_total;
    const opcoes = orc.opcoes || [];
    if (opcoes.length === 0) return 0;
    const calcOpcaoTotal = (op) => {
      const sub = (op.itens_snapshot || []).reduce((s, i) => s + (i.valor_unitario || 0) * (i.quantidade || 1), 0);
      const desc = op.desconto_tipo === 'pct' ? sub * ((op.desconto_valor || 0) / 100) : (op.desconto_valor || 0);
      return Math.max(0, sub - desc);
    };
    const destaque = opcoes.find(op => op.destaque);
    if (destaque) return calcOpcaoTotal(destaque);
    return Math.max(...opcoes.map(calcOpcaoTotal));
  }, [orc]);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-500 mb-4">{error}</p>
      <button onClick={() => navigate('/admin/orcamentos')} className="text-sm text-primary-600 hover:underline">Voltar</button>
    </div>
  );
  if (!orc) return <div className="text-center py-20 text-gray-400">Orcamento nao encontrado</div>;

  const st = STATUS_MAP[orc.status] || STATUS_MAP.rascunho;
  const cliente = orc.cliente || {};
  const opcoes = orc.opcoes || [];


  return (
    <div className="max-w-7xl mx-auto">
      {/* Back button */}
      <button onClick={() => navigate('/admin/orcamentos')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        &larr; Voltar
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {orc.titulo || `Orcamento #${id?.slice(0, 8)}`}
          </h1>
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${st.color}`}>
            {st.label}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Context actions */}
          {['rascunho', 'em_revisao', 'pronto_enviar'].includes(orc.status) && (
            <>
              <ActionBtn label="Editar" onClick={() => navigate(`/admin/orcamentos/${id}/editar`)} />
              <ActionBtn label="Enviar" accent onClick={() => handleAction('enviar')} loading={actionLoading === 'enviar'} />
              <ActionBtn label="Excluir" danger onClick={() => setConfirmModal({ open: true, action: 'excluir' })} />
            </>
          )}
          {orc.status === 'enviado' && (
            <>
              <ActionBtn label="Reenviar" onClick={() => handleAction('enviar')} loading={actionLoading === 'enviar'} />
              <ActionBtn label="Marcar Aceito" accent onClick={() => handleAction('aprovar')} loading={actionLoading === 'aprovar'} />
              <ActionBtn label="Cancelar" danger onClick={() => setConfirmModal({ open: true, action: 'cancelar' })} />
            </>
          )}
          {orc.status === 'aceito' && (
            <ActionBtn label="Gerar Contrato" accent onClick={() => navigate(`/admin/contratos/novo?orcamento_id=${id}`)} />
          )}
          {['recusado', 'expirado'].includes(orc.status) && (
            <ActionBtn label="Reabrir" onClick={() => handleAction('reabrir')} loading={actionLoading === 'reabrir'} />
          )}
          <ActionBtn label="Duplicar" onClick={() => handleAction('duplicar')} loading={actionLoading === 'duplicar'} />
          <ActionBtn label="PDF" onClick={handlePDF} loading={actionLoading === 'pdf'} />
        </div>
      </div>


      {/* Validade countdown */}
      {validadeInfo && !['aceito', 'contrato_gerado', 'cancelado', 'expirado'].includes(orc.status) && (
        <div className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          validadeInfo.diasRestantes <= 2 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
        }`}>
          {validadeInfo.diasRestantes > 0
            ? `Expira em ${validadeInfo.diasRestantes} dia${validadeInfo.diasRestantes > 1 ? 's' : ''} (${formatarData(validadeInfo.expira)})`
            : 'Expirado'}
        </div>
      )}

      {/* Resumo */}
      <div className="bg-white rounded-xl border p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Resumo do Orcamento</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-medium mb-1">Valor Total</span>
            <span className="text-lg font-bold" style={{ color: ACCENT }}>{formatarMoeda(valorTotalConsolidado)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-medium mb-1">Criado em</span>
            <span className="text-sm font-medium text-gray-800">{formatarData(orc.created)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-medium mb-1">Validade</span>
            <span className="text-sm font-medium text-gray-800">
              {orc.validade_dias ? `${orc.validade_dias} dias` : '-'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-medium mb-1">Opcoes</span>
            <span className="text-sm font-medium text-gray-800">{opcoes.length} {opcoes.length === 1 ? 'opcao' : 'opcoes'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-medium mb-1">Origem</span>
            <span className="text-sm font-medium text-gray-800">
              {orc.origem_canal === 'whatsapp' ? 'WhatsApp'
                : orc.origem_canal === 'instagram' ? 'Instagram'
                : orc.origem_canal === 'site' ? 'Site'
                : orc.origem_canal === 'indicacao' ? 'Indicacao'
                : orc.origem_canal === 'telefone' ? 'Telefone'
                : orc.origem_canal || 'Manual'}
            </span>
          </div>
        </div>


        {/* Additional info */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
          {orc.id && <span>ID: {orc.id.slice(0, 8)}...</span>}
          {orc.tipo_evento && <span>{orc.tipo_evento}</span>}
          {orc.data_evento && <span>Evento: {formatarData(orc.data_evento)}</span>}
          {orc.nome_evento && <span>{orc.nome_evento}</span>}
          {orc.updatedAt && orc.updatedAt !== orc.created && (
            <span>Atualizado: {formatarDataHora(orc.updatedAt)}</span>
          )}
        </div>
      </div>

      {/* Cliente */}
      <div className="bg-white rounded-xl border p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Cliente</h3>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-gray-800">{cliente.nome || '-'}</span>
          {cliente.email && <span className="text-gray-500">{cliente.email}</span>}
          {cliente.telefone && <span className="text-gray-500">{cliente.telefone}</span>}
          {cliente.telefone && (
            <a href={`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition">
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Local do Evento */}
      {orc.local_evento && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Local do Evento</h3>
          <p className="text-sm text-gray-700 mb-2">{orc.local_evento}</p>
          {orc.distancia_km && (
            <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
              {orc.distancia_km} km
              {orc.duracao_minutos && ` - ~${orc.duracao_minutos} min`}
            </span>
          )}
        </div>
      )}


      {/* Opcoes */}
      {opcoes.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Opcoes do Orcamento</h3>
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
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold text-gray-900">{op.nome || `Opcao ${idx + 1}`}</h4>
                    {op.destaque && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-700">
                        Recomendada
                      </span>
                    )}
                  </div>
                  {isEscolhida && orc.status === 'aceito' && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full uppercase">
                      Escolhida
                    </div>
                  )}


                  {/* Itens */}
                  {(op.itens_snapshot || []).length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Itens</p>
                      <div className="space-y-1">
                        {op.itens_snapshot.map((it, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-700">
                            <span>{it.nome} <span className="text-gray-400">x{it.quantidade || 1}</span></span>
                            <span>{formatarMoeda((it.valor_unitario || 0) * (it.quantidade || 1))}</span>
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
                            {ev.data && <> - {formatarData(ev.data)}</>}
                            {ev.hora_inicio && <> {ev.hora_inicio}{ev.hora_fim && `-${ev.hora_fim}`}</>}
                            {ev.local && <> - {ev.local}</>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Values */}
                  <div className="pt-3 border-t mt-auto">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span><span>{formatarMoeda(subtotal)}</span>
                    </div>
                    {desconto > 0 && (
                      <div className="flex justify-between text-xs text-red-500">
                        <span>Desconto</span><span>-{formatarMoeda(desconto)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline mt-2">
                      <span className="text-sm font-medium text-gray-700">Total</span>
                      <span className="text-xl font-bold" style={{ color: ACCENT }}>{formatarMoeda(total)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Condicoes de Pagamento */}
      {orc.condicoes && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Condicoes de Pagamento</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {orc.condicoes.avista?.ativo && (() => {
              const base = orc.valor_total || valorTotalConsolidado || 0;
              const desc = base * ((orc.condicoes.avista.desconto_pct || 0) / 100);
              return (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-800 uppercase mb-1">A Vista</p>
                  <p className="text-lg font-bold text-green-700">{formatarMoeda(base - desc)}</p>
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
                  <p className="text-lg font-bold text-blue-700">{parc}x de {formatarMoeda(base / parc)}</p>
                  <p className="text-xs text-blue-600">Total: {formatarMoeda(base)}</p>
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
                  <p className="text-lg font-bold text-purple-700">{parc}x de {formatarMoeda(parcela)}</p>
                  <p className="text-xs text-purple-600">Taxa: {orc.condicoes.com_juros.taxa_mensal}% a.m.</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}


      {/* Timeline */}
      <div className="bg-white rounded-xl border p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <TimelineStep label="Criado" date={orc.created} active />
          <TimelineStep label="Enviado" date={orc.enviado_em} active={!!orc.enviado_em} />
          <TimelineStep label="Visualizado" date={orc.visualizado_em} active={!!orc.visualizado_em} />
          <TimelineStep label="Aceito" date={orc.aprovado_em} active={!!orc.aprovado_em} />
        </div>
      </div>

      {/* Observacoes / Mensagem */}
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
              <h3 className="font-semibold text-gray-900 mb-2">Observacoes Internas</h3>
              <p className="text-sm text-gray-500 whitespace-pre-wrap">{orc.observacoes}</p>
            </div>
          )}
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.action === 'excluir' ? 'Excluir Orcamento' : 'Cancelar Orcamento'}
        message={confirmModal.action === 'excluir'
          ? 'Tem certeza que deseja excluir este orcamento? Esta acao nao pode ser desfeita.'
          : 'Tem certeza que deseja cancelar este orcamento?'}
        confirmText={confirmModal.action === 'excluir' ? 'Excluir' : 'Cancelar Orcamento'}
        onConfirm={() => handleAction(confirmModal.action)}
        onCancel={() => setConfirmModal({ open: false, action: null })}
        variant="danger"
      />
    </div>
  );
}


/* Sub-components */

function ActionBtn({ label, onClick, accent, danger, loading }) {
  const base = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50';
  const style = accent
    ? `${base} text-white hover:opacity-90`
    : danger
    ? `${base} border border-red-200 text-red-600 hover:bg-red-50`
    : `${base} border border-gray-200 text-gray-700 hover:bg-gray-50`;

  return (
    <button onClick={onClick} disabled={loading} className={style}
      style={accent ? { background: ACCENT } : undefined}>
      {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
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
        {date && <span className="ml-1.5 text-xs text-gray-400">{formatarDataHora(date)}</span>}
      </div>
    </div>
  );
}
