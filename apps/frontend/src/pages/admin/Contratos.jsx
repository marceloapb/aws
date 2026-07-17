import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FolderOpen, Search, Plus, Eye, Send, Download,
  AlertTriangle, FileText, X, RefreshCw, Clock, CheckCircle2,
  Circle, PercentIcon
} from 'lucide-react';

const ACCENT = '#EA580C';
const TABS = ['Todos', 'Gerado', 'Enviado', 'Assinado', 'Expirado'];
const STATUS_MAP = {
  gerado: { label: 'Gerado', cls: 'text-gray-700 bg-gray-100' },
  enviado: { label: 'Enviado', cls: 'text-blue-700 bg-blue-50' },
  assinado: { label: 'Assinado', cls: 'text-green-700 bg-green-50' },
  expirado: { label: 'Expirado', cls: 'text-red-700 bg-red-50' },
};
const TIMELINE_STEPS = ['Gerado', 'Enviado', 'Visualizado', 'Assinado'];

function diasRestantes(expiraEm) {
  if (!expiraEm) return null;
  const diff = new Date(expiraEm) - new Date();
  return Math.ceil(diff / 86400000);
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('pt-BR') : '—';
}

function formatCurrency(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function Timeline({ status }) {
  const idx = status === 'assinado' ? 3 : status === 'enviado' ? 1 : status === 'expirado' ? 1 : 0;
  return (
    <div className="flex items-center gap-1 py-2">
      {TIMELINE_STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full border-2 ${i <= idx ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'}`} />
            <span className="text-[10px] text-gray-500 mt-0.5">{step}</span>
          </div>
          {i < TIMELINE_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 min-w-[16px] ${i < idx ? 'bg-orange-500' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Contratos() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [modal, setModal] = useState(false);
  const [orcamentos, setOrcamentos] = useState([]);
  const [form, setForm] = useState({ orcamento_id: '', modelo: 'padrao' });

  useEffect(() => {
    setLoading(true);
    authFetch('/admin/contratos').then(r => r.json()).then(j => {
      if (j.success) setContratos(j.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const kpis = useMemo(() => {
    const total = contratos.length;
    const assinados = contratos.filter(c => c.status === 'assinado' && new Date(c.aceite_em).getMonth() === mesAtual && new Date(c.aceite_em).getFullYear() === anoAtual).length;
    const aguardando = contratos.filter(c => c.status === 'enviado').length;
    const expirados = contratos.filter(c => c.status === 'expirado').length;
    const taxa = total > 0 ? Math.round((contratos.filter(c => c.status === 'assinado').length / total) * 100) : 0;
    return { total, assinados, aguardando, expirados, taxa };
  }, [contratos]);

  const filtered = useMemo(() => {
    let list = contratos;
    if (tab !== 'Todos') list = list.filter(c => c.status === tab.toLowerCase());
    if (busca) list = list.filter(c => c.cliente_nome?.toLowerCase().includes(busca.toLowerCase()));
    if (periodo) {
      const [start, end] = periodo.split(',');
      if (start) list = list.filter(c => new Date(c.gerado_em) >= new Date(start));
      if (end) list = list.filter(c => new Date(c.gerado_em) <= new Date(end));
    }
    return list;
  }, [contratos, tab, busca, periodo]);

  const isExpirando = (c) => {
    if (!c.expira_em || c.status === 'expirado' || c.status === 'assinado') return false;
    const dias = diasRestantes(c.expira_em);
    return dias !== null && dias > 0 && dias <= 3;
  };

  const abrirModal = () => {
    authFetch('/admin/orcamentos?status=aceito').then(r => r.json()).then(j => {
      if (j.success) setOrcamentos(j.data || []);
    }).catch(() => {});
    setModal(true);
  };

  const gerarContrato = () => {
    if (!form.orcamento_id) return;
    authFetch('/admin/contratos/gerar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    }).then(r => r.json()).then(j => {
      if (j.success) { setModal(false); setContratos(prev => [j.data, ...prev]); }
    }).catch(() => {});
  };

  const enviar = (id) => authFetch(`/admin/contratos/${id}/enviar`, { method: 'POST' }).then(r => r.json()).then(j => {
    if (j.success) setContratos(prev => prev.map(c => c.id === id ? { ...c, status: 'enviado' } : c));
  }).catch(() => {});

  const reenviar = (id) => authFetch(`/admin/contratos/${id}/reenviar`, { method: 'POST' }).catch(() => {});

  const downloadPdf = (id) => authFetch(`/admin/contratos/${id}/pdf`).then(r => r.blob()).then(b => {
    const url = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = url; a.download = `contrato-${id}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }).catch(() => {});

  const selectedOrc = orcamentos.find(o => String(o.id) === String(form.orcamento_id));

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <FolderOpen size={24} style={{ color: '#EA580C' }} />
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
        </div>
        <button onClick={abrirModal} style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Gerar Contrato
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total contratos" value={kpis.total} icon={FileText} />
        <KpiCard label="Assinados (mês)" value={kpis.assinados} icon={CheckCircle2} />
        <KpiCard label="Aguardando" value={kpis.aguardando} icon={Clock} />
        <KpiCard label="Expirados" value={kpis.expirados} icon={AlertTriangle} />
        <KpiCard label="Taxa de assinatura" value={kpis.taxa} suffix="%" icon={PercentIcon} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
        </div>
        <input type="date" onChange={e => setPeriodo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
      </div>

      {/* Tabela ou Empty State */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <RefreshCw size={24} className="mx-auto text-gray-300 animate-spin mb-2" />
          <p className="text-gray-400 text-sm">Carregando...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 mb-1">Nenhum contrato.</p>
          <p className="text-gray-400 text-sm mb-3">Aceite um orçamento para gerar o primeiro!</p>
          <button onClick={() => navigate('/admin/orcamentos')} className="text-sm font-medium hover:underline" style={{ color: ACCENT }}>
            Ver orçamentos →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['#ID', 'Cliente', 'Tipo evento', 'Valor', 'Status', 'Gerado em', 'Expira em', 'Assinado em', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => {
                const st = STATUS_MAP[c.status] || STATUS_MAP.gerado;
                const expirando = isExpirando(c);
                const dias = diasRestantes(c.expira_em);
                const expanded = expandedRow === c.id;
                return (
                  <React.Fragment key={c.id}>
                    <tr onClick={() => setExpandedRow(expanded ? null : c.id)} className={`hover:bg-gray-50 cursor-pointer ${expirando ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">#{String(c.id).slice(-6)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.cliente_nome}</td>
                      <td className="px-4 py-3 text-gray-600">{c.tipo_evento || '—'}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(c.valor_total)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(c.gerado_em)}</td>
                      <td className="px-4 py-3">
                        {c.expira_em ? (
                          <span className={dias !== null && dias <= 3 && dias > 0 ? 'text-red-600 font-semibold' : dias !== null && dias <= 0 ? 'text-red-400 line-through' : 'text-gray-500'}>
                            {formatDate(c.expira_em)}
                            {dias !== null && dias > 0 && dias <= 7 && <span className="ml-1 text-[11px]">({dias}d)</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(c.aceite_em)}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => navigate(`/admin/contratos/${c.id}`)} title="Ver detalhes" className="p-1.5 rounded hover:bg-gray-100"><Eye size={15} /></button>
                          {c.status === 'gerado' && <button onClick={() => enviar(c.id)} title="Enviar para assinatura" className="p-1.5 rounded hover:bg-gray-100"><Send size={15} /></button>}
                          {c.status === 'enviado' && <button onClick={() => reenviar(c.id)} title="Reenviar" className="p-1.5 rounded hover:bg-gray-100"><RefreshCw size={15} /></button>}
                          <button onClick={() => downloadPdf(c.id)} title="Download PDF" className="p-1.5 rounded hover:bg-gray-100"><Download size={15} /></button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr><td colSpan={9} className="px-6 py-2 bg-gray-50"><Timeline status={c.status} /></td></tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Gerar Contrato */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Gerar Contrato</h2>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orçamento aceito</label>
              <select value={form.orcamento_id} onChange={e => setForm({ ...form, orcamento_id: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200">
                <option value="">Selecione um orçamento...</option>
                {orcamentos.map(o => (
                  <option key={o.id} value={o.id}>#{o.id} — {o.cliente_nome} ({formatCurrency(o.valor_total)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de contrato</label>
              <select value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200">
                <option value="padrao">Padrão</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            {selectedOrc && (
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium text-gray-900">Preview</p>
                <p className="text-gray-600">Cliente: {selectedOrc.cliente_nome}</p>
                <p className="text-gray-600">Valor: {formatCurrency(selectedOrc.valor_total)}</p>
                <p className="text-gray-600">Tipo: {selectedOrc.tipo_evento || 'N/A'}</p>
              </div>
            )}
            <button onClick={gerarContrato} disabled={!form.orcamento_id} style={{ background: ACCENT }} className="w-full py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              Gerar Contrato
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
