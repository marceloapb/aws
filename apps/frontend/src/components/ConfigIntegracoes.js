import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const ACCENT = '#EA580C';
const GATEWAYS = ['asaas', 'mercadopago', 'stripe', 'pagarme', 'pagbank', 'picpay'];

export default function ConfigIntegracoes({ form, setForm }) {
  const { authFetch } = useAuth();
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [instagramStatus, setInstagramStatus] = useState(null);
  const [subTab, setSubTab] = useState('whatsapp');

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      const [waRes, igRes] = await Promise.all([
        authFetch('/admin/whatsapp/config').then(r => r.json()).catch(() => null),
        authFetch('/admin/instagram').then(r => r.json()).catch(() => null),
      ]);
      if (waRes?.success) setWhatsappStatus(waRes.data);
      if (igRes?.success) setInstagramStatus(igRes.data);
    } catch {}
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['whatsapp', 'instagram', 'pagamento'].map(t => (
          <button key={t} type="button" onClick={() => setSubTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${subTab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'whatsapp' ? 'WhatsApp' : t === 'instagram' ? 'Instagram' : 'Pagamento'}
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
              <p className="text-sm font-medium text-gray-900">
                {whatsappStatus?.connected ? 'Conectado' : 'Não conectado'}
              </p>
              <p className="text-xs text-gray-500">{whatsappStatus?.phoneNumber || 'Nenhum número configurado'}</p>
            </div>
            <button type="button" onClick={loadStatuses} className="p-2 rounded-lg hover:bg-gray-200">
              <RefreshCw size={16} className="text-gray-500" />
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WABA ID</label>
              <input name="wabaId" value={form.wabaId || ''} readOnly
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
              <input name="waPhoneNumberId" value={form.waPhoneNumberId || ''} readOnly
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
            </div>
          </div>
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
              <p className="text-xs text-gray-500">{instagramStatus?.accountType || 'Vincule sua conta business'}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Account ID</label>
            <input name="igBusinessId" value={form.igBusinessId || ''} readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
          </div>
        </div>
      )}

      {/* Gateway de Pagamento */}
      {subTab === 'pagamento' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provedor Ativo</label>
            <select name="activeGateway" value={form.activeGateway || ''} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none">
              <option value="">Nenhum (controle manual)</option>
              {GATEWAYS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
          </div>
          {form.activeGateway && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input name="gatewayApiKey" type="password" value={form.gatewayApiKey || ''} onChange={handleChange}
                  placeholder="••••••••••"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Token</label>
                <input name="gatewayWebhookToken" type="password" value={form.gatewayWebhookToken || ''} onChange={handleChange}
                  placeholder="••••••••••"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
