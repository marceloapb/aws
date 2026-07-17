import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Receipt, Plus, Download, Ban, Check, AlertTriangle, FileText, Settings } from 'lucide-react';

const ACCENT = '#EA580C';
const fmtBRL = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'bg-yellow-50 text-yellow-700', icon: FileText },
  emitida: { label: 'Emitida', color: 'bg-green-50 text-green-700', icon: Check },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500', icon: Ban },
  erro: { label: 'Erro', color: 'bg-red-50 text-red-700', icon: AlertTriangle },
};

export default function NotasFiscais() {
  const { authFetch } = useAuth();
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('todas');
  const [showEmitir, setShowEmitir] = useState(false);
  const [form, setForm] = useState({ orcamento_id: '', valor: '', descricao_servico: '', cliente_cpf: '' });
  const [periodo, setPeriodo] = useState({ inicio: '', fim: '' });

  useEffect(() => { loadNotas(); }, []);

  const loadNotas = async () => {
    try {
      const res = await authFetch('/admin/notas-fiscais');
      const json = await res.json();
      if (json.success) setNotas(json.data || []);
    } catch {}
    setLoading(false);
  };

  const handleEmitir = async () => {
    await authFetch('/admin/notas-fiscais', { method: 'POST', body: JSON.stringify(form) });
    setShowEmitir(false);
    setForm({ orcamento_id: '', valor: '', descricao_servico: '', cliente_cpf: '' });
    loadNotas();
  };

  const handleCancelar = async (id) => {
    if (!window.confirm('Cancelar esta nota fiscal?')) return;
    await authFetch(`/admin/notas-fiscais/${id}/cancelar`, { method: 'PUT' });
    loadNotas();
  };

  const filtradas = aba === 'todas' ? notas : notas.filter(n => n.status === aba);
  const totalEmitidas = notas.filter(n => n.status === 'emitida').length;
  const totalValor = notas.filter(n => n.status === 'emitida').reduce((s, n) => s + (n.valor || 0), 0);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Receipt size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Notas Fiscais</h1>
        </div>
        <button onClick={() => setShowEmitir(true)} style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Emitir NF
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-3xl font-bold" style={{ color: ACCENT }}>{totalEmitidas}</div>
          <p className="text-xs text-gray-400 mt-1">notas emitidas</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-3xl font-bold">{fmtBRL(totalValor)}</div>
          <p className="text-xs text-gray-400 mt-1">total faturado</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-3xl font-bold text-red-500">{notas.filter(n => n.status === 'erro').length}</div>
          <p className="text-xs text-gray-400 mt-1">com erro</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4">
        {[{ key: 'todas', label: 'Todas' }, { key: 'pendente', label: 'Pendentes' }, { key: 'emitida', label: 'Emitidas' }, { key: 'erro', label: 'Com Erro' }, { key: 'cancelada', label: 'Canceladas' }].map(t => (
          <button key={t.key} onClick={() => setAba(t.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${aba === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        {filtradas.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Nenhuma nota fiscal {aba !== 'todas' ? `com status "${aba}"` : ''}</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Número</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map(n => {
                const st = STATUS_CONFIG[n.status] || STATUS_CONFIG.pendente;
                return (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{n.numero_nf || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{n.cliente_nome || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{n.descricao_servico || n.descricao || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{fmtBRL(n.valor)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        <st.icon size={10} /> {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-400">{n.created ? new Date(n.created).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {n.status === 'emitida' && (
                          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400" title="Download"><Download size={14} /></button>
                        )}
                        {(n.status === 'pendente' || n.status === 'emitida') && (
                          <button onClick={() => handleCancelar(n.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Cancelar"><Ban size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Emitir */}
      {showEmitir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Emitir Nota Fiscal</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Serviço *</label>
                <input value={form.descricao_servico} onChange={e => setForm({ ...form, descricao_servico: e.target.value })}
                  placeholder="Ex: Serviço de fotografia de casamento"
                  className="w-full px-3 py-2.5 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
                  <input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ do Tomador</label>
                  <input value={form.cliente_cpf} onChange={e => setForm({ ...form, cliente_cpf: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID do Orçamento (opcional)</label>
                <input value={form.orcamento_id} onChange={e => setForm({ ...form, orcamento_id: e.target.value })}
                  placeholder="Vincular a orçamento"
                  className="w-full px-3 py-2.5 border rounded-lg" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setShowEmitir(false)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={handleEmitir} disabled={!form.descricao_servico || !form.valor}
                style={{ background: ACCENT }} className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
                Emitir Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
