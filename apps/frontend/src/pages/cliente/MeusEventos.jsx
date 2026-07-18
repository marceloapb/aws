import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Heart, PartyPopper, GraduationCap, Baby, Users,
  Calendar, MapPin, FileSignature, CreditCard, Image, ChevronRight
} from 'lucide-react';

const ACCENT = '#EA580C';

const EVENT_ICONS = {
  casamento: Heart,
  aniversario: PartyPopper,
  formatura: GraduationCap,
  newborn: Baby,
  corporativo: Users,
};

function getEventIcon(tipo) {
  const key = (tipo || '').toLowerCase();
  for (const [k, Icon] of Object.entries(EVENT_ICONS)) {
    if (key.includes(k)) return Icon;
  }
  return Camera;
}

function StatusBadge({ label, variant }) {
  const styles = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-700',
    gray: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[variant] || styles.gray}`}>
      {label}
    </span>
  );
}

export default function MeusEventos() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/client/portal/eventos')
      .then(r => r.json())
      .then(d => setEventos(Array.isArray(d) ? d : d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Calendar size={24} style={{ color: ACCENT }} />
        <h1 className="text-2xl font-bold text-gray-900">Meus Eventos</h1>
      </div>

      {eventos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Nenhum evento encontrado. Seus eventos aparecerão aqui após a confirmação de um orçamento.
        </div>
      ) : (
        <div className="space-y-4">
          {eventos.map(ev => {
            const Icon = getEventIcon(ev.tipo_evento);
            const pagPct = ev.pagamento_percentual != null ? Math.round(ev.pagamento_percentual) : null;
            return (
              <button key={ev.id} onClick={() => navigate(`/cliente/eventos/${ev.id}`)}
                className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${ACCENT}15` }}>
                    <Icon size={20} style={{ color: ACCENT }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900 truncate">{ev.tipo_evento}</p>
                      <ChevronRight size={16} className="text-gray-300 shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(ev.data_evento).toLocaleDateString('pt-BR')}</span>
                      {ev.local && <span className="flex items-center gap-1"><MapPin size={12} /> {ev.local}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <FileSignature size={12} />
                        <StatusBadge
                          label={ev.contrato_status === 'assinado' ? 'Assinado' : 'Pendente'}
                          variant={ev.contrato_status === 'assinado' ? 'green' : 'yellow'}
                        />
                      </div>
                      {pagPct !== null && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <CreditCard size={12} />
                          <StatusBadge
                            label={`${pagPct}% pago`}
                            variant={pagPct >= 100 ? 'green' : pagPct > 0 ? 'blue' : 'yellow'}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Image size={12} />
                        <StatusBadge
                          label={ev.album_status === 'pronto' ? 'Pronto' : 'Pendente'}
                          variant={ev.album_status === 'pronto' ? 'green' : 'gray'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
