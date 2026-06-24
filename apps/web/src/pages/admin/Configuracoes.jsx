import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import PageHeader from '../../components/PageHeader.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const TABS = [
  { id: 'geral', label: '⚙️ Geral' },
  { id: 'pagamentos', label: '💳 Pagamentos' },
  { id: 'whatsapp', label: '💬 WhatsApp' },
  { id: 'instagram', label: '📱 Instagram' },
  { id: 'email', label: '📧 Email' },
];

const GATEWAYS = ['asaas','stripe','mercadopago','pagarme','pagbank','picpay','sumup','banco-inter','stone','infinitepay'];

export default function Configuracoes() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');

  useEffect(() => {
    api.get('/admin/configuracoes')
      .then(({ data }) => setConfig(data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function salvar() {
    setSalvando(true);
    try {
      await api.put('/admin/configuracoes', config);
      alert('Configurações salvas!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const set = (key, val) => setConfig((prev) => ({ ...prev, [key]: val }));

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader
        title="Configurações"
        actions={
          <button onClick={salvar} disabled={salvando} className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium disabled:opacity-50">
            {salvando ? 'Salvando...' : '💾 Salvar'}
          </button>
        }
      />

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'geral' && (
          <div className="space-y-4">
            <Field label="Nome do Estúdio"><input type="text" value={config.nome_estudio || ''} onChange={(e) => set('nome_estudio', e.target.value)} className="input" /></Field>
            <Field label="Email de Contato"><input type="email" value={config.email_contato || ''} onChange={(e) => set('email_contato', e.target.value)} className="input" /></Field>
            <Field label="Telefone"><input type="text" value={config.telefone || ''} onChange={(e) => set('telefone', e.target.value)} className="input" /></Field>
            <Field label="Dias de expiração padrão (álbuns)"><input type="number" value={config.dias_expiracao_album || 30} onChange={(e) => set('dias_expiracao_album', parseInt(e.target.value))} className="input max-w-xs" /></Field>
          </div>
        )}

        {activeTab === 'pagamentos' && (
          <div className="space-y-4">
            <Field label="Gateway Padrão">
              <select value={config.gateway_padrao || 'asaas'} onChange={(e) => set('gateway_padrao', e.target.value)} className="input max-w-xs">
                {GATEWAYS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Dias para vencimento padrão"><input type="number" value={config.dias_vencimento || 7} onChange={(e) => set('dias_vencimento', parseInt(e.target.value))} className="input max-w-xs" /></Field>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            <Field label="Minutos antes do evento (lembrete)"><input type="number" value={config.whatsapp_minutos_antes || 60} onChange={(e) => set('whatsapp_minutos_antes', parseInt(e.target.value))} className="input max-w-xs" /></Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={config.whatsapp_ativo || false} onChange={(e) => set('whatsapp_ativo', e.target.checked)} className="w-4 h-4 rounded" />
              Lembretes automáticos ativos
            </label>
          </div>
        )}

        {activeTab === 'instagram' && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={config.instagram_ativo || false} onChange={(e) => set('instagram_ativo', e.target.checked)} className="w-4 h-4 rounded" />
              Publicação automática ativa
            </label>
            <Field label="Máximo de fotos por carrossel"><input type="number" value={config.instagram_max_fotos || 10} onChange={(e) => set('instagram_max_fotos', parseInt(e.target.value))} className="input max-w-xs" /></Field>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={config.email_ativo || false} onChange={(e) => set('email_ativo', e.target.checked)} className="w-4 h-4 rounded" />
              Notificações por email ativas
            </label>
            <Field label="Email remetente"><input type="email" value={config.email_remetente || ''} onChange={(e) => set('email_remetente', e.target.value)} className="input" /></Field>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
