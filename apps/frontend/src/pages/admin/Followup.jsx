import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Zap, Mail, MessageCircle, Plus, Edit, Trash2, Power, PowerOff,
  Filter, Search, BarChart3, Send, Clock, CheckCircle, XCircle,
  AlertTriangle, ArrowUpRight, RefreshCw, X, ChevronDown, ChevronUp
} from 'lucide-react';

const ACCENT = '#EA580C';
const TABS = ['Réguas', 'Execuções', 'Métricas'];
const GATILHOS = [
  { value: 'orcamento_enviado', label: 'Orçamento enviado' },
  { value: 'contrato_gerado', label: 'Contrato gerado' },
  { value: 'pagamento_atrasado', label: 'Pagamento atrasado' },
  { value: 'album_publicado', label: 'Álbum publicado' },
];
const CANAIS = [
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
];
const NATUREZAS = [
  { value: 'comercial', label: 'Comercial' },
  { value: 'operacional', label: 'Operacional' },
];
const STATUS_DISPARO = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  disparado: { label: 'Disparado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
  esgotado: { label: 'Esgotado', color: 'bg-gray-100 text-gray-700', icon: AlertTriangle },
};

const Badge = ({ children, color = 'gray' }) => {
  const colors = { green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-800', orange: 'bg-orange-100 text-orange-800', gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-800', yellow: 'bg-yellow-100 text-yellow-800' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>{children}</span>;
};

const KPI = ({ icon: Icon, label, value, sub }) => (
  <div className="bg-white rounded-lg border p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: ACCENT + '15' }}>
      <Icon size={20} style={{ color: ACCENT }} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  </div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
};

export default function Followup() {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Réguas
  const [reguas, setReguas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editRegua, setEditRegua] = useState(null);
  const [form, setForm] = useState(getEmptyForm());

  // Execuções
  const [disparos, setDisparos] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCanal, setFiltroCanal] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');

  // Métricas
  const [metricas, setMetricas] = useState(null);

  function getEmptyForm() {
    return {
      nome: '',
      natureza: 'comercial',
      gatilho: 'orcamento_enviado',
      intervalo_dias: 3,
      tentativas_max: 5,
      canal_inicial: 'email',
      escalar_canal: false,
      canal_escalonado: 'whatsapp',
      tentativa_escalonamento: 3,
      template_msg: 'Olá {nome}, ',
      ao_esgotar_pendencia: false,
    };
  }

  const loadReguas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/reguas');
      const data = await res.json();
      if (data.success) setReguas(data.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [authFetch]);

  const loadDisparos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/reguas/disparos');
      const data = await res.json();
      if (data.success) setDisparos(data.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [authFetch]);

  const loadMetricas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/reguas/metricas');
      const data = await res.json();
      if (data.success) setMetricas(data.data || null);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => {
    if (tab === 0) loadReguas();
    else if (tab === 1) loadDisparos();
    else if (tab === 2) loadMetricas();
  }, [tab, loadReguas, loadDisparos, loadMetricas]);

  // CRUD Réguas
  const handleSave = async () => {
    try {
      const method = editRegua ? 'PUT' : 'POST';
      const url = editRegua ? `/admin/reguas/${editRegua.id}` : '/admin/reguas';
      await authFetch(url, { method, body: JSON.stringify(form) });
      setShowModal(false);
      setEditRegua(null);
      setForm(getEmptyForm());
      loadReguas();
    } catch (err) { console.error(err); }
  };

  const handleToggle = async (regua) => {
    try {
      await authFetch(`/admin/reguas/${regua.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...regua, ativo: !regua.ativo }),
      });
      loadReguas();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta régua?')) return;
    try {
      await authFetch(`/admin/reguas/${id}`, { method: 'DELETE' });
      loadReguas();
    } catch (err) { console.error(err); }
  };

  const openEdit = (regua) => {
    setEditRegua(regua);
    setForm({
      nome: regua.nome || '',
      natureza: regua.natureza || 'comercial',
      gatilho: regua.gatilho || 'orcamento_enviado',
      intervalo_dias: regua.intervalo_dias || 3,
      tentativas_max: regua.tentativas_max || 5,
      canal_inicial: regua.canal_inicial || 'email',
      escalar_canal: regua.escalar_canal || false,
      canal_escalonado: regua.canal_escalonado || 'whatsapp',
      tentativa_escalonamento: regua.tentativa_escalonamento || 3,
      template_msg: regua.template_msg || '',
      ao_esgotar_pendencia: regua.ao_esgotar_pendencia || false,
    });
    setShowModal(true);
  };

  const openNew = () => {
    setEditRegua(null);
    setForm(getEmptyForm());
    setShowModal(true);
  };

  // Filtros Execuções
  const disparosFiltrados = disparos.filter(d => {
    if (filtroStatus !== 'todos' && d.status !== filtroStatus) return false;
    if (filtroCanal !== 'todos' && d.canal !== filtroCanal) return false;
    if (filtroPeriodo) {
      const dt = new Date(d.created_at);
      const now = new Date();
      if (filtroPeriodo === '7d' && (now - dt) > 7 * 86400000) return false;
      if (filtroPeriodo === '30d' && (now - dt) > 30 * 86400000) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap size={24} style={{ color: ACCENT }} />
            Follow-up
          </h1>
          <p className="text-sm text-gray-500 mt-1">Motor de réguas automáticas de follow-up</p>
        </div>
        {tab === 0 && (
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: ACCENT }}>
            <Plus size={16} /> Nova Régua
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === i ? 'border-current text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={tab === i ? { color: ACCENT } : {}}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {!loading && tab === 0 && <TabReguas reguas={reguas} onEdit={openEdit} onToggle={handleToggle} onDelete={handleDelete} />}
      {!loading && tab === 1 && <TabExecucoes disparos={disparosFiltrados} filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus} filtroCanal={filtroCanal} setFiltroCanal={setFiltroCanal} filtroPeriodo={filtroPeriodo} setFiltroPeriodo={setFiltroPeriodo} />}
      {!loading && tab === 2 && <TabMetricas metricas={metricas} />}

      {/* Modal de Régua */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditRegua(null); }} title={editRegua ? 'Editar Régua' : 'Nova Régua'}>
        <ModalReguaForm form={form} setForm={setForm} onSave={handleSave} />
      </Modal>
    </div>
  );
}


// ─── Tab: Réguas ────────────────────────────────────────────────────────────────
function TabReguas({ reguas, onEdit, onToggle, onDelete }) {
  if (!reguas.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Zap size={48} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhuma régua configurada</p>
        <p className="text-xs mt-1">Crie uma régua para iniciar disparos automáticos de follow-up</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reguas.map(regua => (
        <div key={regua.id} className={`bg-white rounded-lg border p-4 ${!regua.ativo ? 'opacity-60' : ''}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">{regua.nome}</h3>
                <Badge color={regua.ativo ? 'green' : 'gray'}>{regua.ativo ? 'Ativa' : 'Inativa'}</Badge>
                <Badge color={regua.natureza === 'comercial' ? 'blue' : 'orange'}>{regua.natureza || 'comercial'}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Zap size={12} /> {GATILHOS.find(g => g.value === regua.gatilho)?.label || regua.gatilho}
                </span>
                <span className="flex items-center gap-1">
                  {regua.canal_inicial === 'email' ? <Mail size={12} /> : <MessageCircle size={12} />}
                  {regua.canal_inicial || 'email'}
                </span>
                <span>Intervalo: {regua.intervalo_dias || 3}d</span>
                <span>Tentativas: {regua.tentativas_max || 5}</span>
                {regua.escalar_canal && (
                  <span className="flex items-center gap-1 text-orange-600">
                    <ArrowUpRight size={12} /> Escala p/ {regua.canal_escalonado} na {regua.tentativa_escalonamento}ª
                  </span>
                )}
              </div>
              {regua.template_msg && (
                <p className="text-xs text-gray-400 mt-1 truncate max-w-md">Template: {regua.template_msg}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onToggle(regua)} className="p-2 rounded hover:bg-gray-100" title={regua.ativo ? 'Desativar' : 'Ativar'}>
                {regua.ativo ? <PowerOff size={16} className="text-gray-400" /> : <Power size={16} className="text-green-500" />}
              </button>
              <button onClick={() => onEdit(regua)} className="p-2 rounded hover:bg-gray-100" title="Editar">
                <Edit size={16} className="text-gray-400" />
              </button>
              <button onClick={() => onDelete(regua.id)} className="p-2 rounded hover:bg-gray-100" title="Excluir">
                <Trash2 size={16} className="text-red-400" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


// ─── Tab: Execuções ─────────────────────────────────────────────────────────────
function TabExecucoes({ disparos, filtroStatus, setFiltroStatus, filtroCanal, setFiltroCanal, filtroPeriodo, setFiltroPeriodo }) {
  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-gray-400" />
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="text-sm border rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="todos">Todos status</option>
            <option value="pendente">Pendente</option>
            <option value="disparado">Disparado</option>
            <option value="cancelado">Cancelado</option>
            <option value="esgotado">Esgotado</option>
          </select>
        </div>
        <select
          value={filtroCanal}
          onChange={e => setFiltroCanal(e.target.value)}
          className="text-sm border rounded-lg px-2 py-1.5 bg-white"
        >
          <option value="todos">Todos canais</option>
          <option value="email">E-mail</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <select
          value={filtroPeriodo}
          onChange={e => setFiltroPeriodo(e.target.value)}
          className="text-sm border rounded-lg px-2 py-1.5 bg-white"
        >
          <option value="">Todo período</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
        </select>
      </div>

      {/* Tabela */}
      {disparos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Send size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum disparo encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Régua</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Canal</th>
                  <th className="px-4 py-3 text-left">Passo</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {disparos.map((d, i) => {
                  const st = STATUS_DISPARO[d.status] || STATUS_DISPARO.pendente;
                  const StIcon = st.icon;
                  return (
                    <tr key={d.id || i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{d.regua_nome || d.regua_id}</td>
                      <td className="px-4 py-3 text-gray-600">{d.cliente_nome || d.orcamento_id || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1">
                          {d.canal === 'email' ? <Mail size={13} /> : <MessageCircle size={13} />}
                          {d.canal || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{d.passo_atual || 1}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          <StIcon size={12} /> {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Tab: Métricas ──────────────────────────────────────────────────────────────
function TabMetricas({ metricas }) {
  const data = metricas || {
    total_disparos: 0,
    taxa_resolucao: 0,
    por_canal: { email: 0, whatsapp: 0 },
    por_status: { pendente: 0, disparado: 0, cancelado: 0, esgotado: 0 },
    reguas_ativas: 0,
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={Send} label="Total de Disparos" value={data.total_disparos} />
        <KPI icon={CheckCircle} label="Taxa de Resolução" value={`${data.taxa_resolucao}%`} sub="Follow-ups que resultaram em ação" />
        <KPI icon={Mail} label="Disparos por E-mail" value={data.por_canal?.email || 0} />
        <KPI icon={MessageCircle} label="Disparos por WhatsApp" value={data.por_canal?.whatsapp || 0} />
      </div>

      {/* Distribuição por Status */}
      <div className="bg-white rounded-lg border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <BarChart3 size={16} style={{ color: ACCENT }} /> Distribuição por Status
        </h3>
        <div className="space-y-3">
          {Object.entries(STATUS_DISPARO).map(([key, cfg]) => {
            const count = data.por_status?.[key] || 0;
            const pct = data.total_disparos > 0 ? Math.round((count / data.total_disparos) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-28 ${cfg.color}`}>
                  <cfg.icon size={12} /> {cfg.label}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
                </div>
                <span className="text-xs text-gray-600 w-16 text-right">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Réguas Ativas */}
      <div className="bg-white rounded-lg border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Zap size={16} style={{ color: ACCENT }} /> Réguas Ativas
        </h3>
        <p className="text-3xl font-bold text-gray-900">{data.reguas_ativas}</p>
        <p className="text-xs text-gray-500 mt-1">Réguas configuradas e em operação</p>
      </div>
    </div>
  );
}


// ─── Modal Form ─────────────────────────────────────────────────────────────────
function ModalReguaForm({ form, setForm, onSave }) {
  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da régua</label>
        <input
          type="text"
          value={form.nome}
          onChange={e => upd('nome', e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
          placeholder="Ex: Follow-up orçamento"
        />
      </div>

      {/* Natureza + Gatilho */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Natureza</label>
          <select value={form.natureza} onChange={e => upd('natureza', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {NATUREZAS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gatilho</label>
          <select value={form.gatilho} onChange={e => upd('gatilho', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {GATILHOS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
      </div>

      {/* Intervalo + Tentativas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo (dias)</label>
          <input
            type="number"
            min={1}
            value={form.intervalo_dias}
            onChange={e => upd('intervalo_dias', parseInt(e.target.value) || 1)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tentativas máx.</label>
          <input
            type="number"
            min={1}
            value={form.tentativas_max}
            onChange={e => upd('tentativas_max', parseInt(e.target.value) || 1)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Canal Inicial */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Canal inicial</label>
        <select value={form.canal_inicial} onChange={e => upd('canal_inicial', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
          {CANAIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Escalonamento */}
      <div className="border rounded-lg p-3 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.escalar_canal}
            onChange={e => upd('escalar_canal', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
            style={{ accentColor: ACCENT }}
          />
          <span className="text-sm text-gray-700">Escalar para outro canal</span>
        </label>
        {form.escalar_canal && (
          <div className="grid grid-cols-2 gap-3 pl-6">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Canal escalonado</label>
              <select value={form.canal_escalonado} onChange={e => upd('canal_escalonado', e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm">
                {CANAIS.filter(c => c.value !== form.canal_inicial).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Na tentativa nº</label>
              <input
                type="number"
                min={2}
                value={form.tentativa_escalonamento}
                onChange={e => upd('tentativa_escalonamento', parseInt(e.target.value) || 2)}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Template */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Template da mensagem</label>
        <textarea
          value={form.template_msg}
          onChange={e => upd('template_msg', e.target.value)}
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none resize-none"
          placeholder="Use variáveis: {nome}, {valor}, {data}, {evento}"
        />
        <p className="text-[11px] text-gray-400 mt-1">Variáveis disponíveis: {'{nome}'}, {'{valor}'}, {'{data}'}, {'{evento}'}</p>
      </div>

      {/* Ao esgotar */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.ao_esgotar_pendencia}
          onChange={e => upd('ao_esgotar_pendencia', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300"
          style={{ accentColor: ACCENT }}
        />
        <span className="text-sm text-gray-700">Ao esgotar tentativas, gerar pendência manual</span>
      </label>

      {/* Botão salvar */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onSave}
          disabled={!form.nome.trim()}
          className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
