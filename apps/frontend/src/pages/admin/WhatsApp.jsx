import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  MessageCircle, Send, CheckCheck, Check, Clock, AlertCircle, X, Wifi, WifiOff,
  Bell, GitBranch, Plus, Mail, Smartphone, ToggleLeft, ToggleRight, Filter
} from 'lucide-react';

const ACCENT = '#EA580C';
const TRIGGERS = ['orcamento_enviado','contrato_gerado','pagamento_atrasado','album_publicado','feedback_solicitado'];
const CANAIS = ['email','whatsapp','in_app'];
const STATUS_CONFIG = {
  enviado: { icon: Check, color: 'text-gray-500', label: 'Enviado' },
  entregue: { icon: CheckCheck, color: 'text-gray-500', label: 'Entregue' },
  lido: { icon: CheckCheck, color: 'text-blue-500', label: 'Lido' },
  falhou: { icon: AlertCircle, color: 'text-red-500', label: 'Falhou' },
};
const CANAL_ICONS = { email: Mail, whatsapp: MessageCircle, in_app: Bell };

export default function WhatsApp() {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState('followup');
  // Follow-up
  const [reguas, setReguas] = useState([]);
  const [showReguaModal, setShowReguaModal] = useState(false);
  const [reguaForm, setReguaForm] = useState({ nome: '', gatilho: TRIGGERS[0], ativo: true, passos: [{ dias_apos: 1, canal: 'email', template_msg: '' }] });
  // WhatsApp
  const [messages, setMessages] = useState([]);
  const [config, setConfig] = useState(null);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({ clientId: '', templateId: '', params: '' });
  const [sending, setSending] = useState(false);
  // Notificações
  const [notificacoes, setNotificacoes] = useState([]);
  const [filtroCanal, setFiltroCanal] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('7');

  useEffect(() => { loadReguas(); loadMessages(); loadConfig(); loadClients(); loadTemplates(); loadNotificacoes(); }, []);

  const loadReguas = async () => { try { const r = await authFetch('/admin/followup/reguas'); const d = await r.json(); if (Array.isArray(d)) setReguas(d); } catch {} };
  const loadMessages = async () => { try { const r = await authFetch('/admin/whatsapp/messages'); const d = await r.json(); if (Array.isArray(d)) setMessages(d); } catch {} };
  const loadConfig = async () => { try { const r = await authFetch('/admin/whatsapp/config'); setConfig(await r.json()); } catch {} };
  const loadClients = async () => { try { const r = await authFetch('/admin/clientes'); const d = await r.json(); if (Array.isArray(d)) setClients(d); } catch {} };
  const loadTemplates = async () => { try { const r = await authFetch('/admin/whatsapp/templates'); const d = await r.json(); if (Array.isArray(d)) setTemplates(d); } catch {} };
  const loadNotificacoes = async () => { try { const r = await authFetch(`/admin/whatsapp/messages?tipo=all&dias=${filtroPeriodo}`); const d = await r.json(); if (Array.isArray(d)) setNotificacoes(d); } catch {} };

  const saveRegua = async (e) => {
    e.preventDefault();
    try { await authFetch('/admin/followup/reguas', { method: 'POST', body: JSON.stringify(reguaForm) }); setShowReguaModal(false); setReguaForm({ nome: '', gatilho: TRIGGERS[0], ativo: true, passos: [{ dias_apos: 1, canal: 'email', template_msg: '' }] }); loadReguas(); } catch {}
  };

  const handleSend = async (e) => {
    e.preventDefault(); setSending(true);
    try { const params = sendForm.params ? sendForm.params.split(',').map(p => p.trim()) : []; await authFetch('/admin/whatsapp/send', { method: 'POST', body: JSON.stringify({ clientId: sendForm.clientId, templateId: sendForm.templateId, params }) }); setShowSendModal(false); setSendForm({ clientId: '', templateId: '', params: '' }); loadMessages(); } catch {}
    setSending(false);
  };

  const testConnection = async () => { try { await authFetch('/admin/whatsapp/config'); loadConfig(); } catch {} };

  const addPasso = () => setReguaForm({ ...reguaForm, passos: [...reguaForm.passos, { dias_apos: 1, canal: 'email', template_msg: '' }] });
  const updatePasso = (i, field, val) => { const p = [...reguaForm.passos]; p[i] = { ...p[i], [field]: val }; setReguaForm({ ...reguaForm, passos: p }); };
  const removePasso = (i) => setReguaForm({ ...reguaForm, passos: reguaForm.passos.filter((_, idx) => idx !== i) });

  const renderStatus = (status) => { const c = STATUS_CONFIG[status] || STATUS_CONFIG.enviado; const Icon = c.icon; return <span className={`inline-flex items-center gap-1 text-xs font-medium ${c.color}`}><Icon size={14}/> {c.label}</span>; };
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  const tabs = [
    { id: 'followup', label: 'Réguas de Follow-up', icon: GitBranch },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
  ];

  const notifFiltradas = notificacoes.filter(n => filtroCanal === 'todos' || n.canal === filtroCanal);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Comunicação & Follow-up</h1>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(t => { const Icon = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon size={16}/> {t.label}
          </button>
        );})}
      </div>

      {/* TAB: Follow-up */}
      {tab === 'followup' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{reguas.length} régua(s) configurada(s)</p>
            <button onClick={() => setShowReguaModal(true)} style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"><Plus size={16}/> Nova Régua</button>
          </div>
          <div className="space-y-4">
            {reguas.map((r, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div><h3 className="font-semibold text-gray-900">{r.nome}</h3><span className="text-xs text-gray-500">Gatilho: {r.gatilho}</span></div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{r.passos?.length || 0} passos</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </div>
                {/* Timeline visual */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(r.passos || []).map((p, j) => { const Icon = CANAL_ICONS[p.canal] || Bell; return (
                    <div key={j} className="flex items-center gap-2">
                      {j > 0 && <div className="w-6 h-px bg-gray-300"/>}
                      <div className="flex flex-col items-center px-2 py-1 bg-gray-50 rounded-lg border border-gray-200 min-w-[80px]">
                        <Icon size={14} className="text-gray-600"/><span className="text-[10px] text-gray-500 mt-0.5">Dia +{p.dias_apos}</span><span className="text-[10px] text-gray-400">{p.canal}</span>
                      </div>
                    </div>
                  );})}
                </div>
              </div>
            ))}
            {reguas.length === 0 && <div className="text-center text-gray-400 py-12">Nenhuma régua configurada</div>}
          </div>
        </div>
      )}

      {/* TAB: WhatsApp */}
      {tab === 'whatsapp' && (
        <div>
          {config && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {config.connected ? <Wifi size={16} className="text-green-500"/> : <WifiOff size={16} className="text-red-500"/>}
                <span className={`text-sm font-medium ${config.connected ? 'text-green-600' : 'text-red-600'}`}>{config.connected ? 'Conectado' : 'Desconectado'}</span>
                <span className="text-sm text-gray-500">{config.phoneNumber || ''}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={testConnection} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Testar Conexão</button>
                <button onClick={() => setShowSendModal(true)} style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-1.5 text-white rounded-lg text-sm font-medium hover:opacity-90"><Send size={14}/> Enviar Template</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
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
                {messages.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{m.recipient || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.template || '—'}</td>
                    <td className="px-4 py-3">{renderStatus(m.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(m.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {messages.length === 0 && <div className="p-8 text-center text-gray-400">Nenhuma mensagem enviada</div>}
          </div>
        </div>
      )}

      {/* TAB: Notificações */}
      {tab === 'notificacoes' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Filter size={16} className="text-gray-400"/>
            <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <option value="todos">Todos os canais</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="in_app">In-App</option>
            </select>
            <select value={filtroPeriodo} onChange={e => { setFiltroPeriodo(e.target.value); loadNotificacoes(); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <option value="7">Últimos 7 dias</option><option value="15">Últimos 15 dias</option><option value="30">Últimos 30 dias</option>
            </select>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {notifFiltradas.map((n, i) => { const Icon = CANAL_ICONS[n.canal] || Bell; return (
              <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><Icon size={16} className="text-gray-600"/></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{n.recipient || n.destinatario || '—'}</p>
                  <p className="text-xs text-gray-500">{n.template || n.assunto || n.tipo || '—'}</p>
                </div>
                <div className="text-right">{renderStatus(n.status)}<p className="text-xs text-gray-400 mt-0.5">{fmtDate(n.date || n.data)}</p></div>
              </div>
            );})}
            {notifFiltradas.length === 0 && <div className="p-8 text-center text-gray-400">Nenhuma notificação encontrada</div>}
          </div>
        </div>
      )}

      {/* Modal Nova Régua */}
      {showReguaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nova Régua de Follow-up</h2>
              <button onClick={() => setShowReguaModal(false)} className="p-1 rounded hover:bg-gray-100"><X size={18}/></button>
            </div>
            <form onSubmit={saveRegua} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome</label><input value={reguaForm.nome} onChange={e => setReguaForm({ ...reguaForm, nome: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"/></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Gatilho</label><select value={reguaForm.gatilho} onChange={e => setReguaForm({ ...reguaForm, gatilho: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500">{TRIGGERS.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}</select></div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setReguaForm({ ...reguaForm, ativo: !reguaForm.ativo })} className="text-gray-600">{reguaForm.ativo ? <ToggleRight size={24} className="text-green-500"/> : <ToggleLeft size={24}/>}</button>
                <span className="text-sm">{reguaForm.ativo ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Passos</label>
                {reguaForm.passos.map((p, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input type="number" min="1" value={p.dias_apos} onChange={e => updatePasso(i, 'dias_apos', +e.target.value)} className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm" placeholder="Dias"/>
                    <select value={p.canal} onChange={e => updatePasso(i, 'canal', e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm">{CANAIS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    <input value={p.template_msg} onChange={e => updatePasso(i, 'template_msg', e.target.value)} placeholder="Mensagem template" className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"/>
                    <button type="button" onClick={() => removePasso(i)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                  </div>
                ))}
                <button type="button" onClick={addPasso} className="text-sm text-orange-600 hover:underline mt-1">+ Adicionar passo</button>
              </div>
              <button type="submit" style={{ background: ACCENT }} className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90">Salvar Régua</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Enviar Template */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Enviar Template</h2>
              <button onClick={() => setShowSendModal(false)} className="p-1 rounded hover:bg-gray-100"><X size={18}/></button>
            </div>
            <form onSubmit={handleSend} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label><select value={sendForm.clientId} onChange={e => setSendForm({ ...sendForm, clientId: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"><option value="">Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Template</label><select value={sendForm.templateId} onChange={e => setSendForm({ ...sendForm, templateId: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"><option value="">Selecione...</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Parâmetros (vírgula)</label><input value={sendForm.params} onChange={e => setSendForm({ ...sendForm, params: e.target.value })} placeholder="Ex: João, 15/08" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"/></div>
              <button type="submit" disabled={sending} style={{ background: ACCENT }} className="w-full py-2.5 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50">{sending ? 'Enviando...' : 'Enviar'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
