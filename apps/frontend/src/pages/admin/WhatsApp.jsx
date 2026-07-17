import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MessageCircle, Send, CheckCheck, Check, Clock, AlertCircle, X, Wifi, WifiOff, RefreshCw, Copy, Eye, EyeOff } from 'lucide-react';

const ACCENT = '#EA580C';
const STATUS_CONFIG = {
  enviado: { icon: Check, color: 'text-gray-500', label: 'Enviado' },
  entregue: { icon: CheckCheck, color: 'text-gray-500', label: 'Entregue' },
  lido: { icon: CheckCheck, color: 'text-blue-500', label: 'Lido' },
  falhou: { icon: AlertCircle, color: 'text-red-500', label: 'Falhou' },
};

export default function WhatsApp() {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState('mensagens');
  const [mensagens, setMensagens] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [config, setConfig] = useState(null);
  const [showEnviar, setShowEnviar] = useState(false);
  const [sendForm, setSendForm] = useState({ clienteId: '', templateId: '', params: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [msgRes, tplRes, cliRes, cfgRes] = await Promise.all([
        authFetch('/admin/whatsapp/messages').then(r => r.json()).catch(() => ({ data: [] })),
        authFetch('/admin/whatsapp/templates').then(r => r.json()).catch(() => ({ data: [] })),
        authFetch('/admin/clientes').then(r => r.json()).catch(() => ({ data: [] })),
        authFetch('/admin/whatsapp/config').then(r => r.json()).catch(() => ({ data: null })),
      ]);
      setMensagens(msgRes.data || []);
      setTemplates(tplRes.data || []);
      setClientes(cliRes.data || []);
      setConfig(cfgRes.data);
    } catch {}
    setLoading(false);
  };

  const enviarTemplate = async () => {
    try {
      const params = sendForm.params ? sendForm.params.split(',').map(p => p.trim()) : [];
      await authFetch('/admin/whatsapp/send', { method: 'POST', body: JSON.stringify({ clientId: sendForm.clienteId, templateId: sendForm.templateId, params }) });
      setShowEnviar(false);
      setSendForm({ clienteId: '', templateId: '', params: '' });
      loadData();
    } catch {}
  };

  const testarConexao = async () => {
    try {
      await authFetch('/admin/whatsapp/reconnect', { method: 'POST' });
      loadData();
    } catch {}
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <MessageCircle size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={testarConexao} className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
            <RefreshCw size={14} /> Testar Conexão
          </button>
          <button onClick={() => setShowEnviar(true)} style={{ background: ACCENT }}
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
            <Send size={16} /> Enviar Mensagem
          </button>
        </div>
      </div>

      {/* Status de Conexão */}
      <div className="bg-white rounded-xl border p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config?.connected ? (
            <><Wifi size={20} className="text-green-500" /><span className="text-sm font-medium text-green-700">Conectado</span></>
          ) : (
            <><WifiOff size={20} className="text-red-400" /><span className="text-sm font-medium text-red-600">Desconectado</span></>
          )}
          {config?.phoneNumber && <span className="text-sm text-gray-500 ml-2">• {config.phoneNumber}</span>}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>WABA: {config?.wabaId || '-'}</span>
          <span>Phone ID: {config?.phoneNumberId || '-'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {[{ key: 'mensagens', label: 'Mensagens Enviadas' }, { key: 'templates', label: 'Templates' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Mensagens Enviadas */}
      {tab === 'mensagens' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {mensagens.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Nenhuma mensagem enviada ainda</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Destinatário</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Template</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mensagens.map((m, i) => {
                  const st = STATUS_CONFIG[m.status] || STATUS_CONFIG.enviado;
                  const Icon = st.icon;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.destinatario || m.telefone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.template || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${st.color}`}>
                          <Icon size={12} /> {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-400">{m.created ? new Date(m.created).toLocaleString('pt-BR') : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Templates */}
      {tab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.length === 0 ? (
            <div className="col-span-2 bg-white rounded-xl border p-12 text-center text-gray-400">
              Nenhum template cadastrado. Configure templates no Meta Business Suite.
            </div>
          ) : (
            templates.map((t, i) => (
              <div key={i} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{t.name || t.nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {t.status || 'Pendente'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{t.body || t.conteudo || 'Sem preview disponível'}</p>
                <p className="text-xs text-gray-400 mt-2">Idioma: {t.language || 'pt_BR'}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Enviar */}
      {showEnviar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Enviar Mensagem WhatsApp</h2>
              <button onClick={() => setShowEnviar(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select value={sendForm.clienteId} onChange={e => setSendForm({ ...sendForm, clienteId: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg">
                  <option value="">Selecione...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome || c.name} — {c.whatsapp || c.telefone}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select value={sendForm.templateId} onChange={e => setSendForm({ ...sendForm, templateId: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg">
                  <option value="">Selecione...</option>
                  {templates.map((t, i) => <option key={i} value={t.name || t.id}>{t.name || t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parâmetros (separados por vírgula)</label>
                <input value={sendForm.params} onChange={e => setSendForm({ ...sendForm, params: e.target.value })}
                  placeholder="Ex: João, Ensaio, 20/08" className="w-full px-3 py-2.5 border rounded-lg" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setShowEnviar(false)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={enviarTemplate} disabled={!sendForm.clienteId || !sendForm.templateId}
                style={{ background: ACCENT }} className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
