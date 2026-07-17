import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, List, Plus, Lock, X, MapPin, Phone, Mail, Edit, RefreshCw, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getStatusColor, getTipoColor } from '../../utils/agendaColors';

const ACCENT = '#EA580C';
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const STATUS_OPTIONS = ['Todos', 'Confirmadas', 'Pendentes', 'Bloqueadas', 'Canceladas'];
const TIPO_OPTIONS = ['Todos os tipos', 'Casamento', 'Ensaio', 'Aniversário', 'Corporativo', 'Batizado', 'Outros'];

export default function Agenda() {
  const { authFetch } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [view, setView] = useState('calendario');
  const [mesAtual, setMesAtual] = useState(new Date());
  const [filtroStatus, setFiltroStatus] = useState(['Todos']);
  const [filtroTipo, setFiltroTipo] = useState('Todos os tipos');
  const [drawerEvento, setDrawerEvento] = useState(null);
  const [modalNovaSessao, setModalNovaSessao] = useState(null);
  const [modalBloquear, setModalBloquear] = useState(false);
  const [novaSessao, setNovaSessao] = useState({ tipo_evento: '', cliente_id: '', data_evento: '', horario_inicio: '', horario_fim: '', local: '' });
  const [bloqueio, setBloqueio] = useState({ data: '', motivo: '' });

  useEffect(() => {
    authFetch('/admin/agenda').then(r => r.json()).then(d => { if (d.success) setEventos(d.data); });
    authFetch('/admin/clientes').then(r => r.json()).then(d => { if (d.success) setClientes(d.data || d); });
  }, []);

  const eventosFiltrados = useMemo(() => {
    return eventos.filter(e => {
      const statusOk = filtroStatus.includes('Todos') || filtroStatus.includes(e.status);
      const tipoOk = filtroTipo === 'Todos os tipos' || e.tipo_evento === filtroTipo;
      return statusOk && tipoOk;
    });
  }, [eventos, filtroStatus, filtroTipo]);

  const kpis = useMemo(() => {
    const hoje = new Date();
    const mesAtualNum = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const doMes = eventos.filter(e => { const d = new Date(e.data_evento); return d.getMonth() === mesAtualNum && d.getFullYear() === anoAtual; });
    const confirmadas = doMes.filter(e => e.status === 'Confirmadas').length;
    const pendentes = doMes.filter(e => e.status === 'Pendentes').length;
    const futuras = eventos.filter(e => new Date(e.data_evento) >= hoje).sort((a, b) => new Date(a.data_evento) - new Date(b.data_evento));
    const proxima = futuras[0];
    let countdown = '—';
    if (proxima) {
      const diff = Math.ceil((new Date(proxima.data_evento) - hoje) / (1000 * 60 * 60 * 24));
      countdown = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `${diff} dias`;
    }
    return { total: doMes.length, countdown, confirmadas, pendentes };
  }, [eventos]);

  const toggleStatus = (s) => {
    if (s === 'Todos') { setFiltroStatus(['Todos']); return; }
    let novo = filtroStatus.filter(x => x !== 'Todos');
    novo = novo.includes(s) ? novo.filter(x => x !== s) : [...novo, s];
    setFiltroStatus(novo.length === 0 ? ['Todos'] : novo);
  };

  const getDiasDoMes = () => {
    const ano = mesAtual.getFullYear(), mes = mesAtual.getMonth();
    const primeiro = new Date(ano, mes, 1);
    const ultimo = new Date(ano, mes + 1, 0);
    const dias = [];
    for (let i = 0; i < primeiro.getDay(); i++) dias.push(null);
    for (let i = 1; i <= ultimo.getDate(); i++) dias.push(new Date(ano, mes, i));
    return dias;
  };

  const getEventosDoDia = (data) => {
    if (!data) return [];
    const str = data.toISOString().split('T')[0];
    return eventosFiltrados.filter(e => e.data_evento === str);
  };

  const isBloqueado = (data) => {
    if (!data) return null;
    const str = data.toISOString().split('T')[0];
    return eventos.find(e => e.data_evento === str && e.status === 'Bloqueadas');
  };

  const handleDiaClick = (data, e) => {
    if (e.target.closest('.pill-evento')) return;
    if (!data) return;
    const bloq = isBloqueado(data);
    if (bloq) { alert(`Data bloqueada: ${bloq.observacoes || 'Sem motivo informado'}`); return; }
    setNovaSessao({ ...novaSessao, data_evento: data.toISOString().split('T')[0] });
    setModalNovaSessao(true);
  };

  const ExpirationBadge = ({ evento }) => {
    if (evento.status !== 'reserva' && evento.status !== 'Pendentes') return null;
    if (!evento.reserva_expira_em || evento.reserva_expira_em > 7) return null;
    const urgent = evento.reserva_expira_em <= 2;
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${urgent ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-yellow-100 text-yellow-700'}`}>
        Expira em {evento.reserva_expira_em}d
      </span>
    );
  };

  // KPI Cards
  const KPICards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[
        { icon: Calendar, label: 'Sessões este mês', value: kpis.total },
        { icon: Clock, label: 'Próxima sessão', value: kpis.countdown },
        { icon: CheckCircle, label: 'Confirmadas', value: kpis.confirmadas },
        { icon: AlertCircle, label: 'Pendentes', value: kpis.pendentes },
      ].map((k, i) => (
        <div key={i} className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${ACCENT}15` }}><k.icon size={20} style={{ color: ACCENT }} /></div>
          <div><p className="text-sm text-gray-500">{k.label}</p><p className="text-xl font-bold text-gray-900">{k.value}</p></div>
        </div>
      ))}
    </div>
  );

  // Filtros
  const Filtros = () => (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => toggleStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${filtroStatus.includes(s) ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={filtroStatus.includes(s) ? { backgroundColor: ACCENT } : {}}>
            {s}
          </button>
        ))}
      </div>
      <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
        className="px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2" style={{ focusRingColor: ACCENT }}>
        {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <div className="ml-auto flex gap-2">
        <button onClick={() => setView('calendario')} className={`p-2 rounded-lg ${view === 'calendario' ? 'bg-orange-100' : 'bg-gray-100'}`}>
          <Calendar size={18} style={{ color: view === 'calendario' ? ACCENT : '#6b7280' }} />
        </button>
        <button onClick={() => setView('lista')} className={`p-2 rounded-lg ${view === 'lista' ? 'bg-orange-100' : 'bg-gray-100'}`}>
          <List size={18} style={{ color: view === 'lista' ? ACCENT : '#6b7280' }} />
        </button>
      </div>
    </div>
  );

  // Calendário
  const CalendarioView = () => {
    const dias = getDiasDoMes();
    return (
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <button onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1))} className="p-1 hover:bg-gray-100 rounded">←</button>
          <h3 className="font-semibold text-gray-900">{mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1))} className="p-1 hover:bg-gray-100 rounded">→</button>
        </div>
        <div className="grid grid-cols-7">
          {DIAS_SEMANA.map(d => <div key={d} className="p-2 text-center text-xs font-medium text-gray-500 border-b">{d}</div>)}
          {dias.map((dia, i) => {
            const evts = getEventosDoDia(dia);
            const bloq = isBloqueado(dia);
            return (
              <div key={i} onClick={(e) => handleDiaClick(dia, e)}
                className={`min-h-[80px] p-1 border-b border-r cursor-pointer hover:bg-gray-50 ${bloq ? 'bg-gray-100' : ''}`}
                title={bloq ? `Bloqueado: ${bloq.observacoes || ''}` : ''}>
                {dia && (
                  <>
                    <span className={`text-xs font-medium ${bloq ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {dia.getDate()} {bloq && '🔒'}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {evts.slice(0, 3).map(ev => (
                        <div key={ev.id} className="pill-evento px-1 py-0.5 rounded text-[10px] truncate cursor-pointer"
                          style={{ backgroundColor: getStatusColor(ev.status).pill, color: '#fff' }}
                          onClick={(e) => { e.stopPropagation(); setDrawerEvento(ev); }}>
                          {ev.horario_inicio?.slice(0, 5)} {ev.cliente_nome}
                          {ev.reserva_expira_em && ev.reserva_expira_em <= 7 && <span className="ml-1">⏳</span>}
                        </div>
                      ))}
                      {evts.length > 3 && <span className="text-[10px] text-gray-500">+{evts.length - 3}</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Lista
  const ListaView = () => (
    <div className="space-y-3">
      {eventosFiltrados.sort((a, b) => a.data_evento.localeCompare(b.data_evento)).map(ev => (
        <div key={ev.id} onClick={() => setDrawerEvento(ev)}
          className="bg-white rounded-xl border flex overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
          style={{ borderLeftWidth: '4px', borderLeftColor: getStatusColor(ev.status).border }}>
          <div className="p-4 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">{ev.cliente_nome}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: getStatusColor(ev.status).pill, color: '#fff' }}>{ev.status}</span>
              <ExpirationBadge evento={ev} />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{new Date(ev.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
              <span>{ev.horario_inicio?.slice(0, 5)} - {ev.horario_fim?.slice(0, 5)}</span>
              <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: getTipoColor(ev.tipo_evento) + '20', color: getTipoColor(ev.tipo_evento) }}>{ev.tipo_evento}</span>
            </div>
            {ev.local && <p className="text-sm text-gray-400 mt-1 flex items-center gap-1"><MapPin size={12} />{typeof ev.local === 'object' ? ev.local.nome : ev.local}</p>}
          </div>
        </div>
      ))}
      {eventosFiltrados.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum evento encontrado.</p>}
    </div>
  );

  // Drawer de Detalhe (AGD-01)
  const Drawer = () => {
    if (!drawerEvento) return null;
    const ev = drawerEvento;
    const endereco = typeof ev.local === 'object' ? ev.local?.endereco : ev.local;
    const mapsUrl = endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}` : null;
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDrawerEvento(null)} />
        <div className="fixed top-0 right-0 h-full w-[400px] bg-white z-50 shadow-2xl overflow-y-auto flex flex-col">
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: getTipoColor(ev.tipo_evento) + '20', color: getTipoColor(ev.tipo_evento) }}>{ev.tipo_evento}</span>
              <h2 className="text-lg font-bold text-gray-900 mt-2">{ev.cliente_nome}</h2>
            </div>
            <button onClick={() => setDrawerEvento(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <div className="flex-1 p-6 space-y-5">
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <span className="px-3 py-1.5 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: getStatusColor(ev.status).pill }}>{ev.status}</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Data / Hora</p>
              <p className="font-medium">{new Date(ev.data_evento + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p className="text-gray-600">{ev.horario_inicio?.slice(0, 5)} — {ev.horario_fim?.slice(0, 5)}</p>
            </div>
            {endereco && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Local</p>
                <p className="font-medium">{typeof ev.local === 'object' ? ev.local.nome : ev.local}</p>
                {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm flex items-center gap-1 mt-1" style={{ color: ACCENT }}><MapPin size={14} />Abrir no Maps</a>}
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 mb-1">Cliente</p>
              <p className="font-medium">{ev.cliente_nome}</p>
              {ev.cliente_tel && <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={12} />{ev.cliente_tel}</p>}
              {ev.cliente_email && <p className="text-sm text-gray-500 flex items-center gap-1"><Mail size={12} />{ev.cliente_email}</p>}
            </div>
            {ev.orcamento && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Orçamento</p>
                <p className="font-medium">R$ {ev.orcamento.valor?.toLocaleString('pt-BR')}</p>
                <p className="text-sm text-gray-500">{ev.orcamento.status}</p>
              </div>
            )}
            <ExpirationBadge evento={ev} />
            {/* AGD-10 Sync Google */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Google Calendar</p>
              {ev.sync_status === 'synced' || ev.google_event_id ? (
                <span className="text-sm px-2 py-1 bg-green-50 text-green-700 rounded-full">✅ Sincronizado</span>
              ) : (
                <span className="text-sm px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full">⚠️ Não sincronizado</span>
              )}
            </div>
            {ev.observacoes && <div><p className="text-sm text-gray-500 mb-1">Observações</p><p className="text-sm text-gray-700">{ev.observacoes}</p></div>}
          </div>
          <div className="p-4 border-t flex gap-2">
            <button className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border hover:bg-gray-50 flex items-center justify-center gap-1"><Edit size={14} />Editar</button>
            <button className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100">Cancelar</button>
            <button className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-1" style={{ backgroundColor: ACCENT }}><RefreshCw size={14} />Ressincronizar</button>
          </div>
        </div>
      </>
    );
  };

  // Modal Nova Sessão
  const ModalNovaSessao = () => {
    if (!modalNovaSessao) return null;
    const handleSubmit = async (e) => {
      e.preventDefault();
      await authFetch('/admin/agenda', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novaSessao) });
      setModalNovaSessao(null);
      setNovaSessao({ tipo_evento: '', cliente_id: '', data_evento: '', horario_inicio: '', horario_fim: '', local: '' });
      authFetch('/admin/agenda').then(r => r.json()).then(d => { if (d.success) setEventos(d.data); });
    };
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setModalNovaSessao(null)} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Nova Sessão</h3><button type="button" onClick={() => setModalNovaSessao(null)}><X size={20} /></button></div>
            <div>
              <label className="text-sm text-gray-600">Tipo</label>
              <select value={novaSessao.tipo_evento} onChange={e => setNovaSessao({ ...novaSessao, tipo_evento: e.target.value })} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" required>
                <option value="">Selecione</option>
                {TIPO_OPTIONS.filter(t => t !== 'Todos os tipos').map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Cliente</label>
              <select value={novaSessao.cliente_id} onChange={e => setNovaSessao({ ...novaSessao, cliente_id: e.target.value })} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" required>
                <option value="">Selecione</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Data</label>
              <input type="date" value={novaSessao.data_evento} onChange={e => setNovaSessao({ ...novaSessao, data_evento: e.target.value })} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm text-gray-600">Início</label><input type="time" value={novaSessao.horario_inicio} onChange={e => setNovaSessao({ ...novaSessao, horario_inicio: e.target.value })} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" required /></div>
              <div><label className="text-sm text-gray-600">Fim</label><input type="time" value={novaSessao.horario_fim} onChange={e => setNovaSessao({ ...novaSessao, horario_fim: e.target.value })} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" required /></div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Local</label>
              <input type="text" value={novaSessao.local} onChange={e => setNovaSessao({ ...novaSessao, local: e.target.value })} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="Endereço ou nome do local" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-lg text-white font-medium text-sm" style={{ backgroundColor: ACCENT }}>Criar Sessão</button>
          </form>
        </div>
      </>
    );
  };

  // Modal Bloquear Data
  const ModalBloquear = () => {
    if (!modalBloquear) return null;
    const handleSubmit = async (e) => {
      e.preventDefault();
      await authFetch('/admin/agenda/bloquear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bloqueio) });
      setModalBloquear(false);
      setBloqueio({ data: '', motivo: '' });
      authFetch('/admin/agenda').then(r => r.json()).then(d => { if (d.success) setEventos(d.data); });
    };
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setModalBloquear(false)} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Bloquear Data</h3><button type="button" onClick={() => setModalBloquear(false)}><X size={20} /></button></div>
            <div>
              <label className="text-sm text-gray-600">Data</label>
              <input type="date" value={bloqueio.data} onChange={e => setBloqueio({ ...bloqueio, data: e.target.value })} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="text-sm text-gray-600">Motivo</label>
              <input type="text" value={bloqueio.motivo} onChange={e => setBloqueio({ ...bloqueio, motivo: e.target.value })} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Feriado, compromisso pessoal" required />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-lg text-white font-medium text-sm bg-gray-800 hover:bg-gray-900">Bloquear</button>
          </form>
        </div>
      </>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        <div className="flex gap-2">
          <button onClick={() => setModalBloquear(true)} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 flex items-center gap-2"><Lock size={16} />Bloquear Data</button>
          <button onClick={() => setModalNovaSessao(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2" style={{ backgroundColor: ACCENT }}><Plus size={16} />Nova Sessão</button>
        </div>
      </div>
      <KPICards />
      <Filtros />
      {view === 'calendario' ? <CalendarioView /> : <ListaView />}
      <Drawer />
      <ModalNovaSessao />
      <ModalBloquear />
    </div>
  );
}
