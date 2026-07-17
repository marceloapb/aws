import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FilePlus, Plus, ArrowRight, Check, Send, X, DollarSign, TrendingUp, TrendingDown, Clock } from 'lucide-react';

const ACCENT = '#EA580C';
const fmtBRL = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

const TIPOS = ['Acréscimo de serviço', 'Redução', 'Troca de data', 'Outro'];
const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'bg-yellow-50 text-yellow-700' },
  aprovado_admin: { label: 'Aprovado ADM', color: 'bg-blue-50 text-blue-700' },
  enviado_cliente: { label: 'Enviado', color: 'bg-purple-50 text-purple-700' },
  aceito: { label: 'Aceito', color: 'bg-green-50 text-green-700' },
  rejeitado: { label: 'Rejeitado', color: 'bg-red-50 text-red-700' },
};

export default function Aditivos() {
  const { authFetch } = useAuth();
  const [aditivos, setAditivos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCriar, setShowCriar] = useState(false);
  const [showReembolso, setShowReembolso] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ contrato_id: '', tipo: '', motivo: '', itens: [], recalcular: false });
  const [reembolsoForm, setReembolsoForm] = useState({ contrato_id: '', valor: '', motivo: '', meio: 'pix' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [adRes, cRes] = await Promise.all([
        authFetch('/admin/aditivos').then(r => r.json()),
        authFetch('/admin/contratos').then(r => r.json()),
      ]);
      if (adRes.success) setAditivos(adRes.data || []);
      if (cRes.success) setContratos(cRes.data || []);
    } catch {}
    setLoading(false);
  };

  const handleCriar = async () => {
    const novoValor = form.itens.reduce((s, it) => s + Number(it.valor_novo || 0), 0);
    await authFetch('/admin/aditivos', { method: 'POST', body: JSON.stringify({ ...form, novo_valor_total: novoValor }) });
    setShowCriar(false);
    setForm({ contrato_id: '', tipo: '', motivo: '', itens: [], recalcular: false });
    loadData();
  };

  const handleAprovar = async (id) => {
    await authFetch(`/admin/aditivos/${id}/aprovar`, { method: 'PUT' });
    loadData();
  };

  const handleReembolso = async () => {
    await authFetch('/admin/aditivos', { method: 'POST', body: JSON.stringify({ ...reembolsoForm, tipo: 'Redução', is_reembolso: true }) });
    setShowReembolso(false);
    setReembolsoForm({ contrato_id: '', valor: '', motivo: '', meio: 'pix' });
    loadData();
  };

  const addItem = () => setForm({ ...form, itens: [...form.itens, { descricao: '', valor_antigo: '', valor_novo: '' }] });
  const updateItem = (i, f, v) => { const arr = [...form.itens]; arr[i] = { ...arr[i], [f]: v }; setForm({ ...form, itens: arr }); };
  const removeItem = (i) => setForm({ ...form, itens: form.itens.filter((_, idx) => idx !== i) });

  // KPIs
  const totalAcrescimos = aditivos.filter(a => a.tipo === 'Acréscimo de serviço').reduce((s, a) => s + Math.max(0, (a.novo_valor_total || 0) - (a.valor_original || 0)), 0);
  const totalReducoes = aditivos.filter(a => a.tipo === 'Redução').reduce((s, a) => s + Math.abs((a.novo_valor_total || 0) - (a.valor_original || 0)), 0);
  const pendentes = aditivos.filter(a => a.status === 'pendente').length;
  const taxaAceite = aditivos.length ? Math.round(aditivos.filter(a => a.status === 'aceito').length / aditivos.length * 100) : 0;

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FilePlus size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Renegociação & Aditivos</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowReembolso(true)} className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">
            <DollarSign size={16} /> Reembolso
          </button>
          <button onClick={() => setShowCriar(true)} style={{ background: ACCENT }}
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
            <Plus size={16} /> Novo Aditivo
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold">{aditivos.length}</div>
          <p className="text-xs text-gray-400">Total</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{fmtBRL(totalAcrescimos)}</div>
          <p className="text-xs text-gray-400">Acréscimos</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{fmtBRL(totalReducoes)}</div>
          <p className="text-xs text-gray-400">Reduções</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{pendentes}</div>
          <p className="text-xs text-gray-400">Pendentes</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: ACCENT }}>{taxaAceite}%</div>
          <p className="text-xs text-gray-400">Taxa aceite</p>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {aditivos.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Nenhum aditivo registrado</div>
        ) : aditivos.map(a => {
          const diff = (a.novo_valor_total || 0) - (a.valor_original || 0);
          const st = STATUS_CONFIG[a.status] || STATUS_CONFIG.pendente;
          return (
            <div key={a.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {diff >= 0 ? <TrendingUp size={18} className="text-green-500" /> : <TrendingDown size={18} className="text-red-500" />}
                  <div>
                    <p className="font-medium text-gray-900">{a.cliente_nome || 'Contrato'} — {a.tipo || 'Aditivo'}</p>
                    <p className="text-sm text-gray-500">{a.motivo?.slice(0, 80)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">{fmtBRL(a.valor_original)}</span>
                      <ArrowRight size={12} className="text-gray-300" />
                      <span className="font-medium">{fmtBRL(a.novo_valor_total)}</span>
                    </div>
                    <span className={`text-xs font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {diff >= 0 ? '+' : ''}{fmtBRL(diff)}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                {a.status === 'pendente' && (
                  <button onClick={() => handleAprovar(a.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100">
                    <Check size={12} /> Aprovar
                  </button>
                )}
                {a.status === 'aprovado_admin' && (
                  <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">
                    <Send size={12} /> Enviar ao cliente
                  </button>
                )}
                <button onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100">
                  <Clock size={12} /> Timeline
                </button>
              </div>

              {/* Timeline expandida */}
              {expanded === a.id && (
                <div className="mt-3 pt-3 border-t flex items-center gap-3">
                  {['Criado', 'Aprovado ADM', 'Enviado', 'Aceito Cliente'].map((step, i) => {
                    const active = i <= ['pendente', 'aprovado_admin', 'enviado_cliente', 'aceito'].indexOf(a.status);
                    return (
                      <React.Fragment key={step}>
                        {i > 0 && <div className={`flex-1 h-0.5 ${active ? 'bg-green-400' : 'bg-gray-200'}`} />}
                        <div className={`flex flex-col items-center`}>
                          <div className={`w-3 h-3 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-xs text-gray-400 mt-1">{step}</span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Criar Aditivo */}
      {showCriar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Novo Aditivo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrato *</label>
                <select value={form.contrato_id} onChange={e => setForm({ ...form, contrato_id: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg">
                  <option value="">Selecione...</option>
                  {contratos.filter(c => c.status === 'assinado').map(c => <option key={c.id} value={c.id}>{c.cliente_nome} — {fmtBRL(c.valor_total)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Alteração *</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg">
                  <option value="">Selecione...</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                <textarea value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} rows={2} className="w-full px-3 py-2.5 border rounded-lg resize-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Itens Alterados</label>
                  <button type="button" onClick={addItem} className="text-xs font-medium" style={{ color: ACCENT }}>+ Adicionar item</button>
                </div>
                {form.itens.map((it, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input value={it.descricao} onChange={e => updateItem(i, 'descricao', e.target.value)} placeholder="Descrição" className="flex-1 px-2 py-1.5 border rounded text-sm" />
                    <input type="number" value={it.valor_antigo} onChange={e => updateItem(i, 'valor_antigo', e.target.value)} placeholder="Antes" className="w-24 px-2 py-1.5 border rounded text-sm" />
                    <input type="number" value={it.valor_novo} onChange={e => updateItem(i, 'valor_novo', e.target.value)} placeholder="Depois" className="w-24 px-2 py-1.5 border rounded text-sm" />
                    <button onClick={() => removeItem(i)} className="text-red-400"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.recalcular} onChange={e => setForm({ ...form, recalcular: e.target.checked })} className="rounded" />
                Recalcular cobranças automaticamente
              </label>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setShowCriar(false)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={handleCriar} disabled={!form.contrato_id || !form.tipo} style={{ background: ACCENT }} className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50">Criar Aditivo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reembolso */}
      {showReembolso && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Registrar Reembolso</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrato</label>
                <select value={reembolsoForm.contrato_id} onChange={e => setReembolsoForm({ ...reembolsoForm, contrato_id: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg">
                  <option value="">Selecione...</option>
                  {contratos.map(c => <option key={c.id} value={c.id}>{c.cliente_nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor a Reembolsar (R$)</label>
                <input type="number" step="0.01" value={reembolsoForm.valor} onChange={e => setReembolsoForm({ ...reembolsoForm, valor: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meio de Devolução</label>
                <select value={reembolsoForm.meio} onChange={e => setReembolsoForm({ ...reembolsoForm, meio: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg">
                  <option value="pix">PIX</option>
                  <option value="transferencia">Transferência</option>
                  <option value="credito">Crédito em conta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <textarea value={reembolsoForm.motivo} onChange={e => setReembolsoForm({ ...reembolsoForm, motivo: e.target.value })} rows={2} className="w-full px-3 py-2.5 border rounded-lg resize-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setShowReembolso(false)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={handleReembolso} disabled={!reembolsoForm.contrato_id || !reembolsoForm.valor} style={{ background: ACCENT }} className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50">Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
