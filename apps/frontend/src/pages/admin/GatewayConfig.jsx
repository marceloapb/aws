import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, X, Eye, EyeOff, Copy, Check, Zap, Globe } from 'lucide-react';

const ACCENT = '#EA580C';

const PROVIDERS = [
  { slug: 'asaas', name: 'Asaas', logo: '💳' },
  { slug: 'mercadopago', name: 'Mercado Pago', logo: '💰' },
  { slug: 'stripe', name: 'Stripe', logo: '🟣' },
  { slug: 'pagarme', name: 'Pagar.me', logo: '🟢' },
  { slug: 'pagbank', name: 'PagBank', logo: '🟡' },
  { slug: 'picpay', name: 'PicPay', logo: '🟢' },
  { slug: 'sumup', name: 'SumUp', logo: '🔵' },
  { slug: 'banco-inter', name: 'Banco Inter', logo: '🟠' },
  { slug: 'stone', name: 'Stone', logo: '⚫' },
  { slug: 'infinitepay', name: 'InfinitePay', logo: '🟣' },
  { slug: 'manual', name: 'Controle Manual', logo: '✍️' },
];

const PROVIDER_FIELDS = {
  asaas: [{ key: 'api_key', label: 'API Key', type: 'password' }, { key: 'webhook_token', label: 'Webhook Token', type: 'text' }],
  mercadopago: [{ key: 'access_token', label: 'Access Token', type: 'password' }, { key: 'public_key', label: 'Public Key', type: 'text' }],
  stripe: [{ key: 'secret_key', label: 'Secret Key', type: 'password' }, { key: 'publishable_key', label: 'Publishable Key', type: 'text' }, { key: 'webhook_secret', label: 'Webhook Secret', type: 'password' }],
  pagarme: [{ key: 'api_key', label: 'API Key', type: 'password' }, { key: 'encryption_key', label: 'Encryption Key', type: 'password' }],
  pagbank: [{ key: 'client_id', label: 'Client ID', type: 'text' }, { key: 'client_secret', label: 'Client Secret', type: 'password' }],
  picpay: [{ key: 'x_picpay_token', label: 'PicPay Token', type: 'password' }, { key: 'x_seller_token', label: 'Seller Token', type: 'password' }],
  sumup: [{ key: 'client_id', label: 'Client ID', type: 'text' }, { key: 'client_secret', label: 'Client Secret', type: 'password' }],
  'banco-inter': [{ key: 'client_id', label: 'Client ID', type: 'text' }, { key: 'client_secret', label: 'Client Secret', type: 'password' }],
  stone: [{ key: 'stone_code', label: 'Stone Code', type: 'text' }, { key: 'client_id', label: 'Client ID', type: 'text' }],
  infinitepay: [{ key: 'client_id', label: 'Client ID', type: 'text' }, { key: 'client_secret', label: 'Client Secret', type: 'password' }],
  manual: [],
};

const CAPABILITIES = ['PIX', 'Boleto', 'Cartão Crédito', 'Cartão Débito', 'Link Pagamento', 'Recorrência', 'Split'];
const PROVIDER_CAPS = {
  asaas: [true, true, true, false, true, true, false],
  mercadopago: [true, true, true, true, true, false, true],
  stripe: [false, false, true, true, true, true, true],
  pagarme: [true, true, true, true, true, true, true],
  pagbank: [true, true, true, true, true, false, false],
  picpay: [true, false, true, false, true, false, false],
  sumup: [true, false, true, true, true, false, false],
  'banco-inter': [true, true, false, false, false, false, false],
  stone: [true, true, true, true, true, false, true],
  infinitepay: [true, false, true, true, true, false, false],
  manual: [true, true, true, true, true, true, true],
};

const WEBHOOK_BASE = 'https://setvwal0cd.execute-api.us-east-1.amazonaws.com/prod/webhooks';

