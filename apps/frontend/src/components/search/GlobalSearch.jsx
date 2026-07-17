import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, FileText, BookOpen, Image, Plus, Calendar, Settings, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ACCENT = '#EA580C';

const QUICK_ACTIONS = [
  { id: 'new-orcamento', icon: Plus, title: 'Novo Orçamento', route: '/orcamentos/novo' },
  { id: 'new-cliente', icon: Plus, title: 'Novo Cliente', route: '/clientes/novo' },
  { id: 'agenda', icon: Calendar, title: 'Abrir Agenda', route: '/agenda' },
  { id: 'config', icon: Settings, title: 'Configurações', route: '/configuracoes' },
];

const CATEGORY_CONFIG = {
  clientes: { icon: Users, label: 'Clientes', route: (id) => `/clientes/${id}` },
  orcamentos: { icon: FileText, label: 'Orçamentos', route: (id) => `/orcamentos/${id}` },
  contratos: { icon: BookOpen, label: 'Contratos', route: (id) => `/contratos/${id}` },
  albuns: { icon: Image, label: 'Álbuns', route: (id) => `/albuns/${id}` },
};

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const debounceRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({});
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  const doSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setResults({});
      return;
    }
    setLoading(true);
    try {
      const [clientesRes, orcamentosRes] = await Promise.all([
        authFetch(`/admin/clientes?busca=${encodeURIComponent(term)}`),
        authFetch(`/admin/orcamentos?busca=${encodeURIComponent(term)}`),
      ]);
      const clientes = clientesRes.ok ? await clientesRes.json() : [];
      const orcamentos = orcamentosRes.ok ? await orcamentosRes.json() : [];
      setResults({
        ...(clientes.length > 0 && { clientes: clientes.slice(0, 5).map((c) => ({ id: c.id || c.clienteId, title: c.name || c.nome, subtitle: c.email || c.phone || c.telefone || '' })) }),
        ...(orcamentos.length > 0 && { orcamentos: orcamentos.slice(0, 5).map((o) => ({ id: o.id || o.orcamentoId, title: o.titulo || o.title || `Orçamento #${o.id || o.orcamentoId}`, subtitle: o.clienteNome || o.status || '' })) }),
      });
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults({});
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  // Build flat list of navigable items
  const flatItems = query.trim()
    ? Object.entries(results).flatMap(([cat, items]) =>
        items.map((item) => ({ ...item, category: cat, route: CATEGORY_CONFIG[cat]?.route(item.id) }))
      )
    : QUICK_ACTIONS.map((a) => ({ ...a, category: 'quick' }));

  const handleSelect = (item) => {
    onClose();
    navigate(item.route);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatItems[activeIndex]) {
      e.preventDefault();
      handleSelect(flatItems[activeIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center px-4 border-b border-gray-200">
          <Search size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar clientes, orçamentos, contratos..."
            className="flex-1 px-3 py-4 text-lg outline-none placeholder-gray-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-gray-100 rounded">
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && <p className="text-sm text-gray-400 text-center py-4">Buscando...</p>}

          {!loading && !query.trim() && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase px-3 py-2">Ações Rápidas</p>
              {QUICK_ACTIONS.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleSelect(action)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${idx === activeIndex ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: idx === activeIndex ? ACCENT : '#f3f4f6' }}>
                      <Icon size={16} className={idx === activeIndex ? 'text-white' : 'text-gray-500'} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{action.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && query.trim() && Object.keys(results).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum resultado encontrado</p>
          )}

          {!loading && Object.entries(results).map(([category, items]) => {
            const config = CATEGORY_CONFIG[category];
            if (!config) return null;
            const CatIcon = config.icon;
            return (
              <div key={category} className="mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase px-3 py-2">{config.label}</p>
                {items.map((item) => {
                  const globalIdx = flatItems.findIndex((fi) => fi.id === item.id && fi.category === category);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect({ ...item, route: config.route(item.id) })}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${globalIdx === activeIndex ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: globalIdx === activeIndex ? ACCENT : '#f3f4f6' }}>
                        <CatIcon size={16} className={globalIdx === activeIndex ? 'text-white' : 'text-gray-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{item.title}</p>
                        {item.subtitle && <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">↑↓</kbd> navegar</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Enter</kbd> selecionar</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
