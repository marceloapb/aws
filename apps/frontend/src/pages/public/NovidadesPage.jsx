import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from './SiteLayout';

const API = process.env.REACT_APP_API_URL || '';

export default function NovidadesPage() {
  const config = useSiteConfig();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastKey, setLastKey] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Categorias
  const [categorias, setCategorias] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('');

  // Carregar categorias
  useEffect(() => {
    fetch(`${API}/public/novidades/categorias`)
      .then(r => r.json())
      .then(data => setCategorias(data.data || []))
      .catch(() => setCategorias([]));
  }, []);

  const fetchPosts = async (cursor, append = false, categoria = categoriaAtiva) => {
    const setLoadState = append ? setLoadingMore : setLoading;
    setLoadState(true);
    try {
      let url = `${API}/public/novidades?limit=12`;
      if (cursor) url += `&lastKey=${cursor}`;
      if (categoria) url += `&categoria=${encodeURIComponent(categoria)}`;
      const res = await fetch(url);
      const data = await res.json();
      const items = data.data || [];

      if (append) {
        setPosts(prev => [...prev, ...items]);
      } else {
        setPosts(items);
      }
      setLastKey(data.lastKey || null);
    } catch {
      if (!append) setPosts([]);
    } finally {
      setLoadState(false);
    }
  };

  useEffect(() => {
    fetchPosts(null, false, categoriaAtiva);
  }, [categoriaAtiva]);

  const loadMore = () => {
    if (lastKey) fetchPosts(lastKey, true);
  };

  const handleCategoriaChange = (cat) => {
    setCategoriaAtiva(cat);
    setLastKey(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const nome = config?.nome || 'Marcelo Bloise';
  const logoUrl = config?.logo_dark_url || config?.logo_url;

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Hero Header */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/80 to-stone-950" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-50 text-center mb-4">
            Novidades
          </h1>
          <p className="text-stone-400 text-center max-w-2xl mx-auto">
            Fique por dentro das últimas novidades, bastidores e dicas de fotografia.
          </p>
        </div>
      </section>

      {/* Category tabs */}
      {categorias.length > 0 && (
        <section className="border-b border-stone-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <nav className="flex gap-1 overflow-x-auto no-scrollbar -mb-px">
              <button
                onClick={() => handleCategoriaChange('')}
                className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  !categoriaAtiva
                    ? 'border-[#EA580C] text-[#EA580C]'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                Todos posts
              </button>
              {categorias.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoriaChange(cat.nome)}
                  className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    categoriaAtiva === cat.nome
                      ? 'border-[#EA580C] text-[#EA580C]'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {cat.nome}
                </button>
              ))}
            </nav>
          </div>
        </section>
      )}

      {/* Posts Grid */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] bg-stone-900 rounded-lg mb-4" />
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-stone-800" />
                    <div className="h-3 bg-stone-800 rounded w-24" />
                  </div>
                  <div className="h-5 bg-stone-800 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-stone-800 rounded w-full" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center text-stone-500 py-16 text-lg">
              {categoriaAtiva
                ? `Nenhuma novidade encontrada em "${categoriaAtiva}".`
                : 'Nenhuma novidade publicada ainda.'}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map(post => (
                  <Link
                    key={post.slug}
                    to={`/novidades/${post.slug}`}
                    className="group block"
                  >
                    {/* Cover Image */}
                    <div className="aspect-[4/3] overflow-hidden rounded-lg bg-stone-900 mb-4">
                      {post.capa_url ? (
                        <img
                          src={post.capa_url}
                          alt={post.titulo}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-stone-900">
                          <span className="text-stone-700 text-4xl font-bold">MB</span>
                        </div>
                      )}
                    </div>

                    {/* Author + Date row */}
                    <div className="flex items-center gap-2.5 mb-3">
                      {/* Author avatar */}
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-800 border border-stone-700 shrink-0">
                        {logoUrl ? (
                          <img src={logoUrl} alt={nome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-500 text-xs font-bold">
                            MB
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-stone-200 text-sm font-medium truncate">
                          {nome.split(' ').slice(0, 2).join(' ')}
                        </p>
                        <p className="text-stone-500 text-xs">
                          {formatDate(post.publicado_em)}
                        </p>
                      </div>

                      {/* Three dots menu placeholder (like the reference image) */}
                      <div className="ml-auto text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <circle cx="8" cy="3" r="1.5" />
                          <circle cx="8" cy="8" r="1.5" />
                          <circle cx="8" cy="13" r="1.5" />
                        </svg>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-stone-50 font-bold text-base leading-snug group-hover:text-[#EA580C] transition-colors mb-2">
                      {post.titulo}
                    </h3>

                    {/* Excerpt */}
                    {post.resumo && (
                      <p className="text-stone-400 text-sm leading-relaxed line-clamp-3">
                        {post.resumo}
                      </p>
                    )}
                  </Link>
                ))}
              </div>

              {/* Load More */}
              {lastKey && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-6 py-3 rounded-lg font-medium bg-stone-800 text-stone-200 hover:bg-stone-700 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'Carregando...' : 'Carregar mais'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