export default function GatewayConfig() {
  const { authFetch } = useAuth();
  const [gateways, setGateways] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [modalForm, setModalForm] = useState({});
  const [visibleFields, setVisibleFields] = useState({});
  const [copied, setCopied] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const res = await authFetch('/admin/configuracoes');
      const json = await res.json();
      if (json.success && json.data?.gateways) setGateways(json.data.gateways);
    } catch {}
    setLoading(false);
  };

  const saveGateways = async (updated) => {
    setSaving(true);
    try {
      const res = await authFetch('/admin/configuracoes', { method: 'PUT', body: JSON.stringify({ gateways: updated }) });
      if (res.ok) { setGateways(updated); setMsg('Salvo com sucesso!'); }
      else setMsg('Erro ao salvar');
    } catch { setMsg('Erro ao salvar'); }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const toggleAtivo = (slug) => {
    const updated = { ...gateways, [slug]: { ...gateways[slug], ativo: !gateways[slug]?.ativo } };
    saveGateways(updated);
  };

  const setPadrao = (slug) => {
    const updated = {};
    Object.keys(gateways).forEach(k => { updated[k] = { ...gateways[k], is_padrao: false }; });
    updated[slug] = { ...(gateways[slug] || {}), is_padrao: true, ativo: true };
    saveGateways(updated);
  };

  const openModal = (provider) => {
    const cfg = gateways[provider.slug] || {};
    setModalForm({ ambiente: cfg.ambiente || 'sandbox', credenciais: cfg.credenciais || {} });
    setVisibleFields({});
    setModal(provider);
  };

  const saveModal = () => {
    const updated = { ...gateways, [modal.slug]: { ...gateways[modal.slug], ambiente: modalForm.ambiente, credenciais: modalForm.credenciais } };
    saveGateways(updated);
    setModal(null);
  };

  const hasCredentials = (slug) => {
    const creds = gateways[slug]?.credenciais;
    return creds && Object.values(creds).some(v => v);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <CreditCard size={24} style={{ color: '#EA580C' }} />
          <h1 className="text-2xl font-bold text-gray-900">Gateway de Pagamento</h1>
        </div>
        <div className="flex gap-2">
        </div>
      </div>

      {msg && <div className={`p-3 rounded-lg text-sm ${msg.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      {/* CFG-02: Grade de Provedores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROVIDERS.map(p => {
          const cfg = gateways[p.slug] || {};
          return (
            <div key={p.slug} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{p.logo}</span>
                  <span className="font-semibold text-gray-900">{p.name}</span>
                </div>
                <button onClick={() => toggleAtivo(p.slug)} className={`w-10 h-5 rounded-full relative transition-colors ${cfg.ativo ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${cfg.ativo ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cfg.is_padrao && <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: ACCENT }}>Padrão</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.ambiente === 'producao' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {cfg.ambiente === 'producao' ? 'Produção' : 'Sandbox'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hasCredentials(p.slug) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {hasCredentials(p.slug) ? 'Configurado' : 'Sem credenciais'}
                </span>
              </div>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => openModal(p)} className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium">Configurar</button>
                {!cfg.is_padrao && <button onClick={() => setPadrao(p.slug)} className="text-xs px-3 py-1.5 rounded-lg font-medium text-white hover:opacity-90" style={{ background: ACCENT }}>Definir como padrão</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* CFG-04: Matriz de Capacidades */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Zap size={16} style={{ color: ACCENT }} />
          <h2 className="font-semibold text-gray-900">Matriz de Capacidades</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-600">Provedor</th>
                {CAPABILITIES.map(c => <th key={c} className="px-3 py-2 font-medium text-gray-600 text-center whitespace-nowrap">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {PROVIDERS.map(p => (
                <tr key={p.slug} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{p.logo} {p.name}</td>
                  {(PROVIDER_CAPS[p.slug] || []).map((cap, i) => (
                    <td key={i} className="px-3 py-2 text-center">
                      {cap ? <Check size={16} className="inline text-green-500" /> : <X size={16} className="inline text-gray-300" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CFG-07: Webhook URL + Log */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={16} style={{ color: ACCENT }} />
          <h2 className="font-semibold text-gray-900">Webhook URLs</h2>
        </div>
        <div className="space-y-2">
          {PROVIDERS.filter(p => p.slug !== 'manual').map(p => (
            <div key={p.slug} className="flex items-center gap-2 text-sm">
              <span className="w-28 font-medium text-gray-700">{p.name}:</span>
              <code className="flex-1 bg-gray-50 px-2 py-1 rounded text-xs text-gray-600 truncate">{WEBHOOK_BASE}/{p.slug}</code>
              <button onClick={() => copyToClipboard(`${WEBHOOK_BASE}/${p.slug}`, p.slug)} className="p-1 rounded hover:bg-gray-100">
                {copied === p.slug ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Últimas Notificações</h3>
          <div className="space-y-2">
            {[
              { id: 1, provider: 'asaas', event: 'PAYMENT_RECEIVED', time: '2 min atrás' },
              { id: 2, provider: 'asaas', event: 'PAYMENT_CONFIRMED', time: '15 min atrás' },
              { id: 3, provider: 'mercadopago', event: 'payment.updated', time: '1h atrás' },
              { id: 4, provider: 'stripe', event: 'invoice.paid', time: '3h atrás' },
              { id: 5, provider: 'asaas', event: 'PAYMENT_OVERDUE', time: '5h atrás' },
            ].map(n => (
              <div key={n.id} className="flex items-center gap-3 text-xs bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-medium text-gray-700 w-24">{n.provider}</span>
                <span className="text-gray-600 flex-1">{n.event}</span>
                <span className="text-gray-400">{n.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CFG-03: Modal de Credenciais */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Configurar {modal.name}</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-gray-100"><X size={20} /></button>
            </div>

            {/* Ambiente Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Ambiente:</span>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setModalForm({ ...modalForm, ambiente: 'sandbox' })}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${modalForm.ambiente === 'sandbox' ? 'bg-yellow-100 text-yellow-700 shadow-sm' : 'text-gray-500'}`}>
                  Sandbox
                </button>
                <button onClick={() => setModalForm({ ...modalForm, ambiente: 'producao' })}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${modalForm.ambiente === 'producao' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-gray-500'}`}>
                  Produção
                </button>
              </div>
            </div>

            {/* Campos dinâmicos */}
            {(PROVIDER_FIELDS[modal.slug] || []).map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <div className="relative">
                  <input
                    type={field.type === 'password' && !visibleFields[field.key] ? 'password' : 'text'}
                    value={modalForm.credenciais?.[field.key] || ''}
                    onChange={e => setModalForm({ ...modalForm, credenciais: { ...modalForm.credenciais, [field.key]: e.target.value } })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 pr-10"
                    placeholder={field.label}
                  />
                  {field.type === 'password' && (
                    <button type="button" onClick={() => setVisibleFields({ ...visibleFields, [field.key]: !visibleFields[field.key] })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {visibleFields[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {PROVIDER_FIELDS[modal.slug]?.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">Este provedor não requer credenciais.</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button onClick={() => alert('Teste de conexão em breve!')} className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Testar Conexão
              </button>
              <button onClick={saveModal} disabled={saving} style={{ background: ACCENT }}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
