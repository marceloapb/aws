import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RefreshCw, Zap, Eye, EyeOff, Copy, ArrowRight, AlertTriangle, Calendar, Instagram } from 'lucide-react';

const ACCENT = '#EA580C';
const WEBHOOK_URL = 'https://2fbg55ru9j.execute-api.us-east-1.amazonaws.com/prod/whatsapp/webhook';

export default function ConfigIntegracoes({ form, setForm }) {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [instagramStatus, setInstagramStatus] = useState(null);
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [subTab, setSubTab] = useState('whatsapp');
  const [showToken, setShowToken] = useState(false);
  const [showCalendarToken, setShowCalendarToken] = useState(false);
  const [showIgToken, setShowIgToken] = useState(false);
  const [copied, setCopied] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(false);

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
    setSyncing(true);
    try {
      await authFetch('/admin/google-calendar/sync', { method: 'POST' });
      await loadStatuses();
    } catch {} finally { setSyncing(false); }
  };

  const handleRevokeCalendar = async () => {
    try {
      await authFetch('/admin/google-calendar/revoke', { method: 'POST' });
      setCalendarStatus(null);
      setForm({ ...form, calendarId: '', calendarRefreshToken: '', calendarAutoSync: false });
      setRevokeConfirm(false);
    } catch {}
  };

  const handleRenewIgToken = async () => {
    try {
      await authFetch('/admin/instagram/renew-token', { method: 'POST' });
      await loadStatuses();
    } catch {}
  };

  const handleTestIgPost = async () => {
    alert('Publicação de teste enviada (placeholder)');
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  const getStatusBadge = () => {
    const status = whatsappStatus?.status || (whatsappStatus?.connected ? 'connected' : 'disconnected');
    if (status === 'connected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Conectado
        </span>
      );
    }
    if (status === 'error') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          Erro
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
            <div className="flex-1 flex items-center gap-3">
              {getStatusBadge()}
              <div>
                <p className="text-sm font-medium text-gray-900">{whatsappStatus?.phoneNumber || 'Nenhum número configurado'}</p>
              </div>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token Permanente</label>
            <div className="relative">
              <input
                name="waToken"
                type={showToken ? 'text' : 'password'}
                value={form.waToken || ''}
                onChange={handleChange}
                placeholder="Cole seu token permanente aqui"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none"
              />
              <button type="button" onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verify Token</label>
            <div className="flex gap-2">
              <input
                value={form.waVerifyToken || whatsappStatus?.verifyToken || ''}
                readOnly
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono text-sm"
              />
              <button type="button"
                onClick={() => copyToClipboard(form.waVerifyToken || whatsappStatus?.verifyToken || '', 'verifyToken')}
                className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <Copy size={14} />
                {copied === 'verifyToken' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
            <div className="flex gap-2">
              <input
                value={WEBHOOK_URL}
                readOnly
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono text-xs"
              />
              <button type="button"
                onClick={() => copyToClipboard(WEBHOOK_URL, 'webhook')}
                className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <Copy size={14} />
                {copied === 'webhook' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modo</label>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => setForm({ ...form, waMode: 'production' })}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  (form.waMode || 'production') === 'production'
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>
                Produção
              </button>
              <button type="button"
                onClick={() => setForm({ ...form, waMode: 'development' })}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.waMode === 'development'
                    ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>
                Desenvolvimento
              </button>
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

      {/* Instagram - Expanded (CFG-08) */}
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

          {/* App ID (readonly) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
            <input value={instagramStatus?.appId || form.igAppId || ''} readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
          </div>

          {/* Business Account ID (readonly) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Account ID</label>
            <input value={instagramStatus?.businessAccountId || form.igBusinessId || ''} readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
          </div>

          {/* Access Token (password + eye toggle + Renovar) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showIgToken ? 'text' : 'password'}
                  value={instagramStatus?.accessToken || form.igAccessToken || ''}
                  readOnly
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono text-xs"
                />
                <button type="button" onClick={() => setShowIgToken(!showIgToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showIgToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="button" onClick={handleRenewIgToken}
                className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 whitespace-nowrap">
                <RefreshCw size={14} /> Renovar
              </button>
            </div>
          </div>

          {/* Permissões Ativas (chips verdes) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissões Ativas</label>
            <div className="flex flex-wrap gap-2">
              {(instagramStatus?.permissions || ['pages_show_list', 'instagram_basic', 'instagram_content_publish', 'instagram_manage_comments', 'instagram_manage_insights']).map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                  <CheckCircle size={10} /> {p}
                </span>
              ))}
            </div>
          </div>

          {/* App Review Status */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status do App Review</label>
              <div className="mt-1">
                {(instagramStatus?.appReviewStatus || 'approved') === 'approved' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle size={12} /> Aprovado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                    <AlertTriangle size={12} /> Pendente
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Última Publicação com Sucesso</label>
              <input
                value={instagramStatus?.lastPublishAt ? new Date(instagramStatus.lastPublishAt).toLocaleString('pt-BR') : 'Nenhuma publicação'}
                readOnly
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>

          {/* Botão Testar Publicação */}
          <div>
            <button type="button" onClick={handleTestIgPost}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ background: ACCENT }}>
              <Instagram size={16} /> Testar Publicação
            </button>
          </div>
        </div>
      )}

      {/* Gateway de Pagamento - Link para página dedicada */}
      {subTab === 'pagamento' && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl border border-gray-200 bg-gray-50 text-center">
            <p className="text-sm text-gray-600 mb-4">
              As configurações de gateway de pagamento foram movidas para uma página dedicada com mais recursos.
            </p>
            <button
              type="button"
              onClick={() => navigate('/admin/gateway')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ background: ACCENT }}
            >
              Ir para Gateway de Pagamento
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Google Calendar - Expanded (CFG-06) */}
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
          </div>

          {/* Calendar ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calendar ID</label>
            <input
              name="calendarId"
              type="text"
              value={form.calendarId || calendarStatus?.calendarId || ''}
              onChange={handleChange}
              placeholder="exemplo@group.calendar.google.com"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none"
            />
          </div>

          {/* Refresh Token (password + eye toggle) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Token</label>
            <div className="relative">
              <input
                name="calendarRefreshToken"
                type={showCalendarToken ? 'text' : 'password'}
                value={form.calendarRefreshToken || calendarStatus?.refreshToken || ''}
                onChange={handleChange}
                placeholder="Cole o refresh token aqui"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none"
              />
              <button type="button" onClick={() => setShowCalendarToken(!showCalendarToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCalendarToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Status e Eventos sincronizados */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Última Sincronização</label>
              <input value={calendarStatus?.lastSync ? new Date(calendarStatus.lastSync).toLocaleString('pt-BR') : 'Nunca'} readOnly
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eventos Sincronizados</label>
              <input value={calendarStatus?.eventCount ?? 0} readOnly
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
            </div>
          </div>

          {/* Toggle Sincronização automática */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border">
            <div>
              <p className="text-sm font-medium text-gray-900">Sincronização Automática</p>
              <p className="text-xs text-gray-500">Ativa/desativa o job de sincronização periódica</p>
            </div>
            <button type="button" onClick={() => setForm({ ...form, calendarAutoSync: !form.calendarAutoSync })}
              className={`w-12 h-6 rounded-full transition-colors relative ${form.calendarAutoSync ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${form.calendarAutoSync ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={handleSyncCalendar} disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: ACCENT }}>
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
            </button>

            {!revokeConfirm ? (
              <button type="button" onClick={() => setRevokeConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 transition-colors">
                <XCircle size={16} /> Revogar Acesso
              </button>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle size={16} className="text-red-500" />
                <span className="text-sm text-red-700">Confirmar revogação?</span>
                <button type="button" onClick={handleRevokeCalendar}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700">
                  Sim, revogar
                </button>
                <button type="button" onClick={() => setRevokeConfirm(false)}
                  className="px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 A sincronização é MBF → Google (mão única). Eventos criados no MBF aparecem no Google Calendar, mas alterações no Google não voltam para o MBF.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
