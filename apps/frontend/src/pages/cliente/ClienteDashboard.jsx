import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, FileText, FolderOpen, Image, CreditCard,
  MapPin, AlertCircle, ChevronRight
} from 'lucide-react';

const ACCENT = '#EA580C';
const STEPS = ['Orçamento', 'Contrato', 'Evento', 'Edição', 'Entrega', 'Feedback'];

function TimelineStepper({ etapa_atual }) {
  const currentIndex = STEPS.indexOf(etapa_atual);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Progresso do evento</h3>
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step} className="flex-1 flex flex-col items-center">
              <div className={`w-full h-1.5 rounded-full ${
                isDone ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-200'
              }`} />
              <span className={`text-[10px] mt-1.5 text-center leading-tight ${
                isDone ? 'text-green-600 font-medium' : isCurrent ? 'text-blue-600 font-medium' : 'text-gray-400'
              }`}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ClienteDashboard() {
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/client/portal/dashboard')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  }

  const proximo = data?.proximo_evento;
  const acoes = data?.acoes_pendentes || [];
  const etapa = data?.etapa_atual || 'Orçamento';
  const countdown = proximo?.data_evento
    ? Math.max(0, Math.ceil((new Date(proximo.data_evento) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const quickLinks = [
    { label: 'Orçamentos', icon: FileText, path: '/cliente/orcamentos' },
    { label: 'Contratos', icon: FolderOpen, path: '/cliente/contratos' },
    { label: 'Álbuns', icon: Image, path: '/cliente/albuns' },
    { label: 'Pagamentos', icon: CreditCard, path: '/cliente/pagamentos' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {user?.name || 'Cliente'}!</h1>
        <p className="text-sm text-gray-500 capitalize">{today}</p>
      </div>

      {proximo && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
                <Calendar size={20} style={{ color: ACCENT }} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{proximo.tipo_evento}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <Calendar size={12} /> {new Date(proximo.data_evento).toLocaleDateString('pt-BR')}
                </p>
                {proximo.local && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin size={12} /> {proximo.local}
                  </p>
                )}
              </div>
            </div>
            {countdown !== null && (
              <div className="text-right">
                <span className="text-2xl font-bold" style={{ color: ACCENT }}>{countdown}</span>
                <p className="text-xs text-gray-400">dias</p>
              </div>
            )}
          </div>
        </div>
      )}

      <TimelineStepper etapa_atual={etapa} />

      {acoes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Ações pendentes</h3>
          {acoes.map((acao, i) => (
            <div key={i} className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} style={{ color: ACCENT }} />
                <span className="text-sm font-medium text-gray-800">{acao.descricao}</span>
              </div>
              {acao.rota && (
                <button onClick={() => navigate(acao.rota)} style={{ background: ACCENT }}
                  className="px-3 py-1.5 text-white rounded-lg text-xs font-medium hover:opacity-90">
                  {acao.label || 'Ver'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Acesso rápido</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map(link => (
            <button key={link.path} onClick={() => navigate(link.path)}
              className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md transition-shadow flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
                <link.icon size={18} style={{ color: ACCENT }} />
              </div>
              <span className="text-sm font-medium text-gray-700">{link.label}</span>
              <ChevronRight size={14} className="text-gray-300 ml-auto" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
