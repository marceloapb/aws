import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Bell, Mail, MessageCircle, Save, Info } from 'lucide-react';
import Button from '../../components/ui/Button';

const ACCENT = '#EA580C';

// Tipos de alerta que o cliente pode configurar
const ALERTAS_CLIENTE = [
  {
    key: 'orcamento.enviado',
    label: 'Orcamento enviado',
    descricao: 'Quando um novo orcamento e enviado para voce',
  },
  {
    key: 'orcamento.aceito',
    label: 'Orcamento aceito',
    descricao: 'Confirmacao de que seu orcamento foi aceito',
  },
  {
    key: 'contrato.enviado',
    label: 'Contrato disponivel',
    descricao: 'Quando um contrato esta pronto para assinatura',
  },
  {
    key: 'contrato.assinado',
    label: 'Contrato assinado',
    descricao: 'Confirmacao de assinatura do contrato',
  },
  {
    key: 'pagamento.confirmado',
    label: 'Pagamento confirmado',
    descricao: 'Quando um pagamento e confirmado',
  },
  {
    key: 'pagamento.vencido',
    label: 'Pagamento vencido',
    descricao: 'Lembrete de pagamento em atraso',
  },
  {
    key: 'evento.confirmado',
    label: 'Evento confirmado',
    descricao: 'Confirmacao de agendamento do evento',
  },
  {
    key: 'evento.proximo',
    label: 'Lembrete de evento',
    descricao: 'Lembrete antes do seu evento acontecer',
  },
  {
    key: 'album.publicado',
    label: 'Album publicado',
    descricao: 'Quando suas fotos estao prontas para visualizacao',
  },
  {
    key: 'mensagem.recebida',
    label: 'Nova mensagem',
    descricao: 'Quando voce recebe uma nova mensagem',
  },
];

const CANAIS = [
  { key: 'inapp', label: 'Sininho', icon: Bell, color: 'blue' },
  { key: 'email', label: 'E-mail', icon: Mail, color: 'purple' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'green' },
];

const CANAL_STYLES = {
  inapp: {
    active: 'border-blue-300 bg-blue-50 text-blue-700',
    inactive: 'border-gray-200 hover:bg-gray-50 text-gray-500',
  },
  email: {
    active: 'border-purple-300 bg-purple-50 text-purple-700',
    inactive: 'border-gray-200 hover:bg-gray-50 text-gray-500',
  },
  whatsapp: {
    active: 'border-green-300 bg-green-50 text-green-700',
    inactive: 'border-gray-200 hover:bg-gray-50 text-gray-500',
  },
};

export default function MinhasNotificacoes() {
  const { authFetch } = useAuth();
  const toast = useToast();
  const [preferencias, setPreferencias] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Carregar preferencias salvas
  const loadPreferencias = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/client/notificacoes/preferencias');
      const data = await res.json();
      if (data.success && data.data) {
        setPreferencias(data.data.preferencias || getDefaultPreferencias());
      } else {
        setPreferencias(getDefaultPreferencias());
      }
    } catch {
      // Se falhar, usar defaults (tudo ativo em inapp)
      setPreferencias(getDefaultPreferencias());
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { loadPreferencias(); }, [loadPreferencias]);

  // Preferencias padrao: in-app ativo para todos, email e whatsapp desativados
  function getDefaultPreferencias() {
    const prefs = {};
    ALERTAS_CLIENTE.forEach(alerta => {
      prefs[alerta.key] = { inapp: true, email: false, whatsapp: false };
    });
    return prefs;
  }

  // Toggle de canal para um alerta
  const toggleCanal = (alertaKey, canalKey) => {
    setPreferencias(prev => {
      const current = prev[alertaKey] || { inapp: true, email: false, whatsapp: false };
      return {
        ...prev,
        [alertaKey]: {
          ...current,
          [canalKey]: !current[canalKey],
        },
      };
    });
    setHasChanges(true);
  };

  // Ativar/desativar todos os canais de um tipo
  const toggleTodosCanal = (canalKey) => {
    const todosAtivos = ALERTAS_CLIENTE.every(a => preferencias[a.key]?.[canalKey]);
    setPreferencias(prev => {
      const updated = { ...prev };
      ALERTAS_CLIENTE.forEach(alerta => {
        updated[alerta.key] = {
          ...(updated[alerta.key] || { inapp: true, email: false, whatsapp: false }),
          [canalKey]: !todosAtivos,
        };
      });
      return updated;
    });
    setHasChanges(true);
  };

  // Salvar preferencias
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/client/notificacoes/preferencias', {
        method: 'PUT',
        body: JSON.stringify({ preferencias }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Preferencias salvas com sucesso!');
        setHasChanges(false);
      } else {
        toast.error(data.message || 'Erro ao salvar preferencias');
      }
    } catch {
      toast.error('Erro ao salvar preferencias');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-100 rounded-lg animate-pulse w-64" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <Bell size={24} style={{ color: ACCENT }} />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Minhas Notificacoes</h1>
            <p className="text-sm text-gray-500">Escolha como deseja receber seus alertas</p>
          </div>
        </div>
        {hasChanges && (
          <Button icon={Save} onClick={handleSave} loading={saving}>
            Salvar Preferencias
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Escolha os canais de notificacao para cada tipo de alerta. O <strong>Sininho</strong> mostra alertas dentro do sistema,
          o <strong>E-mail</strong> envia para seu email cadastrado, e o <strong>WhatsApp</strong> envia mensagens no seu numero.
        </p>
      </div>

      {/* Canal Header - Toggle all */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Ativar/desativar todos:</span>
          <div className="flex items-center gap-2">
            {CANAIS.map(({ key, label, icon: Icon }) => {
              const todosAtivos = ALERTAS_CLIENTE.every(a => preferencias[a.key]?.[key]);
              return (
                <button
                  key={key}
                  onClick={() => toggleTodosCanal(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    todosAtivos ? CANAL_STYLES[key].active : CANAL_STYLES[key].inactive
                  }`}
                  title={`${todosAtivos ? 'Desativar' : 'Ativar'} ${label} para todos`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alertas list */}
      <div className="space-y-2">
        {ALERTAS_CLIENTE.map((alerta) => {
          const prefs = preferencias[alerta.key] || { inapp: true, email: false, whatsapp: false };

          return (
            <div
              key={alerta.key}
              className="bg-white rounded-xl border p-4 flex items-center gap-4 flex-col sm:flex-row"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{alerta.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{alerta.descricao}</p>
              </div>

              {/* Canal toggles */}
              <div className="flex items-center gap-2 shrink-0">
                {CANAIS.map(({ key, label, icon: Icon }) => {
                  const ativo = prefs[key];
                  return (
                    <button
                      key={key}
                      onClick={() => toggleCanal(alerta.key, key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${
                        ativo ? CANAL_STYLES[key].active : CANAL_STYLES[key].inactive
                      }`}
                      title={`${ativo ? 'Desativar' : 'Ativar'} ${label}`}
                    >
                      <Icon size={14} />
                      <span className="text-xs font-medium hidden sm:inline">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save button (bottom) */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button icon={Save} onClick={handleSave} loading={saving} className="shadow-lg">
            Salvar Preferencias
          </Button>
        </div>
      )}
    </div>
  );
}
