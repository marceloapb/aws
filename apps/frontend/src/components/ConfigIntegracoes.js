import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, RefreshCw, Zap } from 'lucide-react';

const ACCENT = '#EA580C';
const GATEWAYS = ['asaas', 'mercadopago', 'stripe', 'pagarme', 'pagbank', 'picpay', 'sumup', 'banco-inter', 'stone', 'infinitepay'];

export default function ConfigIntegracoes({ form, setForm }) {
  const { authFetch } = useAuth();
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [instagramStatus, setInstagramStatus] = useState(null);
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [subTab, setSubTab] = useState('whatsapp');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => { loadStatuses(); }, []);

  const loadStatuses = async () => {
    try {
      const [waRes, igRes, calRes] = await Promise.all([
        authFetch('/admin/whatsapp/config').then(r => r.json()).catch(() => null),
        authFetch('/admin/instagram').then(r => r.json()).catch(() => null),
        authFetch('/admin/google-calendar').then(r => r.json()).catch(() => null),
      ]);
      if (waRes?.success) setWhatsappStatus(waRes.data);
      if (igRes?.success) setInstagramStatus(igRes.data);
      if (calRes?.success) setCalendarStatus(calRes.data);
    } catch {}
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleReconnectWhatsApp = async () => {
    try {
      await authFetch('/admin/whatsapp/reconnect', { method: 'POST' });
      await loadStatuses();
    } catch {}
  };

  const handleSyncCalendar = async () => {
    try {
      await authFetch('/admin/google-calendar/sync', { method: 'POST' });
      await loadStatuses();
    } catch {}
  };

  const handleTestGateway = async () => {
    setTesting(true);
    setTestResult('');
    try {
      const res = await authFetch('/admin/cobrancas/test-gateway', { method: 'POST' });
      const json = await res.json();
      setTestResult(json.success ? '✅ Conexão OK' : `❌ ${json.message}`);
    } catch (e) {
      setTestResult('❌ Erro ao testar conexão');
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit overflow-x-auto">
        {['whatsapp', 'instagram', 'pagamento', 'calendar'].map(t => (
          <button key={t} type="button" onClick={() => setSubTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${subTab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'whatsapp' ? 'WhatsApp' : t === 'instagram' ? 'Instagram' : t === 'pagamento' ? 'Pagamento' : 'Google Calendar'}
          </button>
        ))}
      </div>

      {/* WhatsApp */}
      {subTab === 'whatsapp' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border">
            {whatsappStatus?.connected ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <XCircle size={20} className="text-red-400" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{whatsappStatus?.connected ? 'Conectado' : 'Não conectado'}</p>
              <p className="text-xs text-gray-500">{whatsappStatus?.phoneNumber || 'Nenhum número configurado'}</p>
            </div>
            <button type="button" onClick={handleReconnectWhatsApp} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-gray-100">
              <RefreshCw size={12} /> Reconectar
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WABA ID</label>
              <input value={whatsappStatus?.wabaId || form.wabaId || ''} readOnly
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
              <input value={whatsappStatus?.phoneNumberId || form.waPhoneNumberId || ''} readOnly
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
            </div>
          </div>
          {whatsappStatus?.templates && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Templates Cadastrados</label>
              <div className="space-y-1">
                {(whatsappStatus.templates || []).map((t, i) => (
                  <div key={i} className="text-sm text-gray-600 px-3 py-1.5 bg-gray-50 rounded">{t.name} ({t.status})</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instagram */}
      {subTab === 'instagram' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border">
            {instagramStatus?.connected ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <XCircle size={20} className="text-red-400" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{instagramStatus?.connected ? `@${instagramStatus.username}` : 'Não conectado'}</p>
              <p className="text-xs text-gray-500">{instagramStatus?.accountType || 'Vincule sua conta business'}</p>
            </div>
            <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-gray-100">
              <Zap size={12} /> Vincular Conta
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Account ID</label>
            <input value={instagramStatus?.businessAccountId || form.igBusinessId || ''} readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
          </div>
          {instagramStatus?.permissions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissões Ativas</label>
              <div className="flex flex-wrap gap-2">
                {(instagramStatus.permissions || []).map((p, i) => (
                  <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gateway de Pagamento */}
      {subTab === 'pagamento' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provedor Ativo</label>
              <select name="activeGateway" value={form.activeGateway || ''} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none">
                <option value="">Nenhum (controle manual)</option>
                {GATEWAYS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente</label>
              <div className="flex items-center gap-3 mt-1">
                <button type="button" onClick={() => setForm({ ...form, gatewayEnv: 'sandbox' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${form.gatewayEnv === 'sandbox' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'border-gray-200 text-gray-500'}`}>
                  Sandbox
                </button>
                <button type="button" onClick={() => setForm({ ...form, gatewayEnv: 'production' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${form.gatewayEnv === 'production' ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-500'}`}>
                  Produção
                </button>
              </div>
            </div>
          </div>
          {form.activeGateway && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client ID / API Key</label>
                  <input name="gatewayApiKey" type="password" value={form.gatewayApiKey || ''} onChange={handleChange}
                    placeholder="••••••••••"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret / Webhook Token</label>
                  <input name="gatewayWebhookToken" type="password" value={form.gatewayWebhookToken || ''} onChange={handleChange}
                    placeholder="••••••••••"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleTestGateway} disabled={testing}
                  style={{ background: ACCENT }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  <Zap size={14} /> {testing ? 'Testando...' : 'Testar Conexão'}
                </button>
                {testResult && <span className="text-sm">{testResult}</span>}
              </div>
            </>
          )}
        </div>
      )}

      {/* Google Calendar */}
      {subTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border">
            {calendarStatus?.connected ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <XCircle size={20} className="text-red-400" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{calendarStatus?.connected ? 'Sincronizado' : 'Não conectado'}</p>
              <p className="text-xs text-gray-500">{calendarStatus?.calendarName || 'Nenhum calendário vinculado'}</p>
            </div>
            <button type="button" onClick={handleSyncCalendar} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-gray-100">
              <RefreshCw size={12} /> Sincronizar Agora
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calendário Vinculado</label>
              <input value={calendarStatus?.calendarName || 'Nenhum'} readOnly
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Última Sincronização</label>
              <input value={calendarStatus?.lastSync ? new Date(calendarStatus.lastSync).toLocaleString('pt-BR') : 'Nunca'} readOnly
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
            </div>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 A sincronização MBF → Google Calendar é automática a cada 15 minutos. Eventos criados no MBF aparecem no Google Calendar, mas alterações no Google não voltam para o MBF.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
