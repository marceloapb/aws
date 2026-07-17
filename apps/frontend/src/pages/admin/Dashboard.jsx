import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar, FileText, CreditCard, Image, Clock, MapPin, Users,
  PlusCircle, Lock, Send, RefreshCw, MessageCircle, Upload,
  TrendingUp, AlertCircle, CheckCircle2, Bell, LayoutDashboard
} from 'lucide-react';

const ACCENT = '#EA580C';

function timeAgo(date) {
  if (!date) return '';
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Dashboard() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [charges, setCharges] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [evRes, qRes, fRes, cRes, chRes, aRes] = await Promise.all([
        authFetch('/admin/agenda'), authFetch('/admin/orcamentos'),
        authFetch('/admin/financeiro/resumo'), authFetch('/admin/contratos'),
        authFetch('/admin/cobrancas'), authFetch('/admin/albuns'),
      ]);
      const [evJ, qJ, fJ, cJ, chJ, aJ] = await Promise.all(
        [evRes, qRes, fRes, cRes, chRes, aRes].map(r => r.json())
      );
      if (evJ.success) setEvents(evJ.data || []);
      if (qJ.success) setQuotes(qJ.data || []);
      if (fJ.success) setSummary(fJ.data || {});
      if (cJ.success) setContracts(cJ.data || []);
      if (chJ.success) setCharges(chJ.data || []);
      if (aJ.success) setAlbums(aJ.data || []);
    } catch {}
    setLoading(false);
  };

  const now = new Date();
  const todayStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const sessionsToday = events.filter(e => new Date(e.date).toDateString() === now.toDateString()).length;
  const sessionsWeek = events.filter(e => { const d = new Date(e.date); return d >= now && d <= new Date(now.getTime() + 7 * 86400000); }).length;
  const pendingQuotes = quotes.filter(q => q.status === 'draft' || q.status === 'pending');
  const overdueCharges = charges.filter(c => c.status === 'overdue' || c.status === 'atrasada');
  const pendingContracts = contracts.filter(c => c.status === 'pending' || c.status === 'aguardando');
  const readyAlbums = albums.filter(a => a.status === 'ready' || a.status === 'pronto');
  const formatBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Pendências consolidadas
  const pendencies = [
    ...pendingQuotes.map(q => ({ id: `q-${q.id}`, icon: FileText, title: `Orçamento: ${q.clientName || 'Cliente'}`, date: q.createdAt || q.updatedAt, action: 'Enviar agora', color: 'bg-blue-600', onClick: () => navigate(`/admin/orcamentos/${q.id}`) })),
    ...pendingContracts.map(c => ({ id: `c-${c.id}`, icon: RefreshCw, title: `Contrato: ${c.clientName || 'Cliente'}`, date: c.createdAt || c.updatedAt, action: 'Reenviar', color: 'bg-purple-600', onClick: () => navigate(`/admin/contratos/${c.id}`) })),
    ...overdueCharges.map(c => ({ id: `ch-${c.id}`, icon: MessageCircle, title: `Cobrança: ${c.clientName || 'Cliente'}`, date: c.dueDate || c.createdAt, action: 'Cobrar via WhatsApp', color: 'bg-green-600', onClick: () => window.open(`https://wa.me/${c.phone}?text=Olá! Sua cobrança está pendente.`, '_blank') })),
    ...readyAlbums.map(a => ({ id: `a-${a.id}`, icon: Upload, title: `Álbum: ${a.title || a.clientName || 'Álbum'}`, date: a.updatedAt || a.createdAt, action: 'Publicar', color: 'bg-orange-600', onClick: () => navigate(`/admin/albuns/${a.id}`) })),
  ];

  // Próximas sessões
  const upcoming = events.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);

  // Atividade recente (últimas 5 do sistema)
  const recentActivity = [
    ...quotes.map(q => ({ date: q.createdAt, text: `Orçamento criado — ${q.clientName || 'Cliente'}`, icon: FileText })),
    ...contracts.filter(c => c.status === 'signed' || c.status === 'assinado').map(c => ({ date: c.signedAt || c.updatedAt, text: `Contrato assinado — ${c.clientName || 'Cliente'}`, icon: CheckCircle2 })),
    ...charges.filter(c => c.status === 'paid' || c.status === 'pago').map(c => ({ date: c.paidAt || c.updatedAt, text: `Pagamento recebido — ${formatBRL(c.amount)}`, icon: CreditCard })),
  ].filter(a => a.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  // Redirect to onboarding if not completed
  if (!localStorage.getItem('mbf_onboarding_done')) {
    return <Navigate to="/admin/onboarding" replace />;
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: ACCENT }} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. Saudação */}
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <LayoutDashboard size={24} style={{ color: '#EA580C' }} />
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, {user?.name?.split(' ')[0] || 'Usuário'} 👋</h1>
        </div>
        <div className="flex gap-2">
        </div>
      </div>

      {/* 2. Ações Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Novo Orçamento', icon: PlusCircle, to: '/admin/orcamentos/novo' },
          { label: 'Novo Cliente', icon: Users, to: '/admin/clientes/novo' },
          { label: 'Bloquear Data', icon: Lock, to: '/admin/agenda?action=block' },
          { label: 'Ver Agenda', icon: Calendar, to: '/admin/agenda' },
        ].map(a => (
          <button key={a.label} onClick={() => navigate(a.to)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all group">
            <a.icon size={22} className="text-gray-400 group-hover:text-orange-600 transition-colors" />
            <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">{a.label}</span>
          </button>
        ))}
      </div>

      {/* 3. KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sessões Hoje / Semana', value: `${sessionsToday} / ${sessionsWeek}`, icon: Calendar, bg: 'bg-blue-50', fg: 'text-blue-600' },
          { label: 'Orçamentos Pendentes', value: pendingQuotes.length, sub: pendingQuotes[0] ? timeAgo(pendingQuotes[0].createdAt) + ' parado' : '', icon: FileText, bg: 'bg-amber-50', fg: 'text-amber-600' },
          { label: 'Receita do Mês', value: formatBRL(summary.received || summary.revenue || 0), icon: TrendingUp, bg: 'bg-green-50', fg: 'text-green-600' },
          { label: 'Cobranças Atrasadas', value: overdueCharges.length, sub: overdueCharges[0] ? timeAgo(overdueCharges[0].dueDate) : '', icon: AlertCircle, bg: 'bg-red-50', fg: 'text-red-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                <p className="text-xl font-bold text-gray-900">{k.value}</p>
                {k.sub && <p className="text-[11px] text-gray-400 mt-0.5">{k.sub}</p>}
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${k.bg} ${k.fg}`}>
                <k.icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Pendências com Ação Direta */}
      {pendencies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle size={16} style={{ color: ACCENT }} /> Pendências
          </h2>
          <div className="space-y-2">
            {pendencies.slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <p.icon size={18} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                  <p className="text-[11px] text-gray-400">{timeAgo(p.date)} parado</p>
                </div>
                <button onClick={p.onClick}
                  className={`${p.color} text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity shrink-0`}>
                  {p.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Próximas Sessões */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar size={16} style={{ color: ACCENT }} /> Próximas Sessões
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma sessão agendada</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <div className="text-center shrink-0 w-10">
                  <p className="text-[10px] text-gray-400 uppercase">{new Date(ev.date).toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                  <p className="text-sm font-bold text-gray-800">{new Date(ev.date).getDate()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{ev.clientName || ev.title}</p>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                    {ev.time && <span className="flex items-center gap-0.5"><Clock size={10} />{ev.time}</span>}
                    {ev.type && <span>• {ev.type}</span>}
                    {ev.location && <span className="flex items-center gap-0.5"><MapPin size={10} />{ev.location}</span>}
                  </div>
                </div>
                <button onClick={() => window.open(`https://wa.me/${ev.phone}?text=Lembrete: sua sessão está agendada!`, '_blank')}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-orange-300 hover:text-orange-600 transition-colors shrink-0 flex items-center gap-1">
                  <Bell size={12} /> Lembrete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Atividade Recente */}
      {recentActivity.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock size={16} style={{ color: ACCENT }} /> Atividade Recente
          </h2>
          <div className="relative pl-4 border-l-2 border-gray-100 space-y-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-white border-2 border-gray-300" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{a.text}</p>
                  <p className="text-[11px] text-gray-400">{new Date(a.date).toLocaleDateString('pt-BR')} às {new Date(a.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
