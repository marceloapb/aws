import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Users, Plus, Search, Filter, FileText, Download, CheckCircle, XCircle, Send, Edit, Trash2, X, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#EA580C';
const API = import.meta.env.VITE_API_URL || '';
const fmt = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
const STATUS_COLORS = { em_aberto: 'bg-yellow-100 text-yellow-800', paga: 'bg-green-100 text-green-800', atrasada: 'bg-red-100 text-red-800', cancelada: 'bg-gray-100 text-gray-500' };
const CATEGORIAS = ['equipamento', 'transporte', 'alimentação', 'terceiro', 'marketing', 'outros'];

export default function Financeiro() {
  const { token } = useAuth();
  const [tab, setTab] = useState('visao');
  const [periodo, setPeriodo] = useState('mes');
  const [customRange, setCustomRange] = useState({ inicio: '', fim: '' });
  const [resumo, setResumo] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [modalPagar, setModalPagar] = useState(null);
  const [modalCobranca, setModalCobranca] = useState(false);
  const [modalDespesa, setModalDespesa] = useState(null);
  const [formPagar, setFormPagar] = useState({ meio: 'pix', data: '', valor: '' });
  const [formCobranca, setFormCobranca] = useState({ cliente: '', evento: '', valor: '', vencimento: '', meio: 'pix' });
  const [formDespesa, setFormDespesa] = useState({ descricao: '', valor: '', categoria: 'equipamento', data: '', evento: '' });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = async () => {
    try {
      const params = periodo === 'custom' ? `?inicio=${customRange.inicio}&fim=${customRange.fim}` : `?periodo=${periodo}`;
      const [res, cob, desp] = await Promise.all([
        fetch(`${API}/admin/financeiro/resumo${params}`, { headers }),
        fetch(`${API}/admin/cobrancas${params}`, { headers }),
        fetch(`${API}/admin/financeiro/despesas${params}`, { headers })
      ]);
      setResumo(await res.json());
      setCobrancas(await cob.json());
      setDespesas(await desp.json());
    } catch (e) { console.error('Erro ao buscar dados financeiros', e); }
  };

  useEffect(() => { fetchData(); }, [periodo, customRange]);

  const cobrancasFiltradas = useMemo(() => {
    let list = cobrancas;
    if (filtroStatus !== 'todos') list = list.filter(c => c.status === filtroStatus);
    if (buscaCliente) list = list.filter(c => c.cliente?.toLowerCase().includes(buscaCliente.toLowerCase()));
    return list;
  }, [cobrancas, filtroStatus, buscaCliente]);

  const subtotalDespesas = useMemo(() => despesas.reduce((s, d) => s + (d.valor || 0), 0), [despesas]);

  const marcarPago = async () => {
    await fetch(`${API}/admin/cobrancas/${modalPagar._id}/pagar`, { method: 'PUT', headers, body: JSON.stringify(formPagar) });
    setModalPagar(null); fetchData();
  };
  const cancelarCobranca = async (id) => {
    if (!confirm('Cancelar esta cobrança?')) return;
    await fetch(`${API}/admin/cobrancas/${id}/cancelar`, { method: 'PUT', headers });
    fetchData();
  };
  const enviarLembrete = (c) => {
    const msg = encodeURIComponent(`Olá ${c.cliente}, lembramos que sua cobrança de ${fmt(c.valor)} vence em ${fmtDate(c.vencimento)}. Obrigado!`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };
  const salvarCobranca = async () => {
    await fetch(`${API}/admin/cobrancas`, { method: 'POST', headers, body: JSON.stringify(formCobranca) });
    setModalCobranca(false); setFormCobranca({ cliente: '', evento: '', valor: '', vencimento: '', meio: 'pix' }); fetchData();
  };
  const salvarDespesa = async () => {
    const method = formDespesa._id ? 'PUT' : 'POST';
    const url = formDespesa._id ? `${API}/admin/financeiro/despesas/${formDespesa._id}` : `${API}/admin/financeiro/despesas`;
    await fetch(url, { method, headers, body: JSON.stringify(formDespesa) });
    setModalDespesa(null); setFormDespesa({ descricao: '', valor: '', categoria: 'equipamento', data: '', evento: '' }); fetchData();
  };
  const excluirDespesa = async (id) => {
    if (!confirm('Excluir despesa?')) return;
    await fetch(`${API}/admin/financeiro/despesas/${id}`, { method: 'DELETE', headers });
    fetchData();
  };
  const exportar = (tipo) => {
    const params = periodo === 'custom' ? `?inicio=${customRange.inicio}&fim=${customRange.fim}` : `?periodo=${periodo}`;
    window.open(`${API}/admin/financeiro/export/${tipo}${params}`, '_blank');
  };

  const kpis = [
    { label: 'Receita do mês', value: fmt(resumo?.receita_mes), icon: DollarSign, color: 'text-green-600' },
    { label: 'A receber', value: fmt(resumo?.a_receber), icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Recebido total', value: fmt(resumo?.recebido_total), icon: CheckCircle, color: 'text-emerald-600' },
    { label: 'Inadimplência', value: `${resumo?.inadimplencia || 0}%`, icon: AlertTriangle, color: 'text-red-600' },
    { label: 'Ticket médio', value: fmt(resumo?.ticket_medio), icon: Users, color: 'text-purple-600' }
  ];

  const meses = resumo?.grafico_meses || [];
  const maxVal = Math.max(...meses.flatMap(m => [m.entradas || 0, m.saidas || 0]), 1);

  const BarChart = () => (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h3 className="font-semibold text-gray-700 mb-4">Últimos 6 meses</h3>
      <div className="flex items-end justify-between gap-3 h-48">
        {meses.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex gap-1 items-end w-full justify-center h-40">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-green-700 font-medium">{fmt(m.entradas)}</span>
                <div className="w-5 bg-green-500 rounded-t" style={{ height: `${(m.entradas / maxVal) * 140}px` }} />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-red-700 font-medium">{fmt(m.saidas)}</span>
                <div className="w-5 bg-red-500 rounded-t" style={{ height: `${(m.saidas / maxVal) * 140}px` }} />
              </div>
            </div>
            <span className="text-xs text-gray-500">{m.mes}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-xs"><span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" />Entradas</span><span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" />Saídas</span></div>
    </div>
  );

  const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">{title}</h3><button onClick={onClose}><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="mes">Este mês</option><option value="trimestre">Trimestre</option><option value="ano">Ano</option><option value="custom">Personalizado</option>
          </select>
          {periodo === 'custom' && (
            <div className="flex gap-2"><input type="date" value={customRange.inicio} onChange={e => setCustomRange(p => ({ ...p, inicio: e.target.value }))} className="border rounded px-2 py-1 text-sm" /><input type="date" value={customRange.fim} onChange={e => setCustomRange(p => ({ ...p, fim: e.target.value }))} className="border rounded px-2 py-1 text-sm" /></div>
          )}
          <button onClick={() => exportar('pdf')} className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"><FileText size={14} />Exportar PDF</button>
          <button onClick={() => exportar('csv')} className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"><Download size={14} />Exportar CSV</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-1"><k.icon size={18} className={k.color} /><span className="text-xs text-gray-500">{k.label}</span></div>
            <p className="text-xl font-bold text-gray-800">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[['visao', 'Visão Geral'], ['cobrancas', 'Cobranças'], ['despesas', 'Despesas']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`} style={tab === key ? { borderBottom: `2px solid ${ACCENT}` } : {}}>{label}</button>
        ))}
      </div>

      {/* Visão Geral */}
      {tab === 'visao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4"><p className="text-sm text-green-700">Entradas</p><p className="text-2xl font-bold text-green-800">{fmt(resumo?.entradas)}</p></div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4"><p className="text-sm text-red-700">Saídas</p><p className="text-2xl font-bold text-red-800">{fmt(resumo?.saidas)}</p></div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><p className="text-sm text-blue-700">Saldo</p><p className="text-2xl font-bold text-blue-800">{fmt((resumo?.entradas || 0) - (resumo?.saidas || 0))}</p></div>
          </div>
          <BarChart />
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-700 mb-3">Top 5 clientes por receita</h3>
            <div className="space-y-2">
              {(resumo?.top_clientes || []).slice(0, 5).map((c, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm text-gray-700">{i + 1}. {c.nome}</span><span className="font-semibold text-sm">{fmt(c.receita)}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Margem por evento */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-700 mb-3">Margem por evento</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Evento</th><th className="pb-2">Receita</th><th className="pb-2">Custos</th><th className="pb-2">Margem</th><th className="pb-2">%</th></tr></thead>
                <tbody>
                  {(resumo?.margens || []).map((m, i) => (
                    <tr key={i} className="border-b last:border-0"><td className="py-2">{m.evento}</td><td>{fmt(m.receita)}</td><td>{fmt(m.custos)}</td><td className={m.receita - m.custos >= 0 ? 'text-green-700' : 'text-red-700'}>{fmt(m.receita - m.custos)}</td><td className="font-medium">{m.receita ? ((((m.receita - m.custos) / m.receita) * 100).toFixed(1)) : 0}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cobranças */}
      {tab === 'cobrancas' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              {['todos', 'em_aberto', 'paga', 'atrasada', 'cancelada'].map(s => (
                <button key={s} onClick={() => setFiltroStatus(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition ${filtroStatus === s ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} style={filtroStatus === s ? { backgroundColor: ACCENT } : {}}>{s === 'todos' ? 'Todos' : s.replace('_', ' ')}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-gray-400" /><input placeholder="Buscar cliente..." value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)} className="border rounded-lg pl-8 pr-3 py-2 text-sm w-48" /></div>
              <button onClick={() => setModalCobranca(true)} className="flex items-center gap-1 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: ACCENT }}><Plus size={14} />Nova Cobrança</button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b bg-gray-50"><th className="p-3">Cliente</th><th className="p-3">Evento</th><th className="p-3">Valor</th><th className="p-3">Vencimento</th><th className="p-3">Status</th><th className="p-3">Meio</th><th className="p-3">Ações</th></tr></thead>
              <tbody>
                {cobrancasFiltradas.map(c => (
                  <tr key={c._id} className={`border-b hover:bg-gray-50 ${c.status === 'atrasada' ? 'bg-red-50' : ''}`}>
                    <td className="p-3 font-medium">{c.cliente}</td><td className="p-3">{c.evento}</td><td className="p-3">{fmt(c.valor)}</td><td className="p-3">{fmtDate(c.vencimento)}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>{c.status?.replace('_', ' ')}</span></td>
                    <td className="p-3 capitalize">{c.meio}</td>
                    <td className="p-3"><div className="flex gap-1">
                      {c.status !== 'paga' && c.status !== 'cancelada' && <><button onClick={() => { setModalPagar(c); setFormPagar({ meio: c.meio || 'pix', data: new Date().toISOString().split('T')[0], valor: c.valor }); }} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Marcar pago"><CheckCircle size={16} /></button><button onClick={() => cancelarCobranca(c._id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Cancelar"><XCircle size={16} /></button><button onClick={() => enviarLembrete(c)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Lembrete WhatsApp"><Send size={16} /></button></>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cobrancasFiltradas.length === 0 && <p className="text-center text-gray-400 py-8">Nenhuma cobrança encontrada.</p>}
          </div>
        </div>
      )}

      {/* Despesas */}
      {tab === 'despesas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Subtotal: <span className="font-bold text-gray-800">{fmt(subtotalDespesas)}</span></p>
            <button onClick={() => { setFormDespesa({ descricao: '', valor: '', categoria: 'equipamento', data: '', evento: '' }); setModalDespesa('nova'); }} className="flex items-center gap-1 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: ACCENT }}><Plus size={14} />Nova Despesa</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b bg-gray-50"><th className="p-3">Descrição</th><th className="p-3">Valor</th><th className="p-3">Categoria</th><th className="p-3">Data</th><th className="p-3">Evento</th><th className="p-3">Ações</th></tr></thead>
              <tbody>
                {despesas.map(d => (
                  <tr key={d._id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{d.descricao}</td><td className="p-3">{fmt(d.valor)}</td><td className="p-3 capitalize">{d.categoria}</td><td className="p-3">{fmtDate(d.data)}</td><td className="p-3">{d.evento || '-'}</td>
                    <td className="p-3"><div className="flex gap-1">
                      <button onClick={() => { setFormDespesa(d); setModalDespesa('editar'); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                      <button onClick={() => excluirDespesa(d._id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {despesas.length === 0 && <p className="text-center text-gray-400 py-8">Nenhuma despesa registrada.</p>}
          </div>
        </div>
      )}

      {/* Modal Marcar Pago */}
      {modalPagar && (
        <Modal title="Marcar como pago" onClose={() => setModalPagar(null)}>
          <div className="space-y-3">
            <div><label className="text-sm text-gray-600">Meio de pagamento</label><select value={formPagar.meio} onChange={e => setFormPagar(p => ({ ...p, meio: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1"><option value="pix">PIX</option><option value="boleto">Boleto</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transferência</option></select></div>
            <div><label className="text-sm text-gray-600">Data do pagamento</label><input type="date" value={formPagar.data} onChange={e => setFormPagar(p => ({ ...p, data: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
            <div><label className="text-sm text-gray-600">Valor recebido</label><input type="number" value={formPagar.valor} onChange={e => setFormPagar(p => ({ ...p, valor: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
            <button onClick={marcarPago} className="w-full py-2 rounded-lg text-white font-medium" style={{ backgroundColor: ACCENT }}>Confirmar pagamento</button>
          </div>
        </Modal>
      )}

      {/* Modal Nova Cobrança */}
      {modalCobranca && (
        <Modal title="Nova Cobrança" onClose={() => setModalCobranca(false)}>
          <div className="space-y-3">
            <div><label className="text-sm text-gray-600">Cliente</label><input value={formCobranca.cliente} onChange={e => setFormCobranca(p => ({ ...p, cliente: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
            <div><label className="text-sm text-gray-600">Evento</label><input value={formCobranca.evento} onChange={e => setFormCobranca(p => ({ ...p, evento: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
            <div><label className="text-sm text-gray-600">Valor</label><input type="number" value={formCobranca.valor} onChange={e => setFormCobranca(p => ({ ...p, valor: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
            <div><label className="text-sm text-gray-600">Vencimento</label><input type="date" value={formCobranca.vencimento} onChange={e => setFormCobranca(p => ({ ...p, vencimento: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
            <div><label className="text-sm text-gray-600">Meio</label><select value={formCobranca.meio} onChange={e => setFormCobranca(p => ({ ...p, meio: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1"><option value="pix">PIX</option><option value="boleto">Boleto</option><option value="cartao">Cartão</option></select></div>
            <button onClick={salvarCobranca} className="w-full py-2 rounded-lg text-white font-medium" style={{ backgroundColor: ACCENT }}>Salvar cobrança</button>
          </div>
        </Modal>
      )}

      {/* Modal Despesa */}
      {modalDespesa && (
        <Modal title={modalDespesa === 'editar' ? 'Editar Despesa' : 'Nova Despesa'} onClose={() => setModalDespesa(null)}>
          <div className="space-y-3">
            <div><label className="text-sm text-gray-600">Descrição</label><input value={formDespesa.descricao} onChange={e => setFormDespesa(p => ({ ...p, descricao: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
            <div><label className="text-sm text-gray-600">Valor</label><input type="number" value={formDespesa.valor} onChange={e => setFormDespesa(p => ({ ...p, valor: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
            <div><label className="text-sm text-gray-600">Categoria</label><select value={formDespesa.categoria} onChange={e => setFormDespesa(p => ({ ...p, categoria: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1">{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-sm text-gray-600">Data</label><input type="date" value={formDespesa.data} onChange={e => setFormDespesa(p => ({ ...p, data: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1" /></div>
            <div><label className="text-sm text-gray-600">Evento vinculado</label><input value={formDespesa.evento} onChange={e => setFormDespesa(p => ({ ...p, evento: e.target.value }))} className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="(opcional)" /></div>
            <button onClick={salvarDespesa} className="w-full py-2 rounded-lg text-white font-medium" style={{ backgroundColor: ACCENT }}>Salvar despesa</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
