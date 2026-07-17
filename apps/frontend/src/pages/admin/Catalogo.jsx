import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Package, Plus, Edit2, Copy, Power, LayoutGrid, List, Search, Filter } from 'lucide-react';

const ACCENT = '#EA580C';
const fmtBRL = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Catalogo() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('servico');
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try {
      const res = await authFetch('/admin/catalogo');
      const json = await res.json();
      if (json.success) setItems(json.data || []);
    } catch { /* silently fail */ }
  };

  const handleDuplicate = async (item) => {
    await authFetch('/admin/catalogo', { method: 'POST', body: JSON.stringify({ ...item, id: undefined, name: `${item.name} (cópia)` }) });
    loadItems();
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'ativo' ? 'inativo' : 'ativo';
    await authFetch(`/admin/catalogo/${item.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    loadItems();
  };

  const categories = useMemo(() => [...new Set(items.map(i => i.category).filter(Boolean))], [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (tab === 'servico' && i.type === 'pacote') return false;
      if (tab === 'pacote' && i.type !== 'pacote') return false;
      if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter && i.category !== catFilter) return false;
      if (statusFilter !== 'todos' && i.status !== statusFilter) return false;
      if (priceMin && i.price < Number(priceMin)) return false;
      if (priceMax && i.price > Number(priceMax)) return false;
      return true;
    });
  }, [items, tab, search, catFilter, statusFilter, priceMin, priceMax]);

  const kpis = useMemo(() => {
    const ativos = filtered.filter(i => i.status === 'ativo').length;
    const avgPrice = filtered.length ? filtered.reduce((s, i) => s + Number(i.price), 0) / filtered.length : 0;
    const cats = new Set(filtered.map(i => i.category).filter(Boolean)).size;
    return { total: filtered.length, ativos, avgPrice, cats };
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
        </div>
        <button onClick={() => navigate('/admin/catalogo/novo')}
          style={{ background: ACCENT }} className="inline-flex items-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
          <Plus size={16} /> Novo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Itens', value: kpis.total },
          { label: 'Ativos', value: kpis.ativos },
          { label: 'Preço Médio', value: fmtBRL(kpis.avgPrice) },
          { label: 'Categorias', value: kpis.cats },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[{ key: 'servico', label: 'Serviços' }, { key: 'pacote', label: 'Pacotes' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('grid')} className={`p-2 rounded-md transition ${view === 'grid' ? 'bg-white shadow-sm' : 'text-gray-400'}`}><LayoutGrid size={16} /></button>
          <button onClick={() => setView('list')} className={`p-2 rounded-md transition ${view === 'list' ? 'bg-white shadow-sm' : 'text-gray-400'}`}><List size={16} /></button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
        <Filter size={16} className="text-gray-400" />
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none">
          <option value="">Todas categorias</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none">
          <option value="todos">Todos status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        <input value={priceMin} onChange={e => setPriceMin(e.target.value)} type="number" placeholder="Min R$"
          className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
        <input value={priceMax} onChange={e => setPriceMax(e.target.value)} type="number" placeholder="Max R$"
          className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">Nenhum item encontrado</div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="group relative bg-gradient-to-br from-white to-orange-50/40 rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{item.category}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
              {item.duration && <p className="text-xs text-gray-400 mb-2">{item.duration}</p>}
              <p className="text-xl font-bold mt-3" style={{ color: ACCENT }}>{fmtBRL(item.price)}</p>
              {/* Hover actions */}
              <div className="absolute inset-x-0 bottom-0 p-4 pt-8 bg-gradient-to-t from-white via-white/90 to-transparent rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 justify-end">
                <button onClick={() => navigate(`/admin/catalogo/${item.id}`)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition" title="Editar"><Edit2 size={14} /></button>
                <button onClick={() => handleDuplicate(item)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition" title="Duplicar"><Copy size={14} /></button>
                <button onClick={() => handleToggleStatus(item)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition" title="Ativar/Desativar"><Power size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Preço</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Duração</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">{item.category}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{fmtBRL(item.price)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.duration || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => navigate(`/admin/catalogo/${item.id}`)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Editar"><Edit2 size={14} /></button>
                    <button onClick={() => handleDuplicate(item)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 ml-1" title="Duplicar"><Copy size={14} /></button>
                    <button onClick={() => handleToggleStatus(item)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 ml-1" title="Ativar/Desativar"><Power size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
