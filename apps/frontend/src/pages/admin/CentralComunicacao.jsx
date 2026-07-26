import React, { useState } from 'react';
import { MessageCircle, Mail, Bell, MessageSquare } from 'lucide-react';
import WhatsApp from './WhatsApp';
import ConfigEmails from '../../components/ConfigEmails';
import NotificacoesConfig from './NotificacoesConfig';
import MensagensSistema from './MensagensSistema';

const ACCENT = '#EA580C';

const TABS = [
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'emails', label: 'E-mail Templates', icon: Mail },
  { key: 'mensagens', label: 'Mensagens do Sistema', icon: MessageSquare },
  { key: 'regras', label: 'Regras de Notificação', icon: Bell },
];

export default function CentralComunicacao() {
  const [tab, setTab] = useState('whatsapp');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Central de Comunicação</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie todas as mensagens, templates e notificações enviadas aos clientes.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            style={tab === t.key ? { color: ACCENT, borderColor: ACCENT } : {}}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === 'whatsapp' && <WhatsApp />}
        {tab === 'emails' && <ConfigEmails />}
        {tab === 'mensagens' && <MensagensSistema />}
        {tab === 'regras' && <NotificacoesConfig />}
      </div>
    </div>
  );
}
