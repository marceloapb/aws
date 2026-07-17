import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, DollarSign, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#EA580C';
const STATUS_LABELS = { pendente: 'Pendente', aceito_admin: 'Aceito Admin', aceito_cliente: 'Aceito Cliente', rejeitado: 'Rejeitado' };
const STATUS_COLORS = { pendente: 'bg-yellow-100 text-yellow-800', aceito_admin: 'bg-blue-100 text-blue-800', aceito_cliente: 'bg-green-100 text-green-800', rejeitado: 'bg-red-100 text-red-800' };

export default function Aditivos() {
  const { authFetch } = useAuth();
  const [aditivos, setAditivos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ contrato_id: '', motivo: '', tipo: 'acrescimo', novo_valor: '', recalcular: false });

  const load = async () => {
    const [a, c] = await Promise.all([authFetch('/admin/aditivos'), authFetch('/admin/contratos')]);
    if (a) setAditivos(a);
    if (c) setContratos(c);
  };
  useEffect(() => { load(); }, []);

  const kpis = {
    total: aditivos.length,
    adicionado: aditivos.filter(a => a.novo_valor > a.valor_original).reduce((s, a) => s + (a.novo_valor - a.valor_original), 0),
    reduzido: aditivos.filter(a => a.novo_valor < a.valor_original).reduce((s, a) => s + (a.valor_original - a.novo_valor), 0),
    pendentes: aditivos.filter(a => a.status === 'pendente').length,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await authFetch('/admin/aditivos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, novo_valor: parseFloat(form.novo_valor) }) });
    setShowModal(false);
    setForm({ contrato_id: '', motivo: '', tipo: 'acrescimo', novo_valor: '', recalcular: false });
    load();
  };

  const registrarReembolso = async (aditivo) => {
    const valor = prompt('Valor do reembolso (será registrado como negativo):');
    if (!valor) return;
    await authFetch('/admin/aditivos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contrato_id: aditivo.contrato_id, motivo: `Reembolso ref. aditivo #${aditivo.id}`, tipo: 'reducao', novo_valor: aditivo.valor_original - Math.abs(parseFloat(valor)), recalcular: true }) });
    load();
  };

  const fmt = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Renegociação / Aditivos</h1>
        <button onClick={() => setShowModal(true)} style={{ background: ACCENT }} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:opacity-90">
          <Plus size={18} /> Novo Aditivo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: 'Total Aditivos', value: kpis.total, icon: DollarSign }, { label: 'Valor Adicionado', value: fmt(kpis.adicionado), icon: TrendingUp }, { label: 'Valor Reduzido', value: fmt(kpis.reduzido), icon: TrendingDown }, { label: 'Pendentes', value: kpis.pendentes, icon: Clock }].map((k, i) => (
          <div key={i} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div style={{ background: `${ACCENT}20` }} className="p-3 rounded-lg"><k.icon size={22} style={{ color: ACCENT }} /></div>
            <div><p className="text-sm text-gray-500">{k.label}</p><p className="text-xl font-bold">{k.value}</p></div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>{['Contrato', 'Cliente', 'Motivo', 'Valor Original', 'Novo Valor', 'Diferença', 'Status', 'Data', 'Ações'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {aditivos.map(a => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">#{a.contrato_id}</td>
                <td className="px-4 py-3">{a.cliente_nome || '-'}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{a.motivo}</td>
                <td className="px-4 py-3">{fmt(a.valor_original)}</td>
                <td className="px-4 py-3">{fmt(a.novo_valor)}</td>
                <td className="px-4 py-3 font-medium" style={{ color: a.novo_valor >= a.valor_original ? '#16a34a' : '#dc2626' }}>{fmt(a.novo_valor - a.valor_original)}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{STATUS_LABELS[a.status]}</span></td>
                <td className="px-4 py-3">{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <button onClick={() => registrarReembolso(a)} className="text-xs px-2 py-1 border rounded hover:bg-gray-100 flex items-center gap-1"><RefreshCw size={12} /> Reembolso</button>
                </td>
              </tr>
            ))}
            {!aditivos.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nenhum aditivo registrado</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Novo Aditivo</h2>
            <select required value={form.contrato_id} onChange={e => setForm({ ...form, contrato_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
              <option value="">Selecionar contrato...</option>
              {contratos.map(c => <option key={c.id} value={c.id}>#{c.id} - {c.cliente_nome}</option>)}
            </select>
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full border rounded-lg px-3 py-2">
              <option value="acrescimo">Acréscimo de serviço</option>
              <option value="reducao">Redução</option>
              <option value="troca_data">Troca de data</option>
              <option value="outro">Outro</option>
            </select>
            <textarea required placeholder="Motivo da renegociação" value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} className="w-full border rounded-lg px-3 py-2 h-20 resize-none" />
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm">R$</span>
              <input required type="number" step="0.01" placeholder="0,00" value={form.novo_valor} onChange={e => setForm({ ...form, novo_valor: e.target.value })} className="w-full border rounded-lg pl-10 pr-3 py-2" />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.recalcular} onChange={e => setForm({ ...form, recalcular: e.target.checked })} className="rounded" /> Recalcular cobranças</label>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" style={{ background: ACCENT }} className="px-4 py-2 text-white rounded-lg hover:opacity-90">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
