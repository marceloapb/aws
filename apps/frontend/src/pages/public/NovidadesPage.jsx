import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';

export default function NovidadesPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = async (pageNum, append = false) => {
    const setLoadState = append ? setLoadingMore : setLoading;
    setLoadState(true);
    try {
      const res = await fetch(`${API}/public/novidades?page=${pageNum}&limit=9`);
      const data = await res.json();
      const items = data.data || data.items || data || [];
      const total = data.total || data.totalPages || 0;

      if (append) {
        setPosts(prev => [...prev, ...items]);
      } else {
        setPosts(items);
      }
      setHasMore(data.hasMore || (pageNum * 9 < total));
    } catch {
      if (!append) setPosts([]);
    } finally {
      setLoadState(false);
    }
  };

  useEffect(() => {
    fetchPosts(1);
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Header */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-50 text-center mb-4">
            Novidades
          </h1>
          <p className="text-stone-400 text-center max-w-2xl mx-auto">
            Fique por dentro das últimas novidades, bastidores e dicas de fotografia.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-stone-900/50 rounded-xl overflow-hidden border border-stone-800 animate-pulse">
                  <div className="aspect-[16/10] bg-stone-800" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-stone-800 rounded w-1/3" />
                    <div className="h-5 bg-stone-800 rounded w-3/4" />
                    <div className="h-4 bg-stone-800 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center text-stone-500 py-12">Nenhuma novidade publicada ainda.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map(post => (
                  <Link
                    key={post.id || post.slug}
                    to={`/novidades/${post.slug}`}
                    className="group bg-stone-900/50 rounded-xl overflow-hidden border border-stone-800 hover:border-stone-700 transition-colors"
                  >
                    {/* Cover Image */}
                    {post.cover_url && (
                      <div className="aspect-[16/10] overflow-hidden">
                        <img
                          src={post.cover_url}
                          alt={post.titulo}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                      {/* Date */}
                      <div className="flex items-center gap-1.5 text-stone-500 text-xs mb-2">
                        <Calendar size={12} />
                        <span>{formatDate(post.data || post.created_at)}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-stone-50 font-semibold text-lg leading-snug group-hover:text-[#EA580C] transition-colors line-clamp-2">
                        {post.titulo}
                      </h3>

                      {/* Excerpt */}
                      {post.resumo && (
                        <p className="mt-2 text-stone-400 text-sm leading-relaxed line-clamp-3">
                          {post.resumo}
                        </p>
                      )}

                      {/* Read more */}
                      <span className="mt-4 inline-flex items-center gap-1 text-[#EA580C] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Ler mais <ArrowRight size={14} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
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
