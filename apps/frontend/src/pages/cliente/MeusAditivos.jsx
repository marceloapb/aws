import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FilePlus, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const ACCENT = '#EA580C';

function StatusBadge({ status }) {
  const map = {
    pendente: { label: 'Pendente', cls: 'bg-yellow-50 text-yellow-700' },
    aceito: { label: 'Aceito', cls: 'bg-green-50 text-green-600' },
    recusado: { label: 'Recusado', cls: 'bg-red-50 text-red-600' },
  };
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export default function MeusAditivos() {
  const { authFetch } = useAuth();
  const [aditivos, setAditivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptDialog, setAcceptDialog] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [acceptName, setAcceptName] = useState('');
  const [acceptCheck, setAcceptCheck] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    authFetch('/client/portal/aditivos')
      .then(r => r.json())
      .then(d => setAditivos(Array.isArray(d) ? d : d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id) => {
    setProcessing(true);
    try {
      await authFetch(`/client/portal/aditivos/${id}/aceitar`, { method: 'PATCH' });
      setAditivos(prev => prev.map(a => a.id === id ? { ...a, status: 'aceito' } : a));
      setAcceptDialog(null);
    } catch {}
    setProcessing(false);
  };

  const handleReject = async (id) => {
    if (rejectMotivo.length < 10) return;
    setProcessing(true);
    try {
      await authFetch(`/client/portal/aditivos/${id}/recusar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: rejectMotivo }),
      });
      setAditivos(prev => prev.map(a => a.id === id ? { ...a, status: 'recusado' } : a));
      setRejectDialog(null);
      setRejectMotivo('');
    } catch {}
    setProcessing(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FilePlus size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Meus Aditivos</h1>
      </div>

      {aditivos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Nenhum aditivo disponível.
        </div>
      ) : (
        <div className="space-y-4">
          {aditivos.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 uppercase">{a.tipo}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm text-gray-700">{a.descricao}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Criado em {new Date(a.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {a.status === 'pendente' && (a.valor_original != null || a.valor_novo != null) && (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-4">
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-400">Valor original</p>
                    <p className="text-sm font-semibold text-gray-700">
                      R$ {Number(a.valor_original || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <span className="text-gray-300">→</span>
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-400">Valor novo</p>
                    <p className="text-sm font-semibold" style={{ color: ACCENT }}>
                      R$ {Number(a.valor_novo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}

              {a.status === 'pendente' && (
                <div className="flex gap-2">
                  <button onClick={() => { setAcceptDialog(a.id); setAcceptName(''); setAcceptCheck(false); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90"
                    style={{ background: '#16a34a' }}>
                    <CheckCircle size={14} /> Aceitar
                  </button>
                  <button onClick={() => { setRejectDialog(a.id); setRejectMotivo(''); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:opacity-90">
                    <XCircle size={14} /> Recusar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Accept Dialog */}
      {acceptDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900">Confirmar aceite do aditivo</h3>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Digite seu nome completo para confirmar</label>
              <input type="text" value={acceptName} onChange={e => setAcceptName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={acceptCheck} onChange={e => setAcceptCheck(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300" style={{ accentColor: ACCENT }} />
              <span className="text-sm text-gray-600">Declaro que li e compreendo os termos deste aditivo</span>
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAcceptDialog(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => handleAccept(acceptDialog)}
                disabled={!acceptName.trim() || !acceptCheck || processing}
                style={{ background: '#16a34a' }}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {processing ? 'Processando...' : 'Confirmar aceite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900">Recusar aditivo</h3>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Motivo da recusa (mínimo 10 caracteres)</label>
              <textarea value={rejectMotivo} onChange={e => setRejectMotivo(e.target.value)}
                rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
              <p className={`text-xs mt-1 ${rejectMotivo.length < 10 ? 'text-gray-400' : 'text-green-600'}`}>
                {rejectMotivo.length}/10 caracteres mínimos
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectDialog(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => handleReject(rejectDialog)}
                disabled={rejectMotivo.length < 10 || processing}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium bg-red-600 hover:opacity-90 disabled:opacity-50">
                {processing ? 'Processando...' : 'Confirmar recusa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
