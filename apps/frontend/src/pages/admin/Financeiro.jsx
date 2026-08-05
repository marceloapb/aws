import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Users, Receipt,
  Plus, Search, Filter, Download, FileText, Send, Link2, X, Check,
  BarChart3, PieChart, Calendar, CreditCard, Loader2, Trash2, Edit2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader, SortableHeader } from '../../components/ui';
import useSortable from '../../hooks/useSortable';

const ACCENT = '#EA580C';
const TABS = ['Visão Geral', 'Cobranças', 'Despesas', 'Fluxo de Caixa', 'Rentabilidade'];
const STATUS_TABS = ['Todas', 'Em aberto', 'Pagas', 'Atrasadas', 'Canceladas'];
const MEIOS_PAGAMENTO = ['Boleto', 'Cartão', 'Dinheiro', 'PIX', 'Transferência'];
const CATEGORIAS_DESPESA = ['Alimentação', 'Aluguel', 'Equipamento', 'Marketing', 'Software', 'Terceirizado', 'Transporte', 'Outros'];
const PERIODOS = ['Este mês', 'Trimestre', 'Ano', 'Custom'];

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
const diasAtraso = (venc) => {
  const diff = Math.floor((new Date() - new Date(venc)) / 86400000);
  return diff > 0 ? diff : 0;
};

