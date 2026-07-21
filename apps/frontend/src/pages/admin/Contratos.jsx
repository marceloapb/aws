import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, Search, Plus, Eye, Send, Download, Copy, RefreshCw,
  Clock, CheckCircle2, AlertTriangle, PercentIcon, X, Trash2,
  Edit, Layers, ToggleLeft, ToggleRight, CreditCard, ArrowRightLeft
} from 'lucide-react';
import { SortableHeader } from '../../components/ui';
import useSortable from '../../hooks/useSortable';

const ACCENT = '#EA580C';
const STATUS_TABS = ['Todos', 'Gerado', 'Enviado', 'Assinado', 'Expirado'];
const STATUS_MAP = {
  gerado: { label: 'Gerado', cls: 'text-gray-700 bg-gray-100' },
  enviado: { label: 'Enviado', cls: 'text-blue-700 bg-blue-50' },
  assinado: { label: 'Assinado', cls: 'text-green-700 bg-green-50' },
  expirado: { label: 'Expirado', cls: 'text-red-700 bg-red-50' },
};
const VARIAVEIS = ['{{nome_cliente}}', '{{cpf_cliente}}', '{{valor_total}}', '{{data_evento}}', '{{local}}', '{{itens_descricao}}', '{{condicoes_pagamento}}'];

function diasRestantes(expiraEm) {
  if (!expiraEm) return null;
  return Math.ceil((new Date(expiraEm) - new Date()) / 86400000);
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : '—'; }
function formatCurrency(v) { return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }
function diasEnviado(enviadoEm) {
  if (!enviadoEm) return 0;
  return Math.floor((new Date() - new Date(enviadoEm)) / 86400000);
}

