import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

const ACCENT = '#EA580C';

export default function Financeiro() {
  const { authFetch } = useAuth();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ received: 0, pending: 0, overdue: 0 });

  useEffect(() => {
    authFetch('/payments').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setPayments(data);
        const received = data.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0);
        const pending = data.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount || 0), 0);
        const overdue = data.filter(p => p.status === 'overdue').reduce((s, p) => s + Number(p.amount || 0), 0);
        setSummary({ received, pending, overdue });
      }
    }).catch(() => {});
  }, []);

  const formatBRL = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CreditCard size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
      </div>

      {/* Cards resumo */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <TrendingUp size={14} className="text-green-500" /> Recebido
          </div>
          <p className="text-2xl font-bold text-green-600">{formatBRL(summary.received)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <DollarSign size={14} className="text-yellow-500" /> Pendente
          </div>
          <p className="text-2xl font-bold text-yellow-600">{formatBRL(summary.pending)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <AlertCircle size={14} className="text-red-500" /> Vencido
          </div>
          <p className="text-2xl font-bold text-red-600">{formatBRL(summary.overdue)}</p>
        </div>
      </div>

      {/* Lista pagamentos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma cobrança registrada</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.clientName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatBRL(p.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      p.status === 'paid' ? 'bg-green-50 text-green-600' :
                      p.status === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      {p.status === 'paid' ? 'Pago' : p.status === 'overdue' ? 'Vencido' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
