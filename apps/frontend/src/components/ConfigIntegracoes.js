import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RefreshCw, Play, FileText, Save } from 'lucide-react';

const ACCENT = '#EA580C';
const WEBHOOK_URL = 'https://setvwal0cd.execute-api.us-east-1.amazonaws.com/prod/whatsapp/webhook';

export default function ConfigIntegracoes({ form, setForm }) {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [instagramStatus, setInstagramStatus] = useState(null);
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [mapsStatus, setMapsStatus] = useState(null);
  const [subTab, setSubTab] = useState('whatsapp');
  const [syncing, setSyncing] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [calendarDirty, setCalendarDirty] = useState(false);
  const [testing, setTesting] = useState('');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => { loadStatuses(); }, []);

  const loadStatuses = async () => {
    try {
      const [waRes, igRes, calRes, emailRes, mapsRes] = await Promise.all([
        authFetch('/admin/whatsapp/config').then(r => r.json()).catch(() => null),
        authFetch('/admin/instagram/status').then(r => r.json()).catch(() => null),
        authFetch('/admin/google-calendar/status').then(r => r.json()).catch(() => null),
        authFetch('/admin/integracoes/test/email-status').then(r => r.json()).catch(() => null),
        authFetch('/admin/integracoes/test/maps-status').then(r => r.json()).catch(() => null),
      ]);
      if (waRes?.success) setWhatsappStatus(waRes.data);
      if (igRes?.success) setInstagramStatus(igRes.data);
      if (calRes?.success) { setCalendarStatus(calRes.data); if (calRes.data?.autoSync !== undefined) setForm(f => ({ ...f, calendarAutoSync: calRes.data.autoSync })); }
      if (emailRes?.success) setEmailStatus(emailRes.data);
      if (mapsRes?.success) setMapsStatus(mapsRes.data);
    } catch {}
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSyncCalendar = async () => {
    setSyncing(true);
    try {
      await authFetch('/admin/google-calendar/sync', { method: 'POST' });
      await loadStatuses();
    } catch {} finally { setSyncing(false); }
  };

  const handleRenewIgToken = async () => {
    try {
      await authFetch('/admin/instagram/renew-token', { method: 'POST' });
      await loadStatuses();
    } catch {}
  };

  const handleTest = async (integracao) => {
    setTesting(integracao);
    setTestResult(null);
    try {
      const res = await authFetch(`/admin/integracoes/test/${integracao}`, { method: 'POST' });
      const data = await res.json();
      setTestResult({ integracao, ...data });
    } catch (error) {
      setTestResult({ integracao, success: false, message: 'Erro de conexão com o servidor' });
    } finally {
      setTesting('');
    }
  };

  const getStatusBadge = (connected, label) => {
    if (connected) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {label || 'Conectado'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Desconectado
      </span>
    );
  };

  const getWhatsAppStatusBadge = () => {
    const status = whatsappStatus?.status || (whatsappStatus?.connected ? 'connected' : 'disconnected');
    if (status === 'connected') return getStatusBadge(true);
    if (status === 'error') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          Erro
        </span>
      );
    }
    return getStatusBadge(false);
  };

  const TestResultBanner = () => {
    if (!testResult) return null;
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        {testResult.success ? <CheckCircle size={16} className="text-green-600" /> : <XCircle size={16} className="text-red-600" />}
        <span className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>{testResult.message}</span>
      </div>
    );
  };

  const TestButton = ({ integracao, label }) => (
    <button
      type="button"
      onClick={() => handleTest(integracao)}
      disabled={testing === integracao}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {testing === integracao ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
      {testing === integracao ? 'Testando...' : label || 'Testar Conexão'}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit overflow-x-auto">
        {['whatsapp', 'instagram', 'email', 'maps', 'calendar'].map(t => (
          <button key={t} type="button" onClick={() => { setSubTab(t); setTestResult(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${subTab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'whatsapp' ? 'WhatsApp' : t === 'instagram' ? 'Instagram' : t === 'email' ? 'Email (SES)' : t === 'maps' ? 'Google Maps' : 'Google Calendar'}
          </button>
        ))}
      </div>

      {/* Link para logs */}
      <div className="flex justify-end">
        <button type="button" onClick={() => navigate('/admin/integracoes/logs')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <FileText size={14} /> Ver logs de integrações
        </button>
      </div>

      {/* WhatsApp */}
      {subTab === 'whatsapp' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border">
            <div className="flex-1 flex items-center gap-3">
              {getWhatsAppStatusBadge()}
              <div>
                <p className="text-sm font-medium text-gray-900">{whatsappStatus?.phoneNumber || 'Nenhum número configurado'}</p>
                <p className="text-xs text-gray-500">Meta Cloud API</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 O token e configurações do WhatsApp são gerenciados automaticamente via AWS SSM Parameter Store. Use o botão abaixo para verificar se a conexão está funcionando.
            </p>
          </div>

          {/* Testar conexão */}
          <div className="pt-2 border-t flex items-center gap-3">
            <TestButton integracao="whatsapp" />
          </div>
          {testResult?.integracao === 'whatsapp' && <TestResultBanner />}
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
              <p className="text-sm font-medium text-gray-900">
                {instagramStatus?.connected ? `@${instagramStatus.username}` : 'Não conectado'}
              </p>
              <p className="text-xs text-gray-500">
                {instagramStatus?.connected
                  ? `${instagramStatus.accountType || 'BUSINESS'} • ${instagramStatus.media_count || 0} mídias`
                  : 'Configure o token no SSM Parameter Store'}
              </p>
            </div>
            {getStatusBadge(instagramStatus?.connected)}
          </div>

          {/* Token info */}
          {instagramStatus?.connected && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-gray-50 border">
                <p className="text-xs text-gray-500 mb-1">Validade do Token</p>
                <p className="text-sm font-medium text-gray-900">
                  {instagramStatus?.tokenExpiresAt
                    ? `Expira em ${Math.max(0, Math.ceil((new Date(instagramStatus.tokenExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)))} dias`
                    : 'Token de longa duração (60 dias)'}
                </p>
              </div>
              {instagramStatus?.lastPublishAt && (
                <div className="p-4 rounded-lg bg-gray-50 border">
                  <p className="text-xs text-gray-500 mb-1">Última Publicação</p>
                  <p className="text-sm font-medium text-gray-900">{new Date(instagramStatus.lastPublishAt).toLocaleString('pt-BR')}</p>
                </div>
              )}
            </div>
          )}

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 O token do Instagram é renovado automaticamente pelo sistema a cada publicação agendada. Validade: 60 dias.
            </p>
          </div>

          {/* Ações */}
          <div className="pt-2 border-t flex items-center gap-3 flex-wrap">
            <TestButton integracao="instagram" />
          </div>
          {testResult?.integracao === 'instagram' && <TestResultBanner />}
        </div>
      )}

      {/* Email (SES) */}
      {subTab === 'email' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border">
            {emailStatus?.connected ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <XCircle size={20} className="text-red-400" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {emailStatus?.connected ? `Remetente: ${emailStatus.fromEmail}` : 'Não configurado'}
              </p>
              <p className="text-xs text-gray-500">
                {emailStatus?.connected ? `Domínio ${emailStatus.domain} verificado` : 'Configure o SES para enviar emails'}
              </p>
            </div>
            {getStatusBadge(emailStatus?.connected)}
          </div>

          {emailStatus?.connected && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Remetente</label>
                <p className="text-sm text-gray-600 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">{emailStatus.fromEmail}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Região SES</label>
                <p className="text-sm text-gray-600 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">us-east-1</p>
              </div>
            </div>
          )}

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 O SES é usado para enviar emails de notificação, contratos, orçamentos e confirmações. A configuração é feita via AWS Console.
            </p>
          </div>

          <div className="pt-2 border-t flex items-center gap-3">
            <TestButton integracao="email" />
          </div>
          {testResult?.integracao === 'email' && <TestResultBanner />}
        </div>
      )}

      {/* Google Maps */}
      {subTab === 'maps' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border">
            {mapsStatus?.connected ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <XCircle size={20} className="text-red-400" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {mapsStatus?.connected ? 'API Key configurada' : 'Não configurado'}
              </p>
              <p className="text-xs text-gray-500">
                {mapsStatus?.connected ? 'Geocoding, Distance Matrix e Maps Embed disponíveis' : 'Configure a API Key do Google Maps'}
              </p>
            </div>
            {getStatusBadge(mapsStatus?.connected)}
          </div>

          {mapsStatus?.connected && mapsStatus.services && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Serviços Disponíveis</label>
              <div className="flex flex-wrap gap-2">
                {(mapsStatus.services || []).map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                    <CheckCircle size={10} /> {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 O Google Maps é usado para calcular distâncias nos orçamentos, mostrar mapas na agenda e gerar links de navegação.
            </p>
          </div>

          <div className="pt-2 border-t flex items-center gap-3">
            <TestButton integracao="maps" />
          </div>
          {testResult?.integracao === 'maps' && <TestResultBanner />}
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
              <p className="text-xs text-gray-500">{calendarStatus?.email || calendarStatus?.calendarName || 'Nenhum calendário vinculado'}</p>
            </div>
            {getStatusBadge(calendarStatus?.connected)}
          </div>

          {/* Última Sincronização */}
          {calendarStatus?.last_sync && (
            <div className="p-4 rounded-lg bg-gray-50 border">
              <p className="text-xs text-gray-500 mb-1">Última Sincronização</p>
              <p className="text-sm font-medium text-gray-900">{new Date(calendarStatus.last_sync).toLocaleString('pt-BR')}</p>
            </div>
          )}

          {/* Toggle Sincronização automática */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border">
            <div>
              <p className="text-sm font-medium text-gray-900">Sincronização Automática</p>
              <p className="text-xs text-gray-500">Eventos criados no MBF aparecem automaticamente no Google Calendar</p>
            </div>
            <button type="button" onClick={() => {
              const newVal = !form.calendarAutoSync;
              setForm({ ...form, calendarAutoSync: newVal });
              setCalendarDirty(true);
            }}
              className={`w-12 h-6 rounded-full transition-colors relative ${form.calendarAutoSync ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${form.calendarAutoSync ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 A sincronização é MBF → Google (mão única). Eventos criados no MBF aparecem no Google Calendar. Alterações no Google não voltam para o MBF.
            </p>
          </div>

          {/* Botão Salvar Configuração */}
          {calendarDirty && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={async () => {
                setSavingCalendar(true);
                try {
                  await authFetch('/admin/google-calendar/config', { method: 'PUT', body: JSON.stringify({ autoSync: form.calendarAutoSync }) });
                  setCalendarDirty(false);
                } catch {} finally { setSavingCalendar(false); }
              }}
                disabled={savingCalendar}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: ACCENT }}>
                <Save size={16} className={savingCalendar ? 'animate-pulse' : ''} />
                {savingCalendar ? 'Salvando...' : 'Salvar'}
              </button>
              <span className="text-xs text-amber-600">Alterações não salvas</span>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t">
            <button type="button" onClick={handleSyncCalendar} disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: ACCENT }}>
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
            </button>

            <TestButton integracao="google-calendar" />
          </div>
          {testResult?.integracao === 'google-calendar' && <TestResultBanner />}
        </div>
      )}
    </div>
  );
}