export default function Contratos() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [abaGlobal, setAbaGlobal] = useState('Contratos');

  // --- Aba Contratos state ---
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [modalGerar, setModalGerar] = useState(false);
  const [orcamentos, setOrcamentos] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [formGerar, setFormGerar] = useState({ orcamento_id: '', modelo_id: '' });

  // --- Aba Modelos state ---
  const [modalModelo, setModalModelo] = useState(false);
  const [editModelo, setEditModelo] = useState(null);
  const [formModelo, setFormModelo] = useState({ nome: '', tipo_evento: '', corpo_html: '', ativo: true });

  // --- Aba Aditivos state ---
  const [aditivos, setAditivos] = useState([]);
  const [modalAditivo, setModalAditivo] = useState(false);
  const [formAditivo, setFormAditivo] = useState({ contrato_id: '', motivo: '', tipo: 'acrescimo', novo_valor: '', itens_alterados: '', recalcular: false });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      authFetch('/admin/contratos').then(r => r.json()),
      authFetch('/admin/contratos/modelos').then(r => r.json()),
      authFetch('/admin/aditivos').then(r => r.json()),
    ]).then(([cj, mj, aj]) => {
      if (cj.success) setContratos(cj.data || []);
      if (mj.success) setModelos(mj.data || []);
      if (aj.success) setAditivos(aj.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const total = contratos.length;
    const now = new Date();
    const assinados = contratos.filter(c => c.status === 'assinado' && new Date(c.aceite_em).getMonth() === now.getMonth() && new Date(c.aceite_em).getFullYear() === now.getFullYear()).length;
    const aguardando = contratos.filter(c => c.status === 'enviado').length;
    const expirados = contratos.filter(c => c.status === 'expirado').length;
    const taxa = total > 0 ? Math.round((contratos.filter(c => c.status === 'assinado').length / total) * 100) : 0;
    return { total, assinados, aguardando, expirados, taxa };
  }, [contratos]);

  const filtered = useMemo(() => {
    let list = contratos;
    if (tab !== 'Todos') list = list.filter(c => c.status === tab.toLowerCase());
    if (busca) list = list.filter(c => c.cliente_nome?.toLowerCase().includes(busca.toLowerCase()));
    if (periodo) list = list.filter(c => new Date(c.gerado_em) >= new Date(periodo));
    return list;
  }, [contratos, tab, busca, periodo]);

  // Ordenação por coluna - Contratos
  const { sortedData: sortedContratos, requestSort: requestSortContratos, getSortIndicator: getSortIndicatorContratos } = useSortable(filtered, {
    defaultField: 'gerado_em',
    defaultDirection: 'desc',
  });

  // Ordenação por coluna - Aditivos
  const { sortedData: sortedAditivos, requestSort: requestSortAditivos, getSortIndicator: getSortIndicatorAditivos } = useSortable(aditivos, {});

  // Actions
  const abrirModalGerar = () => {
    authFetch('/admin/orcamentos?status=aceito').then(r => r.json()).then(j => { if (j.success) setOrcamentos(j.data || []); }).catch(() => {});
    setModalGerar(true);
  };
  const gerarContrato = () => {
    if (!formGerar.orcamento_id || !formGerar.modelo_id) return;
    authFetch('/admin/contratos/gerar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formGerar) })
      .then(r => r.json()).then(j => { if (j.success) { setModalGerar(false); setContratos(p => [j.data, ...p]); setFormGerar({ orcamento_id: '', modelo_id: '' }); } }).catch(() => {});
  };
  const enviar = (id) => authFetch(`/admin/contratos/${id}/enviar`, { method: 'POST' }).then(r => r.json()).then(j => { if (j.success) setContratos(p => p.map(c => c.id === id ? { ...c, status: 'enviado', enviado_em: new Date().toISOString() } : c)); }).catch(() => {});
  const reenviar = (id) => authFetch(`/admin/contratos/${id}/enviar`, { method: 'POST' }).catch(() => {});
  const downloadPdf = (id) => authFetch(`/admin/contratos/${id}/pdf`).then(r => r.blob()).then(b => { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `contrato-${id}.pdf`; a.click(); URL.revokeObjectURL(u); }).catch(() => {});
  const copiarLink = (id) => { navigator.clipboard.writeText(`${window.location.origin}/contratos/${id}/assinar`); };

  // Modelos actions
  const salvarModelo = () => {
    const method = editModelo ? 'PUT' : 'POST';
    const url = editModelo ? `/admin/contratos/modelos/${editModelo.id}` : '/admin/contratos/modelos';
    authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formModelo) })
      .then(r => r.json()).then(j => { if (j.success) { setModalModelo(false); setModelos(p => editModelo ? p.map(m => m.id === editModelo.id ? j.data : m) : [...p, j.data]); resetFormModelo(); } }).catch(() => {});
  };
  const duplicarModelo = (m) => {
    authFetch('/admin/contratos/modelos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...m, nome: `${m.nome} (cópia)`, id: undefined }) })
      .then(r => r.json()).then(j => { if (j.success) setModelos(p => [...p, j.data]); }).catch(() => {});
  };
  const excluirModelo = (id) => { authFetch(`/admin/contratos/modelos/${id}`, { method: 'DELETE' }).then(r => r.json()).then(j => { if (j.success) setModelos(p => p.filter(m => m.id !== id)); }).catch(() => {}); };
  const resetFormModelo = () => { setFormModelo({ nome: '', tipo_evento: '', corpo_html: '', ativo: true }); setEditModelo(null); };

  // Aditivos actions
  const criarAditivo = () => {
    authFetch('/admin/aditivos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formAditivo) })
      .then(r => r.json()).then(j => { if (j.success) { setModalAditivo(false); setAditivos(p => [j.data, ...p]); setFormAditivo({ contrato_id: '', motivo: '', tipo: 'acrescimo', novo_valor: '', itens_alterados: '', recalcular: false }); } }).catch(() => {});
  };
  const aprovarAditivo = (id) => { authFetch(`/admin/aditivos/${id}/aprovar`, { method: 'PUT' }).then(r => r.json()).then(j => { if (j.success) setAditivos(p => p.map(a => a.id === id ? { ...a, status: 'aceito', recalculado: true } : a)); }).catch(() => {}); };
  const enviarAditivoCliente = (id) => { authFetch(`/admin/aditivos/${id}/enviar`, { method: 'POST' }).catch(() => {}); };

  const KpiCard = ({ label, value, icon: Icon, suffix }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50">
        <Icon size={20} style={{ color: ACCENT }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}{suffix}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );


  return (
    <div className="space-y-6">
      {/* Header + Abas Globais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['Contratos', 'Modelos', 'Aditivos'].map(a => (
            <button key={a} onClick={() => setAbaGlobal(a)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${abaGlobal === a ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{a}</button>
          ))}
        </div>
      </div>

      {/* ========== ABA CONTRATOS ========== */}
      {abaGlobal === 'Contratos' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Total contratos" value={kpis.total} icon={FileText} />
            <KpiCard label="Assinados (mês)" value={kpis.assinados} icon={CheckCircle2} />
            <KpiCard label="Aguardando" value={kpis.aguardando} icon={Clock} />
            <KpiCard label="Expirados" value={kpis.expirados} icon={AlertTriangle} />
            <KpiCard label="Taxa assinatura" value={kpis.taxa} suffix="%" icon={PercentIcon} />
          </div>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {STATUS_TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
            </div>
            <input type="date" value={periodo} onChange={e => setPeriodo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <button onClick={abrirModalGerar} style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
              <Plus size={16} /> Gerar Contrato
            </button>
          </div>
          {/* Tabela */}
          {loading ? (
            <div className="bg-white rounded-xl border p-10 text-center"><RefreshCw size={24} className="mx-auto text-gray-300 animate-spin mb-2" /><p className="text-sm text-gray-400">Carregando...</p></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center"><FileText size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">Nenhum contrato encontrado.</p></div>
          ) : (
            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>
                  <SortableHeader label="#ID" field="id" onSort={requestSortContratos} active={getSortIndicatorContratos('id')} />
                  <SortableHeader label="Cliente" field="cliente_nome" onSort={requestSortContratos} active={getSortIndicatorContratos('cliente_nome')} />
                  <SortableHeader label="Tipo evento" field="tipo_evento" onSort={requestSortContratos} active={getSortIndicatorContratos('tipo_evento')} />
                  <SortableHeader label="Valor" field="valor_total" onSort={requestSortContratos} active={getSortIndicatorContratos('valor_total')} />
                  <SortableHeader label="Status" field="status" onSort={requestSortContratos} active={getSortIndicatorContratos('status')} />
                  <SortableHeader label="Gerado em" field="gerado_em" onSort={requestSortContratos} active={getSortIndicatorContratos('gerado_em')} />
                  <SortableHeader label="Expira" field="expira_em" onSort={requestSortContratos} active={getSortIndicatorContratos('expira_em')} />
                  <SortableHeader label="Assinado em" field="aceite_em" onSort={requestSortContratos} active={getSortIndicatorContratos('aceite_em')} />
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Ações</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedContratos.map(c => {
                    const st = STATUS_MAP[c.status] || STATUS_MAP.gerado;
                    const dias = diasRestantes(c.expira_em);
                    const expirando = dias !== null && dias > 0 && dias <= 3 && c.status !== 'assinado';
                    const diasEnv = c.status === 'enviado' ? diasEnviado(c.enviado_em) : 0;
                    return (
                      <tr key={c.id} className={`hover:bg-gray-50 ${expirando ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">#{String(c.id).slice(-6)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{c.cliente_nome}</td>
                        <td className="px-4 py-3 text-gray-600">{c.tipo_evento || '—'}</td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(c.valor_total)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                          {diasEnv >= 3 && <span className="ml-1 text-xs text-amber-600">⚠️ {diasEnv}d</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(c.gerado_em)}</td>
                        <td className="px-4 py-3">
                          {dias !== null && dias > 0 ? <span className={dias <= 3 ? 'text-red-600 font-semibold' : 'text-gray-500'}>{dias}d restantes</span> : dias !== null && dias <= 0 ? <span className="text-red-400 text-xs">Expirado</span> : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(c.aceite_em)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => navigate(`/admin/contratos/${c.id}`)} title="Ver" className="p-1.5 rounded hover:bg-gray-100"><Eye size={15} /></button>
                            {c.status === 'gerado' && <button onClick={() => enviar(c.id)} title="Enviar" className="p-1.5 rounded hover:bg-gray-100"><Send size={15} /></button>}
                            {c.status === 'enviado' && <button onClick={() => reenviar(c.id)} title="Reenviar" className="p-1.5 rounded hover:bg-gray-100"><RefreshCw size={15} /></button>}
                            <button onClick={() => downloadPdf(c.id)} title="PDF" className="p-1.5 rounded hover:bg-gray-100"><Download size={15} /></button>
                            <button onClick={() => copiarLink(c.id)} title="Copiar link" className="p-1.5 rounded hover:bg-gray-100"><Copy size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* ========== ABA MODELOS ========== */}
      {abaGlobal === 'Modelos' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{modelos.length} modelo(s) cadastrado(s)</p>
            <button onClick={() => { resetFormModelo(); setModalModelo(true); }} style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
              <Plus size={16} /> Novo Modelo
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modelos.map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{m.nome}</h3>
                    <p className="text-xs text-gray-500">{m.tipo_evento}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{m.ativo ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(m.variaveis || VARIAVEIS.slice(0, 4)).map(v => <span key={v} className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">{v}</span>)}
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => { setEditModelo(m); setFormModelo({ nome: m.nome, tipo_evento: m.tipo_evento, corpo_html: m.corpo_html || '', ativo: m.ativo }); setModalModelo(true); }} className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"><Edit size={12} />Editar</button>
                  <button onClick={() => duplicarModelo(m)} className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"><Layers size={12} />Duplicar</button>
                  <button onClick={() => excluirModelo(m.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 size={12} />Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ========== ABA ADITIVOS ========== */}
      {abaGlobal === 'Aditivos' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{aditivos.length} aditivo(s)</p>
            <button onClick={() => setModalAditivo(true)} style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
              <Plus size={16} /> Novo Aditivo
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <SortableHeader label="Contrato" field="contrato_id" onSort={requestSortAditivos} active={getSortIndicatorAditivos('contrato_id')} />
                <SortableHeader label="Motivo" field="motivo" onSort={requestSortAditivos} active={getSortIndicatorAditivos('motivo')} />
                <SortableHeader label="Tipo" field="tipo" onSort={requestSortAditivos} active={getSortIndicatorAditivos('tipo')} />
                <SortableHeader label="Status" field="status" onSort={requestSortAditivos} active={getSortIndicatorAditivos('status')} />
                <SortableHeader label="Valor antes" field="valor_antes" onSort={requestSortAditivos} active={getSortIndicatorAditivos('valor_antes')} />
                <SortableHeader label="Valor depois" field="valor_depois" onSort={requestSortAditivos} active={getSortIndicatorAditivos('valor_depois')} />
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ações</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {sortedAditivos.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">#{String(a.contrato_id).slice(-6)}</td>
                    <td className="px-4 py-3 text-gray-700">{a.motivo}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.tipo === 'acrescimo' ? 'bg-blue-50 text-blue-700' : a.tipo === 'reducao' ? 'bg-yellow-50 text-yellow-700' : 'bg-purple-50 text-purple-700'}`}>
                        {a.tipo === 'acrescimo' ? 'Acréscimo' : a.tipo === 'reducao' ? 'Redução' : 'Troca'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 'aceito' ? 'bg-green-50 text-green-700' : a.status === 'rejeitado' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {a.status === 'aceito' ? 'Aceito' : a.status === 'rejeitado' ? 'Rejeitado' : 'Pendente'}
                      </span>
                      {a.recalculado && <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Cobranças recalculadas</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatCurrency(a.valor_antes)}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(a.valor_depois)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {a.status === 'pendente' && <button onClick={() => aprovarAditivo(a.id)} title="Aprovar" className="p-1.5 rounded hover:bg-gray-100 text-green-600"><CheckCircle2 size={15} /></button>}
                        {a.status === 'pendente' && <button onClick={() => enviarAditivoCliente(a.id)} title="Enviar ao cliente" className="p-1.5 rounded hover:bg-gray-100"><Send size={15} /></button>}
                        {a.status === 'aceito' && a.tipo === 'reducao' && <button title="Registrar reembolso" className="p-1.5 rounded hover:bg-gray-100 text-amber-600"><CreditCard size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {aditivos.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Nenhum aditivo registrado.</div>}
          </div>
        </div>
      )}


      {/* ===== MODAL GERAR CONTRATO ===== */}
      {modalGerar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Gerar Contrato</h2>
              <button onClick={() => setModalGerar(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orçamento aceito</label>
              <select value={formGerar.orcamento_id} onChange={e => setFormGerar({ ...formGerar, orcamento_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200">
                <option value="">Selecione...</option>
                {orcamentos.map(o => <option key={o.id} value={o.id}>#{o.id} — {o.cliente_nome} ({formatCurrency(o.valor_total)})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <select value={formGerar.modelo_id} onChange={e => setFormGerar({ ...formGerar, modelo_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200">
                <option value="">Selecione o modelo...</option>
                {modelos.filter(m => m.ativo).map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <button onClick={gerarContrato} disabled={!formGerar.orcamento_id || !formGerar.modelo_id} style={{ background: ACCENT }} className="w-full py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              Gerar Contrato
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL MODELO ===== */}
      {modalModelo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editModelo ? 'Editar Modelo' : 'Novo Modelo'}</h2>
              <button onClick={() => { setModalModelo(false); resetFormModelo(); }}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do modelo</label>
              <input value={formModelo.nome} onChange={e => setFormModelo({ ...formModelo, nome: e.target.value })} placeholder="Ex: Casamento Padrão" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de evento</label>
              <select value={formModelo.tipo_evento} onChange={e => setFormModelo({ ...formModelo, tipo_evento: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200">
                <option value="">Selecione...</option>
                {['Casamento','Aniversário','Corporativo','Formatura','Ensaio','Outro'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corpo HTML</label>
              <textarea value={formModelo.corpo_html} onChange={e => setFormModelo({ ...formModelo, corpo_html: e.target.value })} rows={8} placeholder="Use variáveis: {{nome_cliente}}, {{cpf_cliente}}, {{valor_total}}, {{data_evento}}, {{local}}, {{itens_descricao}}, {{condicoes_pagamento}}" className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-orange-200" />
              <div className="flex flex-wrap gap-1 mt-2">
                {VARIAVEIS.map(v => <span key={v} onClick={() => setFormModelo(f => ({ ...f, corpo_html: f.corpo_html + v }))} className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded cursor-pointer hover:bg-orange-100">{v}</span>)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFormModelo(f => ({ ...f, ativo: !f.ativo }))} className="text-gray-600">
                {formModelo.ativo ? <ToggleRight size={24} style={{ color: ACCENT }} /> : <ToggleLeft size={24} />}
              </button>
              <span className="text-sm text-gray-700">{formModelo.ativo ? 'Ativo' : 'Inativo'}</span>
            </div>
            <button onClick={salvarModelo} disabled={!formModelo.nome || !formModelo.tipo_evento} style={{ background: ACCENT }} className="w-full py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {editModelo ? 'Salvar Alterações' : 'Criar Modelo'}
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL ADITIVO ===== */}
      {modalAditivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Novo Aditivo</h2>
              <button onClick={() => setModalAditivo(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrato</label>
              <select value={formAditivo.contrato_id} onChange={e => setFormAditivo({ ...formAditivo, contrato_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200">
                <option value="">Selecione...</option>
                {contratos.filter(c => c.status === 'assinado').map(c => <option key={c.id} value={c.id}>#{String(c.id).slice(-6)} — {c.cliente_nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
              <input value={formAditivo.motivo} onChange={e => setFormAditivo({ ...formAditivo, motivo: e.target.value })} placeholder="Descreva o motivo..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={formAditivo.tipo} onChange={e => setFormAditivo({ ...formAditivo, tipo: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200">
                <option value="acrescimo">Acréscimo</option>
                <option value="reducao">Redução</option>
                <option value="troca">Troca de item</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Novo valor total</label>
              <input type="number" step="0.01" value={formAditivo.novo_valor} onChange={e => setFormAditivo({ ...formAditivo, novo_valor: e.target.value })} placeholder="0.00" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Itens alterados</label>
              <textarea value={formAditivo.itens_alterados} onChange={e => setFormAditivo({ ...formAditivo, itens_alterados: e.target.value })} rows={3} placeholder="Descreva os itens..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFormAditivo(f => ({ ...f, recalcular: !f.recalcular }))} className="text-gray-600">
                {formAditivo.recalcular ? <ToggleRight size={24} style={{ color: ACCENT }} /> : <ToggleLeft size={24} />}
              </button>
              <span className="text-sm text-gray-700">Recalcular cobranças automaticamente</span>
            </div>
            <button onClick={criarAditivo} disabled={!formAditivo.contrato_id || !formAditivo.motivo} style={{ background: ACCENT }} className="w-full py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              Criar Aditivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
