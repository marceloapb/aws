import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Plus, MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const ACCENT = '#EA580C';
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function Agenda() {
  const { authFetch } = useAuth();
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('calendar');

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const res = await authFetch('/events');
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch {}
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const upcomingEvents = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {['calendar', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${view === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                {v === 'calendar' ? 'Calendário' : 'Lista'}
              </button>
            ))}
          </div>
          <button style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
            <Plus size={16} /> Nova Sessão
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
            <h2 className="text-lg font-semibold text-gray-900">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {DAYS.map(d => (
              <div key={d} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} className="bg-white p-2 min-h-[80px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              return (
                <div key={day} className={`bg-white p-2 min-h-[80px] ${isToday ? 'ring-2 ring-accent ring-inset' : ''}`}>
                  <span className={`text-sm ${isToday ? 'font-bold' : 'text-gray-600'}`} style={isToday ? { color: ACCENT } : {}}>{day}</span>
                  {dayEvents.slice(0, 2).map((ev, idx) => (
                    <div key={idx} className="mt-1 px-1.5 py-0.5 rounded text-xs truncate text-white" style={{ background: ACCENT }}>
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && <span className="text-xs text-gray-400">+{dayEvents.length - 2}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Nenhuma sessão agendada</div>
          ) : (
            upcomingEvents.map(ev => (
              <div key={ev.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center" style={{ background: `${ACCENT}15` }}>
                  <span className="text-xs font-medium" style={{ color: ACCENT }}>{new Date(ev.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                  <span className="text-lg font-bold" style={{ color: ACCENT }}>{new Date(ev.date).getDate()}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{ev.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    {ev.time && <span className="flex items-center gap-1"><Clock size={12} />{ev.time}</span>}
                    {ev.location && <span className="flex items-center gap-1"><MapPin size={12} />{ev.location}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
