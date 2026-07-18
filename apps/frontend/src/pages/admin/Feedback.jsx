import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Star, MessageSquare, Send, Quote, Check, X, Download,
  BarChart3, Eye, GripVertical, Filter, Bell, PieChart,
  FileText, AlertCircle, ChevronUp, ChevronDown
} from 'lucide-react';

const ACCENT = '#EA580C';
const MOTIVOS_RECUSA = [
  'Preço alto',
  'Prazo não atende',
  'Escolheu outro fotógrafo',
  'Desistiu do evento',
  'Atendimento insatisfatório',
  'Outro'
];

function Stars({ value, size = 16 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={size}
          style={{ color: n <= value ? ACCENT : '#d1d5db', fill: n <= value ? ACCENT : 'none' }} />
      ))}
    </div>
  );
}

export default function Feedback() {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState('avaliacoes');
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [resumo, setResumo] = useState({});
  const [recusas, setRecusas] = useState([]);
  const [clientes, setClientes] = useState([]);
  // Filtros Avaliações
  const [filtroEstrelas, setFiltroEstrelas] = useState(0);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  // Filtros Recusas
  const [filtroMotivoRecusa, setFiltroMotivoRecusa] = useState('');
  const [filtroPeriodoRecusa, setFiltroPeriodoRecusa] = useState('');
  // Modais
  const [showSolicitar, setShowSolicitar] = useState(false);
  const [solicitarCliente, setSolicitarCliente] = useState('');
  const [solicitarEvento, setSolicitarEvento] = useState('');
  const [showRecusaModal, setShowRecusaModal] = useState(false);
  const [recusaOrcamento, setRecusaOrcamento] = useState('');
  const [recusaMotivos, setRecusaMotivos] = useState([]);
  const [recusaComentario, setRecusaComentario] = useState('');
  const [previewDepoimento, setPreviewDepoimento] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fbRes, recRes, cliRes] = await Promise.all([
        authFetch('/admin/feedback').then(r => r.json()),
        authFetch('/admin/feedback/recusas').then(r => r.json()),
        authFetch('/admin/clientes').then(r => r.json()),
      ]);
      if (fbRes.success) {
        setFeedbacks(fbRes.data || []);
        setResumo(fbRes.resumo || {});
      }
      if (recRes.success) setRecusas(recRes.data || []);
      if (cliRes.success) setClientes(cliRes.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  // Cálculos KPI
  const respondidos = feedbacks.filter(f => f.nota != null);
  const pendentes = feedbacks.filter(f => f.nota == null);
  const media = respondidos.length
    ? (respondidos.reduce((s, f) => s + f.nota, 0) / respondidos.length).toFixed(1)
    : '0.0';
  const nps = respondidos.length
    ? Math.round(((respondidos.filter(f => f.nota >= 4).length - respondidos.filter(f => f.nota <= 2).length) / respondidos.length) * 100)
    : 0;
  const distribuicao = [5, 4, 3, 2, 1].map(n => ({
    estrelas: n,
    count: respondidos.filter(f => f.nota === n).length,
    pct: respondidos.length ? Math.round((respondidos.filter(f => f.nota === n).length / respondidos.length) * 100) : 0
  }));

  // Filtros aplicados
  const feedbacksFiltrados = feedbacks.filter(f => {
    if (filtroEstrelas > 0 && (f.nota || 0) < filtroEstrelas) return false;
    if (filtroStatus === 'respondido' && f.nota == null) return false;
    if (filtroStatus === 'pendente' && f.nota != null) return false;
    if (filtroPeriodo) {
      const d = new Date(f.created_at || f.created);
      const now = new Date();
      if (filtroPeriodo === '7d' && (now - d) > 7 * 86400000) return false;
      if (filtroPeriodo === '30d' && (now - d) > 30 * 86400000) return false;
      if (filtroPeriodo === '90d' && (now - d) > 90 * 86400000) return false;
    }
    return true;
  });

  const depoimentos = feedbacks.filter(f => f.autoriza_publico);
  const recusasFiltradas = recusas.filter(r => {
    if (filtroMotivoRecusa && !(r.motivos || []).includes(filtroMotivoRecusa)) return false;
    if (filtroPeriodoRecusa) {
      const d = new Date(r.created_at || r.created);
      const now = new Date();
      if (filtroPeriodoRecusa === '7d' && (now - d) > 7 * 86400000) return false;
      if (filtroPeriodoRecusa === '30d' && (now - d) > 30 * 86400000) return false;
      if (filtroPeriodoRecusa === '90d' && (now - d) > 90 * 86400000) return false;
    }
    return true;
  });

  // Recusas KPIs
  const totalRecusas = recusas.length;
  const recusasRespondidas = recusas.filter(r => (r.motivos || []).length > 0).length;
  const motivosCount = {};
  recusas.forEach(r => (r.motivos || []).forEach(m => { motivosCount[m] = (motivosCount[m] || 0) + 1; }));
  const topMotivo = Object.entries(motivosCount).sort((a, b) => b[1] - a[1])[0];
  const motivosChart = Object.entries(motivosCount).sort((a, b) => b[1] - a[1]);
  const maxMotivo = motivosChart.length ? motivosChart[0][1] : 1;

  // Handlers
  const handleSolicitar = async () => {
    if (!solicitarCliente) return;
    await authFetch('/admin/feedback/solicitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: solicitarCliente, evento_id: solicitarEvento })
    });
    setShowSolicitar(false);
    setSolicitarCliente('');
    setSolicitarEvento('');
    loadData();
  };

  const handleAprovar = async (id) => {
    await authFetch(`/admin/feedback/${id}/aprovar`, { method: 'PUT' });
    loadData();
  };

  const handleTogglePublicar = async (id, publicado) => {
    await authFetch(`/admin/feedback/${id}/aprovar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicado: !publicado })
    });
    loadData();
  };

  const handleLembrete = async (id) => {
    await authFetch(`/admin/feedback/${id}/lembrete`, { method: 'POST' });
    loadData();
  };

  const handleEnviarRecusa = async () => {
    if (!recusaOrcamento) return;
    await authFetch('/admin/feedback/recusas/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orcamento_id: recusaOrcamento, motivos: recusaMotivos, comentario: recusaComentario })
    });
    setShowRecusaModal(false);
    setRecusaOrcamento('');
    setRecusaMotivos([]);
    setRecusaComentario('');
    loadData();
  };

  const handleExport = async (tipo) => {
    const res = await authFetch(`/admin/feedback/export/${tipo}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tipo}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'avaliacoes', label: 'Avaliações' },
    { id: 'depoimentos', label: 'Depoimentos' },
    { id: 'recusas', label: 'Recusas' },
    { id: 'exportar', label: 'Exportar' },
  ];

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Star size={24} style={{ color: ACCENT, fill: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Satisfação & Feedback</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* === ABA 1: AVALIAÇÕES === */}
      {tab === 'avaliacoes' && (
        <div>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: ACCENT }}>{media}</div>
              <div className="mt-1 flex justify-center"><Stars value={Math.round(media)} size={14} /></div>
              <p className="mt-1 text-xs text-gray-500">Média geral</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{feedbacks.length}</div>
              <p className="mt-1 text-xs text-gray-500">Total feedbacks</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{respondidos.length}</div>
              <p className="mt-1 text-xs text-gray-500">Respondidos</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendentes.length}</div>
              <p className="mt-1 text-xs text-gray-500">Pendentes</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{nps}</div>
              <p className="mt-1 text-xs text-gray-500">NPS estimado</p>
            </div>
          </div>

          {/* Distribuição por estrelas */}
          <div className="bg-white rounded-xl border p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por estrelas</h3>
            <div className="space-y-2">
              {distribuicao.map(d => (
                <div key={d.estrelas} className="flex items-center gap-3">
                  <span className="text-sm w-8 text-right font-medium">{d.estrelas}★</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, background: ACCENT }} />
                  </div>
                  <span className="text-sm text-gray-500 w-12">{d.pct}%</span>
                  <span className="text-xs text-gray-400 w-8">({d.count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros + Botão Solicitar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Filter size={16} className="text-gray-400" />
            <select value={filtroEstrelas} onChange={e => setFiltroEstrelas(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value={0}>Todas estrelas</option>
              <option value={3}>≥ 3 estrelas</option>
              <option value={4}>≥ 4 estrelas</option>
              <option value={5}>5 estrelas</option>
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="todos">Todos</option>
              <option value="respondido">Respondidos</option>
              <option value="pendente">Pendentes</option>
            </select>
            <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Todo período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
            <div className="ml-auto">
              <button onClick={() => setShowSolicitar(true)} style={{ background: ACCENT }}
                className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
                <Send size={16} /> Solicitar Feedback
              </button>
            </div>
          </div>

          {/* Lista de feedbacks */}
          <div className="space-y-3">
            {feedbacksFiltrados.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <MessageSquare size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Nenhum feedback encontrado.</p>
              </div>
            ) : feedbacksFiltrados.map(f => (
              <div key={f.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-gray-900">
                      {f.cliente_nome || 'Cliente'}
                      <span className="text-sm font-normal text-gray-400 ml-2">· {f.evento || ''}</span>
                    </div>
                    {f.nota ? (
                      <div className="mt-1 flex items-center gap-2">
                        <Stars value={f.nota} size={14} />
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">Respondido</span>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">Pendente</span>
                        {f.lembrete_enviado && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                            <Bell size={10} /> Lembrete enviado
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : f.created ? new Date(f.created).toLocaleDateString('pt-BR') : ''}
                  </span>
                </div>
                {f.texto && (
                  <div className="mt-3 flex gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                    <Quote size={14} className="shrink-0 text-gray-300 mt-0.5" />
                    <span>{f.texto}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-end gap-2">
                  {f.nota && f.autoriza_publico && !f.aprovado && (
                    <button onClick={() => handleAprovar(f.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg ring-1 ring-gray-200 hover:bg-gray-50">
                      <Star size={12} /> Marcar como depoimento
                    </button>
                  )}
                  {f.aprovado && (
                    <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700">
                      <Check size={12} /> Depoimento
                    </span>
                  )}
                  {f.nota == null && !f.lembrete_enviado && (
                    <button onClick={() => handleLembrete(f.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg ring-1 ring-gray-200 hover:bg-gray-50 text-blue-600">
                      <Bell size={12} /> Enviar lembrete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === ABA 2: DEPOIMENTOS === */}
      {tab === 'depoimentos' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Curadoria de Depoimentos</h3>
            <span className="text-sm text-gray-500">{depoimentos.filter(d => d.aprovado).length} publicados de {depoimentos.length}</span>
          </div>

          {depoimentos.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              <Star size={40} className="mx-auto mb-3 text-gray-300" />
              <p>Nenhum feedback com autorização pública ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {depoimentos.map((d, idx) => (
                <div key={d.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                      <GripVertical size={16} className="cursor-grab" />
                      <span className="text-xs font-mono">#{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <Stars value={d.nota} size={14} />
                          <p className="text-sm font-medium text-gray-900 mt-1">{d.cliente_nome || 'Cliente'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {d.aprovado ? (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium">Publicado</span>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">Oculto</span>
                          )}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={!!d.aprovado} onChange={() => handleTogglePublicar(d.id, d.aprovado)}
                              className="sr-only peer" />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600" />
                          </label>
                        </div>
                      </div>
                      {d.texto && (
                        <p className="mt-2 text-sm text-gray-600 italic">"{d.texto}"</p>
                      )}
                      <div className="mt-3">
                        <button onClick={() => setPreviewDepoimento(d)}
                          className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium">
                          <Eye size={12} /> Ver como aparece no site
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Preview Modal */}
          {previewDepoimento && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg p-8 text-center">
                <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Preview público</h3>
                <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl p-6 border border-orange-100">
                  <div className="flex justify-center mb-3">
                    <Stars value={previewDepoimento.nota} size={20} />
                  </div>
                  <p className="text-gray-700 italic text-lg leading-relaxed">"{previewDepoimento.texto}"</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">
                      {(previewDepoimento.cliente_nome || 'C')[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{previewDepoimento.cliente_nome}</span>
                  </div>
                </div>
                <button onClick={() => setPreviewDepoimento(null)}
                  className="mt-6 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === ABA 3: RECUSAS === */}
      {tab === 'recusas' && (
        <div>
          {/* KPIs Recusas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{totalRecusas}</div>
              <p className="mt-1 text-xs text-gray-500">Total recusas</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {resumo.total_orcamentos ? Math.round((totalRecusas / resumo.total_orcamentos) * 100) : 0}%
              </div>
              <p className="mt-1 text-xs text-gray-500">Taxa recusa</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{recusasRespondidas}</div>
              <p className="mt-1 text-xs text-gray-500">Respondidas</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl font-bold text-orange-600 text-sm leading-8">{topMotivo ? topMotivo[0] : '—'}</div>
              <p className="mt-1 text-xs text-gray-500">Top motivo</p>
            </div>
          </div>

          {/* Gráfico de motivos */}
          <div className="bg-white rounded-xl border p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <PieChart size={14} style={{ color: ACCENT }} /> Motivos mais frequentes
            </h3>
            {motivosChart.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum motivo registrado.</p>
            ) : (
              <div className="space-y-2">
                {motivosChart.map(([motivo, count]) => (
                  <div key={motivo} className="flex items-center gap-3">
                    <span className="text-sm w-48 truncate">{motivo}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxMotivo) * 100}%`, background: ACCENT }} />
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filtros + Botão Enviar Pesquisa */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Filter size={16} className="text-gray-400" />
            <select value={filtroMotivoRecusa} onChange={e => setFiltroMotivoRecusa(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Todos motivos</option>
              {MOTIVOS_RECUSA.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filtroPeriodoRecusa} onChange={e => setFiltroPeriodoRecusa(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Todo período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
            <div className="ml-auto">
              <button onClick={() => setShowRecusaModal(true)} style={{ background: ACCENT }}
                className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
                <Send size={16} /> Enviar Pesquisa Recusa
              </button>
            </div>
          </div>

          {/* Lista de recusas */}
          <div className="space-y-3">
            {recusasFiltradas.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Nenhuma pesquisa de recusa encontrada.</p>
              </div>
            ) : recusasFiltradas.map(r => (
              <div key={r.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{r.cliente_nome || 'Cliente'}</p>
                    <p className="text-sm text-gray-500 mt-0.5">Orçamento: {r.orcamento_ref || r.orcamento_id}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : ''}
                  </span>
                </div>
                {(r.motivos || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.motivos.map(m => (
                      <span key={m} className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700">{m}</span>
                    ))}
                  </div>
                )}
                {r.comentario && (
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{r.comentario}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* === ABA 4: EXPORTAR === */}
      {tab === 'exportar' && (
        <div>
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Exportar Dados</h3>
            <p className="text-sm text-gray-500 mb-6">Baixe relatórios em formato CSV para análise externa.</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <button onClick={() => handleExport('feedbacks')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors">
                <Download size={24} style={{ color: ACCENT }} />
                <span className="text-sm font-medium text-gray-700">Exportar Feedbacks (CSV)</span>
                <span className="text-xs text-gray-400">Todos os feedbacks recebidos</span>
              </button>
              <button onClick={() => handleExport('depoimentos')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors">
                <Download size={24} style={{ color: ACCENT }} />
                <span className="text-sm font-medium text-gray-700">Exportar Depoimentos (CSV)</span>
                <span className="text-xs text-gray-400">Somente publicados</span>
              </button>
              <button onClick={() => handleExport('recusas')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors">
                <Download size={24} style={{ color: ACCENT }} />
                <span className="text-sm font-medium text-gray-700">Exportar Recusas (CSV)</span>
                <span className="text-xs text-gray-400">Pesquisas de recusa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL: SOLICITAR FEEDBACK === */}
      {showSolicitar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Solicitar Feedback</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select value={solicitarCliente} onChange={e => setSolicitarCliente(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm">
                  <option value="">Selecione o cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome || c.name} — {c.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evento entregue</label>
                <select value={solicitarEvento} onChange={e => setSolicitarEvento(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm">
                  <option value="">Selecione o evento...</option>
                  {clientes.find(c => c.id === solicitarCliente)?.eventos?.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.titulo || ev.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => { setShowSolicitar(false); setSolicitarCliente(''); setSolicitarEvento(''); }}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSolicitar} disabled={!solicitarCliente} style={{ background: ACCENT }}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                Enviar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL: ENVIAR PESQUISA RECUSA === */}
      {showRecusaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Enviar Pesquisa de Recusa</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orçamento recusado</label>
                <select value={recusaOrcamento} onChange={e => setRecusaOrcamento(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm">
                  <option value="">Selecione o orçamento...</option>
                  {clientes.flatMap(c => (c.orcamentos || []).filter(o => o.status === 'recusado').map(o => (
                    <option key={o.id} value={o.id}>{c.nome || c.name} — {o.referencia || o.id}</option>
                  )))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motivos (pré-definidos)</label>
                <div className="space-y-2">
                  {MOTIVOS_RECUSA.map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={recusaMotivos.includes(m)}
                        onChange={e => {
                          if (e.target.checked) setRecusaMotivos([...recusaMotivos, m]);
                          else setRecusaMotivos(recusaMotivos.filter(x => x !== m));
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                      <span className="text-sm text-gray-700">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comentário aberto</label>
                <textarea value={recusaComentario} onChange={e => setRecusaComentario(e.target.value)}
                  rows={3} className="w-full px-3 py-2.5 border rounded-lg text-sm resize-none"
                  placeholder="Comentário adicional (opcional)..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => { setShowRecusaModal(false); setRecusaOrcamento(''); setRecusaMotivos([]); setRecusaComentario(''); }}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleEnviarRecusa} disabled={!recusaOrcamento} style={{ background: ACCENT }}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                Enviar Pesquisa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
