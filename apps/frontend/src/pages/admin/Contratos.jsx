import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FileSignature, Search, Plus, Eye, Send, Download, AlertTriangle, FileText, X } from 'lucide-react';

const ACCENT = '#EA580C';
const TABS = ['Todos', 'Gerados', 'Enviados', 'Assinados', 'Expirados'];
const STATUS_MAP = {
  gerado: { label: 'Gerado', cls: 'text-gray-700 bg-gray-100' },
  enviado: { label: 'Enviado', cls: 'text-blue-700 bg-blue-50' },
  assinado: { label: 'Assinado', cls: 'text-green-700 bg-green-50' },
  expirado: { label: 'Expirado', cls: 'text-red-700 bg-red-50' },
};

export default function Contratos() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [tab, setTab] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [orcamentos, setOrcamentos] = useState([]);
  const [form, setForm] = useState({ orcamento_id: '', modelo: 'padrao' });

  useEffect(() => {
    authFetch('/admin/contratos').then(r => r.json()).then(j => {
      if (j.success) setContratos(j.data || []);
    }).catch(() => {});
  }, []);

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const kpis = useMemo(() => ({
    total: contratos.length,
    assinados_mes: contratos.filter(c => c.status === 'assinado' && new Date(c.aceite_em).getMonth() === mesAtual && new Date(c.aceite_em).getFullYear() === anoAtual).length,
    aguardando: contratos.filter(c => c.status === 'enviado').length,
    expirados: contratos.filter(c => c.status === 'expirado').length,
  }), [contratos]);

  const filtered = useMemo(() => {
    let list = contratos;
    if (tab !== 'Todos') list = list.filter(c => c.status === tab.toLowerCase().slice(0, -1) + (tab === 'Assinados' ? 'o' : tab === 'Expirados' ? 'o' : '') || c.status === tab.slice(0, -1).toLowerCase());
    if (tab === 'Gerados') list = contratos.filter(c => c.status === 'gerado');
    if (tab === 'Enviados') list = contratos.filter(c => c.status === 'enviado');
    if (tab === 'Assinados') list = contratos.filter(c => c.status === 'assinado');
    if (tab === 'Expirados') list = contratos.filter(c => c.status === 'expirado');
    if (busca) list = list.filter(c => c.cliente_nome?.toLowerCase().includes(busca.toLowerCase()));
    return list;
  }, [contratos, tab, busca]);

  const isExpirando = (c) => {
    if (!c.expira_em || c.status === 'expirado' || c.status === 'assinado') return false;
    return new Date(c.expira_em) - hoje < 7 * 86400000 && new Date(c.expira_em) > hoje;
  };

  const abrirModal = () => {
    authFetch('/admin/orcamentos?status=aceito').then(r => r.json()).then(j => {
      if (j.success) setOrcamentos(j.data || []);
    }).catch(() => {});
    setModal(true);
  };

  const gerarContrato = () => {
    if (!form.orcamento_id) return;
    authFetch('/admin/contratos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      .then(r => r.json()).then(() => { setModal(false); window.location.reload(); }).catch(() => {});
  };

  const enviar = (id) => authFetch(`/admin/contratos/${id}/enviar`, { method: 'POST' }).catch(() => {});
  const downloadPdf = (id) => authFetch(`/admin/contratos/${id}/pdf`).then(r => r.blob()).then(b => {
    const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = `contrato-${id}.pdf`; a.click();
  }).catch(() => {});

  const KpiCard = ({ label, value, icon: Icon }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50"><Icon size={20} style={{ color: ACCENT }} /></div>
      <div><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-xs text-gray-500">{label}</p></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><FileSignature size={24} style={{ color: ACCENT }} /><h1 className="text-2xl font-bold text-gray-900">Contratos</h1></div>
        <button onClick={abrirModal} style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"><Plus size={16} /> Gerar Contrato</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total contratos" value={kpis.total} icon={FileText} />
        <KpiCard label="Assinados este mês" value={kpis.assinados_mes} icon={FileSignature} />
        <KpiCard label="Aguardando assinatura" value={kpis.aguardando} icon={Send} />
        <KpiCard label="Expirados" value={kpis.expirados} icon={AlertTriangle} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map(t => (<button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
        </div>
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-2">Nenhum contrato encontrado.</p>
          <a href="/admin/orcamentos" className="text-sm font-medium" style={{ color: ACCENT }}>Ver orçamentos aceitos →</a>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['#','Cliente','Orçamento','Valor','Status','Gerado em','Assinado em','Ações'].map(h => (<th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => {
                const st = STATUS_MAP[c.status] || STATUS_MAP.gerado;
                const expirando = isExpirando(c);
                return (
                  <tr key={c.id} className={`hover:bg-gray-50 ${expirando ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 text-gray-500">{c.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.cliente_nome}</td>
                    <td className="px-4 py-3 text-gray-500">#{c.orcamento_id}</td>
                    <td className="px-4 py-3 font-medium">R$ {Number(c.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${st.cls}`}>{st.label}{expirando && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}</span></td>
                    <td className="px-4 py-3 text-gray-500">{c.gerado_em ? new Date(c.gerado_em).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.aceite_em ? new Date(c.aceite_em).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => navigate(`/admin/contratos/${c.id}`)} title="Ver" className="p-1.5 rounded hover:bg-gray-100"><Eye size={15} /></button>
                        {c.status === 'gerado' && <button onClick={() => enviar(c.id)} title="Enviar" className="p-1.5 rounded hover:bg-gray-100"><Send size={15} /></button>}
                        <button onClick={() => downloadPdf(c.id)} title="Download PDF" className="p-1.5 rounded hover:bg-gray-100"><Download size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Gerar Contrato */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900">Gerar Contrato</h2><button onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orçamento aceito</label>
              <select value={form.orcamento_id} onChange={e => setForm({ ...form, orcamento_id: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200">
                <option value="">Selecione...</option>
                {orcamentos.map(o => <option key={o.id} value={o.id}>#{o.id} — {o.cliente_nome} (R$ {Number(o.valor_total).toLocaleString('pt-BR')})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <select value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200">
                <option value="padrao">Padrão</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            <button onClick={gerarContrato} disabled={!form.orcamento_id} style={{ background: ACCENT }} className="w-full py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">Gerar</button>
          </div>
        </div>
      )}
    </div>
  );
}
