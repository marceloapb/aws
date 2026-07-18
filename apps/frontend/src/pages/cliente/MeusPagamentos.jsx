import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, AlertTriangle } from 'lucide-react';

const ACCENT = '#EA580C';

export default function MeusPagamentos() {
  const { authFetch } = useAuth();
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/client/pagamentos')
      .then(r => r.json())
      .then(d => setParcelas(Array.isArray(d) ? d : d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  }

  const total = parcelas.reduce((s, p) => s + Number(p.valor || 0), 0);
  const pago = parcelas.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor || 0), 0);
  const restante = total - pago;
  const pctPago = total > 0 ? Math.round((pago / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CreditCard size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Meus Pagamentos</h1>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-lg font-bold text-gray-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Pago</p>
            <p className="text-lg font-bold text-green-600">R$ {pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Restante</p>
            <p className="text-lg font-bold" style={{ color: ACCENT }}>R$ {restante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pctPago}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">{pctPago}% pago</p>
      </div>

      {/* Installments */}
      {parcelas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Nenhum pagamento registrado.
        </div>
      ) : (
        <div className="space-y-3">
          {parcelas.map((p, i) => {
            const isOverdue = p.status === 'em_aberto' && new Date(p.vencimento) < new Date();
            return (
              <div key={p.id || i} className={`bg-white rounded-xl border p-4 flex items-center justify-between ${
                isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  {isOverdue && <AlertTriangle size={16} className="text-red-500 shrink-0" />}
                  <div>
                    <p className="text-sm font-medium text-gray-900">Parcela {p.numero}</p>
                    <p className="text-xs text-gray-500">
                      Vencimento: {new Date(p.vencimento).toLocaleDateString('pt-BR')}
                      {isOverdue && <span className="text-red-500 font-medium ml-1">• Vencida</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">
                    R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  {p.status === 'pago' ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">Pago</span>
                  ) : (
                    <button style={{ background: ACCENT }}
                      className="px-3 py-1.5 text-white rounded-lg text-xs font-medium hover:opacity-90">
                      Pagar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
