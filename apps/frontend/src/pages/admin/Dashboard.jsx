import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, FileText, CreditCard, Image, Clock, MapPin } from 'lucide-react';

const ACCENT = '#EA580C';

export default function Dashboard() {
  const { user, authFetch } = useAuth();
  const [events, setEvents] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [summary, setSummary] = useState({ received: 0, pending: 0, overdue: 0 });
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [eventsRes, quotesRes, finRes, albunsRes] = await Promise.all([
        authFetch('/admin/agenda'),
        authFetch('/admin/orcamentos'),
        authFetch('/admin/financeiro/resumo'),
        authFetch('/admin/albuns'),
      ]);

      const eventsJson = await eventsRes.json();
      if (eventsJson.success) setEvents(eventsJson.data || []);

      const quotesJson = await quotesRes.json();
      if (quotesJson.success) setQuotes(quotesJson.data || []);

      const finJson = await finRes.json();
      if (finJson.success && finJson.data) setSummary(finJson.data);

      const albunsJson = await albunsRes.json();
      if (albunsJson.success) setAlbums(albunsJson.data || []);
    } catch {}
    setLoading(false);
  };

  // KPI calculations
  const now = new Date();
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const pendingQuotes = quotes.filter(q => q.status === 'sent');

  const monthRevenue = summary.received || 0;

  const activeAlbums = albums.filter(a => a.status !== 'delivered');

  // Display data
  const next5Events = upcomingEvents.slice(0, 5);
  const recent5Quotes = [...quotes].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);

  const formatBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const kpis = [
    { label: 'Próximas Sessões', value: upcomingEvents.length, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
    { label: 'Orçamentos Pendentes', value: pendingQuotes.length, icon: FileText, color: 'bg-amber-50 text-amber-600' },
    { label: 'Receita do Mês', value: formatBRL(monthRevenue), icon: CreditCard, color: 'bg-green-50 text-green-600' },
    { label: 'Álbuns Ativos', value: activeAlbums.length, icon: Image, color: 'bg-purple-50 text-purple-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: ACCENT }} />
      </div>
    );
  }

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {user?.name || user?.email || 'Usuário'} 👋
        </h1>
        <p className="text-gray-500 mt-1">Aqui está o resumo do seu negócio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} style={{ color: ACCENT }} />
            <h2 className="text-lg font-semibold text-gray-900">Próximas Sessões</h2>
          </div>
          {next5Events.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Nenhuma sessão agendada</p>
          ) : (
            <div className="space-y-3">
              {next5Events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-11 h-11 rounded-lg flex flex-col items-center justify-center" style={{ background: `${ACCENT}12` }}>
                    <span className="text-[10px] font-medium" style={{ color: ACCENT }}>
                      {new Date(ev.date).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className="text-sm font-bold" style={{ color: ACCENT }}>
                      {new Date(ev.date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      {ev.time && <span className="flex items-center gap-1"><Clock size={10} />{ev.time}</span>}
                      {ev.location && <span className="flex items-center gap-1"><MapPin size={10} />{ev.location}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quotes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} style={{ color: ACCENT }} />
            <h2 className="text-lg font-semibold text-gray-900">Orçamentos Recentes</h2>
          </div>
          {recent5Quotes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Nenhum orçamento registrado</p>
          ) : (
            <div className="space-y-3">
              {recent5Quotes.map((q) => {
                const statusColors = {
                  draft: 'bg-gray-100 text-gray-500',
                  sent: 'bg-blue-50 text-blue-600',
                  accepted: 'bg-green-50 text-green-600',
                  rejected: 'bg-red-50 text-red-600',
                };
                const statusLabels = {
                  draft: 'Rascunho',
                  sent: 'Enviado',
                  accepted: 'Aceito',
                  rejected: 'Recusado',
                };
                return (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{q.clientName || 'Cliente'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {q.title || 'Orçamento'} • {formatBRL(q.total)}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-3 ${statusColors[q.status] || statusColors.draft}`}>
                      {statusLabels[q.status] || 'Rascunho'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
