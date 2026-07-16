import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, CheckCircle, Clock, Send, Eye } from 'lucide-react';

const ACCENT = '#EA580C';

export default function MeusOrcamentos() {
  const { authFetch } = useAuth();
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    authFetch('/quotes/mine').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setQuotes(data);
    }).catch(() => {});
  }, []);

  const handleAccept = async (id) => {
    if (!window.confirm('Confirma aceite deste orçamento?')) return;
    await authFetch(`/quotes/${id}/accept`, { method: 'POST' });
    setQuotes(quotes.map(q => q.id === id ? { ...q, status: 'accepted' } : q));
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileText size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Meus Orçamentos</h1>
      </div>

      <div className="space-y-3">
        {quotes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            Você ainda não possui orçamentos. Quando o fotógrafo enviar uma proposta, ela aparecerá aqui.
          </div>
        ) : (
          quotes.map(q => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{q.title || 'Orçamento'}</p>
                  <p className="text-sm text-gray-500 mt-1">Valor: R$ {Number(q.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {q.status === 'sent' && (
                    <button onClick={() => handleAccept(q.id)} style={{ background: ACCENT }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-medium hover:opacity-90">
                      <CheckCircle size={14} /> Aceitar
                    </button>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    q.status === 'accepted' ? 'bg-green-50 text-green-600' :
                    q.status === 'sent' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {q.status === 'accepted' ? 'Aceito' : q.status === 'sent' ? 'Aguardando resposta' : q.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
