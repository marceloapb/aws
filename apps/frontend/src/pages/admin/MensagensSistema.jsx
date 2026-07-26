import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Save, AlertCircle, CheckCircle, Image, FileText, CreditCard, Calendar } from 'lucide-react';

const ACCENT = '#EA580C';

const CATEGORIAS = [
  {
    key: 'album',
    label: 'Álbum de Fotos',
    icon: Image,
    campos: [
      { key: 'mensagem_album_expirado', label: 'Mensagem quando álbum expira', tipo: 'textarea', placeholder: 'Seu álbum expirou. Entre em contato para renovar o acesso.' },
      { key: 'notificacao_dias_antecedencia', label: 'Notificar antes do vencimento (dias)', tipo: 'chips', opcoes: [1, 3, 5, 7, 14, 30] },
      { key: 'notificacao_canais', label: 'Canais de notificação do álbum', tipo: 'checkboxes', opcoes: [{ key: 'whatsapp', label: 'WhatsApp' }, { key: 'email', label: 'E-mail' }] },
    ],
  },
  {
    key: 'contrato',
    label: 'Contratos',
    icon: FileText,
    campos: [
      { key: 'mensagem_contrato_enviado', label: 'Mensagem ao enviar contrato para assinatura', tipo: 'textarea', placeholder: 'Olá {nome}, seu contrato está pronto para assinatura.' },
      { key: 'mensagem_contrato_assinado', label: 'Mensagem após contrato assinado', tipo: 'textarea', placeholder: 'Contrato assinado com sucesso! Obrigado pela confiança.' },
    ],
  },
  {
    key: 'pagamento',
    label: 'Pagamentos',
    icon: CreditCard,
    campos: [
      { key: 'mensagem_pagamento_confirmado', label: 'Mensagem de confirmação de pagamento', tipo: 'textarea', placeholder: 'Pagamento confirmado! Obrigado.' },
      { key: 'mensagem_pagamento_vencido', label: 'Mensagem de lembrete de pagamento vencido', tipo: 'textarea', placeholder: 'Olá {nome}, identificamos um pagamento pendente.' },
    ],
  },
  {
    key: 'evento',
    label: 'Eventos/Sessões',
    icon: Calendar,
    campos: [
      { key: 'mensagem_lembrete_evento', label: 'Mensagem de lembrete de sessão', tipo: 'textarea', placeholder: 'Olá {nome}, lembrete da sua sessão de {tipo_evento} em {data}.' },
      { key: 'mensagem_pos_evento', label: 'Mensagem pós-evento (follow-up)', tipo: 'textarea', placeholder: 'Olá {nome}, foi um prazer fotografar seu evento!' },
    ],
  },
];

export default function MensagensSistema() {
  const { authFetch } = useAuth();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      // Carregar config de álbum
      const albumRes = await authFetch('/admin/album/config').then(r => r.json());
      const albumConfig = albumRes.data || {};

      // Carregar mensagens do sistema
      const msgRes = await authFetch('/admin/config/mensagens').then(r => r.json()).catch(() => ({ data: {} }));
      const msgConfig = msgRes.data || {};

      setForm({
        mensagem_album_expirado: albumConfig.mensagem_album_expirado || '',
        notificacao_dias_antecedencia: albumConfig.notificacao_dias_antecedencia || [7, 3, 1],
        notificacao_canais: albumConfig.notificacao_canais || ['whatsapp', 'email'],
        mensagem_contrato_enviado: msgConfig.mensagem_contrato_enviado || '',
        mensagem_contrato_assinado: msgConfig.mensagem_contrato_assinado || '',
        mensagem_pagamento_confirmado: msgConfig.mensagem_pagamento_confirmado || '',
        mensagem_pagamento_vencido: msgConfig.mensagem_pagamento_vencido || '',
        mensagem_lembrete_evento: msgConfig.mensagem_lembrete_evento || '',
        mensagem_pos_evento: msgConfig.mensagem_pos_evento || '',
      });
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Salvar config de álbum (campos de notificação)
      await authFetch('/admin/album/config', {
        method: 'PUT',
        body: JSON.stringify({
          mensagem_album_expirado: form.mensagem_album_expirado,
          notificacao_dias_antecedencia: form.notificacao_dias_antecedencia,
          notificacao_canais: form.notificacao_canais,
        }),
      });

      // Salvar mensagens do sistema
      await authFetch('/admin/config/mensagens', {
        method: 'PUT',
        body: JSON.stringify({
          mensagem_contrato_enviado: form.mensagem_contrato_enviado,
          mensagem_contrato_assinado: form.mensagem_contrato_assinado,
          mensagem_pagamento_confirmado: form.mensagem_pagamento_confirmado,
          mensagem_pagamento_vencido: form.mensagem_pagamento_vencido,
          mensagem_lembrete_evento: form.mensagem_lembrete_evento,
          mensagem_pos_evento: form.mensagem_pos_evento,
        }),
      });

      setMsg('Salvo com sucesso!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Erro ao salvar: ' + err.message);
    } finally { setSaving(false); }
  };

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleChip = (key, value) => {
    const current = form[key] || [];
    if (current.includes(value)) {
      updateField(key, current.filter(v => v !== value));
    } else {
      updateField(key, [...current, value]);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-gray-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Mensagens enviadas automaticamente ao cliente em cada situação. Use variáveis: {'{nome}'}, {'{tipo_evento}'}, {'{data}'}, {'{valor}'}.</p>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50" style={{ background: ACCENT }}>
          <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${msg.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {msg.includes('Erro') ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {msg}
        </div>
      )}

      {CATEGORIAS.map(cat => (
        <div key={cat.key} className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <cat.icon size={18} style={{ color: ACCENT }} />
            <h3 className="font-semibold text-gray-900">{cat.label}</h3>
          </div>
          <div className="space-y-4">
            {cat.campos.map(campo => (
              <div key={campo.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{campo.label}</label>
                {campo.tipo === 'textarea' && (
                  <textarea
                    value={form[campo.key] || ''}
                    onChange={e => updateField(campo.key, e.target.value)}
                    rows={2}
                    placeholder={campo.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none"
                  />
                )}
                {campo.tipo === 'chips' && (
                  <div className="flex flex-wrap gap-2">
                    {campo.opcoes.map(op => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => toggleChip(campo.key, op)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          (form[campo.key] || []).includes(op) ? 'text-white border-transparent' : 'text-gray-600 border-gray-300 hover:border-gray-400'
                        }`}
                        style={(form[campo.key] || []).includes(op) ? { background: ACCENT } : {}}
                      >
                        {op} {op === 1 ? 'dia' : 'dias'}
                      </button>
                    ))}
                  </div>
                )}
                {campo.tipo === 'checkboxes' && (
                  <div className="flex gap-4">
                    {campo.opcoes.map(op => (
                      <label key={op.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form[campo.key] || []).includes(op.key)}
                          onChange={() => toggleChip(campo.key, op.key)}
                          className="w-4 h-4 rounded border-gray-300 accent-orange-600"
                        />
                        <span className="text-sm text-gray-700">{op.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
