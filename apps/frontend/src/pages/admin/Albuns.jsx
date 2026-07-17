import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Image, Plus, Search, Eye, Shield, Trash2, Send, Clock, Camera,
  CheckCircle2, XCircle, AlertTriangle, Upload, Link2, Edit, ArrowUpDown
} from 'lucide-react';

const ACCENT = '#EA580C';
const STATUS_TABS = ['todos', 'publicado', 'em_edicao', 'rascunho', 'expirado'];
const STATUS_LABELS = { todos: 'Todos', publicado: 'Publicados', em_edicao: 'Em Edição', rascunho: 'Rascunho', expirado: 'Expirados' };
const BADGE_STYLES = {
  publicado: 'bg-green-100 text-green-700',
  rascunho: 'bg-gray-100 text-gray-600',
  expirado: 'bg-red-100 text-red-700',
  em_edicao: 'bg-blue-100 text-blue-700',
};

function diasRestantes(dataExp) {
  if (!dataExp) return null;
  return Math.ceil((new Date(dataExp) - new Date()) / 86400000);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export default function Albuns() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [albuns, setAlbuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('todos');
  const [busca, setBusca] = useState('');
  const [ordenar, setOrdenar] = useState('recentes');
  const [modal, setModal] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({ titulo: '', cliente_id: '', tipo_evento: '', data_evento: '', data_expiracao: '' });

  useEffect(() => {
    authFetch('/admin/albuns').then(r => r.json()).then(json => {
      if (json.success) setAlbuns(json.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
    authFetch('/admin/clientes').then(r => r.json()).then(json => {
      if (json.success) setClientes(json.data || []);
    }).catch(() => {});
  }, []);

  // Auto-calcula expiração 30 dias após evento
  useEffect(() => {
    if (form.data_evento) {
      const exp = new Date(form.data_evento);
      exp.setDate(exp.getDate() + 30);
      setForm(f => ({ ...f, data_expiracao: exp.toISOString().split('T')[0] }));
    }
  }, [form.data_evento]);

  const filtrados = useMemo(() => {
    let list = [...albuns];
    if (tab !== 'todos') list = list.filter(a => a.status === tab);
    if (busca) {
      const q = busca.toLowerCase();
      list = list.filter(a => a.titulo?.toLowerCase().includes(q) || a.cliente_nome?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (ordenar === 'recentes') return new Date(b.created || 0) - new Date(a.created || 0);
      if (ordenar === 'antigos') return new Date(a.created || 0) - new Date(b.created || 0);
      if (ordenar === 'evento') return new Date(b.data_evento || 0) - new Date(a.data_evento || 0);
      return 0;
    });
    return list;
  }, [albuns, tab, busca, ordenar]);

  const kpis = useMemo(() => ({
    total: albuns.length,
    publicados: albuns.filter(a => a.status === 'publicado').length,
    em_edicao: albuns.filter(a => a.status === 'em_edicao').length,
    expirados: albuns.filter(a => a.status === 'expirado').length,
    fotos: albuns.reduce((s, a) => s + (a.total_fotos || 0), 0),
  }), [albuns]);

  const handlePublicar = async (album) => {
    if ((album.pagamento_pct || 0) < 70) return alert('Pagamento mínimo de 70% necessário para publicar.');
    const res = await authFetch(`/admin/albuns/${album.id}/publicar`, { method: 'POST' });
    const json = await res.json();
    if (json.success) setAlbuns(prev => prev.map(a => a.id === album.id ? { ...a, status: 'publicado' } : a));
  };

  const handleProteger = async (id) => {
    await authFetch(`/admin/albuns/${id}/proteger`, { method: 'POST' });
    setAlbuns(prev => prev.map(a => a.id === id ? { ...a, data_expiracao: null } : a));
  };

  const handleExcluir = async (id) => {
    if (!window.confirm('Excluir este álbum permanentemente?')) return;
    const res = await authFetch(`/admin/albuns/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) setAlbuns(prev => prev.filter(a => a.id !== id));
  };

  const handleCompartilhar = (album) => {
    const url = `${window.location.origin}/album/${album.slug || album.id}`;
    navigator.clipboard.writeText(url);
    alert('Link copiado!');
  };

  const handleCriar = async (e) => {
    e.preventDefault();
    const res = await authFetch('/admin/albuns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    });
    const json = await res.json();
    if (json.success) {
      setAlbuns(prev => [json.data, ...prev]);
      setModal(false);
      setForm({ titulo: '', cliente_id: '', tipo_evento: '', data_evento: '', data_expiracao: '' });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-3">
          <Image size={24} style={{ color: '#EA580C' }} />
          <h1 className="text-2xl font-bold text-gray-900">Álbuns</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal(true)} style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 transition shadow-sm">
            <Plus size={16} /> Novo Álbum
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: kpis.total, icon: Image, color: 'bg-orange-50 text-orange-600' },
          { label: 'Publicados', value: kpis.publicados, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
          { label: 'Em Edição', value: kpis.em_edicao, icon: Edit, color: 'bg-blue-50 text-blue-600' },
          { label: 'Expirados', value: kpis.expirados, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
          { label: 'Total Fotos', value: kpis.fotos, icon: Camera, color: 'bg-purple-50 text-purple-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.color}`}><k.icon size={20} /></div>
            <div><p className="text-2xl font-bold text-gray-900">{k.value}</p><p className="text-xs text-gray-500">{k.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {STATUS_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar título ou cliente..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-gray-400" />
          <select value={ordenar} onChange={e => setOrdenar(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200">
            <option value="recentes">Mais recentes</option>
            <option value="antigos">Mais antigos</option>
            <option value="evento">Data do evento</option>
          </select>
        </div>
      </div>

      {/* Grid de Cards */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Image size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum álbum encontrado.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtrados.map(album => {
            const dias = diasRestantes(album.data_expiracao);
            const pct = album.pagamento_pct ?? 100;
            const bloqueado = pct < 70;
            return (
              <div key={album.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
                {/* Gradient header */}
                <div className="h-32 bg-gradient-to-br from-orange-100 via-orange-50 to-amber-50 flex items-center justify-center relative">
                  <Image size={36} className="text-orange-200" />
                  <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-xs font-semibold ${BADGE_STYLES[album.status] || BADGE_STYLES.rascunho}`}>
                    {STATUS_LABELS[album.status] || album.status}
                  </span>
                  {/* Countdown expiração */}
                  {dias !== null && dias > 0 && (
                    <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${dias <= 3 ? 'bg-red-100 text-red-700' : dias <= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                      <Clock size={11} />{dias}d restantes
                    </span>
                  )}
                  {dias !== null && dias <= 0 && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 bg-red-100 text-red-700">
                      <XCircle size={11} />Expirado
                    </span>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="p-4 space-y-3">
                  <h3 className="font-bold text-gray-900 truncate text-base">{album.titulo}</h3>
                  <p className="text-sm text-gray-500 truncate">{album.cliente_nome || 'Sem cliente'}</p>

                  {/* Resumo */}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Camera size={12} />{album.total_fotos || 0} fotos</span>
                    <span>Evento: {formatDate(album.data_evento)}</span>
                  </div>
                  <p className="text-xs text-gray-400">Criado em {formatDate(album.created)}</p>

                  {/* Barra de pagamento / trava 70% */}
                  {album.status !== 'publicado' && album.status !== 'expirado' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={bloqueado ? 'text-yellow-700 font-medium' : 'text-gray-500'}>
                          Pagamento {pct}% {bloqueado && '— mínimo 70% para publicar'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${bloqueado ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
                    <button onClick={() => navigate(`/admin/albuns/${album.id}`)} title="Ver fotos" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"><Eye size={16} /></button>
                    <button onClick={() => navigate(`/admin/albuns/${album.id}/upload`)} title="Upload" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"><Upload size={16} /></button>
                    {(album.status === 'rascunho' || album.status === 'em_edicao') && (
                      <button onClick={() => handlePublicar(album)} title={bloqueado ? 'Pagamento insuficiente' : 'Publicar'} disabled={bloqueado}
                        className={`p-1.5 rounded ${bloqueado ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-green-50 text-gray-500 hover:text-green-600'}`}><Send size={16} /></button>
                    )}
                    {dias !== null && dias > 0 && (
                      <button onClick={() => handleProteger(album.id)} title="Proteger de expiração" className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600"><Shield size={16} /></button>
                    )}
                    <button onClick={() => handleCompartilhar(album)} title="Copiar link" className="p-1.5 rounded hover:bg-purple-50 text-gray-500 hover:text-purple-600"><Link2 size={16} /></button>
                    <button onClick={() => handleExcluir(album.id)} title="Excluir" className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 ml-auto"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Novo Álbum */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <form onSubmit={handleCriar} className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 mx-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Plus size={18} style={{ color: ACCENT }} />Novo Álbum</h2>
            <div>
              <label className="text-sm font-medium text-gray-700">Título *</label>
              <input required value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Cliente *</label>
              <select required value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200">
                <option value="">Selecione o cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo de Evento</label>
              <select value={form.tipo_evento} onChange={e => setForm(f => ({ ...f, tipo_evento: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200">
                <option value="">Selecione...</option>
                <option value="casamento">Casamento</option>
                <option value="aniversario">Aniversário</option>
                <option value="corporativo">Corporativo</option>
                <option value="ensaio">Ensaio</option>
                <option value="batizado">Batizado</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Data do Evento</label>
                <input type="date" value={form.data_evento} onChange={e => setForm(f => ({ ...f, data_evento: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Expiração (auto)</label>
                <input type="date" value={form.data_expiracao} readOnly
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-100 text-sm bg-gray-50 text-gray-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
              <button type="submit" style={{ background: ACCENT }} className="px-5 py-2 text-sm text-white rounded-lg font-medium hover:opacity-90 transition shadow-sm">Criar Álbum</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
