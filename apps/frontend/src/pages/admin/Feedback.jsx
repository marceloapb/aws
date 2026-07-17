import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Star, Quote, Check, X, BarChart3, Send, MessageSquare } from 'lucide-react';

const ACCENT = '#EA580C';

function Estrelas({ valor, tamanho = 16, leitura }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={tamanho}
          style={{ color: n <= valor ? ACCENT : '#d6d3d1', fill: n <= valor ? ACCENT : 'transparent' }} />
      ))}
    </div>
  );
}

export default function Feedback() {
  const { authFetch } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSolicitar, setShowSolicitar] = useState(false);
  const [solicitarCliente, setSolicitarCliente] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [fbRes, cliRes] = await Promise.all([
        authFetch('/admin/feedback').then(r => r.json()),
        authFetch('/admin/clientes').then(r => r.json()),
      ]);
      if (fbRes.success) setFeedbacks(fbRes.data || []);
      if (cliRes.success) setClientes(cliRes.data || []);
    } catch {}
    setLoading(false);
  };

  const handleSolicitar = async () => {
    if (!solicitarCliente) return;
    await authFetch('/admin/feedback/solicitar', { method: 'POST', body: JSON.stringify({ cliente_id: solicitarCliente }) });
    setShowSolicitar(false);
    setSolicitarCliente('');
    loadData();
  };

  const handleAprovar = async (id) => {
    await authFetch(`/admin/feedback/${id}/aprovar`, { method: 'PUT' });
    loadData();
  };

  const respondidos = feedbacks.filter(f => f.nota != null);
  const media = respondidos.length ? (respondidos.reduce((s, f) => s + f.nota, 0) / respondidos.length).toFixed(1) : '0.0';
  const totalDepoimentos = feedbacks.filter(f => f.aprovado).length;
  const pendentes = feedbacks.filter(f => !f.nota).length;

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Feedback & Avaliações</h1>
        </div>
        <button onClick={() => setShowSolicitar(true)} style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Send size={16} /> Solicitar Feedback
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-3xl font-bold" style={{ color: ACCENT }}>{media}</div>
          <div className="mt-1 flex justify-center"><Estrelas valor={Math.round(media)} tamanho={14} leitura /></div>
          <p className="mt-1 text-xs text-gray-400">média geral</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-3xl font-bold">{respondidos.length}</div>
          <p className="mt-1 text-xs text-gray-400">avaliações</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-3xl font-bold">{totalDepoimentos}</div>
          <p className="mt-1 text-xs text-gray-400">depoimentos publicados</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">{pendentes}</div>
          <p className="mt-1 text-xs text-gray-400">aguardando resposta</p>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {feedbacks.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <MessageSquare size={40} className="mx-auto mb-3 text-gray-300" />
            <p>Nenhum feedback ainda. Solicite avaliações dos seus clientes!</p>
          </div>
        ) : (
          feedbacks.map(f => (
            <div key={f.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-gray-900">
                    {f.cliente_nome || 'Cliente'}
                    <span className="text-sm font-normal text-gray-400 ml-2">· {f.evento || ''}</span>
                  </div>
                  {f.nota ? (
                    <div className="mt-1"><Estrelas valor={f.nota} tamanho={14} leitura /></div>
                  ) : (
                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full mt-1 inline-block">Aguardando resposta</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{f.created ? new Date(f.created).toLocaleDateString('pt-BR') : ''}</span>
              </div>

              {f.texto && (
                <div className="mt-3 flex gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                  <Quote size={14} className="shrink-0 text-gray-300 mt-0.5" />
                  <span>{f.texto}</span>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <div>
                  {f.autoriza_publico ? (
                    <span className="flex items-center gap-1 text-xs text-green-600"><Check size={12} /> Autorizado uso público</span>
                  ) : f.nota ? (
                    <span className="flex items-center gap-1 text-xs text-gray-400"><X size={12} /> Sem autorização pública</span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {f.nota && f.autoriza_publico && !f.aprovado && (
                    <button onClick={() => handleAprovar(f.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg ring-1 ring-gray-300 hover:bg-gray-50">
                      <Star size={12} /> Publicar como depoimento
                    </button>
                  )}
                  {f.aprovado && (
                    <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white" style={{ background: ACCENT }}>
                      <Star size={12} className="fill-white" /> Depoimento publicado
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Solicitar */}
      {showSolicitar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Solicitar Feedback</h2>
            <select value={solicitarCliente} onChange={(e) => setSolicitarCliente(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg mb-4">
              <option value="">Selecione o cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome || c.name} — {c.email}</option>)}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSolicitar(false)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={handleSolicitar} style={{ background: ACCENT }} className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90">Enviar Solicitação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
