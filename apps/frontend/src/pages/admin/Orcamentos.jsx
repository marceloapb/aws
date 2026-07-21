import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader, KPICard, SortableHeader } from '../../components/ui';
import useSortable from '../../hooks/useSortable';
import {
  FileText, Plus, Eye, Send, Copy, Trash2, Search,
  CheckCircle, Clock, XCircle, AlertTriangle, TrendingUp, DollarSign, BarChart3
} from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_MAP = {
  draft:    { label: 'Rascunho', color: 'text-gray-600 bg-gray-100', dot: 'bg-gray-400' },
  sent:     { label: 'Enviado',  color: 'text-blue-700 bg-blue-50',  dot: 'bg-blue-500' },
  accepted: { label: 'Aceito',   color: 'text-green-700 bg-green-50', dot: 'bg-green-500' },
  rejected: { label: 'Recusado', color: 'text-red-700 bg-red-50',    dot: 'bg-red-500' },
  expired:  { label: 'Expirado', color: 'text-amber-700 bg-amber-50', dot: 'bg-amber-500' },
};

const TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'draft', label: 'Rascunho' },
  { key: 'sent', label: 'Enviados' },
  { key: 'accepted', label: 'Aceitos' },
  { key: 'rejected', label: 'Recusados' },
  { key: 'expired', label: 'Expirados' },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff >= 0 ? diff : null;
}

export default function Orcamentos() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { loadQuotes(); }, []);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/admin/orcamentos');
      const json = await res.json();
      if (json.success) setQuotes(json.data || []);
    } catch { /* silently fail */ } finally { setLoading(false); }
  };

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = quotes.filter(q => q.status === 'accepted' && new Date(q.updatedAt).getMonth() === now.getMonth() && new Date(q.updatedAt).getFullYear() === now.getFullYear());
    const open = quotes.filter(q => ['draft', 'sent'].includes(q.status));
    const openValue = open.reduce((s, q) => s + Number(q.total || 0), 0);
    const rate = quotes.length ? ((quotes.filter(q => q.status === 'accepted').length / quotes.length) * 100).toFixed(0) : 0;
    return [
      { label: 'Total Orçamentos', value: quotes.length, icon: FileText, accent: 'text-orange-600 bg-orange-50' },
      { label: 'Aceitos este mês', value: thisMonth.length, icon: CheckCircle, accent: 'text-green-600 bg-green-50' },
      { label: 'Valor em aberto', value: `R$ ${openValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, accent: 'text-blue-600 bg-blue-50' },
      { label: 'Taxa de conversão', value: `${rate}%`, icon: TrendingUp, accent: 'text-purple-600 bg-purple-50' },
    ];
  }, [quotes]);

  // Filtragem
  const filtered = useMemo(() => {
    let list = tab === 'all' ? quotes : quotes.filter(q => q.status === tab);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(q => (q.clientName || '').toLowerCase().includes(s) || (q.title || '').toLowerCase().includes(s));
    }
    return list;
  }, [quotes, tab, search]);

  // Ordenação por coluna
  const { sortedData: sortedQuotes, requestSort, getSortIndicator } = useSortable(filtered, {
    defaultField: 'clientName',
    defaultDirection: 'asc',
  });

  const handleAction = async (e, action, quote) => {
    e.stopPropagation();
    if (action === 'view') navigate(`/admin/orcamentos/${quote.id}`);
    if (action === 'send') {
      try {
        await authFetch(`/admin/orcamentos/${quote.id}/enviar`, { method: 'POST' });
        loadQuotes();
      } catch {}
    }
    if (action === 'duplicate') {
      try {
        await authFetch(`/admin/orcamentos/${quote.id}/duplicar`, { method: 'POST' });
        loadQuotes();
      } catch {}
    }
    if (action === 'delete') {
      if (!window.confirm('Tem certeza que deseja excluir este orçamento?')) return;
      try {
        const res = await authFetch(`/admin/orcamentos/${quote.id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          setQuotes(prev => prev.filter(q => q.id !== quote.id));
        }
      } catch {}
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={FileText}
        title="Orçamentos"
        actions={
          <button onClick={() => navigate('/admin/orcamentos/novo')} style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus size={16} /> Novo Orçamento
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} accent={kpi.accent} />
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              style={tab === t.key ? { borderColor: ACCENT, color: ACCENT } : {}}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente ou evento..."
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-orange-200" />
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : sortedQuotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Nenhum orçamento encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Crie seu primeiro orçamento e comece a fechar negócios!</p>
          <button onClick={() => navigate('/admin/orcamentos/novo')} style={{ background: ACCENT }} className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
            <Plus size={16} /> Novo Orçamento
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">#</th>
                  <SortableHeader label="Cliente" field="clientName" onSort={requestSort} active={getSortIndicator('clientName')} />
                  <SortableHeader label="Tipo Evento" field="eventType" onSort={requestSort} active={getSortIndicator('eventType')} />
                  <SortableHeader label="Data Evento" field="eventDate" onSort={requestSort} active={getSortIndicator('eventDate')} />
                  <SortableHeader label="Valor" field="total" onSort={requestSort} active={getSortIndicator('total')} />
                  <SortableHeader label="Status" field="status" onSort={requestSort} active={getSortIndicator('status')} />
                  <SortableHeader label="Validade" field="validUntil" onSort={requestSort} active={getSortIndicator('validUntil')} />
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedQuotes.map((q, idx) => {
                  const st = STATUS_MAP[q.status] || STATUS_MAP.draft;
                  const expDays = daysUntil(q.validUntil);
                  const expiring = expDays !== null && expDays <= 5 && q.status === 'sent';
                  return (
                    <tr key={q.id} onClick={() => navigate(`/admin/orcamentos/${q.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-gray-400 font-mono">{String(idx + 1).padStart(3, '0')}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{q.clientName || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{q.eventType || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{q.eventDate ? new Date(q.eventDate).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">R$ {Number(q.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {q.validUntil ? (
                          <span className={`text-xs ${expiring ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium' : 'text-gray-500'}`}>
                            {expiring ? `Expira em ${expDays}d` : new Date(q.validUntil).toLocaleDateString('pt-BR')}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={e => handleAction(e, 'view', q)} title="Ver detalhes" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Eye size={15} /></button>
                          <button onClick={e => handleAction(e, 'send', q)} title="Enviar" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Send size={15} /></button>
                          <button onClick={e => handleAction(e, 'duplicate', q)} title="Duplicar" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Copy size={15} /></button>
                          <button onClick={e => handleAction(e, 'delete', q)} title="Excluir" className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
