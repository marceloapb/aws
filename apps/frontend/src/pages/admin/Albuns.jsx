import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Image, Plus, Search, Eye, Shield, Trash2, Send, Clock, AlertTriangle, Camera, CheckCircle2, XCircle } from 'lucide-react';

const ACCENT = '#EA580C';
const TABS = ['todos', 'publicado', 'rascunho', 'expirado'];

function diasRestantes(dataExp) {
  if (!dataExp) return null;
  const diff = Math.ceil((new Date(dataExp) - new Date()) / 86400000);
  return diff;
}

export default function Albuns() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [albuns, setAlbuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('todos');
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ titulo: '', cliente_id: '', tipo_evento: '' });

  useEffect(() => {
    authFetch('/admin/albuns').then(r => r.json()).then(json => {
      if (json.success) setAlbuns(json.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtrados = useMemo(() => {
    let list = albuns;
    if (tab !== 'todos') list = list.filter(a => a.status === tab);
    if (busca) {
      const q = busca.toLowerCase();
      list = list.filter(a => a.titulo?.toLowerCase().includes(q) || a.cliente_nome?.toLowerCase().includes(q));
    }
    return list;
  }, [albuns, tab, busca]);

  const kpis = useMemo(() => ({
    total: albuns.length,
    publicados: albuns.filter(a => a.status === 'publicado').length,
    expirados: albuns.filter(a => a.status === 'expirado').length,
    fotos: albuns.reduce((s, a) => s + (a.total_fotos || 0), 0),
  }), [albuns]);

  const handlePublicar = async (id) => {
    const res = await authFetch(`/admin/albuns/${id}/publicar`, { method: 'POST' });
    const json = await res.json();
    if (json.success) setAlbuns(prev => prev.map(a => a.id === id ? { ...a, status: 'publicado' } : a));
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

  const handleCriar = async (e) => {
    e.preventDefault();
    const res = await authFetch('/admin/albuns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await res.json();
    if (json.success) { setAlbuns(prev => [json.data, ...prev]); setModal(false); setForm({ titulo: '', cliente_id: '', tipo_evento: '' }); }
  };

  const Badge = ({ status }) => {
    const map = { publicado: 'bg-green-100 text-green-700', rascunho: 'bg-gray-100 text-gray-600', expirado: 'bg-red-100 text-red-700' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.rascunho}`}>{status}</span>;
  };

  const ExpiracaoTag = ({ data }) => {
    const dias = diasRestantes(data);
    if (dias === null) return null;
    if (dias <= 0) return <span className="text-xs text-red-600 flex items-center gap-1"><XCircle size={12}/>Expirado</span>;
    const cor = dias <= 3 ? 'text-red-600' : dias <= 7 ? 'text-yellow-600' : 'text-gray-500';
    return <span className={`text-xs ${cor} flex items-center gap-1`}><Clock size={12}/>Expira em {dias}d</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"/></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Álbuns</h1>
        </div>
        <button onClick={() => setModal(true)} style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
          <Plus size={16}/> Novo Álbum
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Álbuns', value: kpis.total, icon: Image, color: 'bg-orange-50 text-orange-600' },
          { label: 'Publicados', value: kpis.publicados, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
          { label: 'Expirados', value: kpis.expirados, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
          { label: 'Fotos Totais', value: kpis.fotos, icon: Camera, color: 'bg-blue-50 text-blue-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.color}`}><k.icon size={20}/></div>
            <div><p className="text-2xl font-bold text-gray-900">{k.value}</p><p className="text-xs text-gray-500">{k.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'todos' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar título ou cliente..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"/>
        </div>
      </div>

      {/* Grid */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Image size={32} className="mx-auto text-gray-300 mb-3"/>
          <p className="text-gray-500 text-sm">Nenhum álbum encontrado.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(album => {
            const dias = diasRestantes(album.data_expiracao);
            const pagInsuf = album.status === 'rascunho' && album.pagamento_pct !== undefined && album.pagamento_pct < 70;
            return (
              <div key={album.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
                {/* Cover */}
                <div className="h-36 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center relative">
                  <Image size={40} className="text-orange-200"/>
                  <div className="absolute top-2 right-2"><Badge status={album.status}/></div>
                  {pagInsuf && (
                    <div className="absolute bottom-2 left-2 right-2 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 flex items-center gap-1 text-xs text-yellow-700">
                      <AlertTriangle size={12}/> Pagamento &lt;70% — publicação bloqueada
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 truncate">{album.titulo}</h3>
                  <p className="text-sm text-gray-500">{album.cliente_nome || 'Sem cliente'}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Camera size={12}/>{album.total_fotos || 0} fotos</span>
                    <ExpiracaoTag data={album.data_expiracao}/>
                  </div>
                  {album.data_evento && <p className="text-xs text-gray-400">Evento: {new Date(album.data_evento).toLocaleDateString('pt-BR')}</p>}
                  {/* Ações */}
                  <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
                    <button onClick={() => navigate(`/admin/albuns/${album.id}`)} title="Ver fotos" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"><Eye size={16}/></button>
                    {album.status === 'rascunho' && !pagInsuf && (
                      <button onClick={() => handlePublicar(album.id)} title="Publicar" className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-600"><Send size={16}/></button>
                    )}
                    {dias !== null && dias > 0 && (
                      <button onClick={() => handleProteger(album.id)} title="Proteger de expiração" className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600"><Shield size={16}/></button>
                    )}
                    <button onClick={() => handleExcluir(album.id)} title="Excluir" className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 ml-auto"><Trash2 size={16}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Novo Álbum */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleCriar} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Novo Álbum</h2>
            <div>
              <label className="text-sm font-medium text-gray-700">Título</label>
              <input required value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Cliente</label>
              <input value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))} placeholder="ID do cliente" className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo de Evento</label>
              <select value={form.tipo_evento} onChange={e => setForm(f => ({ ...f, tipo_evento: e.target.value }))} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200">
                <option value="">Selecione...</option>
                <option value="casamento">Casamento</option>
                <option value="aniversario">Aniversário</option>
                <option value="corporativo">Corporativo</option>
                <option value="ensaio">Ensaio</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button type="submit" style={{ background: ACCENT }} className="px-4 py-2 text-sm text-white rounded-lg font-medium hover:opacity-90">Criar Álbum</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
