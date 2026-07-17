import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Plus, Clock, MapPin, ChevronLeft, ChevronRight, List, Lock, AlertTriangle, CheckCircle2, Users, Timer } from 'lucide-react';

const ACCENT = '#EA580C';
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const TIPO_CORES = { Casamento: '#EC4899', Ensaio: '#3B82F6', Corporativo: '#10B981', Bloqueio: '#6B7280' };
const TIPOS = ['Casamento', 'Ensaio', 'Corporativo', 'Bloqueio'];

export default function Agenda() {
  const { authFetch } = useAuth();
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('calendar');
  const [showModal, setShowModal] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({ tipo_evento: '', cliente_id: '', data_evento: '', horario_inicio: '', horario_fim: '', local: '', observacoes: '' });
  const [blockForm, setBlockForm] = useState({ data_evento: '', motivo: '' });

  useEffect(() => { loadEvents(); loadClientes(); }, []);

  const loadEvents = async () => {
    try {
      const res = await authFetch('/admin/agenda');
      const json = await res.json();
      if (json.success) setEvents(json.data || []);
    } catch (e) { console.error(e); }
  };

  const loadClientes = async () => {
    try {
      const res = await authFetch('/admin/clientes');
      const json = await res.json();
      if (json.success) setClientes(json.data || []);
    } catch {}
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.data_evento === dateStr);
  };

  const hasConflict = (dayEvents) => {
    for (let i = 0; i < dayEvents.length; i++)
      for (let j = i + 1; j < dayEvents.length; j++)
        if (dayEvents[i].horario_inicio < dayEvents[j].horario_fim && dayEvents[j].horario_inicio < dayEvents[i].horario_fim) return true;
    return false;
  };

  const kpis = useMemo(() => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const thisMonth = events.filter(e => e.data_evento?.startsWith(monthStr));
    const futureEvents = events.filter(e => e.data_evento >= today.toISOString().split('T')[0] && e.tipo_evento !== 'Bloqueio').sort((a, b) => a.data_evento.localeCompare(b.data_evento));
    const next = futureEvents[0];
    let countdown = '--';
    if (next) {
      const diff = Math.ceil((new Date(next.data_evento) - today) / (1000 * 60 * 60 * 24));
      countdown = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `${diff} dias`;
    }
    return {
      total: thisMonth.filter(e => e.tipo_evento !== 'Bloqueio').length,
      countdown,
      confirmadas: thisMonth.filter(e => e.status === 'confirmado').length,
      pendentes: thisMonth.filter(e => e.status === 'pendente').length
    };
  }, [events, year, month]);

  const groupedByDate = useMemo(() => {
    const sorted = [...events].filter(e => e.data_evento >= today.toISOString().split('T')[0]).sort((a, b) => a.data_evento.localeCompare(b.data_evento) || (a.horario_inicio || '').localeCompare(b.horario_inicio || ''));
    const groups = {};
    sorted.forEach(e => { (groups[e.data_evento] ||= []).push(e); });
    return groups;
  }, [events]);

  const handleSave = async () => {
    try {
      await authFetch('/admin/agenda', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setShowModal(null); setForm({ tipo_evento: '', cliente_id: '', data_evento: '', horario_inicio: '', horario_fim: '', local: '', observacoes: '' });
      loadEvents();
    } catch {}
  };

  const handleBlock = async () => {
    try {
      await authFetch('/admin/agenda', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...blockForm, tipo_evento: 'Bloqueio', status: 'bloqueio' }) });
      setShowModal(null); setBlockForm({ data_evento: '', motivo: '' });
      loadEvents();
    } catch {}
  };

  const KpiCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}><Icon size={20} style={{ color }} /></div>
      <div><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-xs text-gray-500">{label}</p></div>
    </div>
  );

  const StatusBadge = ({ status }) => {
    const map = { confirmado: { bg: '#DCFCE7', text: '#166534', label: 'Confirmado' }, pendente: { bg: '#FEF3C7', text: '#92400E', label: 'Pendente' }, bloqueio: { bg: '#F3F4F6', text: '#374151', label: 'Bloqueio' } };
    const s = map[status] || map.pendente;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.text }}>{s.label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Calendar size={24} style={{ color: ACCENT }} /><h1 className="text-2xl font-bold text-gray-900">Agenda</h1></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${view === 'calendar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}><Calendar size={14} />Calendário</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}><List size={14} />Lista</button>
          </div>
          <button onClick={() => setShowModal('block')} className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1"><Lock size={14} />Bloquear Data</button>
          <button onClick={() => setShowModal('new')} style={{ background: ACCENT }} className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1"><Plus size={16} />Nova Sessão</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Sessões este mês" value={kpis.total} color={ACCENT} />
        <KpiCard icon={Timer} label="Próxima sessão" value={kpis.countdown} color="#8B5CF6" />
        <KpiCard icon={CheckCircle2} label="Confirmadas" value={kpis.confirmadas} color="#10B981" />
        <KpiCard icon={AlertTriangle} label="Pendentes" value={kpis.pendentes} color="#F59E0B" />
      </div>

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
            <h2 className="text-lg font-semibold text-gray-900">{MONTHS[month]} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {DAYS.map(d => <div key={d} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="bg-white p-2 min-h-[90px]" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const conflict = hasConflict(dayEvents);
              return (
                <div key={day} className={`bg-white p-1.5 min-h-[90px] ${isToday ? 'ring-2 ring-inset' : ''} ${conflict ? 'border-2 border-red-500' : ''}`} style={isToday ? { '--tw-ring-color': ACCENT } : {}}>
                  <span className={`text-xs ${isToday ? 'font-bold bg-orange-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center' : 'text-gray-600'}`}>{day}</span>
                  {dayEvents.slice(0, 3).map((ev, idx) => (
                    <div key={idx} className="mt-0.5 px-1 py-0.5 rounded text-[10px] truncate text-white" style={{ background: TIPO_CORES[ev.tipo_evento] || ACCENT }}>{ev.horario_inicio?.slice(0, 5)} {ev.cliente_nome || ev.tipo_evento}</div>
                  ))}
                  {dayEvents.length > 3 && <span className="text-[10px] text-gray-400">+{dayEvents.length - 3}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 justify-end">
            {Object.entries(TIPO_CORES).map(([tipo, cor]) => <div key={tipo} className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: cor }} /><span className="text-xs text-gray-500">{tipo}</span></div>)}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-4">
          {Object.keys(groupedByDate).length === 0 && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Nenhuma sessão agendada</div>}
          {Object.entries(groupedByDate).map(([date, evts]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              <div className="space-y-2">
                {evts.map(ev => (
                  <div key={ev.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                    <div className="w-1 h-12 rounded-full" style={{ background: TIPO_CORES[ev.tipo_evento] || ACCENT }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{ev.cliente_nome || ev.tipo_evento}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={12} />{ev.horario_inicio?.slice(0, 5)} - {ev.horario_fim?.slice(0, 5)}</span>
                        {ev.local && <span className="flex items-center gap-1"><MapPin size={12} />{ev.local}</span>}
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-[10px] font-medium text-white" style={{ background: TIPO_CORES[ev.tipo_evento] || ACCENT }}>{ev.tipo_evento}</span>
                    <StatusBadge status={ev.status} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Sessão */}
      {showModal === 'new' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">Nova Sessão</h2>
            <select value={form.tipo_evento} onChange={e => setForm({ ...form, tipo_evento: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Tipo de evento</option>{TIPOS.filter(t => t !== 'Bloqueio').map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Selecionar cliente</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <input type="date" value={form.data_evento} onChange={e => setForm({ ...form, data_evento: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input type="time" value={form.horario_inicio} onChange={e => setForm({ ...form, horario_inicio: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Início" />
              <input type="time" value={form.horario_fim} onChange={e => setForm({ ...form, horario_fim: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Fim" />
            </div>
            <input type="text" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} placeholder="Local" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700">Cancelar</button>
              <button onClick={handleSave} style={{ background: ACCENT }} className="flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bloquear Data */}
      {showModal === 'block' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Lock size={18} />Bloquear Data</h2>
            <input type="date" value={blockForm.data_evento} onChange={e => setBlockForm({ ...blockForm, data_evento: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input type="text" value={blockForm.motivo} onChange={e => setBlockForm({ ...blockForm, motivo: e.target.value })} placeholder="Motivo do bloqueio" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700">Cancelar</button>
              <button onClick={handleBlock} className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800">Bloquear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
