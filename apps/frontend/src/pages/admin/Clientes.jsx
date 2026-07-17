import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, Plus, Search, MessageCircle, Eye, Mail,
  TrendingUp, UserCheck, UserPlus, UserX
} from 'lucide-react';

const ACCENT = '#EA580C';

const PIPELINE = [
  { key: 'todos', label: 'Todos', color: '#6B7280' },
  { key: 'lead', label: 'Lead', color: '#6B7280' },
  { key: 'contato', label: 'Contato', color: '#3B82F6' },
  { key: 'negociacao', label: 'Negociação', color: '#EAB308' },
  { key: 'cliente', label: 'Cliente', color: '#22C55E' },
  { key: 'inativo', label: 'Inativo', color: '#EF4444' },
];

const SORT_OPTIONS = [
  { value: 'nome_asc', label: 'Nome A-Z' },
  { value: 'ultimo_contato', label: 'Último contato' },
  { value: 'created', label: 'Data cadastro' },
];

const TAG_COLORS = [
  'bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700', 'bg-yellow-100 text-yellow-700',
  'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700',
  'bg-red-100 text-red-700', 'bg-teal-100 text-teal-700',
];

function getTagColor(tag, index) {
  const hash = tag.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

function StatusBadge({ status }) {
  const pipe = PIPELINE.find(p => p.key === status) || PIPELINE[1];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: pipe.color + '20', color: pipe.color }}
    >
      {pipe.label}
    </span>
  );
}

function TagChips({ tags = [] }) {
  if (!tags || tags.length === 0) return <span className="text-gray-300">—</span>;
  const visible = tags.slice(0, 3);
  const extra = tags.length - 3;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag, i) => (
        <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag, i)}`}>
          {tag}
        </span>
      ))}
      {extra > 0 && (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          +{extra}
        </span>
      )}
    </div>
  );
}

export default function Clientes() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [selectedTags, setSelectedTags] = useState([]);
  const [cidadeFilter, setCidadeFilter] = useState('');
  const [origemFilter, setOrigemFilter] = useState('');
  const [sortBy, setSortBy] = useState('nome_asc');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await authFetch('/admin/clientes');
      const json = await res.json();
      if (json.success) setClientes(json.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Extrair opções únicas para filtros
  const allTags = useMemo(() => {
    const set = new Set();
    clientes.forEach(c => (c.tags || []).forEach(t => set.add(t)));
    return [...set].sort();
  }, [clientes]);

  const allCidades = useMemo(() => {
    const set = new Set();
    clientes.forEach(c => { if (c.cidade) set.add(c.cidade); });
    return [...set].sort();
  }, [clientes]);

  const allOrigens = useMemo(() => {
    const set = new Set();
    clientes.forEach(c => { if (c.como_conheceu) set.add(c.como_conheceu); });
    return [...set].sort();
  }, [clientes]);

  // CLI-06: Busca em tempo real + CLI-02 Pipeline + CLI-05 Filtros
  const filtered = useMemo(() => {
    let list = [...clientes];

    // Pipeline tab filter
    if (activeTab !== 'todos') {
      list = list.filter(c => c.status === activeTab);
    }

    // Search (nome, email, telefone, instagram)
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.nome || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.telefone || '').toLowerCase().includes(q) ||
        (c.instagram || '').toLowerCase().includes(q)
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      list = list.filter(c =>
        selectedTags.every(tag => (c.tags || []).includes(tag))
      );
    }

    // Cidade filter
    if (cidadeFilter) {
      list = list.filter(c => c.cidade === cidadeFilter);
    }

    // Origem filter
    if (origemFilter) {
      list = list.filter(c => c.como_conheceu === origemFilter);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'nome_asc') return (a.nome || '').localeCompare(b.nome || '');
      if (sortBy === 'ultimo_contato') return new Date(b.ultimo_contato || 0) - new Date(a.ultimo_contato || 0);
      if (sortBy === 'created') return new Date(b.created || 0) - new Date(a.created || 0);
      return 0;
    });

    return list;
  }, [clientes, activeTab, search, selectedTags, cidadeFilter, origemFilter, sortBy]);

  // CLI-07 KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    return {
      total: clientes.length,
      leadsNovos: clientes.filter(c => {
        if (c.status !== 'lead') return false;
        const d = new Date(c.created);
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
      }).length,
      negociacao: clientes.filter(c => c.status === 'negociacao').length,
      ativos: clientes.filter(c => c.status === 'cliente').length,
    };
  }, [clientes]);

  // Contagens por tab
  const tabCounts = useMemo(() => {
    const counts = { todos: clientes.length };
    PIPELINE.slice(1).forEach(p => {
      counts[p.key] = clientes.filter(c => c.status === p.key).length;
    });
    return counts;
  }, [clientes]);

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const formatPhone = (phone) => (phone || '').replace(/\D/g, '');

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} style={{ color: ACCENT }} />
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        </div>
        <button
          onClick={() => navigate('/admin/clientes/novo')}
          style={{ background: ACCENT }}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {/* CLI-07 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Clientes', value: kpis.total, icon: Users, color: '#6B7280' },
          { label: 'Leads Novos', value: kpis.leadsNovos, icon: UserPlus, color: '#3B82F6' },
          { label: 'Em Negociação', value: kpis.negociacao, icon: TrendingUp, color: '#EAB308' },
          { label: 'Clientes Ativos', value: kpis.ativos, icon: UserCheck, color: '#22C55E' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: kpi.color + '15' }}>
                <kpi.icon size={20} style={{ color: kpi.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-xs text-gray-500">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CLI-02 Pipeline Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
        {PIPELINE.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span
              className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs"
              style={activeTab === tab.key ? { backgroundColor: tab.color + '20', color: tab.color } : {}}
            >
              {tabCounts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* CLI-05 & CLI-06 Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Busca */}
          <div className="relative md:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar nome, email, telefone, instagram..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          {/* Cidade */}
          <select
            value={cidadeFilter}
            onChange={(e) => setCidadeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="">Todas cidades</option>
            {allCidades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* Origem */}
          <select
            value={origemFilter}
            onChange={(e) => setOrigemFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="">Todas origens</option>
            {allOrigens.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Tags + Ordenar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Tags:</span>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                selectedTags.includes(tag)
                  ? 'ring-2 ring-offset-1 ring-orange-400 ' + getTagColor(tag, 0)
                  : getTagColor(tag, 0) + ' opacity-60 hover:opacity-100'
              }`}
            >
              {tag}
            </button>
          ))}
          <div className="ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">{filtered.length} cliente(s)</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            {search || activeTab !== 'todos' || selectedTags.length > 0
              ? 'Nenhum cliente encontrado com os filtros aplicados.'
              : 'Nenhum cliente cadastrado.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tags</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Telefone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cidade</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Último Job</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/admin/clientes/${c.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.nome}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3"><TagChips tags={c.tags} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.telefone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.cidade || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {c.ultimo_job ? new Date(c.ultimo_job).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {(c.whatsapp || c.telefone) && (
                          <a
                            href={`https://wa.me/55${formatPhone(c.whatsapp || c.telefone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                            title="WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </a>
                        )}
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                            title="Email"
                          >
                            <Mail size={16} />
                          </a>
                        )}
                        <button
                          onClick={() => navigate(`/admin/clientes/${c.id}`)}
                          className="p-1.5 rounded-lg hover:bg-orange-50"
                          style={{ color: ACCENT }}
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
