import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, TrendingUp, TrendingDown, DollarSign, AlertCircle, Plus, X, Check, Ban, Filter } from 'lucide-react';

const ACCENT = '#EA580C';
const formatBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const STATUS_MAP = { em_aberto: 'Em aberto', paga: 'Paga', atrasada: 'Atrasada', cancelada: 'Cancelada' };
const STATUS_COLORS = { em_aberto: 'bg-yellow-50 text-yellow-700', paga: 'bg-green-50 text-green-700', atrasada: 'bg-red-50 text-red-700', cancelada: 'bg-gray-100 text-gray-500' };
const CATEGORIAS = ['Aluguel', 'Fornecedor', 'Equipamento', 'Marketing', 'Pessoal', 'Outros'];

export default function Financeiro() {
  const { authFetch } = useAuth();
  const [resumo, setResumo] = useState({});
  const [cobrancas, setCobrancas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [tab, setTab] = useState('visao');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [modalDespesa, setModalDespesa] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState({ descricao: '', valor: '', categoria: 'Outros', data: '', eventoId: '' });
  const [eventoDetalhe, setEventoDetalhe] = useState(null);

  useEffect(() => {
    authFetch('/admin/financeiro/resumo').then(r => r.json()).then(j => { if (j.success) setResumo(j.data); }).catch(() => {});
    authFetch('/admin/cobrancas').then(r => r.json()).then(j => { if (j.success) setCobrancas(j.data || []); }).catch(() => {});
    authFetch('/admin/financeiro/despesas').then(r => r.json()).then(j => { if (j.success) setDespesas(j.data || []); }).catch(() => {});
  }, []);

  const receitaMeses = useMemo(() => {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
      const total = cobrancas.filter(c => c.status === 'paga' && new Date(c.dataPagamento || c.vencimento).getMonth() === d.getMonth() && new Date(c.dataPagamento || c.vencimento).getFullYear() === d.getFullYear())
        .reduce((s, c) => s + Number(c.valor || 0), 0);
      meses.push({ label, total });
    }
    return meses;
  }, [cobrancas]);

  const maxReceita = Math.max(...receitaMeses.map(m => m.total), 1);
  const totalEntradas = cobrancas.filter(c => c.status === 'paga').reduce((s, c) => s + Number(c.valor || 0), 0);
  const totalSaidas = despesas.reduce((s, d) => s + Number(d.valor || 0), 0);

  const cobrancasFiltradas = useMemo(() => {
    return cobrancas.filter(c => (!filtroStatus || c.status === filtroStatus) && (!filtroCliente || (c.clienteNome || '').toLowerCase().includes(filtroCliente.toLowerCase())));
  }, [cobrancas, filtroStatus, filtroCliente]);

  const marcarPago = async (id) => {
    const r = await authFetch(`/admin/cobrancas/${id}/pagar`, { method: 'PATCH' });
    const j = await r.json();
    if (j.success) setCobrancas(prev => prev.map(c => c.id === id ? { ...c, status: 'paga' } : c));
  };

  const cancelarCobranca = async (id) => {
    const r = await authFetch(`/admin/cobrancas/${id}/cancelar`, { method: 'PATCH' });
    const j = await r.json();
    if (j.success) setCobrancas(prev => prev.map(c => c.id === id ? { ...c, status: 'cancelada' } : c));
  };

  const salvarDespesa = async () => {
    const r = await authFetch('/admin/financeiro/despesas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novaDespesa) });
    const j = await r.json();
    if (j.success) { setDespesas(prev => [...prev, j.data]); setModalDespesa(false); setNovaDespesa({ descricao: '', valor: '', categoria: 'Outros', data: '', eventoId: '' }); }
  };

  const verMargemEvento = async (eventoId) => {
    const r = await authFetch(`/admin/financeiro/evento/${eventoId}/margem`);
    const j = await r.json();
    if (j.success) setEventoDetalhe(j.data);
  };

  const KPICard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Icon size={14} style={{ color }} />{label}</div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CreditCard size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={TrendingUp} label="Receita do mês" value={formatBRL(resumo.receitaMesAtual)} color="#16a34a" />
        <KPICard icon={DollarSign} label="A receber" value={formatBRL(resumo.aReceber)} color={ACCENT} />
        <KPICard icon={AlertCircle} label="Inadimplência" value={`${resumo.inadimplencia || 0}%`} color="#dc2626" />
        <KPICard icon={CreditCard} label="Ticket médio" value={formatBRL(resumo.ticketMedio)} color="#7c3aed" />
      </div>

      {/* Gráfico de receita - barras CSS */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Receita — últimos 6 meses</h2>
        <div className="flex items-end gap-3 h-40">
          {receitaMeses.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-gray-600">{m.total > 0 ? formatBRL(m.total) : ''}</span>
              <div className="w-full rounded-t-md transition-all" style={{ height: `${(m.total / maxReceita) * 100}%`, minHeight: 4, backgroundColor: ACCENT }} />
              <span className="text-xs text-gray-500 capitalize">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[['visao', 'Visão Geral'], ['cobrancas', 'Cobranças'], ['despesas', 'Despesas']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
        ))}
      </div>

      {/* Visão Geral */}
      {tab === 'visao' && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Entradas</p>
            <p className="text-xl font-bold text-green-600">{formatBRL(totalEntradas)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Saídas</p>
            <p className="text-xl font-bold text-red-600">{formatBRL(totalSaidas)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Saldo</p>
            <p className={`text-xl font-bold ${totalEntradas - totalSaidas >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatBRL(totalEntradas - totalSaidas)}</p>
          </div>
        </div>
      )}

      {/* Cobranças */}
      {tab === 'cobrancas' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter size={14} className="text-gray-400" />
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todos status</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="text" placeholder="Buscar cliente..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Cliente</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Valor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Vencimento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Meio</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Ações</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {cobrancasFiltradas.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50 ${c.status === 'atrasada' ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 cursor-pointer hover:underline" onClick={() => c.eventoId && verMargemEvento(c.eventoId)}>{c.clienteNome}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(c.valor)}</td>
                    <td className="px-4 py-3 text-gray-500">{c.vencimento ? new Date(c.vencimento).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || ''}`}>{STATUS_MAP[c.status] || c.status}</span></td>
                    <td className="px-4 py-3 text-gray-500">{c.meio || '-'}</td>
                    <td className="px-4 py-3 text-right flex justify-end gap-1">
                      {c.status === 'em_aberto' && <button onClick={() => marcarPago(c.id)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Marcar pago"><Check size={15} /></button>}
                      {(c.status === 'em_aberto' || c.status === 'atrasada') && <button onClick={() => cancelarCobranca(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Cancelar"><Ban size={15} /></button>}
                    </td>
                  </tr>
                ))}
                {cobrancasFiltradas.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhuma cobrança encontrada</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Despesas */}
      {tab === 'despesas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setModalDespesa(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: ACCENT }}>
              <Plus size={16} /> Nova Despesa
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Descrição</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Valor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Categoria</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Data</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {despesas.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.descricao}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatBRL(d.valor)}</td>
                    <td className="px-4 py-3 text-gray-500">{d.categoria}</td>
                    <td className="px-4 py-3 text-gray-500">{d.data ? new Date(d.data).toLocaleDateString('pt-BR') : '-'}</td>
                  </tr>
                ))}
                {despesas.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhuma despesa registrada</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nova Despesa */}
      {modalDespesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalDespesa(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Nova Despesa</h3>
              <button onClick={() => setModalDespesa(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <input type="text" placeholder="Descrição" value={novaDespesa.descricao} onChange={e => setNovaDespesa(p => ({ ...p, descricao: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="Valor (R$)" value={novaDespesa.valor} onChange={e => setNovaDespesa(p => ({ ...p, valor: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <select value={novaDespesa.categoria} onChange={e => setNovaDespesa(p => ({ ...p, categoria: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={novaDespesa.data} onChange={e => setNovaDespesa(p => ({ ...p, data: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input type="text" placeholder="ID do evento (opcional)" value={novaDespesa.eventoId} onChange={e => setNovaDespesa(p => ({ ...p, eventoId: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <button onClick={salvarDespesa} disabled={!novaDespesa.descricao || !novaDespesa.valor} className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50" style={{ backgroundColor: ACCENT }}>Salvar</button>
          </div>
        </div>
      )}

      {/* Modal Margem do Evento */}
      {eventoDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEventoDetalhe(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Margem do Evento</h3>
              <button onClick={() => setEventoDetalhe(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Receita</span><span className="font-medium text-green-600">{formatBRL(eventoDetalhe.receita)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Custos</span><span className="font-medium text-red-600">{formatBRL(eventoDetalhe.custos)}</span></div>
              <hr />
              <div className="flex justify-between"><span className="font-medium text-gray-700">Margem</span><span className={`font-bold ${(eventoDetalhe.receita - eventoDetalhe.custos) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatBRL(eventoDetalhe.receita - eventoDetalhe.custos)}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
