import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';

export default function NovidadeDetalhe() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${API}/public/novidades/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => setPost(data.data || data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 animate-pulse">
          <div className="h-6 bg-stone-800 rounded w-24 mb-8" />
          <div className="aspect-[2/1] bg-stone-900 rounded-xl mb-8" />
          <div className="h-8 bg-stone-800 rounded w-2/3 mb-4" />
          <div className="h-4 bg-stone-800 rounded w-1/4 mb-8" />
          <div className="space-y-3">
            <div className="h-4 bg-stone-800 rounded w-full" />
            <div className="h-4 bg-stone-800 rounded w-5/6" />
            <div className="h-4 bg-stone-800 rounded w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-400 text-lg mb-4">Publicação não encontrada.</p>
          <Link
            to="/novidades"
            className="inline-flex items-center gap-2 text-[#EA580C] hover:underline"
          >
            <ArrowLeft size={16} /> Voltar para Novidades
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 py-12 sm:py-20">
      <article className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back button */}
        <Link
          to="/novidades"
          className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-200 transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>

        {/* Cover image */}
        {post.cover_url && (
          <div className="aspect-[2/1] overflow-hidden rounded-xl mb-8">
            <img
              src={post.cover_url}
              alt={post.titulo}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-stone-50 leading-tight">
          {post.titulo}
        </h1>

        {/* Date */}
        <div className="flex items-center gap-2 mt-4 mb-8 text-stone-500">
          <Calendar size={16} />
          <time>{formatDate(post.data || post.created_at)}</time>
        </div>

        {/* Body */}
        <div
          className="prose prose-invert prose-lg max-w-none text-stone-300
            prose-headings:text-stone-50 prose-strong:text-stone-50
            prose-a:text-[#EA580C] prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-blockquote:border-[#EA580C]"
          dangerouslySetInnerHTML={{ __html: post.corpo || post.body || post.conteudo }}
        />

        {/* Bottom back link */}
        <div className="mt-12 pt-8 border-t border-stone-800">
          <Link
            to="/novidades"
            className="inline-flex items-center gap-2 text-[#EA580C] hover:underline font-medium"
          >
            <ArrowLeft size={16} /> Todas as novidades
          </Link>
        </div>
      </article>
    </div>
  );
}
