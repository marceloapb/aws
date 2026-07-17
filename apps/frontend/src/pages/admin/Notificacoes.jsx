import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Check, FileText, CreditCard, Image, Calendar, MessageCircle, CheckCircle } from 'lucide-react';

const ACCENT = '#EA580C';

const TIPO_CONFIG = {
  orcamento_solicitado: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
  contrato_assinado: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  pagamento_recebido: { icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  album_publicado: { icon: Image, color: 'text-purple-500', bg: 'bg-purple-50' },
  evento_proximo: { icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-50' },
  mensagem_recebida: { icon: MessageCircle, color: 'text-sky-500', bg: 'bg-sky-50' },
};

export default function Notificacoes() {
  const { authFetch } = useAuth();
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotificacoes(); }, []);

  const loadNotificacoes = async () => {
    try {
      const res = await authFetch('/admin/notificacoes');
      const json = await res.json();
      if (json.success) setNotificacoes(json.data || []);
    } catch {}
    setLoading(false);
  };

  const marcarLida = async (id) => {
    await authFetch(`/admin/notificacoes/${id}/lida`, { method: 'PUT' });
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  const marcarTodasLidas = async () => {
    const naoLidas = notificacoes.filter(n => !n.lida);
    for (const n of naoLidas) {
      await authFetch(`/admin/notificacoes/${n.id}/lida`, { method: 'PUT' });
    }
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <Bell size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
          {naoLidas > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{naoLidas} novas</span>
          )}
        </div>
        {naoLidas > 0 && (
          <button onClick={marcarTodasLidas} className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
            <Check size={14} /> Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notificacoes.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <Bell size={40} className="mx-auto mb-3 text-gray-300" />
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          notificacoes.map(n => {
            const config = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.orcamento_solicitado;
            const Icon = config.icon;
            return (
              <div key={n.id} onClick={() => !n.lida && marcarLida(n.id)}
                className={`bg-white rounded-xl border p-4 flex items-start gap-3 cursor-pointer transition-colors ${!n.lida ? 'border-l-4 border-l-orange-400 bg-orange-50/30' : 'hover:bg-gray-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}>
                  <Icon size={18} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.lida ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.titulo}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.mensagem}</p>
                  <p className="text-xs text-gray-400 mt-1">{n.created ? new Date(n.created).toLocaleString('pt-BR') : ''}</p>
                </div>
                {!n.lida && <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-2" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
