import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MessageCircle, Send, CheckCheck, Check, Clock, AlertCircle, X, Wifi, WifiOff } from 'lucide-react';

const ACCENT = '#EA580C';

const STATUS_CONFIG = {
  enviado: { icon: Check, color: 'text-gray-500', label: 'Enviado' },
  entregue: { icon: CheckCheck, color: 'text-gray-500', label: 'Entregue' },
  lido: { icon: CheckCheck, color: 'text-blue-500', label: 'Lido' },
  falhou: { icon: AlertCircle, color: 'text-red-500', label: 'Falhou' },
  pendente: { icon: Clock, color: 'text-yellow-500', label: 'Pendente' },
};

export default function WhatsApp() {
  const { authFetch } = useAuth();
  const [messages, setMessages] = useState([]);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [config, setConfig] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ clientId: '', templateId: '', params: '' });

  useEffect(() => {
    loadMessages();
    loadClients();
    loadTemplates();
    loadConfig();
  }, []);

  const loadMessages = async () => {
    try {
      const res = await authFetch('/admin/whatsapp/messages');
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } catch {}
  };

  const loadClients = async () => {
    try {
      const res = await authFetch('/admin/clientes');
      const data = await res.json();
      if (Array.isArray(data)) setClients(data);
    } catch {}
  };

  const loadTemplates = async () => {
    try {
      const res = await authFetch('/admin/whatsapp/templates');
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch {}
  };

  const loadConfig = async () => {
    try {
      const res = await authFetch('/admin/whatsapp/config');
      const data = await res.json();
      setConfig(data);
    } catch {}
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const params = form.params ? form.params.split(',').map((p) => p.trim()) : [];
      await authFetch('/admin/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({ clientId: form.clientId, templateId: form.templateId, params }),
      });
      setShowModal(false);
      setForm({ clientId: '', templateId: '', params: '' });
      loadMessages();
    } catch {}
    setSending(false);
  };

  const renderStatus = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
        <Icon size={14} /> {cfg.label}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageCircle size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Send size={16} /> Enviar Template
        </button>
      </div>

      {/* Connection Status */}
      {config && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Configuração do Número</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {config.connected ? (
                <Wifi size={16} className="text-green-500" />
              ) : (
                <WifiOff size={16} className="text-red-500" />
              )}
              <span className={`text-sm font-medium ${config.connected ? 'text-green-600' : 'text-red-600'}`}>
                {config.connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <span className="text-sm text-gray-500">|</span>
            <span className="text-sm text-gray-600">{config.phoneNumber || '—'}</span>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700">Mensagens Recentes</h3>
        </div>
        {messages.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma mensagem enviada</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Destinatário</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Template</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {messages.map((msg) => (
                <tr key={msg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{msg.recipient || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{msg.template || '—'}</td>
                  <td className="px-4 py-3">{renderStatus(msg.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {msg.date ? new Date(msg.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Enviar Template */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Enviar Template</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select
                  value={form.templateId}
                  onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">Selecione um template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parâmetros (separados por vírgula)</label>
                <input
                  value={form.params}
                  onChange={(e) => setForm({ ...form, params: e.target.value })}
                  placeholder="Ex: João, 15/08, 14h"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                style={{ background: ACCENT }}
                className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
