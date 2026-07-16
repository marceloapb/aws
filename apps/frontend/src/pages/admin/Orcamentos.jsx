import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Plus, Eye, Send, CheckCircle, Clock, XCircle } from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_MAP = {
  draft: { label: 'Rascunho', icon: Clock, color: 'text-gray-500 bg-gray-100' },
  sent: { label: 'Enviado', icon: Send, color: 'text-blue-600 bg-blue-50' },
  accepted: { label: 'Aceito', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  rejected: { label: 'Recusado', icon: XCircle, color: 'text-red-600 bg-red-50' },
};

export default function Orcamentos() {
  const { authFetch } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadQuotes(); }, []);

  const loadQuotes = async () => {
    try {
      const res = await authFetch('/quotes');
      const data = await res.json();
      if (Array.isArray(data)) setQuotes(data);
    } catch {}
  };

  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
        </div>
        <button style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Novo Orçamento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[{ key: 'all', label: 'Todos' }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f.key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={filter === f.key ? { background: ACCENT } : {}}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            Nenhum orçamento {filter !== 'all' ? `com status "${STATUS_MAP[filter]?.label}"` : 'cadastrado'}
          </div>
        ) : (
          filtered.map(q => {
            const st = STATUS_MAP[q.status] || STATUS_MAP.draft;
            const Icon = st.icon;
            return (
              <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${st.color}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{q.clientName || 'Cliente'}</p>
                    <p className="text-sm text-gray-500">{q.title || 'Orçamento'} • R$ {Number(q.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                  <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