export default function Financeiro() {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState('Este mês');
  const [customRange, setCustomRange] = useState({ inicio: '', fim: '' });

  // Data states
  const [resumo, setResumo] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [fluxo, setFluxo] = useState(null);
  const [rentabilidade, setRentabilidade] = useState([]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [buscaDespesa, setBuscaDespesa] = useState('');

  // Modal states
  const [modalPagar, setModalPagar] = useState(null);
  const [modalNovaCobranca, setModalNovaCobranca] = useState(false);
  const [modalNovaDespesa, setModalNovaDespesa] = useState(false);
  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalCategorias, setModalCategorias] = useState(false);

  // Form states
  const [formPagar, setFormPagar] = useState({ meio: 'PIX', data_pagamento: '', valor_pago: 0 });
  const [formCobranca, setFormCobranca] = useState({ cliente_id: '', valor: '', vencimento: '', parcela: '1/1', meio: 'PIX' });
  const [formDespesa, setFormDespesa] = useState({
    descricao: '', valor: '', categoria: 'Outros', data: '', evento_id: '',
    recorrente: false, recorrencia: 'mensal',
    fornecedor: '', forma_pagamento: '', observacoes: '',
    dia_vencimento: '', data_inicio: '', data_fim: '', qtd_repeticoes: '', sem_fim: true,
  });
  const [formEntrada, setFormEntrada] = useState({ descricao: '', valor: '', data: '' });
  const [categorias, setCategorias] = useState([]);
  const [novaCat, setNovaCat] = useState({ nome: '', cor: '#3B82F6' });

  // Load categorias from API
  useEffect(() => {
    authFetch('/admin/financeiro/categorias')
      .then(r => r.json())
      .then(data => {
        const cats = Array.isArray(data) ? data : (data.data || []);
        if (cats.length === 0) {
          // Seed com categorias padrão se vazio
          setCategorias(CATEGORIAS_DESPESA.map((c, i) => ({ id: String(i + 1), nome: c, cor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#6B7280'][i] })));
        } else {
          setCategorias(cats);
        }
      })
      .catch(() => {
        setCategorias(CATEGORIAS_DESPESA.map((c, i) => ({ id: String(i + 1), nome: c, cor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#6B7280'][i] })));
      });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = periodo === 'Custom' ? `?periodo_inicio=${customRange.inicio}&periodo_fim=${customRange.fim}` : `?periodo=${periodo}`;
      if (activeTab === 0) {
        const r = await authFetch(`/admin/financeiro/resumo${params}`);
        if (r.ok) setResumo(await r.json());
      } else if (activeTab === 1) {
        const r = await authFetch(`/admin/cobrancas${params}`);
        if (r.ok) {
          const json = await r.json();
          setCobrancas(Array.isArray(json) ? json : (json.data || []));
        }
      } else if (activeTab === 2) {
        const r = await authFetch(`/admin/financeiro/despesas${params}`);
        if (r.ok) {
          const json = await r.json();
          setDespesas(Array.isArray(json) ? json : (json.data || []));
        }
      } else if (activeTab === 3) {
        const p = periodo === 'Custom' ? `?periodo_inicio=${customRange.inicio}&periodo_fim=${customRange.fim}` : `?periodo_inicio=&periodo_fim=`;
        const r = await authFetch(`/admin/financeiro/fluxo-caixa${p}`);
        if (r.ok) setFluxo(await r.json());
      } else if (activeTab === 4) {
        const r = await authFetch(`/admin/financeiro/rentabilidade${params}`);
        if (r.ok) setRentabilidade(await r.json());
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [activeTab, periodo, customRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const marcarPago = async () => {
    if (!modalPagar) return;
    await authFetch(`/admin/cobrancas/${modalPagar.id}/pagar`, { method: 'PUT', body: JSON.stringify(formPagar) });
    setModalPagar(null);
    fetchData();
  };

  const cancelarCobranca = async (id) => {
    if (!confirm('Cancelar esta cobrança?')) return;
    await authFetch(`/admin/cobrancas/${id}/cancelar`, { method: 'PUT' });
    fetchData();
  };

  const criarCobranca = async () => {
    await authFetch(`/admin/cobrancas`, { method: 'POST', body: JSON.stringify(formCobranca) });
    setModalNovaCobranca(false);
    setFormCobranca({ cliente_id: '', valor: '', vencimento: '', parcela: '1/1', meio: 'PIX' });
    fetchData();
  };

  const criarDespesa = async () => {
    const payload = { ...formDespesa };
    // Se sem_fim, não envia data_fim nem qtd_repeticoes
    if (payload.sem_fim) {
      delete payload.data_fim;
      delete payload.qtd_repeticoes;
    }
    delete payload.sem_fim;
    // Limpar campos vazios
    if (!payload.evento_id) delete payload.evento_id;
    if (!payload.fornecedor) delete payload.fornecedor;
    if (!payload.forma_pagamento) delete payload.forma_pagamento;
    if (!payload.observacoes) delete payload.observacoes;
    if (!payload.dia_vencimento) delete payload.dia_vencimento;
    if (!payload.data_inicio) delete payload.data_inicio;

    await authFetch(`/admin/financeiro/despesas`, { method: 'POST', body: JSON.stringify(payload) });
    setModalNovaDespesa(false);
    setFormDespesa({
      descricao: '', valor: '', categoria: 'Outros', data: '', evento_id: '',
      recorrente: false, recorrencia: 'mensal',
      fornecedor: '', forma_pagamento: '', observacoes: '',
      dia_vencimento: '', data_inicio: '', data_fim: '', qtd_repeticoes: '', sem_fim: true,
    });
    fetchData();
  };

  const criarEntrada = async () => {
    await authFetch(`/admin/financeiro/despesas`, { method: 'POST', body: JSON.stringify({ ...formEntrada, categoria: 'receita_extra', tipo: 'entrada' }) });
    setModalEntrada(false);
    setFormEntrada({ descricao: '', valor: '', data: '' });
    fetchData();
  };

  const deletarDespesa = async (id) => {
    if (!confirm('Excluir esta despesa?')) return;
    await authFetch(`/admin/financeiro/despesas/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const exportar = (tipo) => {
    const apiUrl = process.env.REACT_APP_API_URL || 'https://setvwal0cd.execute-api.us-east-1.amazonaws.com/prod';
    window.open(`${apiUrl}/admin/financeiro/exportar?tipo=${tipo}&periodo=${periodo}`, '_blank');
  };

  const cobrancasFiltradas = cobrancas.filter(c => {
    if (statusFilter !== 'Todas' && c.status !== statusFilter.toLowerCase().replace(' ', '_')) return false;
    if (buscaCliente && !c.cliente_nome?.toLowerCase().includes(buscaCliente.toLowerCase())) return false;
    return true;
  });

  const despesasFiltradas = despesas.filter(d => {
    if (catFilter && d.categoria !== catFilter) return false;
    if (buscaDespesa && !d.descricao?.toLowerCase().includes(buscaDespesa.toLowerCase())) return false;
    return true;
  });

  // Ordenação por coluna - Cobranças
  const { sortedData: sortedCobrancas, requestSort: requestSortCob, getSortIndicator: getSortIndicatorCob } = useSortable(cobrancasFiltradas, {
    defaultField: 'vencimento',
    defaultDirection: 'desc',
  });

  // Ordenação por coluna - Despesas
  const { sortedData: sortedDespesas, requestSort: requestSortDesp, getSortIndicator: getSortIndicatorDesp } = useSortable(despesasFiltradas, {
    defaultField: 'data',
    defaultDirection: 'desc',
  });

  // Ordenação por coluna - Rentabilidade
  const { sortedData: sortedRentabilidade, requestSort: requestSortRent, getSortIndicator: getSortIndicatorRent } = useSortable(rentabilidade, {});



  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={CreditCard}
        title="Financeiro"
        actions={
          <>
            <button onClick={() => exportar('pdf')} className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <FileText size={16} /> Exportar PDF
            </button>
            <button onClick={() => exportar('csv')} className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Download size={16} /> Exportar CSV
            </button>
          </>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === i ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            style={activeTab === i ? { borderColor: ACCENT, color: ACCENT } : {}}>
            {tab}
          </button>
        ))}
      </div>

      {/* Filtro período global */}
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar size={16} className="text-gray-500" />
        {PERIODOS.map(p => (
          <button key={p} onClick={() => setPeriodo(p)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${periodo === p ? 'text-white border-transparent' : 'text-gray-600 border-gray-300 hover:border-gray-400'}`}
            style={periodo === p ? { backgroundColor: ACCENT } : {}}>
            {p}
          </button>
        ))}
        {periodo === 'Custom' && (
          <div className="flex gap-2 ml-2">
            <input type="date" value={customRange.inicio} onChange={e => setCustomRange(r => ({ ...r, inicio: e.target.value }))} className="border rounded px-2 py-1 text-xs" />
            <input type="date" value={customRange.fim} onChange={e => setCustomRange(r => ({ ...r, fim: e.target.value }))} className="border rounded px-2 py-1 text-xs" />
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin" size={32} style={{ color: ACCENT }} />
        </div>
      )}

      {/* ═══ ABA 1: VISÃO GERAL ═══ */}
      {!loading && activeTab === 0 && resumo && (
        <div className="space-y-6">
          {/* 6 KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Receita mês', valor: resumo.receitaMesAtual || resumo.receita_mes || 0, icon: TrendingUp, cor: 'text-green-600' },
              { label: 'A receber', valor: resumo.aReceber || resumo.a_receber || 0, icon: Receipt, cor: 'text-blue-600' },
              { label: 'Recebido', valor: resumo.receitaTotal || resumo.recebido || 0, icon: Check, cor: 'text-emerald-600' },
              { label: 'Inadimplência', valor: `${resumo.inadimplencia || resumo.inadimplencia_pct || 0}%`, icon: AlertTriangle, cor: 'text-red-600', raw: true },
              { label: 'Ticket médio', valor: resumo.ticketMedio || resumo.ticket_medio || 0, icon: CreditCard, cor: 'text-purple-600' },
              { label: 'Despesas mês', valor: resumo.despesas_mes || 0, icon: TrendingDown, cor: 'text-red-500' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon size={16} className={kpi.cor} />
                  <span className="text-xs text-gray-500">{kpi.label}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{kpi.raw ? kpi.valor : fmt(kpi.valor)}</p>
              </div>
            ))}
          </div>

          {/* Gráfico Evolução 6 meses - CSS puro (FIN-20) */}
          {(resumo.evolucao && resumo.evolucao.length > 0) ? (
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <BarChart3 size={16} /> Evolução Financeira — Últimos 6 meses
              </h3>
              <div className="flex items-end gap-3 h-48">
                {resumo.evolucao.map((m, i) => {
                  const max = Math.max(...resumo.evolucao.flatMap(x => [x.entradas, x.saidas])) || 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex gap-1 items-end w-full justify-center" style={{ height: '160px' }}>
                        <div className="w-4 bg-green-500 rounded-t transition-all" style={{ height: `${(m.entradas / max) * 100}%` }} title={`Entradas: ${fmt(m.entradas)}`} />
                        <div className="w-4 bg-red-500 rounded-t transition-all" style={{ height: `${(m.saidas / max) * 100}%` }} title={`Saídas: ${fmt(m.saidas)}`} />
                      </div>
                      <span className="text-xs text-gray-500">{m.mes}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 justify-center">
                <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 bg-green-500 rounded" /> Entradas</span>
                <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 bg-red-500 rounded" /> Saídas</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <BarChart3 size={16} /> Evolução Financeira — Últimos 6 meses
              </h3>
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                Dados de evolução aparecerão aqui conforme o sistema registrar receitas e despesas
              </div>
            </div>
          )}

          {/* Top 5 clientes */}
          {(resumo.top_clientes && resumo.top_clientes.length > 0) ? (
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Users size={16} /> Top 5 Clientes por Receita
              </h3>
              <div className="space-y-2">
                {resumo.top_clientes.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm font-medium text-gray-700">{i + 1}. {c.nome}</span>
                    <span className="text-sm font-bold" style={{ color: ACCENT }}>{fmt(c.receita)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 5 Clientes</h3>
              <div className="py-8 text-center text-gray-400 text-sm">Nenhuma receita registrada ainda</div>
            </div>
          )}
        </div>
      )}


      {/* ═══ ABA 2: COBRANÇAS ═══ */}
      {!loading && activeTab === 1 && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              {STATUS_TABS.map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs rounded-full border ${statusFilter === s ? 'text-white border-transparent' : 'text-gray-600 border-gray-300'}`}
                  style={statusFilter === s ? { backgroundColor: ACCENT } : {}}>
                  {s}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-2 text-gray-400" />
              <input placeholder="Buscar cliente..." value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-xs border rounded-lg w-48" />
            </div>
            <button onClick={() => setModalNovaCobranca(true)} className="ml-auto flex items-center gap-1 px-3 py-2 text-white text-sm rounded-lg" style={{ backgroundColor: ACCENT }}>
              <Plus size={14} /> Nova Cobrança
            </button>
          </div>

          {/* Tabela Cobranças */}
          <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <SortableHeader label="Cliente" field="cliente_nome" onSort={requestSortCob} active={getSortIndicatorCob('cliente_nome')} />
                  <SortableHeader label="Evento" field="evento_nome" onSort={requestSortCob} active={getSortIndicatorCob('evento_nome')} />
                  <SortableHeader label="Parcela" field="parcela" onSort={requestSortCob} active={getSortIndicatorCob('parcela')} />
                  <SortableHeader label="Valor" field="valor" onSort={requestSortCob} active={getSortIndicatorCob('valor')} />
                  <SortableHeader label="Vencimento" field="vencimento" onSort={requestSortCob} active={getSortIndicatorCob('vencimento')} />
                  <SortableHeader label="Status" field="status" onSort={requestSortCob} active={getSortIndicatorCob('status')} />
                  <SortableHeader label="Meio" field="meio" onSort={requestSortCob} active={getSortIndicatorCob('meio')} />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Pago %</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedCobrancas.map(c => {
                  const atraso = c.status === 'atrasada' ? diasAtraso(c.vencimento) : 0;
                  const pctPago = c.valor_total ? Math.round((c.valor_pago || 0) / c.valor_total * 100) : 0;
                  return (
                    <tr key={c.id} className={`border-b hover:bg-gray-50 ${atraso > 0 ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 font-medium">{c.cliente_nome}</td>
                      <td className="px-4 py-3 text-gray-600">{c.evento_nome || '-'}</td>
                      <td className="px-4 py-3">{c.parcela || '1/1'}</td>
                      <td className="px-4 py-3 font-semibold">{fmt(c.valor)}</td>
                      <td className="px-4 py-3">
                        {fmtDate(c.vencimento)}
                        {atraso > 0 && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Atrasada há {atraso} dias</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.status === 'paga' ? 'bg-green-100 text-green-700' :
                          c.status === 'atrasada' ? 'bg-red-100 text-red-700' :
                          c.status === 'cancelada' ? 'bg-gray-100 text-gray-500' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{c.status === 'em_aberto' ? 'Em aberto' : c.status?.charAt(0).toUpperCase() + c.status?.slice(1)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.meio || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${pctPago}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{pctPago}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {c.status !== 'paga' && c.status !== 'cancelada' && (
                            <>
                              <button onClick={() => { setModalPagar(c); setFormPagar({ meio: 'PIX', data_pagamento: new Date().toISOString().split('T')[0], valor_pago: c.valor }); }}
                                className="p-1 rounded hover:bg-green-100 text-green-600" title="Marcar pago"><Check size={14} /></button>
                              <button onClick={() => cancelarCobranca(c.id)} className="p-1 rounded hover:bg-red-100 text-red-600" title="Cancelar"><X size={14} /></button>
                              <button className="p-1 rounded hover:bg-green-100 text-green-600" title="Lembrete WhatsApp"><Send size={14} /></button>
                              <button className="p-1 rounded hover:bg-blue-100 text-blue-600" title="Link pagamento"><Link2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sortedCobrancas.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhuma cobrança encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ═══ ABA 3: DESPESAS ═══ */}
      {!loading && activeTab === 2 && (
        <div className="space-y-4">
          {/* Filtros e ações */}
          <div className="flex flex-wrap items-center gap-3">
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-xs">
              <option value="">Todas categorias</option>
              {categorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-2 text-gray-400" />
              <input placeholder="Buscar despesa..." value={buscaDespesa} onChange={e => setBuscaDespesa(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-xs border rounded-lg w-48" />
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setModalCategorias(true)} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                <PieChart size={14} /> Gerenciar categorias
              </button>
              <button onClick={() => setModalEntrada(true)} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg text-green-700 border-green-300 hover:bg-green-50">
                <Plus size={14} /> Entrada Manual
              </button>
              <button onClick={() => setModalNovaDespesa(true)} className="flex items-center gap-1 px-3 py-2 text-white text-sm rounded-lg" style={{ backgroundColor: ACCENT }}>
                <Plus size={14} /> Nova Despesa
              </button>
            </div>
          </div>

          {/* Subtotais */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Despesas', valor: despesasFiltradas.filter(d => d.tipo !== 'entrada').reduce((s, d) => s + (d.valor || 0), 0), cor: 'text-red-600' },
              { label: 'Entradas Manuais', valor: despesasFiltradas.filter(d => d.tipo === 'entrada').reduce((s, d) => s + (d.valor || 0), 0), cor: 'text-green-600' },
              { label: 'Saldo', valor: despesasFiltradas.filter(d => d.tipo === 'entrada').reduce((s, d) => s + (d.valor || 0), 0) - despesasFiltradas.filter(d => d.tipo !== 'entrada').reduce((s, d) => s + (d.valor || 0), 0), cor: 'text-blue-600' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 shadow-sm">
                <span className="text-xs text-gray-500">{s.label}</span>
                <p className={`text-lg font-bold ${s.cor}`}>{fmt(s.valor)}</p>
              </div>
            ))}
          </div>

          {/* Tabela Despesas */}
          <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <SortableHeader label="Descrição" field="descricao" onSort={requestSortDesp} active={getSortIndicatorDesp('descricao')} />
                  <SortableHeader label="Valor" field="valor" onSort={requestSortDesp} active={getSortIndicatorDesp('valor')} />
                  <SortableHeader label="Categoria" field="categoria" onSort={requestSortDesp} active={getSortIndicatorDesp('categoria')} />
                  <SortableHeader label="Data" field="data" onSort={requestSortDesp} active={getSortIndicatorDesp('data')} />
                  <SortableHeader label="Tipo" field="recorrente" onSort={requestSortDesp} active={getSortIndicatorDesp('recorrente')} />
                  <SortableHeader label="Evento" field="evento_nome" onSort={requestSortDesp} active={getSortIndicatorDesp('evento_nome')} />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedDespesas.map(d => {
                  const cat = categorias.find(c => c.nome === d.categoria);
                  return (
                    <tr key={d.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{d.descricao}</td>
                      <td className={`px-4 py-3 font-semibold ${d.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>{d.tipo === 'entrada' ? '+' : '-'}{fmt(d.valor)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: cat?.cor || '#6B7280' }}>{d.categoria}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmtDate(d.data)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.recorrente ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {d.recorrente ? 'Recorrente' : 'Avulsa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{d.evento_nome || '-'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deletarDespesa(d.id)} className="p-1 rounded hover:bg-red-100 text-red-600"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
                {sortedDespesas.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma despesa encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ═══ ABA 4: FLUXO DE CAIXA ═══ */}
      {!loading && activeTab === 3 && fluxo && (
        <div className="space-y-4">
          {/* Cards resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <span className="text-xs text-gray-500">Entradas</span>
              <p className="text-lg font-bold text-green-600">{fmt(fluxo.total_entradas)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <span className="text-xs text-gray-500">Saídas</span>
              <p className="text-lg font-bold text-red-600">{fmt(fluxo.total_saidas)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <span className="text-xs text-gray-500">Saldo</span>
              <p className={`text-lg font-bold ${(fluxo.total_entradas - fluxo.total_saidas) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(fluxo.total_entradas - fluxo.total_saidas)}
              </p>
            </div>
          </div>

          {/* Gráfico Fluxo - CSS puro (FIN-18) */}
          {fluxo.grafico && (
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Fluxo de Caixa — Movimentação</h3>
              <div className="flex items-end gap-2 h-40 overflow-x-auto">
                {fluxo.grafico.map((d, i) => {
                  const max = Math.max(...fluxo.grafico.flatMap(x => [x.entradas, x.saidas])) || 1;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 min-w-[32px]">
                      <div className="flex gap-0.5 items-end" style={{ height: '120px' }}>
                        <div className="w-3 bg-green-500 rounded-t" style={{ height: `${(d.entradas / max) * 100}%` }} />
                        <div className="w-3 bg-red-500 rounded-t" style={{ height: `${(d.saidas / max) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-500">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabela movimentações */}
          <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Data', 'Descrição', 'Tipo', 'Valor', 'Saldo Acumulado'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 cursor-default">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(fluxo.movimentacoes || []).map((m, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{fmtDate(m.data)}</td>
                    <td className="px-4 py-3">{m.descricao}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.tipo === 'entrada' ? '+' : '-'}{fmt(m.valor)}
                    </td>
                    <td className="px-4 py-3 font-medium">{fmt(m.saldo_acumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Projeção */}
          {fluxo.projecao && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-1">📊 Projeção (cobranças em aberto)</h4>
              <p className="text-sm text-blue-700">Entradas previstas: <strong>{fmt(fluxo.projecao.entradas_previstas)}</strong> | Saldo projetado: <strong>{fmt(fluxo.projecao.saldo_projetado)}</strong></p>
            </div>
          )}
        </div>
      )}

      {/* ═══ ABA 5: RENTABILIDADE ═══ */}
      {!loading && activeTab === 4 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => exportar('csv')} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              <Download size={14} /> Exportar
            </button>
          </div>
          <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <SortableHeader label="Evento" field="evento_nome" onSort={requestSortRent} active={getSortIndicatorRent('evento_nome')} />
                  <SortableHeader label="Cliente" field="cliente_nome" onSort={requestSortRent} active={getSortIndicatorRent('cliente_nome')} />
                  <SortableHeader label="Receita Bruta" field="receita_bruta" onSort={requestSortRent} active={getSortIndicatorRent('receita_bruta')} />
                  <SortableHeader label="Despesas" field="despesas" onSort={requestSortRent} active={getSortIndicatorRent('despesas')} />
                  <SortableHeader label="Margem (R$)" field="margem" onSort={requestSortRent} active={getSortIndicatorRent('margem')} />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Margem (%)</th>
                </tr>
              </thead>
              <tbody>
                {sortedRentabilidade.map((r, i) => {
                  const margem_pct = r.receita_bruta ? Math.round((r.margem / r.receita_bruta) * 100) : 0;
                  const corMargem = margem_pct > 50 ? 'text-green-600' : margem_pct >= 30 ? 'text-yellow-600' : 'text-red-600';
                  const bgMargem = margem_pct > 50 ? 'bg-green-50' : margem_pct >= 30 ? 'bg-yellow-50' : 'bg-red-50';
                  return (
                    <tr key={i} className={`border-b ${bgMargem}`}>
                      <td className="px-4 py-3 font-medium">{r.evento_nome}</td>
                      <td className="px-4 py-3 text-gray-600">{r.cliente_nome}</td>
                      <td className="px-4 py-3 font-semibold">{fmt(r.receita_bruta)}</td>
                      <td className="px-4 py-3 text-red-600">{fmt(r.despesas)}</td>
                      <td className={`px-4 py-3 font-semibold ${corMargem}`}>{fmt(r.margem)}</td>
                      <td className={`px-4 py-3 font-bold ${corMargem}`}>{margem_pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
              {sortedRentabilidade.length > 0 && (
                <tfoot className="bg-gray-100 border-t">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700">Média Geral</td>
                    <td className="px-4 py-3 font-bold">{fmt(sortedRentabilidade.reduce((s, r) => s + (r.margem || 0), 0) / sortedRentabilidade.length)}</td>
                    <td className="px-4 py-3 font-bold">
                      {Math.round(sortedRentabilidade.reduce((s, r) => s + (r.receita_bruta ? (r.margem / r.receita_bruta) * 100 : 0), 0) / sortedRentabilidade.length)}%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
            {rentabilidade.length === 0 && (
              <p className="text-center py-8 text-gray-400">Nenhum dado de rentabilidade</p>
            )}
          </div>
        </div>
      )}


      {/* ═══ MODAIS ═══ */}

      {/* Modal Marcar Pago (FIN-03) */}
      {modalPagar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Registrar Pagamento</h3>
            <p className="text-sm text-gray-600 mb-4">Cobrança: <strong>{modalPagar.cliente_nome}</strong> — {fmt(modalPagar.valor)}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Meio de pagamento</label>
                <select value={formPagar.meio} onChange={e => setFormPagar(f => ({ ...f, meio: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                  {MEIOS_PAGAMENTO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Data pagamento</label>
                <input type="date" value={formPagar.data_pagamento} onChange={e => setFormPagar(f => ({ ...f, data_pagamento: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Valor pago (permite parcial)</label>
                <input type="number" step="0.01" value={formPagar.valor_pago} onChange={e => setFormPagar(f => ({ ...f, valor_pago: parseFloat(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModalPagar(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={marcarPago} className="px-4 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: ACCENT }}>Confirmar Pagamento</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Cobrança (FIN-01) */}
      {modalNovaCobranca && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Nova Cobrança</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Cliente</label>
                <input placeholder="ID do cliente" value={formCobranca.cliente_id} onChange={e => setFormCobranca(f => ({ ...f, cliente_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Valor</label>
                <input type="number" step="0.01" value={formCobranca.valor} onChange={e => setFormCobranca(f => ({ ...f, valor: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Vencimento</label>
                <input type="date" value={formCobranca.vencimento} onChange={e => setFormCobranca(f => ({ ...f, vencimento: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Parcela (ex: 1/3)</label>
                <input value={formCobranca.parcela} onChange={e => setFormCobranca(f => ({ ...f, parcela: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Meio de pagamento</label>
                <select value={formCobranca.meio} onChange={e => setFormCobranca(f => ({ ...f, meio: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                  {MEIOS_PAGAMENTO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModalNovaCobranca(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={criarCobranca} className="px-4 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: ACCENT }}>Criar Cobrança</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Despesa (FIN-15, FIN-16) — Formulário elaborado */}
      {modalNovaDespesa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Nova Despesa</h3>
              <button onClick={() => setModalNovaDespesa(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {/* Descrição + Valor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-700">Descrição *</label>
                  <input value={formDespesa.descricao} onChange={e => setFormDespesa(f => ({ ...f, descricao: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Ex: Adobe Creative Cloud" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Valor *</label>
                  <input type="number" step="0.01" value={formDespesa.valor} onChange={e => setFormDespesa(f => ({ ...f, valor: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="0,00" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Categoria *</label>
                  <select value={formDespesa.categoria} onChange={e => setFormDespesa(f => ({ ...f, categoria: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                    {categorias.sort((a, b) => a.nome.localeCompare(b.nome)).map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Data + Fornecedor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Data {formDespesa.recorrente ? '(primeira ocorrência)' : ''}</label>
                  <input type="date" value={formDespesa.data} onChange={e => setFormDespesa(f => ({ ...f, data: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Fornecedor / Beneficiário</label>
                  <input value={formDespesa.fornecedor} onChange={e => setFormDespesa(f => ({ ...f, fornecedor: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Ex: Adobe, Aluguel Estúdio" />
                </div>
              </div>

              {/* Forma de pagamento + Evento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Forma de pagamento</label>
                  <select value={formDespesa.forma_pagamento} onChange={e => setFormDespesa(f => ({ ...f, forma_pagamento: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                    <option value="">— Não informado —</option>
                    <option value="PIX">PIX</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Cartão Crédito">Cartão de Crédito</option>
                    <option value="Cartão Débito">Cartão de Débito</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Débito Automático">Débito Automático</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Vincular a evento (opcional)</label>
                  <input placeholder="ID do evento" value={formDespesa.evento_id} onChange={e => setFormDespesa(f => ({ ...f, evento_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
              </div>

              {/* Separador — Recorrência */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="recorrente" checked={formDespesa.recorrente} onChange={e => setFormDespesa(f => ({ ...f, recorrente: e.target.checked }))} className="rounded w-4 h-4" style={{ accentColor: ACCENT }} />
                  <label htmlFor="recorrente" className="text-sm font-medium text-gray-700">Despesa recorrente</label>
                </div>
                {formDespesa.recorrente && (
                  <p className="text-xs text-gray-500 mt-1 ml-7">O sistema gerará lançamentos automáticos conforme a frequência configurada.</p>
                )}
              </div>

              {/* Campos de recorrência — só aparece se recorrente */}
              {formDespesa.recorrente && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                  {/* Frequência + Dia vencimento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-purple-800">Frequência *</label>
                      <select value={formDespesa.recorrencia} onChange={e => setFormDespesa(f => ({ ...f, recorrencia: e.target.value }))} className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm mt-1 bg-white">
                        <option value="semanal">Semanal</option>
                        <option value="quinzenal">Quinzenal</option>
                        <option value="mensal">Mensal</option>
                        <option value="bimestral">Bimestral</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="semestral">Semestral</option>
                        <option value="anual">Anual</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-purple-800">Dia do vencimento</label>
                      <input type="number" min="1" max="31" value={formDespesa.dia_vencimento} onChange={e => setFormDespesa(f => ({ ...f, dia_vencimento: e.target.value }))} className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm mt-1 bg-white" placeholder="Ex: 10" />
                      <p className="text-[10px] text-purple-600 mt-0.5">Dia fixo para o vencimento (1–31)</p>
                    </div>
                  </div>

                  {/* Data início + Duração */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-purple-800">Data início</label>
                      <input type="date" value={formDespesa.data_inicio} onChange={e => setFormDespesa(f => ({ ...f, data_inicio: e.target.value }))} className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm mt-1 bg-white" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-purple-800">Duração</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="checkbox" id="sem_fim" checked={formDespesa.sem_fim} onChange={e => setFormDespesa(f => ({ ...f, sem_fim: e.target.checked, data_fim: '', qtd_repeticoes: '' }))} className="rounded" style={{ accentColor: ACCENT }} />
                        <label htmlFor="sem_fim" className="text-xs text-purple-700">Sem data fim (indefinido)</label>
                      </div>
                    </div>
                  </div>

                  {/* Data fim OU Qtd repetições — só aparece se NÃO é sem_fim */}
                  {!formDespesa.sem_fim && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-purple-800">Data fim</label>
                        <input type="date" value={formDespesa.data_fim} onChange={e => setFormDespesa(f => ({ ...f, data_fim: e.target.value, qtd_repeticoes: '' }))} className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm mt-1 bg-white" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-purple-800">Ou: nº de repetições</label>
                        <input type="number" min="1" max="120" value={formDespesa.qtd_repeticoes} onChange={e => setFormDespesa(f => ({ ...f, qtd_repeticoes: e.target.value, data_fim: '' }))} className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm mt-1 bg-white" placeholder="Ex: 12" />
                        <p className="text-[10px] text-purple-600 mt-0.5">Alternativa à data fim</p>
                      </div>
                    </div>
                  )}

                  {/* Resumo da recorrência */}
                  <div className="bg-white border border-purple-100 rounded p-2 text-xs text-purple-700">
                    📅 Resumo: <strong>{formDespesa.recorrencia}</strong>
                    {formDespesa.dia_vencimento && <>, todo dia <strong>{formDespesa.dia_vencimento}</strong></>}
                    {formDespesa.data_inicio && <>, a partir de <strong>{new Date(formDespesa.data_inicio + 'T12:00').toLocaleDateString('pt-BR')}</strong></>}
                    {formDespesa.sem_fim && <>, <strong>sem data fim</strong></>}
                    {!formDespesa.sem_fim && formDespesa.data_fim && <>, até <strong>{new Date(formDespesa.data_fim + 'T12:00').toLocaleDateString('pt-BR')}</strong></>}
                    {!formDespesa.sem_fim && formDespesa.qtd_repeticoes && <>, <strong>{formDespesa.qtd_repeticoes}× repetições</strong></>}
                    {formDespesa.valor && <> — <strong>{fmt(parseFloat(formDespesa.valor) || 0)}/ocorrência</strong></>}
                  </div>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="text-xs font-medium text-gray-700">Observações</label>
                <textarea value={formDespesa.observacoes} onChange={e => setFormDespesa(f => ({ ...f, observacoes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 resize-none" placeholder="Notas adicionais sobre esta despesa..." />
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button onClick={() => setModalNovaDespesa(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={criarDespesa} disabled={!formDespesa.descricao || !formDespesa.valor} className="px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50" style={{ backgroundColor: ACCENT }}>Criar Despesa</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entrada Manual (FIN-17) */}
      {modalEntrada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Entrada Manual</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Descrição</label>
                <input value={formEntrada.descricao} onChange={e => setFormEntrada(f => ({ ...f, descricao: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Valor</label>
                <input type="number" step="0.01" value={formEntrada.valor} onChange={e => setFormEntrada(f => ({ ...f, valor: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Data</label>
                <input type="date" value={formEntrada.data} onChange={e => setFormEntrada(f => ({ ...f, data: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModalEntrada(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={criarEntrada} className="px-4 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: ACCENT }}>Registrar Entrada</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Categorias (FIN-14) */}
      {modalCategorias && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Gerenciar Categorias</h3>
              <button onClick={() => setModalCategorias(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {categorias.sort((a, b) => a.nome.localeCompare(b.nome)).map(c => (
                <div key={c.id} className="flex items-center gap-2 p-2 border rounded-lg group">
                  <input
                    type="color"
                    value={c.cor || '#6B7280'}
                    onChange={e => setCategorias(cats => cats.map(x => x.id === c.id ? { ...x, cor: e.target.value, _dirty: true } : x))}
                    className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                  />
                  <input
                    value={c.nome}
                    onChange={e => setCategorias(cats => cats.map(x => x.id === c.id ? { ...x, nome: e.target.value, _dirty: true } : x))}
                    className="text-sm flex-1 border-0 border-b border-transparent focus:border-gray-300 outline-none px-1 py-0.5 bg-transparent"
                  />
                  {c._dirty && (
                    <button
                      onClick={async () => {
                        try {
                          await authFetch(`/admin/financeiro/categorias/${c.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ nome: c.nome, cor: c.cor }),
                          });
                          setCategorias(cats => cats.map(x => x.id === c.id ? { ...x, _dirty: false } : x));
                        } catch (err) { alert('Erro ao salvar: ' + err.message); }
                      }}
                      className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium"
                    >
                      Salvar
                    </button>
                  )}
                  <button onClick={async () => {
                    if (!confirm(`Excluir categoria "${c.nome}"?`)) return;
                    await authFetch(`/admin/financeiro/categorias/${c.id}`, { method: 'DELETE' });
                    setCategorias(cats => cats.filter(x => x.id !== c.id));
                  }} className="p-1 hover:bg-red-100 rounded text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                </div>
              ))}
              {categorias.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhuma categoria cadastrada</p>}
            </div>
            {/* Salvar todas alterações pendentes */}
            {categorias.some(c => c._dirty) && (
              <button
                onClick={async () => {
                  const dirty = categorias.filter(c => c._dirty);
                  for (const c of dirty) {
                    await authFetch(`/admin/financeiro/categorias/${c.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({ nome: c.nome, cor: c.cor }),
                    });
                  }
                  setCategorias(cats => cats.map(c => ({ ...c, _dirty: false })));
                }}
                className="w-full mb-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: ACCENT }}
              >
                Salvar todas alterações ({categorias.filter(c => c._dirty).length})
              </button>
            )}
            <div className="flex gap-2 border-t pt-3">
              <input placeholder="Nova categoria" value={novaCat.nome} onChange={e => setNovaCat(c => ({ ...c, nome: e.target.value }))} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <input type="color" value={novaCat.cor} onChange={e => setNovaCat(c => ({ ...c, cor: e.target.value }))} className="w-10 h-10 border rounded cursor-pointer" />
              <button onClick={async () => {
                if (!novaCat.nome) return;
                const r = await authFetch('/admin/financeiro/categorias', { method: 'POST', body: JSON.stringify(novaCat) });
                const json = await r.json();
                setCategorias(cats => [...cats, json]);
                setNovaCat({ nome: '', cor: '#3B82F6' });
              }}
                className="px-3 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: ACCENT }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
