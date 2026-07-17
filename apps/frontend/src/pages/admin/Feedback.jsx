import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Send, Star, CheckCircle, X } from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_MAP = {
  responded: { label: 'Respondido', color: 'text-blue-600 bg-blue-50' },
  pending: { label: 'Pendente', color: 'text-yellow-600 bg-yellow-50' },
  approved: { label: 'Aprovado', color: 'text-green-600 bg-green-50' },
};

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={14}
          className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );
}

export default function Feedback() {
  const { authFetch } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [fbRes, clRes] = await Promise.all([
        authFetch('/admin/feedback'),
        authFetch('/admin/clientes'),
      ]);
      const fbJson = await fbRes.json();
      const clJson = await clRes.json();
      if (fbJson.success) setFeedbacks(fbJson.data || []);
      if (clJson.success) setClientes(clJson.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSolicitar = async (e) => {
    e.preventDefault();
    if (!selectedCliente) return;
    setSaving(true);
    try {
      const res = await authFetch('/admin/feedback/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId: selectedCliente }),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setSelectedCliente('');
        loadData();
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleAprovar = async (id) => {
    try {
      const res = await authFetch(`/admin/feedback/${id}/aprovar`, { method: 'PUT' });
      const json = await res.json();
      if (json.success) loadData();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Feedbacks</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Send size={16} /> Solicitar Feedback
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {feedbacks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            Nenhum feedback recebido ainda.
          </div>
        ) : (
          feedbacks.map(fb => {
            const st = STATUS_MAP[fb.status] || STATUS_MAP.pending;
            return (
              <div key={fb.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium text-gray-900">{fb.clienteNome || 'Cliente'}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    {fb.nota && <StarRating rating={fb.nota} />}
                    {fb.texto && (
                      <p className="text-sm text-gray-600 mt-2">&ldquo;{fb.texto}&rdquo;</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </div>
                  {fb.status === 'responded' && (
                    <button
                      onClick={() => handleAprovar(fb.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
                    >
                      <CheckCircle size={14} /> Aprovar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Solicitar Feedback */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Solicitar Feedback</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSolicitar} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Cliente</label>
                <select
                  required
                  value={selectedCliente}
                  onChange={(e) => setSelectedCliente(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="">Selecionar...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ background: ACCENT }}
                  className="flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Enviando...' : 'Enviar Solicitacao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
